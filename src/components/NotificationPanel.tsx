// NotificationPanel — Rich notification dropdown for app header
// Displays in-app notifications with grouping, actions, and filtering

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { InAppNotificationService } from '../services/InAppNotificationService';
import {
  INotification,
  NOTIFICATION_TYPE_INFO,
  NOTIFICATION_CATEGORY_COLORS,
  NOTIFICATION_PRIORITY_STYLES,
} from '../models/INotification';

interface IProps {
  sp: SPFI;
  userEmail: string;
  userId?: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string, entityType?: string, entityId?: number) => void;
}

type FilterType = 'all' | 'unread' | 'tasks' | 'approvals';

export const NotificationPanel: React.FC<IProps> = ({
  sp,
  userEmail,
  userId,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [service] = useState(() => new InAppNotificationService(sp, userEmail, userId));

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await service.getNotifications(true);
      setNotifications(data);
    } catch (error) {
      console.error('[NotificationPanel] Error loading notifications:', error);
    }
    setLoading(false);
  }, [service]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  const handleMarkAsRead = async (id: number): Promise<void> => {
    await service.markAsRead(id);
    setNotifications(prev => prev.map(n => n.Id === id ? { ...n, IsRead: true } : n));
  };

  const handleMarkAllRead = async (): Promise<void> => {
    await service.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, IsRead: true })));
  };

  const handleDismiss = async (id: number, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    await service.dismiss(id);
    setNotifications(prev => prev.filter(n => n.Id !== id));
  };

  const handleDismissAll = async (): Promise<void> => {
    await service.dismissAll();
    setNotifications([]);
  };

  const handleNotificationClick = (notification: INotification): void => {
    // Mark as read
    if (!notification.IsRead) {
      handleMarkAsRead(notification.Id);
    }

    // Navigate if action URL is available
    if (notification.ActionUrl) {
      window.location.href = notification.ActionUrl;
    } else if (notification.RelatedEntityType && notification.RelatedEntityId) {
      // Navigate to related entity
      const view = notification.RelatedEntityType.toLowerCase();
      onNavigate(view, notification.RelatedEntityType, notification.RelatedEntityId);
    }

    onClose();
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getFilteredNotifications = (): INotification[] => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.IsRead);
      case 'tasks':
        return notifications.filter(n => n.Type.startsWith('task_'));
      case 'approvals':
        return notifications.filter(n => n.Type.startsWith('approval_'));
      default:
        return notifications;
    }
  };

  const groupNotificationsByDate = (items: INotification[]): Record<string, INotification[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<string, INotification[]> = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Earlier': [],
    };

    items.forEach(item => {
      const itemDate = new Date(item.Created);
      itemDate.setHours(0, 0, 0, 0);

      if (itemDate.getTime() === today.getTime()) {
        groups['Today'].push(item);
      } else if (itemDate.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(item);
      } else if (itemDate >= weekAgo) {
        groups['This Week'].push(item);
      } else {
        groups['Earlier'].push(item);
      }
    });

    // Remove empty groups (ES5-compatible approach)
    const result: Record<string, INotification[]> = {};
    Object.keys(groups).forEach(key => {
      if (groups[key].length > 0) {
        result[key] = groups[key];
      }
    });
    return result;
  };

  const unreadCount = notifications.filter(n => !n.IsRead).length;
  const filteredNotifications = getFilteredNotifications();
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '48px',
      right: 0,
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      width: '400px',
      maxHeight: '520px',
      zIndex: 1000001,
      color: '#323130',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #edebe9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #005BAA 0%, #004A8F 100%)',
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon iconName="Ringer" style={{ fontSize: '20px' }} />
          <span style={{ fontWeight: 600, fontSize: '15px' }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{
              background: '#dc2626',
              color: 'white',
              borderRadius: '10px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 600,
            }}>
              {unreadCount} new
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button
              onClick={() => void handleMarkAllRead()}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '11px',
                color: 'white',
                cursor: 'pointer',
              }}
              title="Mark all as read"
            >
              <Icon iconName="CheckMark" style={{ fontSize: '12px' }} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <Icon iconName="Cancel" style={{ fontSize: '14px' }} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #edebe9',
        padding: '0 12px',
        background: '#faf9f8',
      }}>
        {(['all', 'unread', 'tasks', 'approvals'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: filter === f ? 600 : 400,
              color: filter === f ? '#005BAA' : '#605e5c',
              borderBottom: filter === f ? '2px solid #005BAA' : '2px solid transparent',
              textTransform: 'capitalize',
            }}
          >
            {f}
            {f === 'unread' && unreadCount > 0 && (
              <span style={{
                marginLeft: '4px',
                background: '#dc2626',
                color: 'white',
                borderRadius: '8px',
                padding: '1px 5px',
                fontSize: '10px',
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        maxHeight: '380px',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spinner size={SpinnerSize.medium} label="Loading notifications..." />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8a8886' }}>
            <Icon iconName="InboxCheck" style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }} />
            <div style={{ fontSize: '14px', fontWeight: 500 }}>All caught up!</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>No notifications to show.</div>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([group, items]) => (
            <div key={group}>
              <div style={{
                padding: '8px 20px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#8a8886',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: '#faf9f8',
              }}>
                {group}
              </div>
              {items.map(notification => {
                const typeInfo = NOTIFICATION_TYPE_INFO[notification.Type];
                const categoryColors = NOTIFICATION_CATEGORY_COLORS[notification.Category];
                const priorityStyle = NOTIFICATION_PRIORITY_STYLES[notification.Priority];

                return (
                  <div
                    key={notification.Id}
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid #f3f2f1',
                      cursor: 'pointer',
                      background: notification.IsRead ? 'transparent' : '#f0f7ff',
                      transition: 'background 0.15s',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = notification.IsRead ? '#f3f2f1' : '#e6f0fa')}
                    onMouseLeave={e => (e.currentTarget.style.background = notification.IsRead ? 'transparent' : '#f0f7ff')}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: typeInfo.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon
                        iconName={typeInfo.icon}
                        style={{ fontSize: '16px', color: typeInfo.color }}
                      />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px',
                      }}>
                        <span style={{
                          fontWeight: notification.IsRead ? 500 : 600,
                          fontSize: '13px',
                          color: '#1a1a1a',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {notification.Title}
                        </span>
                        {notification.Priority !== 'low' && (
                          <span style={{
                            fontSize: '9px',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            background: priorityStyle.color,
                            color: 'white',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}>
                            {notification.Priority}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#605e5c',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {notification.Message}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '6px',
                      }}>
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: categoryColors.bgColor,
                          color: categoryColors.color,
                          fontWeight: 500,
                        }}>
                          {notification.Category}
                        </span>
                        <span style={{ fontSize: '11px', color: '#8a8886' }}>
                          {formatRelativeTime(notification.Created)}
                        </span>
                      </div>
                    </div>

                    {/* Dismiss button */}
                    <button
                      onClick={(e) => void handleDismiss(notification.Id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#a19f9d',
                        opacity: 0.6,
                      }}
                      title="Dismiss"
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                    >
                      <Icon iconName="Cancel" style={{ fontSize: '12px' }} />
                    </button>

                    {/* Unread indicator */}
                    {!notification.IsRead && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#005BAA',
                        flexShrink: 0,
                        marginTop: '6px',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #edebe9',
          display: 'flex',
          justifyContent: 'space-between',
          background: '#faf9f8',
        }}>
          <button
            onClick={() => void handleDismissAll()}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#605e5c',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#d13438')}
            onMouseLeave={e => (e.currentTarget.style.color = '#605e5c')}
          >
            Clear all
          </button>
          <button
            onClick={() => { onNavigate('notifications'); onClose(); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#005BAA',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            View all
            <Icon iconName="ChevronRight" style={{ fontSize: '10px' }} />
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
