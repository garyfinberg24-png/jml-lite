import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { Icon } from '@fluentui/react/lib/Icon';
import { JmlRole, filterNavForRole, getHeaderVisibility } from '../services/JmlRoleService';
import { getUnreadCount, markAllRead, getActivityLog, formatRelativeTime } from '../utils/activityLog';

type JmlViewType =
  | 'dashboard'
  | 'onboarding'
  | 'myonboarding'
  | 'mover'
  | 'offboarding'
  | 'jmlreporting'
  | 'search'
  | 'admin'
  | 'help'
  | 'onboarding-wizard'
  | 'mover-wizard'
  | 'offboarding-wizard';

export interface IJmlAppHeaderProps {
  currentView: JmlViewType;
  onNavigate: (view: JmlViewType) => void;
  userRole: JmlRole;
  context: WebPartContext;
}

export interface IRecentlyViewedItem {
  id: number;
  type: 'onboarding' | 'mover' | 'offboarding' | 'employee';
  title: string;
  subtitle?: string;
  timestamp: string;
}

// JML navigation items — Search/Admin/Help are header icon buttons
const NAV_ITEMS: { key: JmlViewType; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'ViewAll' },
  { key: 'onboarding', label: 'Onboarding', icon: 'AddFriend' },
  { key: 'myonboarding', label: 'My Onboarding', icon: 'Contact' },
  { key: 'mover', label: 'Transfers', icon: 'Sync' },
  { key: 'offboarding', label: 'Offboarding', icon: 'UserRemove' },
  { key: 'jmlreporting', label: 'Reporting', icon: 'ReportDocument' },
];

export function addToRecentlyViewed(item: IRecentlyViewedItem): void {
  const key = 'jml_recently_viewed';
  try {
    const items: IRecentlyViewedItem[] = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = items.filter(i => !(i.id === item.id && i.type === item.type));
    filtered.unshift({ ...item, timestamp: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 20)));
  } catch { /* fail silently */ }
}

const iconBtnStyle: React.CSSProperties = {
  width: '40px', height: '40px', borderRadius: '10px',
  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
  cursor: 'pointer', color: '#fff', fontSize: '16px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  position: 'relative' as const,
  transition: 'background 0.15s ease',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute' as const, top: '48px', right: 0, background: '#fff', borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: '300px', zIndex: 1000001, color: '#323130',
  maxHeight: '400px', overflowY: 'auto' as const,
};

