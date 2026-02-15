import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth.store.ts';
import { ROUTES } from '../../lib/constants.ts';

export function AuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setToken = useAuthStore((s) => s.setToken);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      setToken(token);
      fetchUser().then(() => {
        navigate(ROUTES.DASHBOARD, { replace: true });
      });
    } else {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [searchParams, setToken, fetchUser, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4" />
        <p className="text-muted-foreground">{t('auth.signingYouIn')}</p>
      </div>
    </div>
  );
}
