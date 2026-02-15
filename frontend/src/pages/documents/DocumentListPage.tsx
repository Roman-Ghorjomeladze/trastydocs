import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../../stores/document.store.ts';
import { useContactStore } from '../../stores/contact.store.ts';
import { getNextDocumentNumber, checkDocumentNumber } from '../../api/documents.ts';
import { useDebounce } from '../../hooks/use-debounce.ts';
import { ROUTES, STATUS_COLORS } from '../../lib/constants.ts';
import { cn } from '../../lib/utils.ts';
import type { DocumentStatus, Contact, DocumentType } from '../../types/index.ts';

const STATUS_TABS: (DocumentStatus | 'ALL')[] = [
  'ALL',
  'DRAFT',
  'PENDING_SIGNATURE',
  'SIGNED',
  'COMPLETED',
  'CANCELLED',
];

export function DocumentListPage() {
  const { t } = useTranslation();
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const {
    documents,
    isLoading,
    fetchDocuments,
    createDocument,
    deleteDocument,
    duplicateDocument,
  } = useDocumentStore();
  const { contacts, fetchContacts } = useContactStore();
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('invoice');
  const [isCreating, setIsCreating] = useState(false);
  const [docNumber, setDocNumber] = useState('');
  const [docNumberError, setDocNumberError] = useState('');
  const [isCheckingNumber, setIsCheckingNumber] = useState(false);
  const debouncedDocNumber = useDebounce(docNumber, 400);

  useEffect(() => {
    if (companyId) {
      fetchDocuments(
        companyId,
        statusFilter === 'ALL' ? undefined : statusFilter,
        debouncedSearch.trim() || undefined,
      );
    }
  }, [companyId, statusFilter, debouncedSearch, fetchDocuments]);

  useEffect(() => {
    if (companyId && showCreateModal) {
      fetchContacts(companyId);
      // Pre-fill with next auto-generated number
      getNextDocumentNumber(companyId)
        .then((num) => {
          setDocNumber(num);
          setDocNumberError('');
        })
        .catch(() => {
          // silently ignore
        });
    }
  }, [companyId, showCreateModal, fetchContacts]);

  // Debounced document number validation
  useEffect(() => {
    if (!companyId || !debouncedDocNumber.trim() || !showCreateModal) {
      setDocNumberError('');
      return;
    }
    let cancelled = false;
    setIsCheckingNumber(true);
    checkDocumentNumber(companyId, debouncedDocNumber.trim())
      .then((available) => {
        if (!cancelled) {
          setDocNumberError(available ? '' : t('documents.numberInUse'));
          setIsCheckingNumber(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsCheckingNumber(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, debouncedDocNumber, showCreateModal]);

  const handleCreate = async () => {
    if (!companyId || !newDocName.trim()) return;
    setIsCreating(true);
    try {
      const doc = await createDocument(companyId, {
        name: newDocName.trim(),
        documentNumber: docNumber.trim() || undefined,
        buyerId: selectedBuyerId || undefined,
        sellerId: selectedSellerId || undefined,
        inputData: { documentType: selectedDocType },
      });
      setShowCreateModal(false);
      setNewDocName('');
      setSelectedBuyerId('');
      setSelectedSellerId('');
      setSelectedDocType('invoice');
      setDocNumber('');
      setDocNumberError('');
      navigate(ROUTES.DOCUMENT_DETAIL(companyId, doc.id));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    await duplicateDocument(id);
  };

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const buyers = contacts.filter((c: Contact) => c.type === 'BUYER' && c.isActive);
  const sellers = contacts.filter((c: Contact) => c.type === 'SELLER' && c.isActive);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('documents.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('documents.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          {t('documents.create')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('documents.searchPlaceholder')}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          style={{ maxWidth: '434px' }}
        />
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              statusFilter === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'ALL' ? t('documents.all') : t(`status.${tab}`)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && documents.length === 0 && (
        <div className="text-center py-12 bg-muted rounded-lg">
          <p className="text-muted-foreground">{t('documents.noDocuments')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('documents.createFirst')}</p>
        </div>
      )}

      {/* Documents Table */}
      {!isLoading && documents.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t('documents.number')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t('documents.name')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t('documents.status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t('documents.date')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                  {t('documents.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-muted cursor-pointer"
                  onClick={() => navigate(ROUTES.DOCUMENT_DETAIL(companyId!, doc.id))}
                >
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                    {doc.documentNumber || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{doc.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        STATUS_COLORS[doc.status] || 'bg-gray-100 text-gray-800',
                      )}
                    >
                      {t(`status.${doc.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleDuplicate(doc.id)}
                        className="text-xs text-accent hover:text-accent-hover"
                      >
                        {t('documents.duplicate')}
                      </button>
                      {doc.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="text-xs text-danger hover:text-danger-hover"
                        >
                          {t('documents.cancel')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('documents.create')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('documents.docType')}
                </label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                >
                  <option value="invoice">{t('documents.invoice')}</option>
                  <option value="transport_invoice">{t('documents.transportInvoice')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('documents.number')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder={t('documents.numberPlaceholder')}
                    className={cn(
                      'w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-accent focus:border-accent outline-none',
                      docNumberError
                        ? 'border-danger focus:ring-danger focus:border-danger'
                        : 'border-border',
                    )}
                  />
                  {isCheckingNumber && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {docNumberError && <p className="mt-1 text-xs text-danger">{docNumberError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('documents.name')} *
                </label>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder={t('documents.namePlaceholder')}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('documents.buyer')} {t('common.optional')}
                </label>
                <select
                  value={selectedBuyerId}
                  onChange={(e) => setSelectedBuyerId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                >
                  <option value="">{t('documents.none')}</option>
                  {buyers.map((c: Contact) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('documents.seller')} {t('common.optional')}
                </label>
                <select
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                >
                  <option value="">{t('documents.none')}</option>
                  {sellers.map((c: Contact) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newDocName.trim() || isCreating || !!docNumberError || isCheckingNumber}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
