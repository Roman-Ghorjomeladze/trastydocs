import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAuthStore } from '../../stores/auth.store.ts';
import { useCompanyStore } from '../../stores/company.store.ts';
import { getDashboardStats } from '../../api/documents.ts';
import { fetchAnalytics } from '../../api/analytics.ts';
import { exportAnalyticsToExcel } from '../../lib/excel-export.ts';
import { ROUTES, STATUS_COLORS, STATUS_LABELS } from '../../lib/constants.ts';
import { OverflowTooltip } from '../../components/shared/OverflowTooltip.tsx';
import { formatDate } from '../../lib/utils.ts';
import { getVehicles } from '../../api/vehicles.ts';
import { getContractors } from '../../api/contractors.ts';
import type { DashboardStats, AnalyticsData, AnalyticsFilters, Vehicle, Contractor } from '../../types/index.ts';

// ── Chart Colors ──
const CHART_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

const STATUS_CHART_COLORS: Record<string, string> = {
  DRAFT: '#9CA3AF',
  PENDING_SIGNATURE: '#F59E0B',
  SIGNED: '#3B82F6',
  SENT: '#06B6D4',
  VIEWED: '#6366F1',
  COMPLETED: '#10B981',
  PAID: '#059669',
  OVERDUE: '#EF4444',
  CANCELLED: '#DC2626',
  ARCHIVED: '#F97316',
};

// ── Date Range Presets ──
type DatePreset = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all' | 'custom';

function getDateRange(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case 'this_month':
      return {
        dateFrom: new Date(year, month, 1).toISOString().slice(0, 10),
        dateTo: new Date(year, month + 1, 0).toISOString().slice(0, 10),
      };
    case 'last_month':
      return {
        dateFrom: new Date(year, month - 1, 1).toISOString().slice(0, 10),
        dateTo: new Date(year, month, 0).toISOString().slice(0, 10),
      };
    case 'this_quarter': {
      const quarterStart = Math.floor(month / 3) * 3;
      return {
        dateFrom: new Date(year, quarterStart, 1).toISOString().slice(0, 10),
        dateTo: new Date(year, quarterStart + 3, 0).toISOString().slice(0, 10),
      };
    }
    case 'this_year':
      return {
        dateFrom: new Date(year, 0, 1).toISOString().slice(0, 10),
        dateTo: new Date(year, 11, 31).toISOString().slice(0, 10),
      };
    case 'all':
    default:
      return {};
  }
}

