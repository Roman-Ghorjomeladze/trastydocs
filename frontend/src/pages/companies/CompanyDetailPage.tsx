import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCompanyStore } from '../../stores/company.store.ts';
import { useMembershipStore } from '../../stores/membership.store.ts';
import { useAuthStore } from '../../stores/auth.store.ts';
import { getCompany } from '../../api/companies.ts';
import {
  ROUTES,
  ROLE_COLORS,
} from '../../lib/constants.ts';
import { cn, formatDate, getInitials } from '../../lib/utils.ts';
import { ConfirmModal } from '../../components/shared/ConfirmModal.tsx';
import type {
  Company,
  CompanyBankAccount,
  Membership,
  MembershipRole,
  Translations,
  UpdateCompanyDto,
  AddMemberResult,
  PendingInvitation,
} from '../../types/index.ts';

type Tab = 'overview' | 'members' | 'settings';

export function CompanyDetailPage() {
  const { t } = useTranslation();
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { updateCompany, deleteCompany, setActiveCompany } = useCompanyStore();
  const {
    members,
    invitations,
    isLoading: membersLoading,
    fetchMembers,
    fetchInvitations,
    addMember,
    updateMember,
    removeMember,
    cancelInvitation,
    clearMembers,
  } = useMembershipStore();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [error, setError] = useState('');

  // Determine current user's role in this company
  const currentMembership = members.find((m) => m.userId === user?.id);
  const userRole = currentMembership?.role;
  const isOwner = userRole === 'OWNER';
  const isAdmin = userRole === 'ADMIN';
  const canManage = isOwner || isAdmin;

  useEffect(() => {
    if (!companyId) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getCompany(companyId);
        setCompany(data);
        setActiveCompany(data);
      } catch {
        setError(t('companies.notFound'));
      } finally {
        setLoading(false);
      }
    };

    load();
    fetchMembers(companyId);
    fetchInvitations(companyId);

    return () => {
      clearMembers();
    };
  }, [companyId, fetchMembers, fetchInvitations, clearMembers, setActiveCompany]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-4" />
        <div className="h-4 bg-muted rounded w-1/4 mb-8" />
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {error || t('companies.notFound')}
        </h2>
        <button
          onClick={() => navigate(ROUTES.COMPANIES)}
          className="text-accent hover:underline"
        >
          {t('companies.backToCompanies')}
        </button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'overview', label: t('companies.overview'), show: true },
    { key: 'members', label: `${t('companies.members')} (${members.length})`, show: true },
    { key: 'settings', label: t('companies.settings'), show: canManage },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(ROUTES.COMPANIES)}
          className="text-muted-foreground hover:text-foreground"
        >
          &larr; {t('common.back')}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold text-lg">
            {getInitials(company.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="text-sm text-muted-foreground">{company.slug}</p>
          </div>
        </div>
        {userRole && (
          <span
            className={cn(
              'ml-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
              ROLE_COLORS[userRole] || 'bg-gray-100 text-gray-800',
            )}
          >
            {t(`roles.${userRole}`)}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-6">
          {tabs
            .filter((t) => t.show)
            .map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'pb-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab company={company} memberCount={members.length} />
      )}
      {activeTab === 'members' && companyId && (
        <MembersTab
          companyId={companyId}
          members={members}
          invitations={invitations}
          isLoading={membersLoading}
          canManage={canManage}
          isOwner={isOwner}
          currentUserId={user?.id ?? ''}
          onAddMember={addMember}
          onUpdateMember={updateMember}
          onRemoveMember={removeMember}
          onCancelInvitation={cancelInvitation}
        />
      )}
      {activeTab === 'settings' && canManage && companyId && (
        <SettingsTab
          company={company}
          isOwner={isOwner}
          onUpdate={async (data) => {
            const updated = await updateCompany(companyId, data);
            setCompany((prev) => (prev ? { ...prev, ...updated } : prev));
          }}
          onDelete={async () => {
            await deleteCompany(companyId);
            navigate(ROUTES.COMPANIES);
          }}
        />
      )}
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({
  company,
  memberCount,
}: {
  company: Company;
  memberCount: number;
}) {
  const { t } = useTranslation();

  const infoItems = [
    { label: t('companies.name'), value: company.name },
    { label: t('companies.slug'), value: company.slug },
    { label: t('companies.email'), value: company.email || '—' },
    { label: t('companies.phone'), value: company.phone || '—' },
    { label: t('companies.address'), value: company.address || '—' },
    { label: t('companies.taxId'), value: company.taxId || '—' },
    { label: t('companies.members'), value: String(memberCount) },
    { label: t('companies.created'), value: formatDate(company.createdAt) },
  ];

  return (
    <div className="bg-card border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">{t('companies.companyInformation')}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {infoItems.map((item) => (
          <div key={item.label}>
            <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
            <dd className="text-sm text-foreground mt-1">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ── Members Tab ──

function MembersTab({
  companyId,
  members,
  invitations,
  isLoading,
  canManage,
  isOwner,
  currentUserId,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  onCancelInvitation,
}: {
  companyId: string;
  members: Membership[];
  invitations: PendingInvitation[];
  isLoading: boolean;
  canManage: boolean;
  isOwner: boolean;
  currentUserId: string;
  onAddMember: (companyId: string, data: { email: string; role?: 'ADMIN' | 'MEMBER' | 'VIEWER' }) => Promise<AddMemberResult>;
  onUpdateMember: (companyId: string, memberId: string, data: { role?: MembershipRole }) => Promise<Membership>;
  onRemoveMember: (companyId: string, memberId: string) => Promise<void>;
  onCancelInvitation: (companyId: string, invitationId: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorBanner, setErrorBanner] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    if (errorBanner) {
      const timer = setTimeout(() => setErrorBanner(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorBanner]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setAdding(true);
    setAddError('');
    setSuccessMessage('');
    try {
      const result = await onAddMember(companyId, { email: email.trim(), role });
      setEmail('');
      setRole('MEMBER');
      setShowAddForm(false);
      if (result.type === 'invited') {
        setSuccessMessage(t('companies.invitationSent', { email: email.trim() }));
      } else {
        setSuccessMessage(t('companies.memberAdded'));
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to add member';
      setAddError(message);
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: MembershipRole) => {
    try {
      await onUpdateMember(companyId, memberId, { role: newRole });
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemove = (member: Membership) => {
    const isSelf = member.userId === currentUserId;
    const confirmMsg = isSelf
      ? t('companies.confirmLeave')
      : t('companies.confirmRemoveMember', { name: member.user?.name || member.user?.email });

    setConfirmModal({
      isOpen: true,
      title: isSelf ? t('companies.leaveCompany') : t('companies.removeMember'),
      message: confirmMsg,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await onRemoveMember(companyId, member.id);
        } catch (err: unknown) {
          setErrorBanner(err instanceof Error ? err.message : 'Failed to remove member');
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {errorBanner && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm">
          {errorBanner}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-success/10 border border-success/30 text-success rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      {canManage && (
        <div className="mb-4">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm"
          >
            {showAddForm ? t('common.cancel') : t('companies.addMember')}
          </button>
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="mb-4 p-4 bg-card border rounded-lg shadow-sm"
        >
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('companies.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('companies.role')}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              >
                {isOwner && <option value="ADMIN">{t('roles.ADMIN')}</option>}
                <option value="MEMBER">{t('roles.MEMBER')}</option>
                <option value="VIEWER">{t('roles.VIEWER')}</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={adding || !email.trim()}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? t('companies.adding') : t('companies.add')}
            </button>
          </div>
          {addError && <p className="mt-2 text-sm text-danger">{addError}</p>}
        </form>
      )}

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                {t('companies.user')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                {t('companies.role')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                {t('companies.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                {t('companies.joined')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                {t('companies.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const canChangeRole =
                canManage && member.role !== 'OWNER' && !isSelf;
              const canRemove =
                isSelf ||
                (canManage &&
                  member.role !== 'OWNER' &&
                  !(
                    !isOwner &&
                    member.role === 'ADMIN'
                  ));

              return (
                <tr key={member.id} className="hover:bg-muted">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">
                        {getInitials(member.user?.name || member.user?.email || '?')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {member.user?.name}
                          {isSelf && (
                            <span className="text-muted-foreground ml-1">{t('companies.you')}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.user?.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {canChangeRole ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(
                            member.id,
                            e.target.value as MembershipRole,
                          )
                        }
                        className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-accent outline-none"
                      >
                        {isOwner && <option value="ADMIN">{t('roles.ADMIN')}</option>}
                        <option value="MEMBER">{t('roles.MEMBER')}</option>
                        <option value="VIEWER">{t('roles.VIEWER')}</option>
                      </select>
                    ) : (
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-800',
                        )}
                      >
                        {t(`roles.${member.role}`)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {t(`membershipStatus.${member.status}`, member.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDate(member.joinedAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canRemove && (
                      <button
                        onClick={() => handleRemove(member)}
                        className="text-sm text-danger hover:text-danger-hover"
                      >
                        {isSelf ? t('companies.leave') : t('companies.remove')}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t('companies.noMembers')}</p>
        )}
      </div>

      {/* Pending Invitations */}
      {canManage && invitations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
            {t('companies.pendingInvitations')} ({invitations.length})
          </h3>
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    {t('companies.email')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    {t('companies.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    {t('companies.invitedBy')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    {t('companies.expires')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    {t('companies.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{inv.email}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          {t('companies.pending')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          ROLE_COLORS[inv.role] || 'bg-gray-100 text-gray-800',
                        )}
                      >
                        {t(`roles.${inv.role}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {inv.inviter?.name || inv.inviter?.email || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(inv.expiresAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: t('companies.cancelInvitation'),
                            message: t('companies.confirmCancelInvitation', { email: inv.email }),
                            onConfirm: async () => {
                              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                              try {
                                await onCancelInvitation(companyId, inv.id);
                              } catch (err: unknown) {
                                setErrorBanner(
                                  err instanceof Error ? err.message : 'Failed to cancel invitation',
                                );
                              }
                            },
                          });
                        }}
                        className="text-sm text-danger hover:text-danger-hover"
                      >
                        {t('companies.cancel')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

// ── Settings Tab ──

function SettingsTab({
  company,
  isOwner,
  onUpdate,
  onDelete,
}: {
  company: Company;
  isOwner: boolean;
  onUpdate: (data: UpdateCompanyDto) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(company.name);
  const [email, setEmail] = useState(company.email ?? '');
  const [phone, setPhone] = useState(company.phone ?? '');
  const [address, setAddress] = useState(company.address ?? '');
  const [taxId, setTaxId] = useState(company.taxId ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>(
    company.bankAccounts ?? [],
  );
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [bankSaving, setBankSaving] = useState(false);

  // Translations state
  const LANGS = [
    { code: 'en', label: 'English' },
    { code: 'ka', label: 'ქართული' },
    { code: 'ru', label: 'Русский' },
    { code: 'tr', label: 'Türkçe' },
  ];
  const [nameTranslations, setNameTranslations] = useState<Translations>(
    company.nameTranslations ?? {},
  );
  const [addressTranslations, setAddressTranslations] = useState<Translations>(
    company.addressTranslations ?? {},
  );
  const [translationsSaving, setTranslationsSaving] = useState(false);
  const [translationsSaved, setTranslationsSaved] = useState(false);

  useEffect(() => {
    if (errorBanner) {
      const timer = setTimeout(() => setErrorBanner(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorBanner]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const data: UpdateCompanyDto = {};
      if (name !== company.name) data.name = name;
      if (email !== (company.email ?? '')) data.email = email || undefined;
      if (phone !== (company.phone ?? '')) data.phone = phone || undefined;
      if (address !== (company.address ?? ''))
        data.address = address || undefined;
      if (taxId !== (company.taxId ?? '')) data.taxId = taxId || undefined;

      if (Object.keys(data).length > 0) {
        await onUpdate(data);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save changes',
      );
    } finally {
      setSaving(false);
    }
  };

  const saveBankAccounts = async (accounts: CompanyBankAccount[]) => {
    setBankSaving(true);
    try {
      await onUpdate({ bankAccounts: accounts });
      setBankAccounts(accounts);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to save bank accounts');
    } finally {
      setBankSaving(false);
    }
  };

  const handleSaveTranslations = async () => {
    setTranslationsSaving(true);
    try {
      await onUpdate({ nameTranslations, addressTranslations });
      setTranslationsSaved(true);
      setTimeout(() => setTranslationsSaved(false), 3000);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to save translations');
    } finally {
      setTranslationsSaving(false);
    }
  };

  const handleAddBankAccount = async () => {
    if (!newBankName.trim() || !newAccountNumber.trim()) return;
    const isFirst = bankAccounts.length === 0;
    const newAccount: CompanyBankAccount = {
      id: crypto.randomUUID(),
      bankName: newBankName.trim(),
      accountNumber: newAccountNumber.trim(),
      isDefault: isFirst,
    };
    await saveBankAccounts([...bankAccounts, newAccount]);
    setNewBankName('');
    setNewAccountNumber('');
    setShowAddBank(false);
  };

  const handleRemoveBankAccount = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('companies.removeBankTitle'),
      message: t('companies.confirmRemoveBank'),
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        const filtered = bankAccounts.filter((ba) => ba.id !== id);
        // If removed account was default and there are remaining accounts, set first as default
        const hadDefault = bankAccounts.find((ba) => ba.id === id)?.isDefault;
        if (hadDefault && filtered.length > 0) {
          filtered[0].isDefault = true;
        }
        await saveBankAccounts(filtered);
      },
    });
  };

  const handleSetDefaultBank = async (id: string) => {
    const updated = bankAccounts.map((ba) => ({
      ...ba,
      isDefault: ba.id === id,
    }));
    await saveBankAccounts(updated);
  };

  const handleDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: t('companies.deleteCompany'),
      message: t('companies.confirmDelete'),
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setDeleting(true);
        try {
          await onDelete();
        } catch (err: unknown) {
          setErrorBanner(err instanceof Error ? err.message : 'Failed to delete company');
          setDeleting(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {errorBanner && (
        <div className="p-3 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm">
          {errorBanner}
        </div>
      )}

      {/* Edit Form */}
      <form
        onSubmit={handleSave}
        className="bg-card border rounded-lg p-6"
      >
        <h2 className="text-lg font-semibold mb-4">{t('companies.companySettings')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('companies.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('companies.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="company@example.com"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('companies.phone')}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('companies.taxId')}
            </label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="XX-XXXXXXX"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('companies.address')}
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="123 Main St, City, State ZIP"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? t('companies.saving') : t('companies.saveChanges')}
          </button>
          {saveSuccess && (
            <span className="text-sm text-success">{t('companies.changesSaved')}</span>
          )}
          {saveError && (
            <span className="text-sm text-danger">{saveError}</span>
          )}
        </div>
      </form>

      {/* Name & Address Translations */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-1">{t('companies.nameTranslations')}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('companies.translationsHelp')}
        </p>

        <div className="space-y-4">
          {LANGS.map((lang) => (
            <div key={lang.code} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('companies.nameInLang', { lang: lang.label })}
                </label>
                <input
                  type="text"
                  value={nameTranslations[lang.code] ?? ''}
                  onChange={(e) =>
                    setNameTranslations((prev) => ({ ...prev, [lang.code]: e.target.value }))
                  }
                  placeholder={`${company.name}`}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('companies.addressInLang', { lang: lang.label })}
                </label>
                <input
                  type="text"
                  value={addressTranslations[lang.code] ?? ''}
                  onChange={(e) =>
                    setAddressTranslations((prev) => ({ ...prev, [lang.code]: e.target.value }))
                  }
                  placeholder={company.address ?? ''}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveTranslations}
            disabled={translationsSaving}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {translationsSaving ? t('companies.saving') : t('companies.saveChanges')}
          </button>
          {translationsSaved && (
            <span className="text-sm text-success">{t('companies.changesSaved')}</span>
          )}
        </div>
      </div>

      {/* Bank Accounts */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('companies.bankAccounts')}</h2>
          <button
            type="button"
            onClick={() => setShowAddBank(!showAddBank)}
            disabled={bankSaving}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {showAddBank ? t('common.cancel') : t('companies.addBankAccount')}
          </button>
        </div>

        {showAddBank && (
          <div className="mb-4 p-4 border border-border rounded-lg bg-muted">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('companies.bankName')}
                </label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="Bank of Georgia"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('companies.accountNumber')}
                </label>
                <input
                  type="text"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  placeholder="GE00TB0000000000000000"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none font-mono"
                />
              </div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleAddBankAccount}
                disabled={bankSaving || !newBankName.trim() || !newAccountNumber.trim()}
                className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {bankSaving ? t('companies.saving') : t('companies.addBankAccount')}
              </button>
            </div>
          </div>
        )}

        {bankAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('companies.noBankAccounts')}
          </p>
        ) : (
          <div className="space-y-2">
            {bankAccounts.map((ba) => (
              <div
                key={ba.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {ba.bankName}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {ba.accountNumber}
                    </p>
                  </div>
                  {ba.isDefault && (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent">
                      {t('companies.defaultAccount')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {!ba.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultBank(ba.id)}
                      disabled={bankSaving}
                      className="text-xs text-accent hover:text-accent-hover font-medium disabled:opacity-50"
                    >
                      {t('companies.setDefault')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveBankAccount(ba.id)}
                    disabled={bankSaving}
                    className="text-xs text-danger hover:text-danger-hover disabled:opacity-50"
                  >
                    {t('companies.removeBankAccount')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="bg-card border border-danger rounded-lg p-6">
          <h2 className="text-lg font-semibold text-danger mb-2">
            {t('companies.dangerZone')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t('companies.deleteWarning')}
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger-hover disabled:opacity-50 transition-colors"
          >
            {deleting ? t('companies.deleting') : t('companies.deleteCompany')}
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
