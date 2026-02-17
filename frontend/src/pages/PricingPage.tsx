import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ArrowRight, Zap } from 'lucide-react';
import { getPlans } from '../api/plans.ts';
import { useAuthStore } from '../stores/auth.store.ts';
import { ROUTES } from '../lib/constants.ts';
import { cn } from '../lib/utils.ts';
import type { SubscriptionPlan } from '../types/index.ts';

const PLAN_DESC_KEYS: Record<string, string> = {
  free: 'pricing.descFree',
  starter: 'pricing.descStarter',
  professional: 'pricing.descProfessional',
  enterprise: 'pricing.descEnterprise',
};

export function PricingPage() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const formatLimit = (value: number): string =>
    value === -1 ? t('pricing.unlimited') : String(value);

  useEffect(() => {
    getPlans()
      .then((p) => setPlans(p.sort((a, b) => a.sortOrder - b.sortOrder)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentPlanId = user?.subscription?.planId;

  const FEATURES = [
    t('pricing.featureInvoices'),
    t('pricing.featurePdf'),
    t('pricing.featureSignatures'),
    t('pricing.featureMultilang'),
    t('pricing.featureCompanies'),
    t('pricing.featureVehicles'),
    t('pricing.featureAudit'),
    t('pricing.featureDesign'),
  ];

  return (
    <div>
      {/* Header Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            {t('pricing.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            {t('pricing.title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const isCurrent = isAuthenticated && plan.id === currentPlanId;
                const isPopular = plan.name === 'professional';
                const isFree = plan.price === 0;

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'relative rounded-2xl border p-6 transition-all flex flex-col',
                      isPopular
                        ? 'border-accent shadow-lg shadow-accent/10 scale-[1.02]'
                        : 'border-border hover:border-accent/30 hover:shadow-md',
                    )}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-white text-xs font-semibold rounded-full">
                        {t('pricing.mostPopular')}
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {plan.displayName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(PLAN_DESC_KEYS[plan.name] || 'pricing.descFree')}
                      </p>
                    </div>

                    <div className="mb-6">
                      <span className="text-4xl font-bold text-foreground">
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {t('pricing.perMonth')}
                      </span>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      {[
                        {
                          label: t('pricing.companies'),
                          value: formatLimit(plan.limits.maxCompanies),
                        },
                        {
                          label: t('pricing.contractors'),
                          value: formatLimit(plan.limits.maxContractors),
                        },
                        {
                          label: t('pricing.documents'),
                          value: formatLimit(plan.limits.maxDocuments),
                        },
                        {
                          label: t('pricing.signaturesPerCompany'),
                          value: formatLimit(plan.limits.maxSignaturesPerCompany),
                        },
                        {
                          label: t('pricing.stampsPerCompany'),
                          value: formatLimit(plan.limits.maxStampsPerCompany),
                        },
                      ].map((item) => (
                        <li
                          key={item.label}
                          className="flex items-start gap-2.5 text-sm"
                        >
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">
                            <span className="font-semibold text-foreground">
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
                        className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-accent/10 text-accent cursor-default"
                      >
                        {t('pricing.currentPlan')}
                      </button>
                    ) : isAuthenticated ? (
                      <Link
                        to={ROUTES.PROFILE}
                        className={cn(
                          'w-full py-2.5 px-4 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
                          isPopular
                            ? 'bg-accent text-white hover:bg-accent-hover'
                            : 'bg-muted text-foreground hover:bg-border',
                        )}
                      >
                        {isFree ? t('pricing.downgrade') : t('pricing.upgrade')}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <Link
                        to={ROUTES.REGISTER}
                        className={cn(
                          'w-full py-2.5 px-4 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
                          isPopular
                            ? 'bg-accent text-white hover:bg-accent-hover'
                            : 'bg-muted text-foreground hover:bg-border',
                        )}
                      >
                        {isFree
                          ? t('pricing.getStartedFree')
                          : t('pricing.getStarted')}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FAQ / Features Section */}
      <section className="py-16 px-6 bg-card border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">
            {t('pricing.allPlansInclude')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t('pricing.customPlanTitle')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('pricing.customPlanSubtitle')}
          </p>
          {!isAuthenticated && (
            <Link
              to={ROUTES.REGISTER}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              {t('pricing.startFreeTrial')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