// ── Custom Tooltip ──
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="text-sm">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Dropdown Select Component ──
function FilterDropdown({
  label,
  value,
  options,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none cursor-pointer min-w-[140px]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Multi-select Dropdown ──
function MultiFilterDropdown({
  label,
  selectedValues,
  options,
  onToggle,
  allLabel,
}: {
  label: string;
  selectedValues: string[];
  options: { value: string; label: string }[];
  onToggle: (value: string) => void;
  allLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const displayText =
    selectedValues.length === 0
      ? allLabel
      : selectedValues.length === 1
        ? options.find((o) => o.value === selectedValues[0])?.label || selectedValues[0]
        : `${selectedValues.length} selected`;

  return (
    <div className="flex flex-col gap-1 relative">
      <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground hover:border-accent/50 focus:ring-2 focus:ring-accent focus:border-accent outline-none cursor-pointer min-w-[140px] text-left flex items-center justify-between gap-2"
      >
        <span className="truncate">{displayText}</span>
        <svg
          className={`w-3 h-3 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px] max-h-[240px] overflow-y-auto">
            {options.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onToggle(opt.value)}
                  className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-muted transition-colors"
                >
                  <span
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-accent border-accent' : 'border-border'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const activeCompany = useCompanyStore((s) => s.activeCompany);
  const companies = useCompanyStore((s) => s.companies);
  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Vehicles & contractors data
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allContractors, setAllContractors] = useState<Contractor[]>([]);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('this_year');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedVehiclePlates, setSelectedVehiclePlates] = useState<string[]>([]);
  const [selectedTrailerPlates, setSelectedTrailerPlates] = useState<string[]>([]);
  const [selectedBuyerIds, setSelectedBuyerIds] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);

  // Ensure companies are loaded
  useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies();
    }
  }, [companies.length, fetchCompanies]);

  // Load vehicles and contractors for all companies
  useEffect(() => {
    const loadData = async () => {
      if (companies.length === 0) return;
      try {
        const vehicleResults: Vehicle[] = [];
        const contractorResults: Contractor[] = [];
        for (const company of companies) {
          const [vehicles, contractors] = await Promise.all([
            getVehicles(company.id),
            getContractors(company.id),
          ]);
          vehicleResults.push(...vehicles);
          contractorResults.push(...contractors);
        }
        setAllVehicles(vehicleResults);
        setAllContractors(contractorResults);
      } catch {
        // silently fail
      }
    };
    loadData();
  }, [companies]);

  // Memoize truck and trailer options
  const truckOptions = useMemo(() => {
    const trucks = allVehicles.filter((v) => v.type === 'TRUCK' && v.isActive);
    return trucks.map((v) => ({
      value: v.licensePlate,
      label: `${v.model} (${v.licensePlate})`,
    }));
  }, [allVehicles]);

  const trailerOptions = useMemo(() => {
    const trailers = allVehicles.filter((v) => v.type === 'TRAILER' && v.isActive);
    return trailers.map((v) => ({
      value: v.licensePlate,
      label: `${v.model} (${v.licensePlate})`,
    }));
  }, [allVehicles]);

  // Contractor options for filter
  const contractorOptions = useMemo(() => {
    const activeContractors = allContractors.filter((c) => c.isActive);
    // Deduplicate by id (in case same contractor appears in multiple companies)
    const seen = new Set<string>();
    return activeContractors
      .filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .map((c) => ({ value: c.id, label: c.name }));
  }, [allContractors]);

  // Currency options extracted from analytics data
  const currencyOptions = useMemo(() => {
    if (!analytics?.byCurrency) return [];
    return analytics.byCurrency.map((c) => ({
      value: c.currency,
      label: c.currency,
    }));
  }, [analytics?.byCurrency]);

  // Load basic dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);

  // Load analytics when filters change
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsAnalyticsLoading(true);
      try {
        const dateRange = datePreset === 'custom'
          ? { dateFrom: customDateFrom || undefined, dateTo: customDateTo || undefined }
          : getDateRange(datePreset);

        const filters: AnalyticsFilters = {
          ...dateRange,
          companyIds: selectedCompanyIds.length > 0 ? selectedCompanyIds : undefined,
          vehiclePlates: selectedVehiclePlates.length > 0 ? selectedVehiclePlates : undefined,
          trailerPlates: selectedTrailerPlates.length > 0 ? selectedTrailerPlates : undefined,
          buyerIds: selectedBuyerIds.length > 0 ? selectedBuyerIds : undefined,
          currencies: selectedCurrencies.length > 0 ? selectedCurrencies : undefined,
        };

        const data = await fetchAnalytics(filters);
        setAnalytics(data);
      } catch {
        // silently fail
      } finally {
        setIsAnalyticsLoading(false);
      }
    };
    loadAnalytics();
  }, [datePreset, customDateFrom, customDateTo, selectedCompanyIds, selectedVehiclePlates, selectedTrailerPlates, selectedBuyerIds, selectedCurrencies]);

  // Format currency
  const formatAmount = (amount: number, currency?: string) => {
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`;
  };

  // Handle Excel export
  const handleExport = async () => {
    if (!analytics?.documents?.length) return;
    setIsExporting(true);
    try {
      await exportAnalyticsToExcel(analytics.documents, 'analytics-export');
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle helpers for multi-select
  const toggleCompanyFilter = useCallback((companyId: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId],
    );
  }, []);

  const toggleVehicleFilter = useCallback((plate: string) => {
    setSelectedVehiclePlates((prev) =>
      prev.includes(plate) ? prev.filter((p) => p !== plate) : [...prev, plate],
    );
  }, []);

  const toggleTrailerFilter = useCallback((plate: string) => {
    setSelectedTrailerPlates((prev) =>
      prev.includes(plate) ? prev.filter((p) => p !== plate) : [...prev, plate],
    );
  }, []);

  const toggleBuyerFilter = useCallback((buyerId: string) => {
    setSelectedBuyerIds((prev) =>
      prev.includes(buyerId) ? prev.filter((id) => id !== buyerId) : [...prev, buyerId],
    );
  }, []);

  const toggleCurrencyFilter = useCallback((currency: string) => {
    setSelectedCurrencies((prev) =>
      prev.includes(currency) ? prev.filter((c) => c !== currency) : [...prev, currency],
    );
  }, []);

  // Memoized chart data
  const statusPieData = useMemo(() => {
    if (!analytics?.byStatus) return [];
    return Object.entries(analytics.byStatus)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: t(`status.${status}`) || STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_CHART_COLORS[status] || '#9CA3AF',
      }));
  }, [analytics?.byStatus, t]);

  const monthlyBarData = useMemo(() => {
    if (!analytics?.byMonth) return [];
    return analytics.byMonth.map((m) => ({
      month: m.month,
      [t('analytics.revenue')]: m.baseCurrencyAmount,
      [t('analytics.documents')]: m.count,
    }));
  }, [analytics?.byMonth, t]);

  const companyBarData = useMemo(() => {
    if (!analytics?.byCompany) return [];
    return analytics.byCompany
      .sort((a, b) => b.baseCurrencyAmount - a.baseCurrencyAmount)
      .slice(0, 10)
      .map((c) => ({
        name: c.companyName.length > 20 ? c.companyName.slice(0, 20) + '...' : c.companyName,
        [t('analytics.revenue')]: c.baseCurrencyAmount,
      }));
  }, [analytics?.byCompany, t]);

  const currencyPieData = useMemo(() => {
    if (!analytics?.byCurrency) return [];
    return analytics.byCurrency.map((c, i) => ({
      name: c.currency,
      value: c.amount,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [analytics?.byCurrency]);

  // Date presets list
  const datePresets: { value: DatePreset; label: string }[] = [
    { value: 'this_month', label: t('analytics.thisMonth') },
    { value: 'last_month', label: t('analytics.lastMonth') },
    { value: 'this_quarter', label: t('analytics.thisQuarter') },
    { value: 'this_year', label: t('analytics.thisYear') },
    { value: 'all', label: t('analytics.allTime') },
    { value: 'custom', label: t('analytics.custom') },
  ];

  // Company dropdown options
  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, label: c.name })),
    [companies],
  );

  // Check if we have any filters active
  const hasActiveFilters =
    selectedCompanyIds.length > 0 ||
    selectedVehiclePlates.length > 0 ||
    selectedTrailerPlates.length > 0 ||
    selectedBuyerIds.length > 0 ||
    selectedCurrencies.length > 0;

  const clearAllFilters = () => {
    setSelectedCompanyIds([]);
    setSelectedVehiclePlates([]);
    setSelectedTrailerPlates([]);
    setSelectedBuyerIds([]);
    setSelectedCurrencies([]);
    setDatePreset('this_year');
    setCustomDateFrom('');
    setCustomDateTo('');
  };

  // Stat cards from analytics
  const summaryCards = [
    {
      label: t('analytics.totalDocuments'),
      value: analytics?.totalDocuments ?? stats?.total ?? 0,
      icon: (
        <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-accent/10',
    },
    {
      label: t('analytics.totalRevenue'),
      value: formatAmount(analytics?.totalBaseCurrencyAmount ?? 0, analytics?.baseCurrency),
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-100',
    },
    {
      label: t('analytics.paid'),
      value: analytics?.paidCount ?? 0,
      icon: (
        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-emerald-100',
    },
    {
      label: t('analytics.overdue'),
      value: analytics?.overdueCount ?? 0,
      icon: (
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'bg-red-100',
    },
  ];

  return (
    <div>
      {/* Welcome Banner */}
      <div className="mb-6">
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
          {/* ── Filters Bar ── */}
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-end gap-3">
              {/* Date preset dropdown */}
              <FilterDropdown
                label={t('analytics.dateRange')}
                value={datePreset}
                options={datePresets.map((p) => ({ value: p.value, label: p.label }))}
                onChange={(v) => setDatePreset(v as DatePreset)}
              />

              {/* Custom date range inputs */}
              {datePreset === 'custom' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      {t('analytics.from')}
                    </label>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      {t('analytics.to')}
                    </label>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                    />
                  </div>
                </>
              )}

              {/* Company filter dropdown */}
              {companies.length > 1 && (
                <MultiFilterDropdown
                  label={t('analytics.company')}
                  selectedValues={selectedCompanyIds}
                  options={companyOptions}
                  onToggle={toggleCompanyFilter}
                  allLabel={t('analytics.allCompanies')}
                />
              )}

              {/* Truck filter dropdown */}
              {truckOptions.length > 0 && (
                <MultiFilterDropdown
                  label={t('analytics.truck')}
                  selectedValues={selectedVehiclePlates}
                  options={truckOptions}
                  onToggle={toggleVehicleFilter}
                  allLabel={t('analytics.allTrucks')}
                />
              )}

              {/* Trailer filter dropdown */}
              {trailerOptions.length > 0 && (
                <MultiFilterDropdown
                  label={t('analytics.trailer')}
                  selectedValues={selectedTrailerPlates}
                  options={trailerOptions}
                  onToggle={toggleTrailerFilter}
                  allLabel={t('analytics.allTrailers')}
                />
              )}

              {/* Contractor filter dropdown */}
              {contractorOptions.length > 0 && (
                <MultiFilterDropdown
                  label={t('analytics.contractor')}
                  selectedValues={selectedBuyerIds}
                  options={contractorOptions}
                  onToggle={toggleBuyerFilter}
                  allLabel={t('analytics.allContractors')}
                />
              )}

              {/* Currency filter dropdown */}
              {currencyOptions.length > 0 && (
                <MultiFilterDropdown
                  label={t('analytics.currency')}
                  selectedValues={selectedCurrencies}
                  options={currencyOptions}
                  onToggle={toggleCurrencyFilter}
                  allLabel={t('analytics.allCurrencies')}
                />
              )}

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-end"
                >
                  {t('analytics.clearFilters')}
                </button>
              )}

              {/* Export button — push to right */}
              <div className="ml-auto self-end">
                <button
                  onClick={handleExport}
                  disabled={isExporting || !analytics?.documents?.length}
                  className="px-4 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {isExporting ? t('analytics.exporting') : t('analytics.exportExcel')}
                </button>
              </div>
            </div>
          </div>

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {summaryCards.map((card) => (
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

          {/* ── Charts Grid ── */}
          {isAnalyticsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Revenue Over Time */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  {t('analytics.revenueOverTime')}
                </h3>
                {monthlyBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey={t('analytics.revenue')} fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                    {t('analytics.noData')}
                  </div>
                )}
              </div>

              {/* Status Breakdown */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  {t('analytics.statusBreakdown')}
                </h3>
                {statusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                    {t('analytics.noData')}
                  </div>
                )}
              </div>

              {/* Revenue by Company */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  {t('analytics.revenueByCompany')}
                </h3>
                {companyBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={companyBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={120} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey={t('analytics.revenue')} fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                    {t('analytics.noData')}
                  </div>
                )}
              </div>

              {/* Currency Distribution */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  {t('analytics.currencyDistribution')}
                </h3>
                {currencyPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={currencyPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {currencyPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                    {t('analytics.noData')}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* ── Documents Table ── */}
          {analytics?.documents && analytics.documents.length > 0 && (
            <div className="bg-card border border-border rounded-lg mb-6">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  {t('analytics.documentsTable')} ({analytics.documents.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{t('analytics.date')}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{t('analytics.docNumber')}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{t('analytics.company')}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{t('analytics.buyer')}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{t('analytics.status')}</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">{t('analytics.amount')}</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">{t('analytics.baseAmount')}</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">{t('analytics.rate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {analytics.documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => {
                          navigate(ROUTES.DOCUMENT_DETAIL(doc.companyId, doc.id));
                        }}
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(doc.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-foreground">
                          {doc.documentNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground max-w-[150px]">
                          <OverflowTooltip>{doc.companyName}</OverflowTooltip>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground max-w-[150px]">
                          <OverflowTooltip>{doc.buyerName || '-'}</OverflowTooltip>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                              STATUS_COLORS[doc.status] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {t(`status.${doc.status}`) || STATUS_LABELS[doc.status] || doc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground text-right whitespace-nowrap font-mono">
                          {doc.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {doc.currency}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground text-right whitespace-nowrap font-mono">
                          {doc.baseCurrencyAmount != null
                            ? `${doc.baseCurrencyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${doc.baseCurrency || ''}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground text-right whitespace-nowrap font-mono">
                          {doc.exchangeRate != null ? doc.exchangeRate.toFixed(4) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Recent Documents (fallback when no analytics) ── */}
          {!analytics && stats?.recentDocuments && (
            <div className="bg-card border border-border rounded-lg mb-6">
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

              {stats.recentDocuments.length > 0 ? (
                <div className="divide-y divide-border">
                  {stats.recentDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="px-5 py-3 flex items-center gap-4 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => {
                        navigate(ROUTES.DOCUMENT_DETAIL(doc.companyId, doc.id));
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
                          {doc.company?.name && <span>{doc.company.name}</span>}
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
          )}

          {/* ── Quick Actions ── */}
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
