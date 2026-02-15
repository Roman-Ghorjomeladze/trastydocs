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
  Membership,
  MembershipRole,
  UpdateCompanyDto,
} from '../../types/index.ts';

type Tab = 'overview' | 'members' | 'settings';

export function CompanyDetailPage() {
  const { t } = useTranslation();
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { updateCompany, deleteCompany, setActiveCompany } = useCompanyStore();
  const { members, isLoading: membersLoading, fetchMembers, addMember, updateMember, removeMember, clearMembers } =
    useMembershipStore();

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

    return () => {
      clearMembers();
    };
  }, [companyId, fetchMembers, clearMembers, setActiveCompany]);

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
          isLoading={membersLoading}
          canManage={canManage}
          isOwner={isOwner}
          currentUserId={user?.id ?? ''}
          onAddMember={addMember}
          onUpdateMember={updateMember}
          onRemoveMember={removeMember}
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
  isLoading,
  canManage,
  isOwner,
  currentUserId,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
}: {
  companyId: string;
  members: Membership[];
  isLoading: boolean;
  canManage: boolean;
  isOwner: boolean;
  currentUserId: string;
  onAddMember: (companyId: string, data: { email: string; role?: 'ADMIN' | 'MEMBER' | 'VIEWER' }) => Promise<Membership>;
  onUpdateMember: (companyId: string, memberId: string, data: { role?: MembershipRole }) => Promise<Membership>;
  onRemoveMember: (companyId: string, memberId: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setAdding(true);
    setAddError('');
    try {
      await onAddMember(companyId, { email: email.trim(), role });
      setEmail('');
      setRole('MEMBER');
      setShowAddForm(false);
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
