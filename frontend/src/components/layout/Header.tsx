import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store.ts';
import { ThemeLangControls } from '../shared/ThemeLangControls.tsx';
import { ROUTES } from '../../lib/constants.ts';
import { getInitials } from '../../lib/utils.ts';

export function Header() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-end px-4">
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
            <span className="text-sm text-foreground">{user.name}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
