import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { LimitsService } from '../admin/limits.service.js';
import { MailService } from '../../integrations/mail/mail.service.js';
import type { StorageProvider } from '../../integrations/storage/storage.interface.js';
import { getStoragePrefix } from '../../integrations/storage/storage.module.js';
import type { CreateDocumentDto } from './dto/create-document.dto.js';
import type { UpdateDocumentDto } from './dto/update-document.dto.js';
import type { SendDocumentDto } from './dto/send-document.dto.js';
import type { UploadPdfDto } from './dto/upload-pdf.dto.js';

/** Valid status transitions map */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_SIGNATURE', 'SIGNED', 'SENT', 'COMPLETED', 'CANCELLED'],
  PENDING_SIGNATURE: ['SIGNED', 'CANCELLED', 'DRAFT'],
  SIGNED: ['SENT', 'COMPLETED', 'CANCELLED'],
  SENT: ['VIEWED', 'PAID', 'OVERDUE', 'CANCELLED', 'DRAFT'],
  VIEWED: ['PAID', 'OVERDUE', 'CANCELLED', 'DRAFT'],
  COMPLETED: ['PAID', 'ARCHIVED', 'CANCELLED'],
  PAID: ['ARCHIVED'],
  OVERDUE: ['PAID', 'CANCELLED'],
  CANCELLED: ['DRAFT'],
  ARCHIVED: [],
};

/** Contractor fields needed for auto-fill in the invoice builder */
const CONTRACTOR_SELECT = {
  id: true, name: true, email: true, phone: true,
  address: true, taxId: true, bankAccounts: true,
} as const;

