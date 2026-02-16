import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuditStore } from '../../stores/audit.store.ts';
import {
  AUDIT_ACTION_COLORS,
} from '../../lib/constants.ts';
import { cn } from '../../lib/utils.ts';
import type { AuditAction, AuditLog } from '../../types/index.ts';

const ENTITY_OPTIONS = [
  'Contractor',
  'Membership',
  'Document',
  'Signature',
  'Stamp',
];

const ACTION_OPTIONS: AuditAction[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'DUPLICATE',
  'SIGN',
  'SEND',
];

const PAGE_SIZE = 20;

export function AuditLogPage() {
  const { t } = useTranslation();
  const { companyId } = useParams<{ companyId: string }>();
  const { logs, total, isLoading, fetchLogs } = useAuditStore();
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchLogs(companyId, {
        ...(actionFilter && { action: actionFilter }),
        ...(entityFilter && { entity: entityFilter }),
        page,
        limit: PAGE_SIZE,
      });
    }
  }, [companyId, actionFilter, entityFilter, page, fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFilterChange = (type: 'action' | 'entity', value: string) => {
    setPage(1);
    if (type === 'action') setActionFilter(value as AuditAction | '');
    else setEntityFilter(value);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('audit.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('audit.subtitle')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6">
        <div className="flex-1 min-w-[120px] max-w-[180px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t('audit.action')}
          </label>
          <select
            value={actionFilter}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          >
            <option value="">{t('audit.allActions')}</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`auditActions.${a}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[120px] max-w-[180px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t('audit.entity')}
          </label>
          <select
            value={entityFilter}
            onChange={(e) => handleFilterChange('entity', e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          >
            <option value="">{t('audit.allEntities')}</option>
            {ENTITY_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {total}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && logs.length === 0 && (
        <div className="text-center py-12 bg-muted rounded-lg">
          <p className="text-muted-foreground">{t('audit.noLogs')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('audit.subtitle')}
          </p>
        </div>
      )}

      {/* Log Entries */}
      {!isLoading && logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log: AuditLog) => (
            <div
              key={log.id}
              className="bg-card border border-border rounded-lg p-4 hover:border-border transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Action Badge */}
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
                    AUDIT_ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800',
                  )}
                >
                  {t(`auditActions.${log.action}`)}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {log.entity}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                      {log.entityId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="truncate">
                      {log.user
                        ? `${log.user.name} (${log.user.email})`
                        : 'System'}
                    </span>
                    <span className="text-border hidden md:inline">|</span>
                    <span className="hidden md:inline">{formatDate(log.createdAt)}</span>
                    <span className="md:hidden text-muted-foreground block w-full">{formatDate(log.createdAt)}</span>
                  </div>
                </div>

                {/* Expand Details — desktop only (inline) */}
                {log.details && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                    className="hidden md:inline-flex text-xs text-accent hover:text-accent-hover whitespace-nowrap"
                  >
                    {expandedId === log.id ? 'Hide' : t('audit.details')}
                  </button>
                )}
              </div>

              {/* Expand Details — mobile only (bottom of card) */}
              {log.details && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expandedId === log.id ? null : log.id)
                  }
                  className="md:hidden mt-3 w-full py-1.5 text-xs text-accent hover:text-accent-hover border border-border rounded-md transition-colors"
                >
                  {expandedId === log.id ? 'Hide' : t('audit.details')}
                </button>
              )}

              {/* Expanded Details */}
              {expandedId === log.id && log.details && (
                <pre className="mt-3 p-3 bg-muted rounded text-xs text-foreground overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
          >
            {t('common.back')}
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  );
}
