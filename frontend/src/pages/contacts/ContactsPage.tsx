import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useContactStore } from '../../stores/contact.store.ts';
import { useCompanyStore } from '../../stores/company.store.ts';
import {
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_COLORS,
} from '../../lib/constants.ts';
import { cn } from '../../lib/utils.ts';
import type { ContactType, CreateContactDto, UpdateContactDto, BankAccount } from '../../types/index.ts';

type TabType = 'ALL' | 'BUYER' | 'SELLER';

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

  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Create form state
  const [formData, setFormData] = useState<CreateContactDto>({
    type: 'BUYER',
    name: '',
  });
  const [createBankAccounts, setCreateBankAccounts] = useState<BankAccount[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Edit form state
  const [editData, setEditData] = useState<UpdateContactDto>({});
  const [editBankAccounts, setEditBankAccounts] = useState<BankAccount[]>([]);

  const resolvedCompanyId = companyId || activeCompany?.id;

  const loadContacts = useCallback(() => {
    if (!resolvedCompanyId) return;
    const type = activeTab === 'ALL' ? undefined : activeTab;
    fetchContacts(resolvedCompanyId, type, search || undefined);
  }, [resolvedCompanyId, activeTab, search, fetchContacts]);

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
      await createContact(resolvedCompanyId, {
        ...formData,
        name: formData.name.trim(),
        bankAccounts: validAccounts.length > 0 ? validAccounts : undefined,
      });
      setFormData({ type: 'BUYER', name: '' });
      setCreateBankAccounts([]);
      setShowCreate(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create contact';
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
      });
      setEditingId(null);
      setEditData({});
      setEditBankAccounts([]);
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
  };

  if (!resolvedCompanyId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Please select a company to view contacts.
        </p>
      </div>
    );
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'ALL', label: t('contacts.all') },
    { key: 'BUYER', label: t('contacts.buyer') },
    { key: 'SELLER', label: t('contacts.seller') },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('contacts.title')}</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          {showCreate ? t('common.cancel') : t('contacts.create')}
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
                {t('contacts.type')} *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as ContactType,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              >
                <option value="BUYER">{t('contacts.buyer')}</option>
                <option value="SELLER">{t('contacts.seller')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contacts.name')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Contact name"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contacts.email')}
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
                {t('contacts.phone')}
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
                Contact Person
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
                placeholder="Point of contact"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contacts.taxId')}
              </label>
              <input
                type="text"
                value={formData.taxId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, taxId: e.target.value || undefined })
                }
                placeholder="Tax identification number"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contacts.address')}
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
                placeholder="Full address"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>
            {/* Bank Accounts */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('contacts.bankAccounts')}
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
                    placeholder="Account name (e.g. Main Account)"
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
                    placeholder="Account number"
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
                + Add Bank Account
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setFormData({ type: 'BUYER', name: '' });
                setCreateBankAccounts([]);
              }}
              className="px-4 py-2 text-foreground border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name.trim()}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Contact'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </form>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex border rounded-lg overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-accent text-white'
                  : 'bg-card text-foreground hover:bg-muted',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none w-full sm:w-64"
        />
      </div>

      {/* Contacts table */}
      {isLoading ? (
        <div className="bg-card border rounded-lg">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 border-b last:border-b-0 animate-pulse"
            >
              <div className="h-5 bg-muted rounded w-16" />
              <div className="h-5 bg-muted rounded w-40" />
              <div className="h-5 bg-muted rounded w-48" />
              <div className="h-5 bg-muted rounded w-32" />
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg">
          <h3 className="text-lg font-medium text-foreground mb-2">
            No contacts found
          </h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? 'Try a different search term.'
              : 'Add your first contact to get started.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Add Contact
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-muted border-b text-sm font-medium text-muted-foreground">
            <div className="col-span-1">Type</div>
            <div className="col-span-2">Name</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-2">Phone</div>
            <div className="col-span-2">Contact Person</div>
            <div className="col-span-1">Tax ID</div>
            <div className="col-span-2 text-right">Actions</div>
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
                        Name
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
                        Email
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
                        Phone
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
                        Contact Person
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
                        Tax ID
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
                        Address
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
                      Bank Accounts
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
                          placeholder="Account name"
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
                          placeholder="Account number"
                          className="flex-1 px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditBankAccounts(editBankAccounts.filter((_, i) => i !== index))
                          }
                          className="px-2 py-1 text-xs text-danger hover:bg-danger/10 rounded"
                        >
                          Remove
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
                      + Add Bank Account
                    </button>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditData({});
                        setEditBankAccounts([]);
                      }}
                      className="px-3 py-1.5 text-sm text-foreground border rounded hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdate(contact.id)}
                      disabled={submitting}
                      className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted">
                  <div className="col-span-12 md:col-span-1">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        CONTACT_TYPE_COLORS[contact.type] ||
                          'bg-gray-100 text-gray-800',
                      )}
                    >
                      {CONTACT_TYPE_LABELS[contact.type]}
                    </span>
                  </div>
                  <div className="col-span-12 md:col-span-2 font-medium text-foreground truncate">
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
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="px-2 py-1 text-xs text-danger hover:text-danger-hover hover:bg-danger/10 rounded transition-colors"
                    >
                      Delete
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
