import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store.ts';

export function CheckoutSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    // Refresh user data to get updated subscription
    fetchUser();
  }, [fetchUser]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t('checkout.successTitle')}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t('checkout.successMessage')}
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          {t('checkout.goToDashboard')}
        </button>
      </div>
    </div>
  );
}
