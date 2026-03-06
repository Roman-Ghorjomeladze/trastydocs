import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store.ts';
import { useUiStore } from '../../stores/ui.store.ts';
import type { Theme, FontFamily, FontSize } from '../../stores/ui.store.ts';
import { useAuth } from '../../hooks/use-auth.ts';
import { ConfirmModal } from '../../components/shared/ConfirmModal.tsx';
import { changePassword, updateProfile } from '../../api/auth.ts';
import { getPlans } from '../../api/plans.ts';
import { getCheckoutParams, cancelSubscription } from '../../api/payments.ts';
import { openPaddleCheckout } from '../../lib/paddle.ts';
import { getInitials, formatDate } from '../../lib/utils.ts';
import { cn } from '../../lib/utils.ts';
import type { SubscriptionPlan } from '../../types/index.ts';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ka', label: 'ქართული', flag: '🇬🇪' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

const THEMES: { value: Theme; labelKey: string }[] = [
  { value: 'light', labelKey: 'profile.light' },
  { value: 'dark', labelKey: 'profile.dark' },
  { value: 'system', labelKey: 'profile.system' },
];

const FONTS: { value: FontFamily; labelKey: string; preview: string; css: string }[] = [
  { value: 'inter', labelKey: 'profile.fontInter', preview: 'Inter', css: "'Inter', sans-serif" },
  { value: 'nunito', labelKey: 'profile.fontNunito', preview: 'Nunito Sans', css: "'Nunito Sans', sans-serif" },
  { value: 'grotesk', labelKey: 'profile.fontGrotesk', preview: 'Space Grotesk', css: "'Space Grotesk', sans-serif" },
];

const FONT_SIZES: { value: FontSize; labelKey: string; icon: string }[] = [
  { value: 'standard', labelKey: 'profile.fontSizeStandard', icon: 'A' },
  { value: 'medium', labelKey: 'profile.fontSizeMedium', icon: 'A' },
  { value: 'large', labelKey: 'profile.fontSizeLarge', icon: 'A' },
];

