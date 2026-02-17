import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export type Theme = 'light' | 'dark' | 'system';

interface UpgradeModalState {
  isOpen: boolean;
  resource?: string;
  currentUsage?: number;
  limit?: number;
  planName?: string;
}

interface UiState {
  sidebarOpen: boolean;
  toasts: Toast[];
  theme: Theme;
  upgradeModal: UpgradeModalState;
}

interface UiActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setTheme: (theme: Theme) => void;
  showUpgradeModal: (data?: Omit<UpgradeModalState, 'isOpen'>) => void;
  hideUpgradeModal: () => void;
}

let toastCounter = 0;

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('app_theme');
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'light';
}

// Apply initial theme on module load
const initialTheme = getInitialTheme();
applyThemeClass(initialTheme);

export const useUiStore = create<UiState & UiActions>((set) => ({
  // ── State ──
  sidebarOpen: true,
  toasts: [],
  theme: initialTheme,
  upgradeModal: { isOpen: false },

  // ── Actions ──
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setTheme: (theme) => {
    localStorage.setItem('app_theme', theme);
    applyThemeClass(theme);
    set({ theme });
  },

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    const newToast: Toast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  showUpgradeModal: (data) =>
    set({ upgradeModal: { isOpen: true, ...data } }),

  hideUpgradeModal: () =>
    set({ upgradeModal: { isOpen: false } }),
}));

// Listen for system theme changes when in 'system' mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { theme } = useUiStore.getState();
  if (theme === 'system') {
    applyThemeClass('system');
  }
});
