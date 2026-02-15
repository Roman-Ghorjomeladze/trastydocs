import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Copy, Trash2, Ban, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useDocumentStore } from '../../stores/document.store.ts';
import { useContactStore } from '../../stores/contact.store.ts';
import { getNextDocumentNumber, checkDocumentNumber } from '../../api/documents.ts';
import { getContacts } from '../../api/contacts.ts';
import { useDebounce } from '../../hooks/use-debounce.ts';
import { ROUTES, STATUS_COLORS } from '../../lib/constants.ts';
import { cn } from '../../lib/utils.ts';
import { ConfirmModal } from '../../components/shared/ConfirmModal.tsx';
import { Tooltip } from '../../components/shared/Tooltip.tsx';
import { MultiSelect } from '../../components/shared/MultiSelect.tsx';
import type { MultiSelectOption } from '../../components/shared/MultiSelect.tsx';
import type { DocumentStatus, Contact, DocumentType } from '../../types/index.ts';

const ALL_STATUSES: DocumentStatus[] = [
  'DRAFT',
  'PENDING_SIGNATURE',
  'SIGNED',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
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
    updateDocument,
  } = useDocumentStore();
  const { contacts, fetchContacts } = useContactStore();

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [contractorFilters, setContractorFilters] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('invoice');
  const [isCreating, setIsCreating] = useState(false);
  const [docNumber, setDocNumber] = useState('');
  const [docNumberError, setDocNumberError] = useState('');
  const [isCheckingNumber, setIsCheckingNumber] = useState(false);
  const debouncedDocNumber = useDebounce(docNumber, 400);

  // Confirm modals
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Active filter count for badge
  const activeFilterCount =
    (statusFilters.length > 0 ? 1 : 0) +
    (contractorFilters.length > 0 ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  // Status options for MultiSelect
  const statusOptions: MultiSelectOption[] = ALL_STATUSES.map((s) => ({
    value: s,
    label: t(`status.${s}`),
  }));

  // Contractor search handler for MultiSelect async
  const handleContractorSearch = useCallback(
    async (query: string): Promise<MultiSelectOption[]> => {
      if (!companyId) return [];
      const results = await getContacts(companyId, query);
      return results
        .filter((c) => c.isActive)
        .map((c) => ({
          value: c.id,
          label: c.name,
          sublabel: c.taxId || undefined,
        }));
    },
    [companyId],
  );

  // Fetch documents with all filters
  useEffect(() => {
    if (companyId) {
      fetchDocuments(companyId, {
        statuses: statusFilters.length > 0 ? (statusFilters as DocumentStatus[]) : undefined,
        search: debouncedSearch.trim() || undefined,
        buyerIds: contractorFilters.length > 0 ? contractorFilters : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
    }
  }, [
    companyId,
    statusFilters,
    debouncedSearch,
    contractorFilters,
    dateFrom,
    dateTo,
    fetchDocuments,
  ]);

  // Load contacts when filter panel opens (for contractor chips display)
  useEffect(() => {
    if (companyId && showFilters) {
      fetchContacts(companyId);
    }
  }, [companyId, showFilters, fetchContacts]);

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
        inputData: { documentType: selectedDocType },
      });
      setShowCreateModal(false);
      setNewDocName('');
      setSelectedBuyerId('');
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

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteDocument(deleteTargetId);
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTargetId) return;
    setIsCancelling(true);
    try {
      await updateDocument(cancelTargetId, { status: 'CANCELLED' });
    } finally {
      setIsCancelling(false);
      setCancelTargetId(null);
    }
  };

  const clearAllFilters = () => {
    setStatusFilters([]);
    setContractorFilters([]);
    setDateFrom('');
    setDateTo('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const buyers = contacts.filter((c: Contact) => c.isActive);

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

      {/* Search Bar + Filter Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('documents.searchPlaceholder')}
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          style={{ maxWidth: '434px' }}
        />
        <Tooltip content={t('documents.filters')}>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'relative p-2 border rounded-lg transition-colors',
              showFilters
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-accent/50',
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </Tooltip>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-card border border-border rounded-lg space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">{t('documents.filters')}</h3>
            <Tooltip content={t('documents.clearFilters')}>
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  activeFilterCount > 0
                    ? 'text-accent hover:text-accent-hover hover:bg-accent/10'
                    : 'text-muted-foreground/40 cursor-default',
                )}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t('documents.status')}
              </label>
              <MultiSelect
                options={statusOptions}
                value={statusFilters}
                onChange={setStatusFilters}
                placeholder={t('documents.allStatuses')}
              />
            </div>

            {/* Contractor Filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t('documents.contractor')}
              </label>
              <MultiSelect
                options={contacts
                  .filter((c) => c.isActive)
                  .map((c) => ({
                    value: c.id,
                    label: c.name,
                    sublabel: c.taxId || undefined,
                  }))}
                value={contractorFilters}
                onChange={setContractorFilters}
                placeholder={t('documents.allContractors')}
                onSearch={handleContractorSearch}
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t('documents.dateFrom')}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t('documents.dateTo')}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>
          </div>
        </div>
      )}

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
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip content={t('documents.duplicate')}>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(doc.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-accent hover:bg-muted transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      {doc.status !== 'CANCELLED' && (
                        <Tooltip content={t('documents.cancel')}>
                          <button
                            type="button"
                            onClick={() => setCancelTargetId(doc.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-orange-500 hover:bg-muted transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip content={t('common.delete')}>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(doc.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-muted transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
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

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={!!cancelTargetId}
        title={t('documents.cancelDocument')}
        message={t('documents.confirmCancel')}
        confirmLabel={t('documents.cancel')}
        variant="danger"
        isLoading={isCancelling}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelTargetId(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title={t('documents.deleteDocument')}
        message={t('documents.confirmDelete')}
        confirmLabel={t('common.delete')}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
