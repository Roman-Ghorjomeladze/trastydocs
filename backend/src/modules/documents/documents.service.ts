import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
   */
  async findById(id: string) {
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

    return doc;
  }

  /**
   * Update a document.
   */
  async update(id: string, dto: UpdateDocumentDto, userId: string) {
    await this.findById(id);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.buyerId !== undefined) data.buyerId = dto.buyerId;
    if (dto.sellerId !== undefined) data.sellerId = dto.sellerId;
    if (dto.inputData !== undefined)
      data.inputData = dto.inputData as Prisma.InputJsonValue;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'COMPLETED') data.completedAt = new Date();
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
    const doc = await this.findById(id);

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
   * Send a document to a recipient via email.
   */
  async send(id: string, dto: SendDocumentDto, userId: string) {
    const doc = await this.findById(id);

    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const documentUrl =
      doc.pdfUrl || `${process.env.FRONTEND_URL || ''}/documents/${id}`;

    await this.mail.sendDocumentEmail(
      dto.recipientEmail,
      sender?.name || 'Someone',
      doc.name,
      documentUrl,
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

    const original = await this.findById(id);
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
    const doc = await this.findById(id);

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
    const doc = await this.findById(documentId);

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
   */
  async previewNextDocumentNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DOC-${year}-`;

    const lastDoc = await this.prisma.document.findFirst({
      where: {
        companyId,
        documentNumber: { startsWith: prefix },
      },
      orderBy: { documentNumber: 'desc' },
      select: { documentNumber: true },
    });

    const lastCounter = lastDoc?.documentNumber
      ? parseInt(lastDoc.documentNumber.replace(prefix, ''), 10) || 0
      : 0;

    // Also check the sequence table for its current value
    const seq = await this.prisma.documentSequence.findUnique({
      where: {
        companyId_prefix_year: {
          companyId,
          prefix: 'DOC',
          year,
        },
      },
      select: { counter: true },
    });

    const nextCounter = Math.max((seq?.counter ?? 0) + 1, lastCounter + 1);
    return `DOC-${year}-${String(nextCounter).padStart(5, '0')}`;
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
   * Parses the trailing numeric part, increments it, preserves zero-padding and prefix.
   * Falls back to nextDocumentNumber if the original has no numeric suffix.
   */
  private async incrementDocumentNumber(
    tx: Prisma.TransactionClient,
    companyId: string,
    originalNumber: string,
    year: number,
  ): Promise<string> {
    // Match trailing digits (e.g. "DOC-2026-00001" → prefix="DOC-2026-", digits="00001")
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
   * Generate the next unique document number, handling out-of-sync sequences.
   */
  private async nextDocumentNumber(
    tx: Prisma.TransactionClient,
    companyId: string,
    year: number,
  ): Promise<string> {
    const prefix = `DOC-${year}-`;

    // Find the highest existing document number for this company/year
    const lastDoc = await tx.document.findFirst({
      where: {
        companyId,
        documentNumber: { startsWith: prefix },
      },
      orderBy: { documentNumber: 'desc' },
      select: { documentNumber: true },
    });

    const lastCounter = lastDoc?.documentNumber
      ? parseInt(lastDoc.documentNumber.replace(prefix, ''), 10) || 0
      : 0;

    // Upsert the sequence
    const seq = await tx.documentSequence.upsert({
      where: {
        companyId_prefix_year: {
          companyId,
          prefix: 'DOC',
          year,
        },
      },
      create: { companyId, prefix: 'DOC', year, counter: lastCounter + 1 },
      update: { counter: { increment: 1 } },
    });

    // Use whichever is higher: the sequence counter or lastCounter + 1
    const nextCounter = Math.max(seq.counter, lastCounter + 1);

    // Keep the sequence in sync if it fell behind
    if (seq.counter < nextCounter) {
      await tx.documentSequence.update({
        where: { id: seq.id },
        data: { counter: nextCounter },
      });
    }

    return `DOC-${year}-${String(nextCounter).padStart(5, '0')}`;
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
}
