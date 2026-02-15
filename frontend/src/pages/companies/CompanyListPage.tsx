import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCompanyStore } from '../../stores/company.store.ts';
import { ROUTES, ROLE_COLORS } from '../../lib/constants.ts';
import { getInitials, cn } from '../../lib/utils.ts';

export function CompanyListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { companies, isLoading, fetchCompanies, createCompany, setActiveCompany } =
    useCompanyStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    setError('');
    try {
      const company = await createCompany({ name: newName.trim() });
      setNewName('');
      setShowCreate(false);
      setActiveCompany(company);
      navigate(ROUTES.COMPANY_DETAIL(company.id));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create company';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleCardClick = (company: (typeof companies)[0]) => {
    setActiveCompany(company);
    navigate(ROUTES.COMPANY_DETAIL(company.id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('companies.title')}</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          {showCreate ? t('common.cancel') : t('companies.create')}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-4 bg-card border rounded-lg shadow-sm"
        >
          <label className="block text-sm font-medium text-foreground mb-1">
            {t('companies.name')}
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('companies.namePlaceholder')}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? t('companies.creating') : t('common.create')}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </form>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-card border rounded-lg animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('companies.noCompanies')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('companies.createFirst')}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            {t('companies.createCompany')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => handleCardClick(company)}
              className="p-6 bg-card border rounded-lg shadow-sm hover:shadow-md hover:border-accent transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold text-sm">
                  {getInitials(company.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {company.name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">{company.slug}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                {company.membership && (
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      ROLE_COLORS[company.membership.role] || 'bg-gray-100 text-gray-800',
                    )}
                  >
                    {t(`roles.${company.membership.role}`, company.membership.role)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(company.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
