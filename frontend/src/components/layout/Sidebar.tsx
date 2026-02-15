import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Building2,
  PenTool,
  PenLine,
  Users,
  FileText,
  Contact,
  Stamp,
  Truck,
  ClipboardList,
  ChevronsLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCompanyStore } from '../../stores/company.store.ts';
import { cn, getInitials } from '../../lib/utils.ts';
import { ROUTES } from '../../lib/constants.ts';
import type { Company } from '../../types/index.ts';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { companies, activeCompany, setActiveCompany } = useCompanyStore();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [textOpacity, setTextOpacity] = useState(true);

  useEffect(() => {
    if (collapsed) {
      setTextOpacity(false);
    } else {
      const fadeInTimer = setTimeout(() => setTextOpacity(true), 280);
      return () => clearTimeout(fadeInTimer);
    }
  }, [collapsed]);

  const mainNav: NavItem[] = [
    { label: t('sidebar.dashboard'), href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: t('sidebar.signatures'), href: ROUTES.SIGNATURES, icon: PenTool },
    { label: t('sidebar.companies'), href: ROUTES.COMPANIES, icon: Building2 },
  ];

  const companyNav: NavItem[] = activeCompany
    ? [
        {
          label: t('sidebar.members'),
          href: ROUTES.COMPANY_DETAIL(activeCompany.id),
          icon: Users,
        },
        {
          label: t('sidebar.companySignatures'),
          href: ROUTES.COMPANY_SIGNATURES(activeCompany.id),
          icon: PenLine,
        },
        {
          label: t('sidebar.documents'),
          href: ROUTES.DOCUMENTS(activeCompany.id),
          icon: FileText,
        },
        {
          label: t('sidebar.contractors'),
          href: ROUTES.CONTRACTORS(activeCompany.id),
          icon: Contact,
        },
        { label: t('sidebar.stamps'), href: ROUTES.STAMPS(activeCompany.id), icon: Stamp },
        {
          label: t('sidebar.vehicles'),
          href: ROUTES.VEHICLES(activeCompany.id),
          icon: Truck,
        },
        {
          label: t('sidebar.auditLog'),
          href: ROUTES.AUDIT_LOGS(activeCompany.id),
          icon: ClipboardList,
        },
      ]
    : [];

  const handleSwitchCompany = (company: Company) => {
    setActiveCompany(company);
    setSwitcherOpen(false);
  };

  const isActive = (item: NavItem) =>
    location.pathname === item.href ||
    (item.icon !== Users &&
      location.pathname.startsWith(item.href) &&
      item.href !== ROUTES.DASHBOARD);

  // Text fades in/out via opacity — never removed from DOM so layout stays fixed
  const textCls = cn(
    'transition-opacity duration-200 whitespace-nowrap pointer-events-auto',
    textOpacity ? 'opacity-100' : 'opacity-0 pointer-events-none',
  );

  return (
    <aside
      className={cn(
        'bg-sidebar text-sidebar-foreground min-h-screen flex flex-col border-r border-sidebar-border shadow-[4px_0_12px_rgba(0,0,0,0.15)] transition-[width] duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header — fixed h-16, icon always at same position */}
      <div className="flex items-center border-b border-sidebar-border h-16 px-4 whitespace-nowrap">
        <button
          onClick={() => {
            setCollapsed(!collapsed);
            if (!collapsed) setSwitcherOpen(false);
          }}
          className="flex items-center gap-2.5 rounded-md hover:opacity-80"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center text-base font-bold flex-shrink-0">
            T
          </span>
          <span className={cn('text-lg font-semibold text-sidebar-foreground', textCls)}>
            {t('app.name')}
          </span>
        </button>
        <ChevronsLeft
          className={cn(
            'w-4 h-4 text-muted-foreground cursor-pointer hover:text-sidebar-foreground ml-auto flex-shrink-0',
            textCls,
          )}
          onClick={() => {
            setCollapsed(true);
            setSwitcherOpen(false);
          }}
        />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3">
        {/* Main navigation */}
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              to={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md text-sm h-9 px-2.5 whitespace-nowrap',
                active
                  ? 'bg-sidebar-hover text-white'
                  : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-white',
              )}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span className={textCls}>{item.label}</span>
            </Link>
          );
        })}

        {/* Company Switcher */}
        {companies.length > 0 && (
          <div className="pt-4">
            <div className="relative">
              <button
                onClick={() => {
                  if (collapsed) {
                    setCollapsed(false);
                    setTimeout(() => setSwitcherOpen(true), 350);
                  } else {
                    setSwitcherOpen(!switcherOpen);
                  }
                }}
                title={collapsed && activeCompany ? activeCompany.name : undefined}
                className="w-full flex items-center gap-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-hover hover:text-white h-9 px-2.5 whitespace-nowrap"
              >
                {activeCompany ? (
                  <>
                    <span className="w-6 h-6 rounded bg-accent text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {getInitials(activeCompany.name)}
                    </span>
                    <span className={cn('flex items-center gap-1 flex-1 min-w-0', textCls)}>
                      <span className="truncate flex-1 text-left">{activeCompany.name}</span>
                      {switcherOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-[18px] h-[18px] flex-shrink-0 text-muted-foreground" />
                    <span className={cn('text-muted-foreground', textCls)}>
                      {t('sidebar.selectCompany')}
                    </span>
                  </>
                )}
              </button>

              {switcherOpen && !collapsed && (
                <div className="absolute left-0 right-0 mt-1 bg-sidebar-hover border border-sidebar-border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleSwitchCompany(company)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left whitespace-nowrap',
                        company.id === activeCompany?.id
                          ? 'bg-sidebar text-white'
                          : 'text-sidebar-foreground hover:bg-sidebar hover:text-white',
                      )}
                    >
                      <span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {getInitials(company.name)}
                      </span>
                      <span className="truncate">{company.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Company-scoped nav */}
        {companyNav.length > 0 && (
          <>
            {/* Fixed-height separator — shows company name when expanded, border when collapsed */}
            <div className="pt-2 pb-1 border-b border-sidebar-border">
              <p
                className={cn(
                  'px-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate whitespace-nowrap',
                  textCls,
                )}
              >
                {activeCompany?.name}
              </p>
            </div>
            {companyNav.map((item) => {
              const Icon = item.icon;
              const active =
                location.pathname === item.href ||
                (item.icon !== Users && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md text-sm h-9 px-2.5 whitespace-nowrap',
                    active
                      ? 'bg-sidebar-hover text-white'
                      : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-white',
                  )}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className={textCls}>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
