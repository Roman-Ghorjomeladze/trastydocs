import { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicHeader } from './PublicHeader.tsx';
import { ROUTES } from '../../lib/constants.ts';

export function PublicLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {t('app.name')}. {t('footer.rights')}</p>
          <div className="flex items-center gap-4">
            <Link to={ROUTES.TERMS} className="hover:text-foreground transition-colors">
              {t('footer.terms')}
            </Link>
            <Link to={ROUTES.PRICING} className="hover:text-foreground transition-colors">
              {t('footer.pricing')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
