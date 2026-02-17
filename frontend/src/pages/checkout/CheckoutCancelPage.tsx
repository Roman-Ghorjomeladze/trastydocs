import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react';

export function CheckoutCancelPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-6">
          <XCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t('checkout.cancelTitle')}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t('checkout.cancelMessage')}
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-2.5 text-sm font-medium bg-muted text-foreground rounded-lg hover:bg-border transition-colors"
          >
            {t('checkout.backToProfile')}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            {t('checkout.goToDashboard')}
          </button>
        </div>
      </div>
    </div>
  );
}
