import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth.store.ts';
import { exchangeAuthCode } from '../../api/auth.ts';
import { ROUTES } from '../../lib/constants.ts';

export function AuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setToken = useAuthStore((s) => s.setToken);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    // SECURITY: The backend now sends a short-lived one-time auth code instead of
    // the JWT directly in the URL. Exchange the code for an access token via API.
    const code = searchParams.get('code');
    // Backward compatibility: also support legacy ?token= param during rollout
    const legacyToken = searchParams.get('token');

    if (code) {
      exchangeAuthCode(code)
        .then(({ accessToken }) => {
          setToken(accessToken);
          localStorage.removeItem('referral_code');
          return fetchUser();
        })
        .then(() => {
          navigate(ROUTES.DASHBOARD, { replace: true });
        })
        .catch(() => {
          navigate(ROUTES.LOGIN, { replace: true });
        });
    } else if (legacyToken) {
      setToken(legacyToken);
      localStorage.removeItem('referral_code');
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
