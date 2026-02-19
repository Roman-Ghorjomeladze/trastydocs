import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../../stores/document.store.ts';
import { useCompanyStore } from '../../stores/company.store.ts';
import { useVehicleStore } from '../../stores/vehicle.store.ts';
import { useSignatureStore } from '../../stores/signature.store.ts';
import { useStampStore } from '../../stores/stamp.store.ts';
import { useCompanySignatureStore } from '../../stores/company-signature.store.ts';
import { ROUTES } from '../../lib/constants.ts';
import {
  createEmptyInvoiceData,
  calculateTotals,
  populateFromContractor,
  isInvoiceData,
} from '../../lib/invoice-utils.ts';
import { getCompany } from '../../api/companies.ts';
import { getContractor } from '../../api/contractors.ts';
import { getInvoiceLabels } from '../../lib/invoice-i18n.ts';
import type { InvoiceLanguage } from '../../lib/invoice-i18n.ts';
import { exportInvoicePdf } from '../../lib/pdf-export.ts';
import type { InvoiceData, InvoiceLineItem, Document, SignatureAsset } from '../../types/index.ts';
import { InvoiceHeaderSection } from './builder/InvoiceHeaderSection.tsx';
import { CompanyInfoSection } from './builder/CompanyInfoSection.tsx';
import { BuyerInfoSection } from './builder/BuyerInfoSection.tsx';
import { LineItemsSection } from './builder/LineItemsSection.tsx';
import { TotalsSection } from './builder/TotalsSection.tsx';
import { NotesSection } from './builder/NotesSection.tsx';
import { TransportInfoSection } from './builder/TransportInfoSection.tsx';
import { SignatureStampSection } from './builder/SignatureStampSection.tsx';

const AUTO_SAVE_DELAY = 2000;

interface SectionDef {
  id: string;
  label: string;
}

