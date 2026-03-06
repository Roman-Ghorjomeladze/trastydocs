import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export type Theme = 'light' | 'dark' | 'system';
export type FontFamily = 'inter' | 'nunito' | 'grotesk';
export type FontSize = 'standard' | 'medium' | 'large';

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
  fontFamily: FontFamily;
  fontSize: FontSize;
  upgradeModal: UpgradeModalState;
}

interface UiActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setTheme: (theme: Theme) => void;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: FontSize) => void;
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

const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  inter: "'Inter', 'BPG Arial', sans-serif",
  nunito: "'Nunito Sans', 'BPG Nino Elite Round', sans-serif",
  grotesk: "'Space Grotesk', 'BPG Glaho', sans-serif",
};

function applyFontFamily(font: FontFamily) {
  document.documentElement.style.setProperty('--font-family', FONT_FAMILY_MAP[font]);
}

function getInitialFont(): FontFamily {
  const stored = localStorage.getItem('app_font');
  if (stored === 'inter' || stored === 'nunito' || stored === 'grotesk') {
    return stored;
  }
  return 'inter';
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  standard: '16px',
  medium: '18px',
  large: '20px',
};

function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = FONT_SIZE_MAP[size];
}

function getInitialFontSize(): FontSize {
  const stored = localStorage.getItem('app_font_size');
  if (stored === 'standard' || stored === 'medium' || stored === 'large') {
    return stored;
  }
  return 'standard';
}

// Apply initial theme, font and size on module load
const initialTheme = getInitialTheme();
const initialFont = getInitialFont();
const initialFontSize = getInitialFontSize();
applyThemeClass(initialTheme);
applyFontFamily(initialFont);
applyFontSize(initialFontSize);

export const useUiStore = create<UiState & UiActions>((set) => ({
  // ── State ──
  sidebarOpen: true,
  toasts: [],
  theme: initialTheme,
  fontFamily: initialFont,
  fontSize: initialFontSize,
  upgradeModal: { isOpen: false },

  // ── Actions ──
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setTheme: (theme) => {
    localStorage.setItem('app_theme', theme);
    applyThemeClass(theme);
    set({ theme });
  },

  setFontFamily: (font) => {
    localStorage.setItem('app_font', font);
    applyFontFamily(font);
    set({ fontFamily: font });
  },

  setFontSize: (size) => {
    localStorage.setItem('app_font_size', size);
    applyFontSize(size);
    set({ fontSize: size });
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
