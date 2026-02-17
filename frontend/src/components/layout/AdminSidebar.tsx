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
    <aside className="bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shadow-[4px_0_12px_rgba(0,0,0,0.15)] w-64 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-sidebar-border h-16 px-4">
        <AppLogo size={32} />
        <div>
          <span className="text-lg font-semibold text-sidebar-foreground">Admin</span>
          <span className="text-xs text-muted-foreground ml-1.5">Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
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
                'flex items-center gap-3 rounded-md text-sm h-9 px-2.5',
                active
                  ? 'bg-sidebar-hover text-white'
                  : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-white',
              )}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Back to App */}
      <div className="p-3 border-t border-sidebar-border">
        <Link
          to={ROUTES.DASHBOARD}
          className="flex items-center gap-3 rounded-md text-sm h-9 px-2.5 text-sidebar-foreground hover:bg-sidebar-hover hover:text-white"
        >
          <ArrowLeft className="w-[18px] h-[18px] flex-shrink-0" />
          <span>Back to App</span>
        </Link>
      </div>
    </aside>
  );
}
