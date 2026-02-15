import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useContactStore } from '../../stores/contact.store.ts';
import { useCompanyStore } from '../../stores/company.store.ts';
import type { CreateContactDto, UpdateContactDto, BankAccount, Translations } from '../../types/index.ts';

export function ContactsPage() {
  const { t } = useTranslation();
  const { companyId } = useParams<{ companyId: string }>();
  const { activeCompany } = useCompanyStore();
  const {
    contacts,
    isLoading,
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  } = useContactStore();

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Create form state
  const [formData, setFormData] = useState<CreateContactDto>({
    name: '',
  });
  const [createBankAccounts, setCreateBankAccounts] = useState<BankAccount[]>([]);
  const [createNameTranslations, setCreateNameTranslations] = useState<Translations>({});
  const [createAddressTranslations, setCreateAddressTranslations] = useState<Translations>({});
  const [submitting, setSubmitting] = useState(false);

  // Edit form state
  const [editData, setEditData] = useState<UpdateContactDto>({});
  const [editBankAccounts, setEditBankAccounts] = useState<BankAccount[]>([]);
  const [editNameTranslations, setEditNameTranslations] = useState<Translations>({});
  const [editAddressTranslations, setEditAddressTranslations] = useState<Translations>({});

  const LANGS = [
    { code: 'en', label: 'English' },
    { code: 'ka', label: 'ქართული' },
    { code: 'ru', label: 'Русский' },
    { code: 'tr', label: 'Türkçe' },
  ];

  const resolvedCompanyId = companyId || activeCompany?.id;

  const loadContacts = useCallback(() => {
    if (!resolvedCompanyId) return;
    fetchContacts(resolvedCompanyId, search || undefined);
  }, [resolvedCompanyId, search, fetchContacts]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !resolvedCompanyId) return;

    setSubmitting(true);
    setError('');
    try {
      const validAccounts = createBankAccounts.filter(
        (a) => a.name.trim() && a.accountNumber.trim(),
      );
      const hasNameTranslations = Object.values(createNameTranslations).some((v) => v.trim());
      const hasAddrTranslations = Object.values(createAddressTranslations).some((v) => v.trim());
      await createContact(resolvedCompanyId, {
        ...formData,
        name: formData.name.trim(),
        bankAccounts: validAccounts.length > 0 ? validAccounts : undefined,
        nameTranslations: hasNameTranslations ? createNameTranslations : undefined,
        addressTranslations: hasAddrTranslations ? createAddressTranslations : undefined,
      });
      setFormData({ name: '' });
      setCreateBankAccounts([]);
      setCreateNameTranslations({});
      setCreateAddressTranslations({});
      setShowCreate(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create contractor';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!resolvedCompanyId) return;
    setSubmitting(true);
    try {
      const validAccounts = editBankAccounts.filter(
        (a) => a.name.trim() && a.accountNumber.trim(),
      );
      await updateContact(resolvedCompanyId, id, {
        ...editData,
        bankAccounts: validAccounts.length > 0 ? validAccounts : null,
        nameTranslations: editNameTranslations,
        addressTranslations: editAddressTranslations,
      });
      setEditingId(null);
      setEditData({});
      setEditBankAccounts([]);
      setEditNameTranslations({});
      setEditAddressTranslations({});
    } catch {
      // silently handle
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!resolvedCompanyId) return;
    try {
      await deleteContact(resolvedCompanyId, id);
    } catch {
      // silently handle
    }
  };

  const startEditing = (contact: (typeof contacts)[0]) => {
    setEditingId(contact.id);
    setEditData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      taxId: contact.taxId,
      contactPerson: contact.contactPerson,
      notes: contact.notes,
    });
    setEditBankAccounts(contact.bankAccounts || []);
    setEditNameTranslations(contact.nameTranslations ?? {});
    setEditAddressTranslations(contact.addressTranslations ?? {});
  };

  if (!resolvedCompanyId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {t('contractors.selectCompany')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('contractors.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('contractors.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          {showCreate ? t('common.cancel') : t('contractors.create')}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-4 bg-card border rounded-lg shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contractors.name')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t('contractors.name')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contractors.email')}
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value || undefined })
                }
                placeholder="email@example.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contractors.phone')}
              </label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value || undefined })
                }
                placeholder="+1 234 567 890"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contractors.contactPerson')}
              </label>
              <input
                type="text"
                value={formData.contactPerson || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactPerson: e.target.value || undefined,
                  })
                }
                placeholder={t('contractors.contactPerson')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contractors.taxId')}
              </label>
              <input
                type="text"
                value={formData.taxId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, taxId: e.target.value || undefined })
                }
                placeholder={t('contractors.taxId')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contractors.address')}
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: e.target.value || undefined,
                  })
                }
                placeholder={t('contractors.address')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>
            {/* Bank Accounts */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('contractors.bankAccounts')}
              </label>
              {createBankAccounts.map((account, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={account.name}
                    onChange={(e) => {
                      const updated = [...createBankAccounts];
                      updated[index] = { ...updated[index], name: e.target.value };
                      setCreateBankAccounts(updated);
                    }}
                    placeholder={t('contractors.bankName')}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                  />
                  <input
                    type="text"
                    value={account.accountNumber}
                    onChange={(e) => {
                      const updated = [...createBankAccounts];
                      updated[index] = { ...updated[index], accountNumber: e.target.value };
                      setCreateBankAccounts(updated);
                    }}
                    placeholder={t('contractors.accountNumber')}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCreateBankAccounts(createBankAccounts.filter((_, i) => i !== index))
                    }
                    className="px-3 py-2 text-danger hover:bg-danger/10 rounded-lg transition-colors text-sm"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCreateBankAccounts([...createBankAccounts, { name: '', accountNumber: '' }])
                }
                className="mt-1 px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
              >
                + {t('contractors.addBank')}
              </button>
            </div>
            {/* Name & Address Translations */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('contractors.translations')}
              </label>
              <div className="space-y-2">
                {LANGS.map((lang) => (
                  <div key={lang.code} className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={createNameTranslations[lang.code] ?? ''}
                      onChange={(e) =>
                        setCreateNameTranslations((prev) => ({ ...prev, [lang.code]: e.target.value }))
                      }
                      placeholder={`${t('contractors.name')} (${lang.label})`}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none text-sm"
                    />
                    <input
                      type="text"
                      value={createAddressTranslations[lang.code] ?? ''}
                      onChange={(e) =>
                        setCreateAddressTranslations((prev) => ({ ...prev, [lang.code]: e.target.value }))
                      }
                      placeholder={`${t('contractors.address')} (${lang.label})`}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setFormData({ name: '' });
                setCreateBankAccounts([]);
                setCreateNameTranslations({});
                setCreateAddressTranslations({});
              }}
              className="px-4 py-2 text-foreground border rounded-lg hover:bg-muted transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name.trim()}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? t('contractors.creating') : t('contractors.create')}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </form>
      )}

      {/* Search */}
      <div className="flex items-center justify-end mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('contractors.searchPlaceholder')}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full sm:w-64"
        />
      </div>

      {/* Contractors table */}
      {isLoading ? (
        <div className="bg-card border rounded-lg">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 border-b last:border-b-0 animate-pulse"
            >
              <div className="h-5 bg-muted rounded w-40" />
              <div className="h-5 bg-muted rounded w-48" />
              <div className="h-5 bg-muted rounded w-32" />
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg">
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('contractors.noContractors')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? t('contractors.tryDifferentSearch')
              : t('contractors.createFirst')}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              {t('contractors.create')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-muted border-b text-sm font-medium text-muted-foreground">
            <div className="col-span-3">{t('contractors.name')}</div>
            <div className="col-span-2">{t('contractors.email')}</div>
            <div className="col-span-2">{t('contractors.phone')}</div>
            <div className="col-span-2">{t('contractors.contactPerson')}</div>
            <div className="col-span-1">{t('contractors.taxId')}</div>
            <div className="col-span-2 text-right">{t('common.actions')}</div>
          </div>

          {/* Rows */}
          {contacts.map((contact) => (
            <div key={contact.id} className="border-b last:border-b-0">
              {editingId === contact.id ? (
                /* Editing row */
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        {t('contractors.name')}
                      </label>
                      <input
                        type="text"
                        value={editData.name || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, name: e.target.value })
                        }
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        {t('contractors.email')}
                      </label>
                      <input
                        type="email"
                        value={editData.email ?? ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            email: e.target.value || null,
                          })
                        }
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        {t('contractors.phone')}
                      </label>
                      <input
                        type="text"
                        value={editData.phone ?? ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            phone: e.target.value || null,
                          })
                        }
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        {t('contractors.contactPerson')}
                      </label>
                      <input
                        type="text"
                        value={editData.contactPerson ?? ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            contactPerson: e.target.value || null,
                          })
                        }
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        {t('contractors.taxId')}
                      </label>
                      <input
                        type="text"
                        value={editData.taxId ?? ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            taxId: e.target.value || null,
                          })
                        }
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        {t('contractors.address')}
                      </label>
                      <input
                        type="text"
                        value={editData.address ?? ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            address: e.target.value || null,
                          })
                        }
                        className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>
                  </div>
                  {/* Bank Accounts in edit */}
                  <div className="mb-3">
                    <label className="block text-xs text-muted-foreground mb-1">
                      {t('contractors.bankAccounts')}
                    </label>
                    {editBankAccounts.map((account, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={account.name}
                          onChange={(e) => {
                            const updated = [...editBankAccounts];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setEditBankAccounts(updated);
                          }}
                          placeholder={t('contractors.bankName')}
                          className="flex-1 px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                        />
                        <input
                          type="text"
                          value={account.accountNumber}
                          onChange={(e) => {
                            const updated = [...editBankAccounts];
                            updated[index] = { ...updated[index], accountNumber: e.target.value };
                            setEditBankAccounts(updated);
                          }}
                          placeholder={t('contractors.accountNumber')}
                          className="flex-1 px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditBankAccounts(editBankAccounts.filter((_, i) => i !== index))
                          }
                          className="px-2 py-1 text-xs text-danger hover:bg-danger/10 rounded"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setEditBankAccounts([...editBankAccounts, { name: '', accountNumber: '' }])
                      }
                      className="mt-1 px-2 py-1 text-xs text-accent hover:bg-accent/10 rounded"
                    >
                      + {t('contractors.addBank')}
                    </button>
                  </div>
                  {/* Name & Address Translations (edit) */}
                  <div className="mb-3">
                    <label className="block text-xs text-muted-foreground mb-1">
                      {t('contractors.translations')}
                    </label>
                    <div className="space-y-2">
                      {LANGS.map((lang) => (
                        <div key={lang.code} className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editNameTranslations[lang.code] ?? ''}
                            onChange={(e) =>
                              setEditNameTranslations((prev) => ({ ...prev, [lang.code]: e.target.value }))
                            }
                            placeholder={`${t('contractors.name')} (${lang.label})`}
                            className="px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                          />
                          <input
                            type="text"
                            value={editAddressTranslations[lang.code] ?? ''}
                            onChange={(e) =>
                              setEditAddressTranslations((prev) => ({ ...prev, [lang.code]: e.target.value }))
                            }
                            placeholder={`${t('contractors.address')} (${lang.label})`}
                            className="px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditData({});
                        setEditBankAccounts([]);
                        setEditNameTranslations({});
                        setEditAddressTranslations({});
                      }}
                      className="px-3 py-1.5 text-sm text-foreground border rounded hover:bg-muted"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={() => handleUpdate(contact.id)}
                      disabled={submitting}
                      className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
                    >
                      {submitting ? t('common.saving') : t('common.save')}
                    </button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted">
                  <div className="col-span-12 md:col-span-3 font-medium text-foreground truncate">
                    {contact.name}
                  </div>
                  <div className="col-span-12 md:col-span-2 text-sm text-muted-foreground truncate">
                    {contact.email || '\u2014'}
                  </div>
                  <div className="col-span-12 md:col-span-2 text-sm text-muted-foreground truncate">
                    {contact.phone || '\u2014'}
                  </div>
                  <div className="col-span-12 md:col-span-2 text-sm text-muted-foreground truncate">
                    {contact.contactPerson || '\u2014'}
                  </div>
                  <div className="col-span-12 md:col-span-1 text-sm text-muted-foreground truncate">
                    {contact.taxId || '\u2014'}
                  </div>
                  <div className="col-span-12 md:col-span-2 flex justify-end gap-2">
                    <button
                      onClick={() => startEditing(contact)}
                      className="px-2 py-1 text-xs text-accent hover:text-accent-hover hover:bg-accent/10 rounded transition-colors"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="px-2 py-1 text-xs text-danger hover:text-danger-hover hover:bg-danger/10 rounded transition-colors"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
