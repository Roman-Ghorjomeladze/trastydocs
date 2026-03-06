import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Building2,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { ROUTES } from '../../lib/constants.ts';
import { AppLogo } from '../shared/AppLogo.tsx';

const NAV_ITEMS = [
  { label: 'Dashboard', href: ROUTES.ADMIN, icon: LayoutDashboard, exact: true },
  { label: 'Users', href: ROUTES.ADMIN_USERS, icon: Users },
  { label: 'Plans', href: ROUTES.ADMIN_PLANS, icon: CreditCard },
  { label: 'Companies', href: ROUTES.ADMIN_COMPANIES, icon: Building2 },
  { label: 'Documents', href: ROUTES.ADMIN_DOCUMENTS, icon: FileText },
];

export function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex flex-col w-64 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2.5 h-16 px-4">
        <AppLogo size={32} />
        <div>
          <span className="text-lg font-semibold text-white tracking-tight">Admin</span>
          <span className="text-xs text-sidebar-foreground ml-1.5">Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? location.pathname === item.href
            : location.pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl text-sm font-medium h-11 px-3 transition-all duration-200',
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Back to App */}
      <div className="px-3 pb-3">
        <Link
          to={ROUTES.DASHBOARD}
          className="group flex items-center gap-3 rounded-xl text-sm font-medium h-11 px-3 text-sidebar-foreground hover:bg-sidebar-hover hover:text-white transition-all duration-200"
        >
          <ArrowLeft className="w-4.5 h-4.5 flex-shrink-0 text-sidebar-foreground group-hover:text-white transition-colors duration-200" />
          <span>Back to App</span>
        </Link>
      </div>
    </aside>
  );
}