export const JmlAppHeader: React.FC<IJmlAppHeaderProps> = ({
  currentView, onNavigate, userRole, context
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRecentlyViewed, setShowRecentlyViewed] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnreadCount(getUnreadCount());
  }, [currentView]);

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
        setShowRecentlyViewed(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allowedNavKeys = filterNavForRole(userRole);
  const visibility = getHeaderVisibility(userRole);
  const filteredNav = NAV_ITEMS.filter(item => allowedNavKeys.includes(item.key));

  const handleMarkAllRead = (): void => {
    markAllRead();
    setUnreadCount(0);
  };

  const recentItems: IRecentlyViewedItem[] = (() => {
    try {
      return JSON.parse(localStorage.getItem('jml_recently_viewed') || '[]').slice(0, 5);
    } catch { return []; }
  })();

  const userDisplayName = context?.pageContext?.user?.displayName || 'User';
  const userInitials = userDisplayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  const closeDropdowns = (): void => {
    setShowNotifications(false);
    setShowRecentlyViewed(false);
  };

  return (
    <div ref={headerRef} style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', zIndex: 100000, position: 'relative' }}>
      {/* Gradient header bar — Blue theme */}
      <div style={{
        background: 'linear-gradient(135deg, #005BAA 0%, #004A8F 100%)',
        color: '#ffffff',
        padding: '24px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Left: Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon iconName="People" style={{ fontSize: '20px', color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 600, lineHeight: 1.2 }}>JML Lite</div>
            <div style={{ fontSize: '11px', opacity: 0.85 }}>Employee Lifecycle Management</div>
          </div>
        </div>

        {/* Right: Icon buttons — Recent, Search, Admin, Help, Notifications, Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Recently Viewed */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowRecentlyViewed(!showRecentlyViewed); setShowNotifications(false); }}
              style={iconBtnStyle}
              title="Recently Viewed"
            >
              <Icon iconName="Recent" style={{ fontSize: '16px' }} />
            </button>
            {showRecentlyViewed && (
              <div style={dropdownStyle}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #edebe9', fontWeight: 600, fontSize: '13px' }}>
                  Recently Viewed
                </div>
                {recentItems.length > 0 ? recentItems.map((item, i) => (
                  <div key={i} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f2f1')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ fontWeight: 500 }}>{item.title}</div>
                    {item.subtitle && <div style={{ fontSize: '11px', color: '#605e5c' }}>{item.subtitle}</div>}
                  </div>
                )) : (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#8a8886', fontSize: '13px' }}>
                    No recent items
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search icon button */}
          <button
            onClick={() => { onNavigate('search'); closeDropdowns(); }}
            style={{
              ...iconBtnStyle,
              background: currentView === 'search' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
            }}
            title="Search"
          >
            <Icon iconName="Search" style={{ fontSize: '16px' }} />
          </button>

          {/* Admin Settings (Cog) — role-gated */}
          {visibility.showAdmin && (
            <button
              onClick={() => { onNavigate('admin'); closeDropdowns(); }}
              style={{
                ...iconBtnStyle,
                background: currentView === 'admin' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
              }}
              title="Administration"
              aria-label="Administration"
            >
              {/* Custom SVG cog icon matching DWx standard */}
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px' }}>
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          )}

          {/* Help icon button */}
          <button
            onClick={() => { onNavigate('help'); closeDropdowns(); }}
            style={{
              ...iconBtnStyle,
              background: currentView === 'help' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
            }}
            title="Help"
          >
            <Icon iconName="Help" style={{ fontSize: '16px' }} />
          </button>

          {/* Notifications */}
          {visibility.showNotifications && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowRecentlyViewed(false); handleMarkAllRead(); }}
                style={iconBtnStyle}
                title="Notifications"
              >
                <Icon iconName="Ringer" style={{ fontSize: '16px' }} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    background: '#dc2626', color: '#fff', borderRadius: '50%',
                    width: '18px', height: '18px', fontSize: '10px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
              {showNotifications && (
                <div style={dropdownStyle}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #edebe9', fontWeight: 600, fontSize: '13px' }}>
                    Notifications
                  </div>
                  {getActivityLog().slice(0, 10).map((entry, i) => (
                    <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #f3f2f1', fontSize: '13px' }}>
                      <div style={{ fontWeight: 500 }}>{entry.title}</div>
                      <div style={{ color: '#605e5c', fontSize: '12px' }}>{entry.message}</div>
                      <div style={{ color: '#8a8886', fontSize: '11px', marginTop: '4px' }}>{formatRelativeTime(entry.time)}</div>
                    </div>
                  ))}
                  {getActivityLog().length === 0 && (
                    <div style={{ padding: '20px 16px', textAlign: 'center', color: '#8a8886', fontSize: '13px' }}>
                      No notifications
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User avatar */}
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 600, color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
          }} title={`${userDisplayName} (${userRole})`}>
            {userInitials}
          </div>
        </div>
      </div>

      {/* Navigation bar — JML views with icon + label */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        minHeight: '52px',
        overflowX: 'auto',
      }}>
        {filteredNav.map(item => {
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { onNavigate(item.key); closeDropdowns(); }}
              style={{
                padding: '16px 20px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#005BAA' : '#605e5c',
                borderBottom: isActive ? '3px solid #005BAA' : '3px solid transparent',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Icon iconName={item.icon} style={{ fontSize: '16px' }} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
