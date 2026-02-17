import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Building2, FileText, Contact } from 'lucide-react';
import { useAdminStore } from '../../stores/admin.store.ts';

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const { stats, statsLoading, fetchStats } = useAdminStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (statsLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: t('admin.totalUsers'), value: stats?.totalUsers ?? 0, icon: Users, color: 'bg-blue-500' },
    { label: t('admin.totalCompanies'), value: stats?.totalCompanies ?? 0, icon: Building2, color: 'bg-green-500' },
    { label: t('admin.totalDocuments'), value: stats?.totalDocuments ?? 0, icon: FileText, color: 'bg-purple-500' },
    { label: t('admin.totalContractors'), value: stats?.totalContractors ?? 0, icon: Contact, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">{t('admin.dashboard')}</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border border-border rounded-xl p-5 flex items-center gap-4"
            >
              <div className={`${card.color} p-3 rounded-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {card.value.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Subscription Breakdown */}
      {stats?.activeSubscriptions && Object.keys(stats.activeSubscriptions).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t('admin.subscriptionsBreakdown')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.activeSubscriptions).map(([planName, count]) => (
              <div key={planName} className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-sm text-muted-foreground capitalize">{planName}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
