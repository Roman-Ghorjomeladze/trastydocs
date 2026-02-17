import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Check, Zap, ArrowRight } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store.ts';
import { getPlans } from '../../api/plans.ts';
import { getCheckoutParams } from '../../api/payments.ts';
import { openPaddleCheckout } from '../../lib/paddle.ts';
import { useAuthStore } from '../../stores/auth.store.ts';
import type { SubscriptionPlan } from '../../types/index.ts';
import { cn } from '../../lib/utils.ts';

const RESOURCE_KEYS: Record<string, string> = {
  companies: 'upgrade.companies',
  contractors: 'upgrade.contractors',
  documents: 'upgrade.documents',
  signatures: 'upgrade.signaturesPerCo',
  stamps: 'upgrade.stampsPerCo',
};

export function UpgradePlanModal() {
  const { t } = useTranslation();
  const { upgradeModal, hideUpgradeModal } = useUiStore();
  const user = useAuthStore((s) => s.user);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const formatLimit = (value: number): string =>
    value === -1 ? t('upgrade.unlimited') : String(value);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideUpgradeModal();
    },
    [hideUpgradeModal],
  );

  useEffect(() => {
    if (upgradeModal.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      setLoading(true);
      getPlans()
        .then((p) => setPlans(p.sort((a, b) => a.sortOrder - b.sortOrder)))
        .catch(() => {})
        .finally(() => setLoading(false));
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [upgradeModal.isOpen, handleKeyDown]);

  if (!upgradeModal.isOpen) return null;

  const currentPlanId = user?.subscription?.planId;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={hideUpgradeModal}
    >
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl mx-4 p-8 animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={hideUpgradeModal}
          className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            {t('upgrade.limitReached')}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t('upgrade.title')}
          </h2>
          {upgradeModal.resource && (
            <p className="text-muted-foreground">
              {t('upgrade.usageMessage', {
                current: upgradeModal.currentUsage,
                limit: upgradeModal.limit,
                resource: t(RESOURCE_KEYS[upgradeModal.resource] || upgradeModal.resource),
                plan: upgradeModal.planName,
              })}
            </p>
          )}
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const isPopular = plan.name === 'professional';

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative rounded-xl border p-5 transition-all',
                    isCurrent
                      ? 'border-accent/50 bg-accent/5'
                      : isPopular
                        ? 'border-accent shadow-lg shadow-accent/10'
                        : 'border-border hover:border-accent/30',
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-white text-xs font-semibold rounded-full">
                      {t('upgrade.popular')}
                    </div>
                  )}

                  <h3 className="text-lg font-semibold text-foreground">
                    {plan.displayName}
                  </h3>
                  <div className="mt-2 mb-4">
                    <span className="text-3xl font-bold text-foreground">
                      ${plan.price}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {t('pricing.perMonth')}
                    </span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {[
                      {
                        label: t('upgrade.companies'),
                        value: formatLimit(plan.limits.maxCompanies),
                      },
                      {
                        label: t('upgrade.contractors'),
                        value: formatLimit(plan.limits.maxContractors),
                      },
                      {
                        label: t('upgrade.documents'),
                        value: formatLimit(plan.limits.maxDocuments),
                      },
                      {
                        label: t('upgrade.signaturesPerCo'),
                        value: formatLimit(plan.limits.maxSignaturesPerCompany),
                      },
                      {
                        label: t('upgrade.stampsPerCo'),
                        value: formatLimit(plan.limits.maxStampsPerCompany),
                      },
                    ].map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>
                          <span className="font-medium text-foreground">
                            {item.value}
                          </span>{' '}
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    >
                      {t('upgrade.currentPlan')}
                    </button>
                  ) : plan.price === 0 ? (
                    <button
                      disabled
                      className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    >
                      {t('upgrade.free')}
                    </button>
                  ) : !plan.paddlePriceId ? (
                    <button
                      disabled
                      className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    >
                      {t('upgrade.comingSoon')}
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        setCheckoutLoading(plan.id);
                        try {
                          const params = await getCheckoutParams(plan.id);
                          openPaddleCheckout({
                            priceId: params.paddlePriceId,
                            email: params.customerEmail,
                            userId: params.customData.user_id,
                          });
                          hideUpgradeModal();
                        } catch {
                          hideUpgradeModal();
                        } finally {
                          setCheckoutLoading(null);
                        }
                      }}
                      disabled={!!checkoutLoading}
                      className={cn(
                        'w-full py-2 px-4 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
                        isPopular
                          ? 'bg-accent text-white hover:bg-accent-hover disabled:opacity-50'
                          : 'bg-muted text-foreground hover:bg-border disabled:opacity-50',
                      )}
                    >
                      {checkoutLoading === plan.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>{t('upgrade.upgrade')} <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {t('upgrade.footer')}
        </p>
      </div>
    </div>,
    document.body,
  );
}
