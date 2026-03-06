import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  X,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCompanyStore } from '../../stores/company.store.ts';
import { useAuthStore } from '../../stores/auth.store.ts';
import { cn, getInitials } from '../../lib/utils.ts';
import { ROUTES } from '../../lib/constants.ts';
import { AppLogo } from '../shared/AppLogo.tsx';
import type { Company } from '../../types/index.ts';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { companies, activeCompany, setActiveCompany } = useCompanyStore();
  const user = useAuthStore((s) => s.user);
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

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.();
  }, [location.pathname]);

  const mainNav: NavItem[] = [
    { label: t('sidebar.dashboard'), href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: t('sidebar.signatures'), href: ROUTES.SIGNATURES, icon: PenTool },
    { label: t('sidebar.companies'), href: ROUTES.COMPANIES, icon: Building2 },
  ];

  const companyNav: NavItem[] = activeCompany
    ? [
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
        {
          label: t('sidebar.members'),
          href: ROUTES.COMPANY_DETAIL(activeCompany.id),
          icon: Users,
        },
        {
          label: t('sidebar.vehicles'),
          href: ROUTES.VEHICLES(activeCompany.id),
          icon: Truck,
        },
        {
          label: t('sidebar.companySignatures'),
          href: ROUTES.COMPANY_SIGNATURES(activeCompany.id),
          icon: PenLine,
        },
        { label: t('sidebar.stamps'), href: ROUTES.STAMPS(activeCompany.id), icon: Stamp },
        {
          label: t('sidebar.auditLog'),
          href: ROUTES.AUDIT_LOGS(activeCompany.id),
          icon: ClipboardList,
        },
      ]
    : [];

  const handleSwitchCompany = (company: Company) => {
    const prevId = activeCompany?.id;
    setActiveCompany(company);
    setSwitcherOpen(false);

    // If currently on a company-specific page, navigate to the same page for the new company
    if (prevId && location.pathname.startsWith(`/companies/${prevId}`)) {
      const suffix = location.pathname.slice(`/companies/${prevId}`.length);
      navigate(`/companies/${company.id}${suffix}`);
    }
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

  const renderNavLink = (item: NavItem, active: boolean) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        to={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          'group flex items-center gap-3 rounded-xl text-sm font-medium h-11 px-3 whitespace-nowrap transition-all duration-200',
          active
            ? 'bg-sidebar-active text-sidebar-active-text'
            : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-white',
        )}
      >
        <Icon
          className={cn(
            'w-4.5 h-4.5 flex-shrink-0 transition-colors duration-200',
            active ? 'text-sidebar-active-text' : 'text-sidebar-foreground group-hover:text-white',
          )}
        />
        {/* On mobile always show text, on desktop respect collapse */}
        <span className={cn('md:hidden')}>{item.label}</span>
        <span className={cn('hidden md:inline', textCls)}>{item.label}</span>
      </Link>
    );
  };

  const sidebarContent = (
    <aside
      className={cn(
        'bg-sidebar text-sidebar-foreground flex flex-col overflow-hidden',
        // Mobile: full-width drawer, fixed height
        'h-full w-72',
        // Desktop: collapsible width with smooth transition
        'md:min-h-screen md:h-auto md:transition-[width] md:duration-300 md:ease-in-out',
        collapsed ? 'md:w-16' : 'md:w-64',
      )}
    >
      {/* Header */}
      <div className="flex items-center h-16 px-4 whitespace-nowrap">
        <button
          onClick={() => {
            setCollapsed(!collapsed);
            if (!collapsed) setSwitcherOpen(false);
          }}
          className="hidden md:flex items-center gap-2.5 rounded-xl hover:opacity-80 transition-opacity"
          aria-label={collapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
        >
          <AppLogo size={32} className="flex-shrink-0" />
          <span className={cn('text-lg font-semibold text-white tracking-tight', textCls)}>
            {t('app.name')}
          </span>
        </button>

        {/* Mobile header: logo + close button */}
        <div className="flex md:hidden items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <AppLogo size={32} className="flex-shrink-0" />
            <span className="text-lg font-semibold text-white tracking-tight">{t('app.name')}</span>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="p-2 rounded-xl text-sidebar-foreground hover:bg-sidebar-hover hover:text-white transition-all duration-200"
            aria-label={t('sidebar.closeMenu')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ChevronsLeft
          className={cn(
            'w-4 h-4 text-sidebar-foreground cursor-pointer hover:text-white ml-auto flex-shrink-0 hidden md:block transition-colors duration-200',
            textCls,
          )}
          onClick={() => {
            setCollapsed(true);
            setSwitcherOpen(false);
          }}
        />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden sidebar-scroll px-3 py-2">
        {/* Main navigation */}
        {mainNav.map((item) => renderNavLink(item, isActive(item)))}

        {/* Company Switcher */}
        {companies.length > 0 && (
          <div className="pt-5">
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
                className="w-full flex items-center gap-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-hover hover:text-white h-11 px-3 whitespace-nowrap transition-all duration-200"
              >
                {activeCompany ? (
                  <>
                    <span className="w-7 h-7 rounded-lg bg-accent/20 text-sidebar-active-text flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {getInitials(activeCompany.name)}
                    </span>
                    {/* Mobile: always show */}
                    <span className="flex md:hidden items-center gap-1 flex-1 min-w-0">
                      <span className="truncate flex-1 text-left">{activeCompany.name}</span>
                      {switcherOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-sidebar-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground flex-shrink-0" />
                      )}
                    </span>
                    {/* Desktop: respect collapse */}
                    <span
                      className={cn('hidden md:flex items-center gap-1 flex-1 min-w-0', textCls)}
                    >
                      <span className="truncate flex-1 text-left">{activeCompany.name}</span>
                      {switcherOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-sidebar-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground flex-shrink-0" />
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-4.5 h-4.5 flex-shrink-0 text-sidebar-foreground" />
                    <span className="md:hidden text-sidebar-foreground">
                      {t('sidebar.selectCompany')}
                    </span>
                    <span className={cn('hidden md:inline text-sidebar-foreground', textCls)}>
                      {t('sidebar.selectCompany')}
                    </span>
                  </>
                )}
              </button>

              {switcherOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-sidebar border border-sidebar-border rounded-xl shadow-xl shadow-black/20 z-10 max-h-48 overflow-y-auto backdrop-blur-sm">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleSwitchCompany(company)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left whitespace-nowrap transition-all duration-200 first:rounded-t-xl last:rounded-b-xl',
                        company.id === activeCompany?.id
                          ? 'bg-sidebar-active text-sidebar-active-text'
                          : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-white',
                      )}
                    >
                      <span className="w-6 h-6 rounded-md bg-accent/20 text-sidebar-active-text flex items-center justify-center text-xs font-semibold flex-shrink-0">
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
            {/* Separator with company name */}
            <div className="pt-3 pb-2">
              {/* Mobile: always show */}
              <p className="md:hidden px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-widest truncate whitespace-nowrap">
                {activeCompany?.name}
              </p>
              {/* Desktop: respect collapse */}
              <p
                className={cn(
                  'hidden md:block px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-widest truncate whitespace-nowrap',
                  textCls,
                )}
              >
                {activeCompany?.name}
              </p>
            </div>
            {companyNav.map((item) => {
              const active =
                location.pathname === item.href ||
                (item.icon !== Users && location.pathname.startsWith(item.href));
              return renderNavLink(item, active);
            })}
          </>
        )}
      </nav>

      {/* Admin link — only visible for admins */}
      {user?.isAdmin && (
        <div className="px-3 pb-3">
          <Link
            to={ROUTES.ADMIN}
            title={collapsed ? t('sidebar.adminPanel') : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-xl text-sm font-medium h-11 px-3 whitespace-nowrap transition-all duration-200',
              location.pathname.startsWith('/admin')
                ? 'bg-sidebar-active text-sidebar-active-text'
                : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-white',
            )}
          >
            <Shield
              className={cn(
                'w-4.5 h-4.5 flex-shrink-0 transition-colors duration-200',
                location.pathname.startsWith('/admin')
                  ? 'text-sidebar-active-text'
                  : 'text-sidebar-foreground group-hover:text-white',
              )}
            />
            <span className="md:hidden">{t('sidebar.adminPanel')}</span>
            <span className={cn('hidden md:inline', textCls)}>{t('sidebar.adminPanel')}</span>
          </Link>
        </div>
      )}
    </aside>
  );

  // ── Mobile drawer animation state ──
  const [mobileVisible, setMobileVisible] = useState(false);
  const [mobileAnimating, setMobileAnimating] = useState(false);
  const animationTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (mobileOpen) {
      setMobileVisible(true);
      clearTimeout(animationTimer.current);
      animationTimer.current = setTimeout(() => {
        setMobileAnimating(true);
      }, 20);
    } else {
      setMobileAnimating(false);
      clearTimeout(animationTimer.current);
      animationTimer.current = setTimeout(() => {
        setMobileVisible(false);
      }, 350);
    }
    return () => clearTimeout(animationTimer.current);
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* Mobile sidebar — animated overlay drawer */}
      {mobileVisible && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className={cn(
              'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-[350ms] ease-in-out',
              mobileAnimating ? 'opacity-100' : 'opacity-0',
            )}
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div
            className={cn(
              'relative z-50 h-full transition-transform duration-[350ms] ease-out',
              mobileAnimating ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