export function DocumentBuilderPage() {
  const { t } = useTranslation();
  const { companyId, documentId } = useParams<{
    companyId: string;
    documentId: string;
  }>();
  const navigate = useNavigate();
  const { fetchDocument, updateDocument, uploadPdf } = useDocumentStore();
  const { activeCompany } = useCompanyStore();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const { signatures, fetchSignatures } = useSignatureStore();
  const { stamps, fetchStamps } = useStampStore();
  const { companySignatures, fetchCompanySignatures } = useCompanySignatureStore();

  const [doc, setDoc] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(
    createEmptyInvoiceData(),
  );
  const [activeSection, setActiveSection] = useState<string>('header');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBankAccountIds, setSelectedBankAccountIds] = useState<string[]>([]);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Compute i18n labels from language
  const labels = useMemo(
    () => getInvoiceLabels((invoiceData.language || 'en') as InvoiceLanguage),
    [invoiceData.language],
  );

  // Build dynamic sections based on document type
  const sections: SectionDef[] = useMemo(() => {
    const base: SectionDef[] = [
      { id: 'header', label: labels.invoice },
      { id: 'company', label: labels.companySeller },
      { id: 'buyer', label: labels.buyerClient },
    ];

    if (invoiceData.documentType === 'transport_invoice') {
      base.push({ id: 'transport', label: labels.transportInfo });
    }

    base.push(
      { id: 'items', label: labels.lineItems },
      { id: 'totals', label: labels.totals },
      { id: 'notes', label: labels.notesAndTerms },
      { id: 'signature', label: labels.signatureAndStamp },
    );

    return base;
  }, [invoiceData.documentType, labels]);

  // Filter vehicles into trucks and trailers
  const trucks = useMemo(
    () => vehicles.filter((v) => v.type === 'TRUCK'),
    [vehicles],
  );
  const trailers = useMemo(
    () => vehicles.filter((v) => v.type === 'TRAILER'),
    [vehicles],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // Merge personal + company signatures for the picker
  const allSignatures: SignatureAsset[] = useMemo(() => {
    const personal = signatures.map((s) => s);
    const company = companySignatures.map((cs) => ({
      id: cs.id,
      userId: cs.userId,
      name: `[${t('companySignatures.company')}] ${cs.name}`,
      imageUrl: cs.imageUrl,
      isDefault: cs.isDefault,
      createdAt: cs.createdAt,
      updatedAt: cs.updatedAt,
    }));
    return [...personal, ...company];
  }, [signatures, companySignatures, t]);

  // Fetch vehicles, signatures, stamps on mount
  useEffect(() => {
    if (companyId) {
      fetchVehicles(companyId);
      fetchStamps(companyId);
      fetchCompanySignatures(companyId);
    }
    fetchSignatures();
  }, [companyId, fetchVehicles, fetchStamps, fetchCompanySignatures, fetchSignatures]);

  // Load document and hydrate invoice data
  useEffect(() => {
    if (!documentId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const store = useDocumentStore.getState();
        await store.fetchDocument(documentId);
        const loaded = useDocumentStore.getState().currentDocument;
        if (!loaded) return;

        setDoc(loaded);

        // Hydrate invoice data
        let data: InvoiceData;
        if (isInvoiceData(loaded.inputData)) {
          data = loaded.inputData as unknown as InvoiceData;
        } else {
          data = createEmptyInvoiceData();
          // Preserve documentType from creation (e.g. transport_invoice)
          const raw = loaded.inputData as Record<string, unknown> | null;
          if (raw?.documentType === 'transport_invoice') {
            data.documentType = 'transport_invoice';
            data.currency = 'GEL';
          }
        }

        // Auto-fill from document number
        if (loaded.documentNumber && !data.invoiceNumber) {
          data = { ...data, invoiceNumber: loaded.documentNumber };
        }

        // Resolve current document language for translations
        const docLang = data.language || 'en';

        // Auto-fill from buyer contact (using translated name/address)
        if (loaded.buyer) {
          data = populateFromContractor(data, loaded.buyer, 'buyer', docLang);
        }

        // Always populate seller from the active company (using translated name/address)
        if (activeCompany) {
          // Auto-select default bank account(s)
          const companyBanks = activeCompany.bankAccounts ?? [];
          const defaultBanks = companyBanks.filter((ba) => ba.isDefault);
          const defaultIds = defaultBanks.map((ba) => ba.id);
          const bankStr = defaultBanks
            .map((ba) => `${ba.bankName}: ${ba.accountNumber}`)
            .join('\n');

          // Resolve translated company name & address
          const nameTranslations = activeCompany.nameTranslations as Record<string, string> | undefined;
          const addressTranslations = activeCompany.addressTranslations as Record<string, string> | undefined;
          const companyName = nameTranslations?.[docLang] || activeCompany.name || '';
          const companyAddress = addressTranslations?.[docLang] || activeCompany.address || '';

          data = {
            ...data,
            companyName,
            companyAddress,
            companyTaxId: activeCompany.taxId || '',
            companyPhone: activeCompany.phone || '',
            companyEmail: activeCompany.email || '',
            companyBankAccounts: data.companyBankAccounts || bankStr,
          };

          // Only set default selection if no bank accounts are already in the data
          if (!data.companyBankAccounts || data.companyBankAccounts === bankStr) {
            setSelectedBankAccountIds(defaultIds);
          }
        }

        // Recalculate totals
        const totals = calculateTotals(data);
        data = { ...data, ...totals };

        setInvoiceData(data);
      } catch {
        // error loading
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [documentId, fetchDocument, activeCompany]);

  // IntersectionObserver for active section highlight
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      {
        root: container,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      },
    );

    for (const section of sections) {
      const el = sectionRefs.current[section.id];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [isLoading, sections]);

  // Auto-save handler — saves inputData AND regenerates PDF silently
  const saveToServer = useCallback(
    async (data: InvoiceData) => {
      if (!documentId) return;
      try {
        setIsSaving(true);
        await updateDocument(documentId, {
          inputData: data as unknown as Record<string, unknown>,
        });
        setHasUnsavedChanges(false);
        setLastSaved(new Date());

        // Silently regenerate and upload PDF so preview stays in sync
        try {
          const pdfBytes = await exportInvoicePdf(data);
          const base64 = btoa(
            Array.from(pdfBytes)
              .map((b) => String.fromCharCode(b))
              .join(''),
          );
          await uploadPdf(documentId, base64);
        } catch (pdfErr) {
          console.error('[Auto-save] PDF regeneration failed:', pdfErr);
        }
      } catch {
        // silently handle auto-save failure
      } finally {
        setIsSaving(false);
      }
    },
    [documentId, updateDocument, uploadPdf],
  );

  // Field change handler with auto-save
  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      setInvoiceData((prev) => {
        let next = { ...prev, [field]: value };

        // When language changes, re-populate translated name/address for seller & buyer
        if (field === 'language') {
          const newLang = value;

          // Re-populate seller (company) name & address from translations
          if (activeCompany) {
            const nameT = activeCompany.nameTranslations as Record<string, string> | undefined;
            const addrT = activeCompany.addressTranslations as Record<string, string> | undefined;
            next.companyName = nameT?.[newLang] || activeCompany.name || '';
            next.companyAddress = addrT?.[newLang] || activeCompany.address || '';
          }

          // Re-populate buyer name & address from translations
          if (doc?.buyer) {
            const buyer = doc.buyer;
            const nameT = buyer.nameTranslations as Record<string, string> | undefined;
            const addrT = buyer.addressTranslations as Record<string, string> | undefined;
            next.buyerName = nameT?.[newLang] || buyer.name || '';
            next.buyerAddress = addrT?.[newLang] || buyer.address || '';
          }
        }

        const totals = calculateTotals(next);
        const updated = { ...next, ...totals };

        setHasUnsavedChanges(true);

        // Debounced auto-save
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          saveToServer(updated);
        }, AUTO_SAVE_DELAY);

        return updated;
      });
    },
    [saveToServer, activeCompany, doc],
  );

  // Line items change handler
  const handleItemsChange = useCallback(
    (items: InvoiceLineItem[]) => {
      setInvoiceData((prev) => {
        const next = { ...prev, items };
        const totals = calculateTotals(next);
        const updated = { ...next, ...totals };

        setHasUnsavedChanges(true);

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          saveToServer(updated);
        }, AUTO_SAVE_DELAY);

        return updated;
      });
    },
    [saveToServer],
  );

  // Tax rate change
  const handleTaxRateChange = useCallback(
    (rate: number) => {
      setInvoiceData((prev) => {
        const next = { ...prev, taxRate: rate };
        const totals = calculateTotals(next);
        const updated = { ...next, ...totals };

        setHasUnsavedChanges(true);

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          saveToServer(updated);
        }, AUTO_SAVE_DELAY);

        return updated;
      });
    },
    [saveToServer],
  );


  // Bank account toggle handler
  const handleBankAccountToggle = useCallback(
    (bankId: string) => {
      setSelectedBankAccountIds((prev) => {
        const next = prev.includes(bankId)
          ? prev.filter((id) => id !== bankId)
          : [...prev, bankId];

        // Serialize selected bank accounts into the companyBankAccounts string
        const companyBanks = activeCompany?.bankAccounts ?? [];
        const bankStr = next
          .map((id) => companyBanks.find((ba) => ba.id === id))
          .filter(Boolean)
          .map((ba) => `${ba!.bankName}: ${ba!.accountNumber}`)
          .join('\n');

        // Update invoice data with the serialized bank accounts
        setInvoiceData((prevData) => {
          const updated = { ...prevData, companyBankAccounts: bankStr };

          setHasUnsavedChanges(true);
          if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = setTimeout(() => {
            saveToServer(updated);
          }, AUTO_SAVE_DELAY);

          return updated;
        });

        return next;
      });
    },
    [activeCompany, saveToServer],
  );

  // Auto-fill from buyer contact (with language-aware translations)
  const handleAutoFillBuyer = useCallback(() => {
    if (!doc?.buyer) return;
    setInvoiceData((prev) => {
      const updated = populateFromContractor(
        {
          ...prev,
          buyerName: '',
          buyerAddress: '',
          buyerTaxId: '',
          buyerPhone: '',
          buyerEmail: '',
          buyerBankAccounts: '',
        },
        doc.buyer!,
        'buyer',
        prev.language || 'en',
      );

      setHasUnsavedChanges(true);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        saveToServer(updated);
      }, AUTO_SAVE_DELAY);

      return updated;
    });
  }, [doc, saveToServer]);

  // Resync company data from settings (fetches latest from server)
  const handleResyncCompany = useCallback(async () => {
    if (!activeCompany?.id) return;
    try {
      const freshCompany = await getCompany(activeCompany.id);
      const docLang = invoiceData.language || 'en';
      const nameT = freshCompany.nameTranslations as Record<string, string> | undefined;
      const addrT = freshCompany.addressTranslations as Record<string, string> | undefined;
      const companyName = nameT?.[docLang] || freshCompany.name || '';
      const companyAddress = addrT?.[docLang] || freshCompany.address || '';

      // Re-resolve bank accounts
      const companyBanks = freshCompany.bankAccounts ?? [];
      const defaultBanks = companyBanks.filter((ba) => ba.isDefault);
      const defaultIds = defaultBanks.map((ba) => ba.id);
      const bankStr = defaultBanks
        .map((ba) => `${ba.bankName}: ${ba.accountNumber}`)
        .join('\n');

      setSelectedBankAccountIds(defaultIds);

      setInvoiceData((prev) => {
        const updated = {
          ...prev,
          companyName,
          companyAddress,
          companyTaxId: freshCompany.taxId || '',
          companyPhone: freshCompany.phone || '',
          companyEmail: freshCompany.email || '',
          companyBankAccounts: bankStr,
        };

        setHasUnsavedChanges(true);
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          saveToServer(updated);
        }, AUTO_SAVE_DELAY);

        return updated;
      });

      // Update the company in the store so subsequent operations use fresh data
      useCompanyStore.getState().updateCompany(activeCompany.id, {});
    } catch (err) {
      console.error('Failed to resync company data:', err);
    }
  }, [activeCompany?.id, invoiceData.language, saveToServer]);

  // Resync buyer data from settings (fetches latest from server)
  const handleResyncBuyer = useCallback(async () => {
    if (!doc?.buyer?.id || !companyId) return;
    try {
      const freshBuyer = await getContractor(companyId, doc.buyer.id);
      setInvoiceData((prev) => {
        const updated = populateFromContractor(
          {
            ...prev,
            buyerName: '',
            buyerAddress: '',
            buyerTaxId: '',
            buyerPhone: '',
            buyerEmail: '',
            buyerBankAccounts: '',
          },
          freshBuyer,
          'buyer',
          prev.language || 'en',
        );

        setHasUnsavedChanges(true);
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          saveToServer(updated);
        }, AUTO_SAVE_DELAY);

        return updated;
      });

      // Update doc.buyer so subsequent auto-fills use fresh data
      setDoc((prev) => prev ? { ...prev, buyer: freshBuyer } : prev);
    } catch (err) {
      console.error('Failed to resync buyer data:', err);
    }
  }, [doc?.buyer?.id, companyId, saveToServer]);

  // Manual save
  const handleManualSave = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    await saveToServer(invoiceData);
  };

  // Export PDF (default layout)
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      // Flush any pending auto-save so the server has the latest data
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // Save latest data to server first (ensures template, language etc. are persisted)
      if (documentId) {
        await updateDocument(documentId, {
          inputData: invoiceData as unknown as Record<string, unknown>,
        });
      }

      const pdfBytes = await exportInvoicePdf(invoiceData);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceData.invoiceNumber || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Upload generated PDF to server
      if (documentId) {
        const base64 = btoa(
          Array.from(pdfBytes)
            .map((b) => String.fromCharCode(b))
            .join(''),
        );
        await uploadPdf(documentId, base64);
      }

      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Section navigation
  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBack = () => {
    if (companyId && documentId) {
      navigate(ROUTES.DOCUMENT_DETAIL(companyId, documentId));
    } else if (companyId) {
      navigate(ROUTES.DOCUMENTS(companyId));
    } else {
      navigate(-1);
    }
  };

  const isTransport = invoiceData.documentType === 'transport_invoice';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t('common.noResults')}
        </h3>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 text-accent hover:text-accent-hover"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 bg-card border-b shadow-sm shrink-0 gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={handleBack}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
            title={t('documents.back')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-semibold text-foreground truncate">
              {invoiceData.invoiceNumber || doc.name}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {doc.documentNumber ? `${doc.documentNumber} · ` : ''}
              {isTransport ? labels.transportInvoice : labels.invoice}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {isSaving
              ? t('documents.saving')
              : hasUnsavedChanges
                ? t('documents.unsavedChanges')
                : lastSaved
                  ? `${t('documents.saved')} ${lastSaved.toLocaleTimeString()}`
                  : ''}
          </span>

          <button
            onClick={handleManualSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="px-2.5 md:px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? t('documents.saving') : t('common.save')}
          </button>

          {/* Export PDF button */}
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-2.5 md:px-4 py-1.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="hidden sm:inline">
              {isExporting ? t('documents.exporting') : t('documents.exportPdf')}
            </span>
          </button>
        </div>
      </div>

      {/* Main layout: sidebar + form */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: section navigation (desktop only) */}
        <div className="hidden md:block w-48 min-w-[160px] bg-muted border-r border-border py-4 shrink-0">
          <nav className="space-y-0.5 px-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: scrollable form */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-muted"
        >
          <div className="max-w-2xl mx-auto py-4 px-4 md:py-6 md:px-6 space-y-6">
            <div
              id="header"
              ref={(el) => {
                sectionRefs.current['header'] = el;
              }}
            >
              <h3 className="md:hidden text-sm font-semibold text-accent uppercase tracking-wider mb-3">
                {labels.invoice}
              </h3>
              <InvoiceHeaderSection
                data={invoiceData}
                labels={labels}
                onChange={handleFieldChange}
              />
            </div>

            <div
              id="company"
              ref={(el) => {
                sectionRefs.current['company'] = el;
              }}
            >
              <h3 className="md:hidden text-sm font-semibold text-accent uppercase tracking-wider mb-3 pt-2 border-t border-border">
                {labels.companySeller}
              </h3>
              <CompanyInfoSection
                data={invoiceData}
                labels={labels}
                onChange={handleFieldChange}
                bankAccounts={activeCompany?.bankAccounts}
                selectedBankAccountIds={selectedBankAccountIds}
                onBankAccountToggle={handleBankAccountToggle}
                onResync={handleResyncCompany}
              />
            </div>

            <div
              id="buyer"
              ref={(el) => {
                sectionRefs.current['buyer'] = el;
              }}
            >
              <h3 className="md:hidden text-sm font-semibold text-accent uppercase tracking-wider mb-3 pt-2 border-t border-border">
                {labels.buyerClient}
              </h3>
              <BuyerInfoSection
                data={invoiceData}
                labels={labels}
                onChange={handleFieldChange}
                onAutoFill={doc.buyer ? handleAutoFillBuyer : undefined}
                onResync={doc.buyer ? handleResyncBuyer : undefined}
              />
            </div>

            {isTransport && (
              <div
                id="transport"
                ref={(el) => {
                  sectionRefs.current['transport'] = el;
                }}
              >
                <h3 className="md:hidden text-sm font-semibold text-accent uppercase tracking-wider mb-3 pt-2 border-t border-border">
                  {labels.transportInfo}
                </h3>
                <TransportInfoSection
                  data={invoiceData}
                  labels={labels}
                  onChange={handleFieldChange}
                  trucks={trucks}
                  trailers={trailers}
                />
              </div>
            )}

            <div
              id="items"
              ref={(el) => {
                sectionRefs.current['items'] = el;
              }}
            >
              <h3 className="md:hidden text-sm font-semibold text-accent uppercase tracking-wider mb-3 pt-2 border-t border-border">
                {labels.lineItems}
              </h3>
              <LineItemsSection
                items={invoiceData.items}
                currency={invoiceData.currency}
                labels={labels}
                onChange={handleItemsChange}
              />
            </div>

            <div
              id="totals"
              ref={(el) => {
                sectionRefs.current['totals'] = el;
              }}
            >
              <h3 className="md:hidden text-sm font-semibold text-accent uppercase tracking-wider mb-3 pt-2 border-t border-border">
                {labels.totals}
              </h3>
              <TotalsSection
                subtotal={invoiceData.subtotal}
                taxRate={invoiceData.taxRate}
                taxAmount={invoiceData.taxAmount}
                total={invoiceData.total}
                currency={invoiceData.currency}
                labels={labels}
                onTaxRateChange={handleTaxRateChange}
              />
            </div>

            <div
              id="notes"
              ref={(el) => {
                sectionRefs.current['notes'] = el;
              }}
            >
              <h3 className="md:hidden text-sm font-semibold text-accent uppercase tracking-wider mb-3 pt-2 border-t border-border">
                {labels.notesAndTerms}
              </h3>
              <NotesSection
                notes={invoiceData.notes}
                paymentTerms={invoiceData.paymentTerms}
                labels={labels}
                onChange={handleFieldChange}
              />
            </div>

            <div
              id="signature"
              ref={(el) => {
                sectionRefs.current['signature'] = el;
              }}
            >
              <h3 className="md:hidden text-sm font-semibold text-accent uppercase tracking-wider mb-3 pt-2 border-t border-border">
                {labels.signatureAndStamp}
              </h3>
              <SignatureStampSection
                data={invoiceData}
                labels={labels}
                signatures={allSignatures}
                stamps={stamps}
                onChange={handleFieldChange}
              />
            </div>

            {/* Bottom spacer for scroll */}
            <div className="h-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