/** Lean includes for list views */
const DOCUMENT_INCLUDES_LEAN = {
  buyer: { select: CONTRACTOR_SELECT },
  seller: { select: CONTRACTOR_SELECT },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

/** Full includes for detail/single-doc views */
const DOCUMENT_INCLUDES_FULL = {
  buyer: { select: CONTRACTOR_SELECT },
  seller: { select: CONTRACTOR_SELECT },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly limitsService: LimitsService,
    private readonly mail: MailService,
    @Inject('STORAGE_PROVIDER')
    private readonly storage: StorageProvider,
  ) {}

  /**
   * Create a new document with auto-generated document number.
   */
  async create(dto: CreateDocumentDto, userId: string, companyId: string) {
    await this.limitsService.checkLimit(userId, 'documents');

    const year = new Date().getFullYear();

    const doc = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const mergedInputData: Record<string, unknown> = dto.inputData ?? {};

        // Use custom document number if provided, otherwise auto-generate
        let documentNumber: string;
        if (dto.documentNumber) {
          // Validate uniqueness of the custom number
          const existing = await tx.document.findFirst({
            where: { companyId, documentNumber: dto.documentNumber },
            select: { id: true },
          });
          if (existing) {
            throw new ConflictException(
              `Document number "${dto.documentNumber}" is already in use`,
            );
          }
          documentNumber = dto.documentNumber;
        } else {
          documentNumber = await this.nextDocumentNumber(tx, companyId, year);
        }

        return tx.document.create({
          data: {
            name: dto.name,
            documentNumber,
            companyId,
            createdById: userId,
            status: 'DRAFT',
            inputData: mergedInputData as Prisma.InputJsonValue,
            buyerId: dto.buyerId,
            sellerId: dto.sellerId,
            notes: dto.notes,
          },
          include: DOCUMENT_INCLUDES_FULL,
        });
      },
    );

    await this.audit.log({
      action: 'CREATE',
      entity: 'Document',
      entityId: doc.id,
      userId,
      companyId,
      details: { name: doc.name, number: doc.documentNumber },
    });

    return doc;
  }

  /**
   * List documents for a company with optional filters.
   */
  async findAll(
    companyId: string,
    filters?: {
      status?: DocumentStatus;
      statuses?: DocumentStatus[];
      search?: string;
      buyerIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      vehiclePlate?: string;
    },
  ) {
    const where: Prisma.DocumentWhereInput = { companyId };

    // Status filter: multi-status takes priority over single status
    if (filters?.statuses?.length) {
      where.status = { in: filters.statuses };
    } else if (filters?.status) {
      where.status = filters.status;
    }

    // Buyer filter (multi-select)
    if (filters?.buyerIds?.length) {
      where.buyerId = { in: filters.buyerIds };
    }

    // Vehicle plate filter (JSON path on inputData)
    if (filters?.vehiclePlate) {
      where.inputData = {
        path: ['vehiclePlate'],
        equals: filters.vehiclePlate,
      };
    }

    // Date range filter
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        // Include the entire end day
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        (where.createdAt as Prisma.DateTimeFilter).lte = endDate;
      }
    }

    // Text search
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { documentNumber: { contains: filters.search, mode: 'insensitive' } },
        { buyer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { seller: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.document.findMany({
      where,
      include: DOCUMENT_INCLUDES_LEAN,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single document by ID with full includes.
   * If userId is provided, also verifies the user has access (is a member of the document's company).
   */
  async findById(id: string, userId?: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        ...DOCUMENT_INCLUDES_FULL,
        documentSignatures: {
          include: {
            signature: true,
            stamp: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // Verify the requesting user is a member of the document's company
    if (userId) {
      await this.verifyCompanyMembership(userId, doc.companyId);
    }

    return doc;
  }

  /**
   * Verify that a user is an active member of a company.
   * Throws NotFoundException if not (avoids leaking document existence).
   */
  private async verifyCompanyMembership(userId: string, companyId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!membership) {
      throw new NotFoundException('Document not found');
    }
  }

  /**
   * Update a document.
   */
  async update(id: string, dto: UpdateDocumentDto, userId: string) {
    await this.findById(id, userId);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.buyerId !== undefined) data.buyerId = dto.buyerId;
    if (dto.sellerId !== undefined) data.sellerId = dto.sellerId;
    if (dto.inputData !== undefined) {
      data.inputData = dto.inputData as Prisma.InputJsonValue;

      // Extract and persist currency conversion fields from inputData for analytics
      const input = dto.inputData as Record<string, unknown>;
      if (input.baseCurrency !== undefined) data.baseCurrency = input.baseCurrency;
      if (input.baseCurrencyAmount !== undefined) data.baseCurrencyAmount = Number(input.baseCurrencyAmount) || null;
      if (input.exchangeRate !== undefined) data.exchangeRate = Number(input.exchangeRate) || null;
      if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate as string) : null;

      // Sync document number from inputData to top-level field
      if (input.invoiceNumber !== undefined) {
        const newNumber = String(input.invoiceNumber).trim();
        if (newNumber) data.documentNumber = newNumber;
      }
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'COMPLETED') data.completedAt = new Date();
      if (dto.status === 'SENT') data.sentAt = new Date();
      if (dto.status === 'VIEWED') data.viewedAt = new Date();
      if (dto.status === 'PAID') data.paidAt = new Date();
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data,
      include: DOCUMENT_INCLUDES_FULL,
    });

    await this.audit.log({
      action: 'UPDATE',
      entity: 'Document',
      entityId: id,
      userId,
      companyId: updated.companyId,
      details: { name: updated.name },
    });

    return updated;
  }

  /**
   * Permanently delete a document and its related records.
   */
  async remove(id: string, userId: string) {
    const doc = await this.findById(id, userId);

    // Delete related records first, then the document itself
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.documentSignature.deleteMany({ where: { documentId: id } });
      // Clear self-referencing duplicatedFromId on any copies
      await tx.document.updateMany({
        where: { duplicatedFromId: id },
        data: { duplicatedFromId: null },
      });
      await tx.document.delete({ where: { id } });
    });

    // Also delete the PDF from storage if it exists
    if (doc.pdfUrl) {
      try {
        await this.storage.delete(doc.pdfUrl);
      } catch {
        // Ignore storage deletion errors — the DB record is already gone
      }
    }

    await this.audit.log({
      action: 'DELETE',
      entity: 'Document',
      entityId: id,
      userId,
      companyId: doc.companyId,
      details: { name: doc.name, number: doc.documentNumber },
    });

    return { message: 'Document deleted' };
  }

  /**
   * Send a document to a recipient via email with PDF attachment.
   */
  async send(id: string, dto: SendDocumentDto, userId: string) {
    const doc = await this.findById(id, userId);

    if (!doc.pdfUrl) {
      throw new BadRequestException('Document has no PDF. Please generate the PDF first.');
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Read the PDF file into a buffer
    const pdfBuffer = await this.storage.read(doc.pdfUrl);
    const pdfFilename = `${doc.documentNumber || doc.name || 'document'}.pdf`;

    await this.mail.sendDocumentEmail(
      dto.recipientEmail,
      sender?.name || 'Someone',
      doc.name,
      pdfBuffer,
      pdfFilename,
    );

    await this.audit.log({
      action: 'SEND',
      entity: 'Document',
      entityId: id,
      userId,
      companyId: doc.companyId,
      details: { recipientEmail: dto.recipientEmail },
    });

    return { message: 'Document sent successfully' };
  }

  /**
   * Duplicate a document with a new document number.
   */
  async duplicate(id: string, userId: string, companyId: string) {
    await this.limitsService.checkLimit(userId, 'documents');

    const original = await this.findById(id, userId);
    const year = new Date().getFullYear();

    const dup = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const documentNumber = original.documentNumber
          ? await this.incrementDocumentNumber(
              tx,
              companyId,
              original.documentNumber,
              year,
            )
          : await this.nextDocumentNumber(tx, companyId, year);

        return tx.document.create({
          data: {
            name: original.name,
            documentNumber,
            companyId,
            createdById: userId,
            status: 'DRAFT',
            inputData: (original.inputData ?? {}) as Prisma.InputJsonValue,
            buyerId: original.buyerId,
            sellerId: original.sellerId,
            notes: original.notes,
            duplicatedFromId: id,
          },
          include: DOCUMENT_INCLUDES_FULL,
        });
      },
    );

    await this.audit.log({
      action: 'DUPLICATE',
      entity: 'Document',
      entityId: dup.id,
      userId,
      companyId,
      details: { name: dup.name, originalId: id },
    });

    return dup;
  }

  /**
   * Upload a generated PDF for a document.
   */
  async uploadPdf(id: string, dto: UploadPdfDto, userId: string) {
    const doc = await this.findById(id, userId);

    const buffer = Buffer.from(dto.pdfBase64, 'base64');
    const year = new Date().getFullYear();
    const prefix = getStoragePrefix();
    const storagePath = `${prefix}/users/${userId}/documents/${year}/${id}.pdf`;
    const pdfUrl = await this.storage.upload(buffer, storagePath, 'application/pdf');

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        pdfUrl,
        pdfSize: buffer.length,
      },
      include: DOCUMENT_INCLUDES_FULL,
    });

    await this.audit.log({
      action: 'EXPORT',
      entity: 'Document',
      entityId: id,
      userId,
      companyId: doc.companyId,
      details: { pdfSize: buffer.length },
    });

    return updated;
  }

  /**
   * Apply a signature or stamp to a document.
   */
  async applySignature(
    documentId: string,
    data: {
      signatureId?: string;
      stampId?: string;
      pageNumber?: number;
      positionX: number;
      positionY: number;
      width: number;
      height: number;
    },
    userId: string,
  ) {
    const doc = await this.findById(documentId, userId);

    const docSig = await this.prisma.documentSignature.create({
      data: {
        documentId,
        signatureId: data.signatureId,
        stampId: data.stampId,
        pageNumber: data.pageNumber ?? 1,
        positionX: data.positionX,
        positionY: data.positionY,
        width: data.width,
        height: data.height,
      },
      include: {
        signature: true,
        stamp: true,
      },
    });

    await this.audit.log({
      action: 'SIGN',
      entity: 'Document',
      entityId: documentId,
      userId,
      companyId: doc.companyId,
      details: {
        signatureId: data.signatureId,
        stampId: data.stampId,
      },
    });

    return docSig;
  }

  /**
   * List signatures/stamps applied to a document.
   */
  async listSignatures(documentId: string) {
    return this.prisma.documentSignature.findMany({
      where: { documentId },
      include: {
        signature: true,
        stamp: true,
      },
      orderBy: { appliedAt: 'asc' },
    });
  }

  /**
   * Remove a signature/stamp from a document.
   */
  async removeSignature(signatureRecordId: string) {
    const record = await this.prisma.documentSignature.findUnique({
      where: { id: signatureRecordId },
    });

    if (!record) {
      throw new NotFoundException('Signature record not found');
    }

    await this.prisma.documentSignature.delete({
      where: { id: signatureRecordId },
    });

    return { message: 'Signature removed' };
  }

  /**
   * Preview the next document number without incrementing the sequence.
   * Format: DD/MM for first of the day, DD/MM-2, DD/MM-3, etc. for subsequent.
   */
  async previewNextDocumentNumber(companyId: string): Promise<string> {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const base = `${dd}/${mm}`;

    // Check if the base number (DD/MM) is already taken
    const baseExists = await this.prisma.document.findFirst({
      where: { companyId, documentNumber: base },
      select: { id: true },
    });

    if (!baseExists) {
      return base;
    }

    // Find all documents with DD/MM-N suffix pattern
    const suffixed = await this.prisma.document.findMany({
      where: {
        companyId,
        documentNumber: { startsWith: `${base}-` },
      },
      select: { documentNumber: true },
    });

    let maxSuffix = 1; // base already exists, counts as 1
    for (const doc of suffixed) {
      const suffixStr = doc.documentNumber?.replace(`${base}-`, '') ?? '';
      const num = parseInt(suffixStr, 10);
      if (!isNaN(num) && num > maxSuffix) {
        maxSuffix = num;
      }
    }

    return `${base}-${maxSuffix + 1}`;
  }

  /**
   * Check if a document number is available for a company.
   */
  async checkDocumentNumber(
    companyId: string,
    documentNumber: string,
  ): Promise<{ available: boolean }> {
    const existing = await this.prisma.document.findFirst({
      where: { companyId, documentNumber },
      select: { id: true },
    });
    return { available: !existing };
  }

  /**
   * Increment the original document number for duplication.
   * For date-based numbers (DD/MM or DD/MM-N), generates a fresh number for today.
   * For legacy numbers, parses trailing digits and increments them.
   */
  private async incrementDocumentNumber(
    tx: Prisma.TransactionClient,
    companyId: string,
    originalNumber: string,
    year: number,
  ): Promise<string> {
    // Date-based format (DD/MM or DD/MM-N) → generate fresh for today
    if (/^\d{2}\/\d{2}(-\d+)?$/.test(originalNumber)) {
      return this.nextDocumentNumber(tx, companyId, year);
    }

    // Legacy: Match trailing digits (e.g. "DOC-2026-00001" → prefix="DOC-2026-", digits="00001")
    const match = originalNumber.match(/^(.*?)(\d+)$/);
    if (!match) {
      return this.nextDocumentNumber(tx, companyId, year);
    }

    const [, prefix, digits] = match;
    const padLength = digits.length;
    let nextNum = parseInt(digits, 10) + 1;

    // Keep incrementing until we find an available number
    for (let attempt = 0; attempt < 100; attempt++) {
      const candidate = `${prefix}${String(nextNum).padStart(padLength, '0')}`;
      const existing = await tx.document.findFirst({
        where: { companyId, documentNumber: candidate },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
      nextNum++;
    }

    // Exhausted attempts, fall back to auto-generated number
    return this.nextDocumentNumber(tx, companyId, year);
  }

  /**
   * Generate the next unique document number.
   * Format: DD/MM for first of the day, DD/MM-2, DD/MM-3, etc. for subsequent.
   */
  private async nextDocumentNumber(
    tx: Prisma.TransactionClient,
    companyId: string,
    _year: number,
  ): Promise<string> {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const base = `${dd}/${mm}`;

    // Check if the base number (DD/MM) is already taken
    const baseExists = await tx.document.findFirst({
      where: { companyId, documentNumber: base },
      select: { id: true },
    });

    if (!baseExists) {
      return base;
    }

    // Find all documents with DD/MM-N suffix pattern
    const suffixed = await tx.document.findMany({
      where: {
        companyId,
        documentNumber: { startsWith: `${base}-` },
      },
      select: { documentNumber: true },
    });

    let maxSuffix = 1; // base already exists, counts as 1
    for (const doc of suffixed) {
      const suffixStr = doc.documentNumber?.replace(`${base}-`, '') ?? '';
      const num = parseInt(suffixStr, 10);
      if (!isNaN(num) && num > maxSuffix) {
        maxSuffix = num;
      }
    }

    return `${base}-${maxSuffix + 1}`;
  }

  async getDashboardStats(userId: string) {
    // Get all companies the user belongs to
    const memberships = await this.prisma.membership.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { companyId: true },
    });
    const companyIds = memberships.map((m) => m.companyId);

    if (companyIds.length === 0) {
      return { total: 0, byStatus: {}, recentDocuments: [] };
    }

    // Count documents by status
    const docs = await this.prisma.document.groupBy({
      by: ['status'],
      where: { companyId: { in: companyIds } },
      _count: { id: true },
    });

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const d of docs) {
      byStatus[d.status] = d._count.id;
      total += d._count.id;
    }

    // Get 10 most recent documents
    const recentDocuments = await this.prisma.document.findMany({
      where: { companyId: { in: companyIds } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        ...DOCUMENT_INCLUDES_LEAN,
        company: { select: { id: true, name: true } },
      },
    });

    return { total, byStatus, recentDocuments };
  }

  // ────────────────────────────────────────────
  // STATUS TRANSITIONS
  // ────────────────────────────────────────────

  /**
   * Transition a document to a new status with validation.
   */
  async updateStatus(id: string, newStatus: DocumentStatus, userId: string) {
    const doc = await this.findById(id, userId);
    const currentStatus = doc.status;
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }

    const data: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'SENT') data.sentAt = new Date();
    if (newStatus === 'VIEWED') data.viewedAt = new Date();
    if (newStatus === 'PAID') data.paidAt = new Date();
    if (newStatus === 'COMPLETED') data.completedAt = new Date();

    const updated = await this.prisma.document.update({
      where: { id },
      data,
      include: DOCUMENT_INCLUDES_FULL,
    });

    await this.audit.log({
      action: 'UPDATE',
      entity: 'Document',
      entityId: id,
      userId,
      companyId: doc.companyId,
      details: {
        statusChange: { from: currentStatus, to: newStatus },
      },
    });

    return updated;
  }

  // ────────────────────────────────────────────
  // OVERDUE CRON
  // ────────────────────────────────────────────

  /**
   * Daily cron at 1 AM: mark overdue documents.
   */
  @Cron('0 1 * * *')
  async handleOverdueCron() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    try {
      const overdueDocuments = await this.prisma.document.findMany({
        where: {
          dueDate: { lt: now },
          status: { in: ['SENT', 'VIEWED'] },
        },
        select: { id: true, companyId: true },
      });

      if (overdueDocuments.length === 0) return;

      await this.prisma.document.updateMany({
        where: {
          id: { in: overdueDocuments.map((d) => d.id) },
        },
        data: { status: 'OVERDUE' },
      });

      // Log each overdue transition
      for (const doc of overdueDocuments) {
        await this.audit.log({
          action: 'UPDATE',
          entity: 'Document',
          entityId: doc.id,
          companyId: doc.companyId,
          details: { statusChange: { from: 'auto', to: 'OVERDUE' }, reason: 'past_due_date' },
        });
      }

      this.logger.log(`Marked ${overdueDocuments.length} documents as OVERDUE`);
    } catch (err) {
      this.logger.error('Failed to process overdue documents:', err);
    }
  }

  // ────────────────────────────────────────────
  // ANALYTICS
  // ────────────────────────────────────────────

  /**
   * Get analytics data for the user's documents.
   */
  async getAnalytics(
    userId: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      companyIds?: string[];
      statuses?: DocumentStatus[];
      currencies?: string[];
      vehiclePlates?: string[];
      trailerPlates?: string[];
      buyerIds?: string[];
    },
  ) {
    // Get all companies the user belongs to
    const memberships = await this.prisma.membership.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { companyId: true, company: { select: { id: true, name: true, baseCurrency: true } } },
    });

    let companyIds = memberships.map((m) => m.companyId);

    // Filter by specific companies if provided
    if (filters?.companyIds?.length) {
      companyIds = companyIds.filter((id) => filters.companyIds!.includes(id));
    }

    if (companyIds.length === 0) {
      return {
        totalDocuments: 0,
        totalAmount: 0,
        totalBaseCurrencyAmount: 0,
        baseCurrency: 'GEL',
        paidCount: 0,
        unpaidCount: 0,
        overdueCount: 0,
        byStatus: {},
        byMonth: [],
        byCompany: [],
        byCurrency: [],
        documents: [],
      };
    }

    // Determine the primary base currency (from first company or most common)
    const primaryBaseCurrency =
      memberships.find((m) => companyIds.includes(m.companyId))?.company?.baseCurrency || 'GEL';

    // Build where clause
    const where: Prisma.DocumentWhereInput = {
      companyId: { in: companyIds },
    };

    if (filters?.statuses?.length) {
      where.status = { in: filters.statuses };
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters?.dateFrom) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filters.dateFrom);
      }
      if (filters?.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        (where.createdAt as Prisma.DateTimeFilter).lte = endDate;
      }
    }

    if (filters?.buyerIds?.length) {
      where.buyerId = { in: filters.buyerIds };
    }

    // Fetch all matching documents
    const documents = await this.prisma.document.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        buyer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by currencies if provided
    let filteredDocs = documents;
    if (filters?.currencies?.length) {
      filteredDocs = filteredDocs.filter((doc) => {
        const inputData = doc.inputData as Record<string, unknown>;
        const currency = (inputData?.currency as string) || 'GEL';
        return filters.currencies!.includes(currency);
      });
    }

    // Filter by vehicle plates if provided
    if (filters?.vehiclePlates?.length) {
      filteredDocs = filteredDocs.filter((doc) => {
        const inputData = doc.inputData as Record<string, unknown>;
        const vehiclePlate = (inputData?.vehiclePlate as string) || '';
        return filters.vehiclePlates!.includes(vehiclePlate);
      });
    }

    // Filter by trailer plates if provided
    if (filters?.trailerPlates?.length) {
      filteredDocs = filteredDocs.filter((doc) => {
        const inputData = doc.inputData as Record<string, unknown>;
        const trailerPlate = (inputData?.trailerPlate as string) || '';
        return filters.trailerPlates!.includes(trailerPlate);
      });
    }

    // Aggregate stats
    let totalAmount = 0;
    let totalBaseCurrencyAmount = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let overdueCount = 0;
    const byStatus: Record<string, number> = {};
    const byMonthMap: Record<string, { count: number; amount: number; baseCurrencyAmount: number }> = {};
    const byCompanyMap: Record<string, { companyName: string; count: number; amount: number; baseCurrencyAmount: number }> = {};
    const byCurrencyMap: Record<string, { count: number; amount: number }> = {};
    const analyticsDocuments: Array<{
      id: string;
      documentNumber?: string;
      createdAt: string;
      companyId: string;
      companyName: string;
      buyerName?: string;
      status: string;
      currency: string;
      amount: number;
      baseCurrency?: string;
      baseCurrencyAmount?: number;
      exchangeRate?: number;
    }> = [];

    for (const doc of filteredDocs) {
      const inputData = doc.inputData as Record<string, unknown>;
      const currency = (inputData?.currency as string) || 'GEL';
      const amount = Number(inputData?.total) || 0;
      const baseCurrencyAmt = doc.baseCurrencyAmount || amount;

      totalAmount += amount;
      totalBaseCurrencyAmount += baseCurrencyAmt;

      // Status counts
      byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
      if (doc.status === 'PAID') paidCount++;
      if (doc.status === 'OVERDUE') overdueCount++;
      if (['DRAFT', 'SENT', 'VIEWED', 'PENDING_SIGNATURE', 'SIGNED'].includes(doc.status)) unpaidCount++;

      // Monthly aggregation
      const monthKey = `${doc.createdAt.getFullYear()}-${String(doc.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonthMap[monthKey]) byMonthMap[monthKey] = { count: 0, amount: 0, baseCurrencyAmount: 0 };
      byMonthMap[monthKey].count++;
      byMonthMap[monthKey].amount += amount;
      byMonthMap[monthKey].baseCurrencyAmount += baseCurrencyAmt;

      // Company aggregation
      const compId = doc.companyId;
      if (!byCompanyMap[compId]) byCompanyMap[compId] = { companyName: doc.company?.name || '', count: 0, amount: 0, baseCurrencyAmount: 0 };
      byCompanyMap[compId].count++;
      byCompanyMap[compId].amount += amount;
      byCompanyMap[compId].baseCurrencyAmount += baseCurrencyAmt;

      // Currency aggregation
      if (!byCurrencyMap[currency]) byCurrencyMap[currency] = { count: 0, amount: 0 };
      byCurrencyMap[currency].count++;
      byCurrencyMap[currency].amount += amount;

      // Individual document
      analyticsDocuments.push({
        id: doc.id,
        documentNumber: doc.documentNumber || undefined,
        createdAt: doc.createdAt.toISOString(),
        companyId: doc.companyId,
        companyName: doc.company?.name || '',
        buyerName: (doc.buyer as { name?: string })?.name || undefined,
        status: doc.status,
        currency,
        amount,
        baseCurrency: doc.baseCurrency || undefined,
        baseCurrencyAmount: doc.baseCurrencyAmount || undefined,
        exchangeRate: doc.exchangeRate || undefined,
      });
    }

    // Convert maps to arrays
    const byMonth = Object.entries(byMonthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const byCompany = Object.entries(byCompanyMap).map(([companyId, data]) => ({
      companyId,
      ...data,
    }));

    const byCurrency = Object.entries(byCurrencyMap).map(([currency, data]) => ({
      currency,
      ...data,
    }));

    return {
      totalDocuments: filteredDocs.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalBaseCurrencyAmount: Math.round(totalBaseCurrencyAmount * 100) / 100,
      baseCurrency: primaryBaseCurrency,
      paidCount,
      unpaidCount,
      overdueCount,
      byStatus,
      byMonth,
      byCompany,
      byCurrency,
      documents: analyticsDocuments,
    };
  }
}
