// Activity Log — localStorage-backed event log for JML Lite notifications

const STORAGE_KEY = 'jml_activity_log';
const MAX_ENTRIES = 50;

export interface IActivityEntry {
  id: number;
  title: string;
  message: string;
  type: 'task' | 'approval' | 'reminder' | 'alert';
  priority: 'high' | 'medium' | 'low';
  time: string;
  isRead: boolean;
}

export function getActivityLog(): IActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function logActivity(
  title: string,
  message: string,
  type: IActivityEntry['type'] = 'task',
  priority: IActivityEntry['priority'] = 'low'
): void {
  try {
    const entries = getActivityLog();
    const entry: IActivityEntry = {
      id: Date.now(),
      title,
      message,
      type,
      priority,
      time: new Date().toISOString(),
      isRead: false
    };
    entries.unshift(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage may be unavailable — fail silently
  }
}

export function getUnreadCount(): number {
  return getActivityLog().filter(e => !e.isRead).length;
}

export function markAllRead(): void {
  try {
    const entries = getActivityLog();
    entries.forEach(e => { e.isRead = true; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // fail silently
  }
}

export function formatRelativeTime(isoTime: string): string {
  const diff = Date.now() - new Date(isoTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
