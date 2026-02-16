import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store.ts';
import { ThemeLangControls } from '../shared/ThemeLangControls.tsx';
import { AppLogo } from '../shared/AppLogo.tsx';
import { ROUTES } from '../../lib/constants.ts';

export function PublicHeader() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-card border-b border-border relative z-40">
      <div className="h-16 flex items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <AppLogo size={32} />
          <span className="text-lg font-bold text-foreground">Trasty Docs</span>
        </Link>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
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

        {/* Mobile burger button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden absolute left-0 right-0 top-16 bg-card border-b border-border shadow-lg z-40 animate-fade-in">
            <div className="px-4 py-4 space-y-4">
              <div className="flex items-center justify-center">
                <ThemeLangControls />
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                {isAuthenticated ? (
                  <Link
                    to={ROUTES.DASHBOARD}
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    {t('dashboard.title')}
                  </Link>
                ) : (
                  <>
                    <Link
                      to={ROUTES.LOGIN}
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-center px-4 py-2.5 text-sm text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      {t('auth.signIn')}
                    </Link>
                    <Link
                      to={ROUTES.REGISTER}
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-center px-4 py-2.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                    >
                      {t('auth.signUp')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
