import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store.ts';
import { ThemeLangControls } from '../shared/ThemeLangControls.tsx';
import { ROUTES } from '../../lib/constants.ts';
import { getInitials } from '../../lib/utils.ts';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sticky top-0 z-30">
      {/* Mobile burger button */}
      <button
        type="button"
        onClick={onMobileMenuToggle}
        className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Spacer on desktop (no burger) */}
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <ThemeLangControls />

        {user && (
          <Link
            to={ROUTES.PROFILE}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-medium">
              {getInitials(user.name)}
            </div>
            <span className="text-sm text-foreground hidden sm:inline">{user.name}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