function SubscriptionSection() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState('');

  const formatLimit = (value: number): string => {
    return value === -1 ? t('profile.unlimited') : String(value);
  };

  useEffect(() => {
    getPlans()
      .then((p) => setPlans(p.sort((a, b) => a.sortOrder - b.sortOrder)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentPlanId = user?.subscription?.planId;
  const currentPlanName = user?.subscription?.planName;

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan.id === currentPlanId) return;
    if (plan.price === 0) return; // Can't "buy" free plan

    setError('');
    setCheckoutLoading(plan.id);
    try {
      const params = await getCheckoutParams(plan.id);
      openPaddleCheckout({
        priceId: params.paddlePriceId,
        email: params.customerEmail,
        userId: params.customData.user_id,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancel = async () => {
    setShowCancelConfirm(false);
    setError('');
    setCancelLoading(true);
    try {
      await cancelSubscription();
      await fetchUser();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setCancelLoading(false);
    }
  };

  const hasPaidSubscription = plans.find((p) => p.id === currentPlanId)?.price !== undefined &&
    plans.find((p) => p.id === currentPlanId)?.price! > 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-1">
        {t('profile.subscriptionPlan')}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {t('profile.currentPlanLabel')} <span className="font-semibold text-foreground">{currentPlanName || t('profile.freePlan')}</span>
      </p>

      {error && (
        <p className="text-sm text-danger mb-4">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isPopular = plan.name === 'professional';
            const isFree = plan.price === 0;
            const hasPriceId = !!plan.paddlePriceId;

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-xl border p-4 transition-all',
                  isCurrent
                    ? 'border-accent bg-accent/5'
                    : isPopular
                      ? 'border-accent/50 shadow-sm'
                      : 'border-border',
                )}
              >
                {isPopular && !isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-accent text-white text-[10px] font-semibold rounded-full">
                    {t('profile.popular')}
                  </div>
                )}

                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">{plan.displayName}</h3>
                  <div>
                    <span className="text-lg font-bold text-foreground">${plan.price}</span>
                    <span className="text-xs text-muted-foreground">{t('profile.perMonth')}</span>
                  </div>
                </div>

                <ul className="space-y-1 mb-3">
                  {[
                    { label: t('profile.planCompanies'), value: formatLimit(plan.limits.maxCompanies) },
                    { label: t('profile.planContractors'), value: formatLimit(plan.limits.maxContractors) },
                    { label: t('profile.planDocuments'), value: formatLimit(plan.limits.maxDocuments) },
                  ].map((item) => (
                    <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span><span className="font-medium text-foreground">{item.value}</span> {item.label}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-1.5 px-3 text-xs font-medium rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                  >
                    {t('profile.currentPlanButton')}
                  </button>
                ) : isFree ? (
                  <button
                    disabled
                    className="w-full py-1.5 px-3 text-xs font-medium rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                  >
                    {t('profile.freePlan')}
                  </button>
                ) : !hasPriceId ? (
                  <button
                    disabled
                    className="w-full py-1.5 px-3 text-xs font-medium rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                  >
                    {t('profile.comingSoon')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={!!checkoutLoading}
                    className={cn(
                      'w-full py-1.5 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5',
                      isPopular
                        ? 'bg-accent text-white hover:bg-accent-hover disabled:opacity-50'
                        : 'bg-muted text-foreground hover:bg-border disabled:opacity-50',
                    )}
                  >
                    {checkoutLoading === plan.id ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>{t('profile.upgradeButton')} <ArrowRight className="w-3 h-3" /></>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasPaidSubscription && (
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={cancelLoading}
            className="text-xs text-muted-foreground hover:text-danger transition-colors disabled:opacity-50"
          >
            {cancelLoading ? t('profile.cancelling') : t('profile.cancelSubscription')}
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={showCancelConfirm}
        title={t('profile.cancelSubscription')}
        message={t('profile.cancelConfirm')}
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: parts[0] || '', lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { logout } = useAuth();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const fontFamily = useUiStore((s) => s.fontFamily);
  const setFontFamily = useUiStore((s) => s.setFontFamily);
  const fontSize = useUiStore((s) => s.fontSize);
  const setFontSize = useUiStore((s) => s.setFontSize);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Name form state
  const initialName = user ? splitName(user.name) : { firstName: '', lastName: '' };
  const [firstName, setFirstName] = useState(initialName.firstName);
  const [lastName, setLastName] = useState(initialName.lastName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const currentFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const nameChanged = user ? currentFullName !== user.name : false;

  const handleSaveName = async () => {
    if (!user || !firstName.trim()) return;

    setNameError('');
    setNameSuccess('');
    setIsSavingName(true);
    try {
      const updated = await updateProfile(user.id, { name: currentFullName });
      setUser(updated);
      setNameSuccess(t('profile.saved'));
      setTimeout(() => setNameSuccess(''), 3000);
    } catch {
      setNameError(t('profile.updateFailed'));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.passwordMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t('profile.passwordMinLength'));
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordSuccess(t('profile.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError(t('profile.passwordChangeFailed'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('app_language', code);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">{t('profile.title')}</h1>

      {/* Personal Information */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t('profile.personalInfo')}
        </h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center text-xl font-bold">
            {getInitials(currentFullName || user.name)}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('profile.memberSince')}: {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('profile.firstName')}
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setNameSuccess('');
                setNameError('');
              }}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-input text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('profile.lastName')}
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setNameSuccess('');
                setNameError('');
              }}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-input text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
        </div>

        {nameError && (
          <p className="text-sm text-danger mt-3">{nameError}</p>
        )}

        {nameSuccess && (
          <p className="text-sm text-green-600 mt-3">{nameSuccess}</p>
        )}

        {nameChanged && (
          <button
            type="button"
            onClick={handleSaveName}
            disabled={isSavingName || !firstName.trim()}
            className="mt-4 px-4 py-2 text-sm bg-accent text-white rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {isSavingName ? t('profile.saving') : t('profile.save')}
          </button>
        )}
      </div>

      {/* Subscription Plan */}
      <SubscriptionSection />

      {/* Change Password */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t('profile.changePassword')}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('profile.currentPassword')}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-input text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('profile.newPassword')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-input text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('profile.confirmPassword')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-input text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>

          {passwordError && (
            <p className="text-sm text-danger">{passwordError}</p>
          )}

          {passwordSuccess && (
            <p className="text-sm text-green-600">{passwordSuccess}</p>
          )}

          <button
            type="button"
            onClick={handleChangePassword}
            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="px-4 py-2 text-sm bg-accent text-white rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {isChangingPassword ? t('profile.saving') : t('profile.changePassword')}
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t('profile.preferences')}
        </h2>

        <div className="space-y-4">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('profile.language')}
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={cn(
                    'px-3 py-2.5 text-sm rounded-xl border transition-all duration-200 flex items-center gap-2',
                    i18n.language === lang.code
                      ? 'bg-accent/10 border-accent text-accent shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/20',
                  )}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('profile.theme')}
            </label>
            <div className="flex gap-2">
              {THEMES.map((themeOpt) => (
                <button
                  key={themeOpt.value}
                  type="button"
                  onClick={() => setTheme(themeOpt.value)}
                  className={cn(
                    'px-4 py-2.5 text-sm rounded-xl border transition-all duration-200 flex items-center gap-2',
                    theme === themeOpt.value
                      ? 'bg-accent/10 border-accent text-accent shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/20',
                  )}
                >
                  {themeOpt.value === 'light' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  {themeOpt.value === 'dark' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  {themeOpt.value === 'system' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                  {t(themeOpt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('profile.font')}
            </label>
            <div className="flex gap-2">
              {FONTS.map((fontOpt) => (
                <button
                  key={fontOpt.value}
                  type="button"
                  onClick={() => setFontFamily(fontOpt.value)}
                  className={cn(
                    'px-4 py-2.5 text-sm rounded-xl border transition-all duration-200 flex flex-col items-start gap-0.5',
                    fontFamily === fontOpt.value
                      ? 'bg-accent/10 border-accent text-accent shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/20',
                  )}
                >
                  <span
                    className="text-base font-semibold"
                    style={{ fontFamily: fontOpt.css }}
                  >
                    {fontOpt.preview}
                  </span>
                  <span className="text-xs opacity-70">{t(fontOpt.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('profile.fontSize')}
            </label>
            <div className="flex gap-2">
              {FONT_SIZES.map((sizeOpt, idx) => (
                <button
                  key={sizeOpt.value}
                  type="button"
                  onClick={() => setFontSize(sizeOpt.value)}
                  className={cn(
                    'px-4 py-2.5 text-sm rounded-xl border transition-all duration-200 flex items-center gap-2',
                    fontSize === sizeOpt.value
                      ? 'bg-accent/10 border-accent text-accent shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted hover:border-muted-foreground/20',
                  )}
                >
                  <span
                    className="font-semibold"
                    style={{ fontSize: [14, 17, 20][idx] }}
                  >
                    {sizeOpt.icon}
                  </span>
                  <span>{t(sizeOpt.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Log Out */}
      <div className="bg-card border border-border rounded-2xl p-6 mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {t('profile.logOut')}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('profile.logOutDescription')}
        </p>
        <button
          type="button"
          onClick={async () => {
            setIsLoggingOut(true);
            await logout();
          }}
          disabled={isLoggingOut}
          className="px-4 py-2 text-sm text-white bg-danger rounded-xl hover:bg-danger-hover disabled:opacity-50 transition-colors"
        >
          {isLoggingOut ? t('common.loading') : t('profile.logOut')}
        </button>
      </div>
    </div>
  );
}
