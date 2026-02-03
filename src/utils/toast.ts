// Lightweight toast notification utility for Recruitment Manager

export type ToastType = 'success' | 'error' | 'warning' | 'info';

const TOAST_CONTAINER_ID = 'rm-toast-container';
const DEFAULT_DURATION = 4000;

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#f0fdf4', border: '#059669', icon: '\u2713' },
  error:   { bg: '#fef2f2', border: '#dc2626', icon: '\u2716' },
  warning: { bg: '#fffbeb', border: '#d97706', icon: '\u26A0' },
  info:    { bg: '#eff6ff', border: '#2563eb', icon: '\u2139' }
};

function getOrCreateContainer(): HTMLElement {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    Object.assign(container.style, {
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: '999999',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none'
    });
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message: string, type: ToastType = 'info', duration: number = DEFAULT_DURATION): void {
  const container = getOrCreateContainer();
  const colors = COLORS[type];

  const toast = document.createElement('div');
  Object.assign(toast.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: colors.bg,
    borderLeft: `4px solid ${colors.border}`,
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: '14px',
    color: '#323130',
    maxWidth: '400px',
    pointerEvents: 'auto',
    opacity: '0',
    transform: 'translateX(100%)',
    transition: 'all 0.3s ease'
  });

  toast.innerHTML = `<span style="font-weight:600;font-size:16px;color:${colors.border}">${colors.icon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
