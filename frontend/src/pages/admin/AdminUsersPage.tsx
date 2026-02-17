import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Shield, ShieldOff } from 'lucide-react';
import { useAdminStore } from '../../stores/admin.store.ts';
import { ROUTES } from '../../lib/constants.ts';
import { cn } from '../../lib/utils.ts';

export function AdminUsersPage() {
  const { t } = useTranslation();
  const { users, usersTotal, usersLoading, fetchUsers } = useAdminStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchUsers({ search: search || undefined, page, limit });
  }, [fetchUsers, search, page]);

  const totalPages = Math.ceil(usersTotal / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('admin.users')}</h1>
        <span className="text-sm text-muted-foreground">{usersTotal} {t('admin.total')}</span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('admin.searchUsers')}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('admin.user')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('admin.plan')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('admin.status')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('admin.adminLabel')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('admin.joined')}</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {t('admin.noUsersFound')}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        to={ROUTES.ADMIN_USER_DETAIL(user.id)}
                        className="hover:text-accent"
                      >
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                        {user.subscription?.planName ?? t('profile.freePlan')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          user.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                        )}
                      >
                        {user.isActive ? t('admin.active') : t('admin.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.isAdmin ? (
                        <Shield className="w-4 h-4 text-accent" />
                      ) : (
                        <ShieldOff className="w-4 h-4 text-muted-foreground/30" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground disabled:opacity-50"
          >
            {t('admin.previous')}
          </button>
          <span className="text-sm text-muted-foreground">
            {t('admin.pageOf', { page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground disabled:opacity-50"
          >
            {t('admin.next')}
          </button>
        </div>
      )}
    </div>
  );
}
