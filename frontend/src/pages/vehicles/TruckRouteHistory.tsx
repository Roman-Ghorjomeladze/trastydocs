import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDocuments } from '../../api/documents.ts';
import type { Document } from '../../types/index.ts';

interface TruckRouteHistoryProps {
  companyId: string;
  licensePlate: string;
  colSpan: number;
}

interface RouteEntry {
  id: string;
  documentNumber?: string;
  transportRoute: string;
  amount: number;
  currency: string;
  date: string;
}

function formatRoute(route: string): string {
  return route.replace(/\s*[-–—]\s*/g, ' → ');
}

function getMonthRange(month: string): { dateFrom: string; dateTo: string } {
  const [year, m] = month.split('-').map(Number);
  const dateFrom = `${year}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const dateTo = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { dateFrom, dateTo };
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function extractRoutes(docs: Document[]): RouteEntry[] {
  return docs
    .filter((doc) => {
      const input = doc.inputData as Record<string, unknown>;
      return input?.transportRoute;
    })
    .map((doc) => {
      const input = doc.inputData as Record<string, unknown>;
      const currency = (doc.baseCurrency as string) || (input.currency as string) || '';
      const amount =
        (doc.baseCurrencyAmount as number) ||
        (input.totalAmount as number) ||
        (input.total as number) ||
        0;
      return {
        id: doc.id,
        documentNumber: doc.documentNumber,
        transportRoute: input.transportRoute as string,
        amount,
        currency,
        date: (input.invoiceDate as string) || doc.createdAt,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function TruckRouteHistory({ companyId, licensePlate, colSpan }: TruckRouteHistoryProps) {
  const { t } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [routes, setRoutes] = useState<RouteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoutes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { dateFrom, dateTo } = getMonthRange(selectedMonth);
      const docs = await getDocuments(companyId, {
        vehiclePlate: licensePlate,
        dateFrom,
        dateTo,
      });
      setRoutes(extractRoutes(docs));
    } catch (err) {
      console.error('Failed to load route history:', err);
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, licensePlate, selectedMonth]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

  const formatAmount = (amount: number, currency: string) => {
    if (!amount) return '';
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <td colSpan={colSpan}>
      <div className="px-6 py-4 bg-muted/40">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-semibold text-foreground">
              {t('vehicles.routeHistory')}
            </h4>
            {!isLoading && routes.length > 0 && (
              <span className="text-xs text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-full">
                {t('vehicles.totalTrips', { count: routes.length })}
              </span>
            )}
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm bg-card border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && routes.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">{t('vehicles.noRoutes')}</p>
          </div>
        )}

        {/* Timeline */}
        {!isLoading && routes.length > 0 && (
          <div className="relative ml-1">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

            {routes.map((route, index) => (
              <div key={route.id} className="relative pl-8 pb-4 last:pb-0">
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
                    index === routes.length - 1
                      ? 'bg-accent border-accent'
                      : 'bg-card border-accent/50'
                  }`}
                />

                {/* Route card */}
                <div className="bg-card border border-border rounded-xl p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {formatRoute(route.transportRoute)}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(route.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {route.documentNumber && (
                      <span className="text-xs text-muted-foreground font-mono">
                        #{route.documentNumber}
                      </span>
                    )}
                    {route.amount > 0 && (
                      <span className="text-xs font-medium text-foreground font-mono">
                        {formatAmount(route.amount, route.currency)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </td>
  );
}
