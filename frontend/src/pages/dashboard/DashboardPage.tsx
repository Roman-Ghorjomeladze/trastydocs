import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth.store.ts';
import { useCompanyStore } from '../../stores/company.store.ts';
import { getDashboardStats } from '../../api/documents.ts';
import { ROUTES } from '../../lib/constants.ts';
import { STATUS_COLORS } from '../../lib/constants.ts';
import { formatDate } from '../../lib/utils.ts';
import type { DashboardStats } from '../../types/index.ts';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const activeCompany = useCompanyStore((s) => s.activeCompany);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch {
        // silently fail — user may not have any companies
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    {
      label: t('dashboard.totalDocuments'),
      value: stats?.total ?? 0,
      icon: (
        <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-accent/10',
    },
    {
      label: t('dashboard.drafts'),
      value: stats?.byStatus?.DRAFT ?? 0,
      icon: (
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      color: 'bg-yellow-100',
    },
    {
      label: t('dashboard.completed'),
      value: stats?.byStatus?.COMPLETED ?? 0,
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-100',
    },
    {
      label: t('dashboard.pendingSignature'),
      value: stats?.byStatus?.PENDING_SIGNATURE ?? 0,
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
      color: 'bg-blue-100',
    },
  ];

  return (
    <div>
      {/* Welcome Banner */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {user?.name
            ? `${t('dashboard.welcome')}, ${user.name}`
            : t('dashboard.welcomeGeneric')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('dashboard.welcomeGeneric')}
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-card border border-border rounded-lg p-5 flex items-center gap-4"
              >
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${card.color}`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Documents */}
          <div className="bg-card border border-border rounded-lg mb-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {t('dashboard.recentDocuments')}
              </h2>
              {activeCompany && (
                <Link
                  to={ROUTES.DOCUMENTS(activeCompany.id)}
                  className="text-sm text-accent hover:text-accent-hover transition-colors"
                >
                  {t('common.viewAll')}
                </Link>
              )}
            </div>

            {stats?.recentDocuments && stats.recentDocuments.length > 0 ? (
              <div className="divide-y divide-border">
                {stats.recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="px-5 py-3 flex items-center gap-4 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => {
                      navigate(
                        ROUTES.DOCUMENT_DETAIL(doc.companyId, doc.id),
                      );
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.documentNumber && (
                          <span className="font-mono mr-2">{doc.documentNumber}</span>
                        )}
                        {doc.company?.name && (
                          <span>{doc.company.name}</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                        STATUS_COLORS[doc.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {t(`status.${doc.status}`)}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(doc.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.noDocuments')}
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t('dashboard.quickActions')}
            </h2>
            <div className="flex flex-wrap gap-3">
              {activeCompany && (
                <Link
                  to={ROUTES.DOCUMENTS(activeCompany.id)}
                  className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                >
                  {t('dashboard.createDocument')}
                </Link>
              )}
              <Link
                to={ROUTES.COMPANIES}
                className="px-4 py-2 text-sm bg-muted text-foreground rounded-lg hover:bg-muted transition-colors border border-border"
              >
                {t('dashboard.viewCompanies')}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
