import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.ts';
import { ROUTES } from '../lib/constants.ts';

export function useAuth() {
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loginAction = useAuthStore((s) => s.login);
  const registerAction = useAuthStore((s) => s.register);
  const logoutAction = useAuthStore((s) => s.logout);

  const login = useCallback(
    async (email: string, password: string) => {
      await loginAction(email, password);
      navigate(ROUTES.DASHBOARD);
    },
    [loginAction, navigate],
  );

  const register = useCallback(
    async (data: { email: string; password: string; name: string }) => {
      await registerAction(data);
      navigate(ROUTES.DASHBOARD);
    },
    [registerAction, navigate],
  );

  const logout = useCallback(async () => {
    await logoutAction();
    navigate(ROUTES.LOGIN);
  }, [logoutAction, navigate]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
}
