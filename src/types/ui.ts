// UI Types for Nexus

export type ViewType = 'interview' | 'kanban' | 'dashboard' | 'settings';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UIState {
  currentView: ViewType;
  sidebarOpen: boolean;
  theme: ThemeMode;
}

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
}

export interface ModalConfig {
  isOpen: boolean;
  title: string;
  content?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ProgressIndicator {
  label: string;
  current: number;
  total: number;
  status: 'pending' | 'active' | 'complete' | 'error';
}
