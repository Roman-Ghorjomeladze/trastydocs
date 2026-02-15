import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth.store.ts';
import { useUiStore } from '../../stores/ui.store.ts';
import type { Theme } from '../../stores/ui.store.ts';
import { useAuth } from '../../hooks/use-auth.ts';
import { changePassword, updateProfile } from '../../api/auth.ts';
import { getInitials, formatDate } from '../../lib/utils.ts';
import { cn } from '../../lib/utils.ts';

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
      setPasswordError('Password must be at least 8 characters');
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
      setPasswordError('Failed to change password. Please check your current password.');
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
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
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
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
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
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
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
            className="mt-4 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {isSavingName ? t('profile.saving') : t('profile.save')}
          </button>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
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
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
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
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
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
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
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
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {isChangingPassword ? t('profile.saving') : t('profile.changePassword')}
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-card border border-border rounded-lg p-6">
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
                    'px-3 py-2 text-sm rounded-lg border transition-colors flex items-center gap-2',
                    i18n.language === lang.code
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted',
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
                    'px-4 py-2 text-sm rounded-lg border transition-colors flex items-center gap-2',
                    theme === themeOpt.value
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted',
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
        </div>
      </div>

      {/* Log Out */}
      <div className="bg-card border border-border rounded-lg p-6 mt-6">
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
          className="px-4 py-2 text-sm text-white bg-danger rounded-lg hover:bg-danger-hover disabled:opacity-50 transition-colors"
        >
          {isLoggingOut ? t('common.loading') : t('profile.logOut')}
        </button>
      </div>
    </div>
  );
}
