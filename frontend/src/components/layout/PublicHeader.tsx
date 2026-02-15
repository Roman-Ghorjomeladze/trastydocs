import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth.store.ts';
import { ThemeLangControls } from '../shared/ThemeLangControls.tsx';
import { ROUTES } from '../../lib/constants.ts';

export function PublicHeader() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">T</span>
        </div>
        <span className="text-lg font-bold text-foreground">Trasty Docs</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <ThemeLangControls />

        {isAuthenticated ? (
          <Link
            to={ROUTES.DASHBOARD}
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            {t('dashboard.title')}
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to={ROUTES.LOGIN}
              className="px-4 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              {t('auth.signIn')}
            </Link>
            <Link
              to={ROUTES.REGISTER}
              className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              {t('auth.signUp')}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
