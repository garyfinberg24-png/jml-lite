// InAppNotificationService — Manages in-app notifications with SharePoint persistence
// Stores notifications in JML_Notifications list and caches locally

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { JML_LISTS } from '../constants/SharePointListNames';
import {
  INotification,
  INotificationInput,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from '../models/INotification';
import { logActivity } from '../utils/activityLog';

const NOTIFICATION_LIST = JML_LISTS.NOTIFICATIONS;
const LOCAL_STORAGE_KEY = 'jml_notifications_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface ICachedNotifications {
  notifications: INotification[];
  timestamp: number;
}

export class InAppNotificationService {
  private sp: SPFI;
  private currentUserEmail: string;

  constructor(sp: SPFI, userEmail: string, _userId?: number) {
    this.sp = sp;
    this.currentUserEmail = userEmail;
    // userId is reserved for future use (e.g., user-specific filtering)
  }

  // ═══════════════════════════════════════════════════════════════
  // CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all notifications for current user
   */
  public async getNotifications(includeRead: boolean = true): Promise<INotification[]> {
    try {
      // Try to get from cache first
      const cached = this.getFromCache();
      if (cached && !this.isCacheExpired(cached)) {
        const notifications = includeRead
          ? cached.notifications
          : cached.notifications.filter(n => !n.IsRead);
        return notifications;
      }

      // Fetch from SharePoint
      const filter = `RecipientEmail eq '${this.currentUserEmail}' and IsDismissed eq false`;
      const items = await this.sp.web.lists.getByTitle(NOTIFICATION_LIST).items
        .filter(filter)
        .orderBy('Created', false)
        .top(100)();

      const notifications = items.map(this.mapToNotification);

      // Update cache
      this.saveToCache(notifications);

      // Also update localStorage activity log for immediate badge updates
      notifications.filter(n => !n.IsRead).forEach(n => {
        logActivity(n.Title, n.Message, this.mapTypeToActivityType(n.Type), this.mapPriorityToActivityPriority(n.Priority));
      });

      return includeRead ? notifications : notifications.filter(n => !n.IsRead);
    } catch (error) {
      console.error('[InAppNotificationService] Error fetching notifications:', error);
      // Return cached data if available, even if expired
      const cached = this.getFromCache();
      return cached?.notifications || [];
    }
  }

  /**
   * Get unread notification count
   */
  public async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getNotifications(false);
      return notifications.length;
    } catch (error) {
      console.error('[InAppNotificationService] Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Create a new notification
   */
  public async createNotification(input: INotificationInput): Promise<INotification | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(NOTIFICATION_LIST).items.add({
        Title: input.Title,
        Message: input.Message,
        NotificationType: input.Type,
        Category: input.Category,
        Priority: input.Priority,
        RecipientId: input.RecipientId,
        RecipientEmail: input.RecipientEmail,
        RelatedEntityType: input.RelatedEntityType,
        RelatedEntityId: input.RelatedEntityId,
        ActionUrl: input.ActionUrl,
        IsRead: false,
        IsDismissed: false,
        ExpiresAt: input.ExpiresAt?.toISOString(),
      });

      // Clear cache to force refresh
      this.clearCache();

      // Add to activity log for immediate badge update
      logActivity(
        input.Title,
        input.Message,
        this.mapTypeToActivityType(input.Type),
        this.mapPriorityToActivityPriority(input.Priority)
      );

      return this.mapToNotification(item.data);
    } catch (error) {
      console.error('[InAppNotificationService] Error creating notification:', error);
      return null;
    }
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(notificationId: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(NOTIFICATION_LIST).items.getById(notificationId).update({
        IsRead: true,
        ReadAt: new Date().toISOString(),
      });

      // Update cache
      this.updateCacheItem(notificationId, { IsRead: true, ReadAt: new Date() });

      return true;
    } catch (error) {
      console.error('[InAppNotificationService] Error marking as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(): Promise<boolean> {
    try {
      const unread = await this.getNotifications(false);

      // Update each notification sequentially (small batches for performance)
      const updatePromises = unread.map(notification =>
        this.sp.web.lists.getByTitle(NOTIFICATION_LIST).items.getById(notification.Id).update({
          IsRead: true,
          ReadAt: new Date().toISOString(),
        })
      );
      await Promise.all(updatePromises);

      // Clear cache
      this.clearCache();

      return true;
    } catch (error) {
      console.error('[InAppNotificationService] Error marking all as read:', error);
      return false;
    }
  }

  /**
   * Dismiss notification (hide from list)
   */
  public async dismiss(notificationId: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(NOTIFICATION_LIST).items.getById(notificationId).update({
        IsDismissed: true,
      });

      // Remove from cache
      this.removeFromCache(notificationId);

      return true;
    } catch (error) {
      console.error('[InAppNotificationService] Error dismissing notification:', error);
      return false;
    }
  }

  /**
   * Dismiss all notifications
   */
  public async dismissAll(): Promise<boolean> {
    try {
      const notifications = await this.getNotifications(true);

      // Update each notification in parallel
      const updatePromises = notifications.map(notification =>
        this.sp.web.lists.getByTitle(NOTIFICATION_LIST).items.getById(notification.Id).update({
          IsDismissed: true,
        })
      );
      await Promise.all(updatePromises);

      // Clear cache
      this.clearCache();

      return true;
    } catch (error) {
      console.error('[InAppNotificationService] Error dismissing all:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATION HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create task assignment notification
   */
  public async notifyTaskAssigned(
    recipientEmail: string,
    taskTitle: string,
    employeeName: string,
    category: NotificationCategory,
    taskId: number,
    actionUrl?: string
  ): Promise<void> {
    await this.createNotification({
      Title: 'New Task Assigned',
      Message: `Task "${taskTitle}" for ${employeeName} has been assigned to you.`,
      Type: 'task_assigned',
      Category: category,
      Priority: 'medium',
      RecipientEmail: recipientEmail,
      RelatedEntityType: 'Task',
      RelatedEntityId: taskId,
      ActionUrl: actionUrl,
    });
  }

  /**
   * Create task overdue notification
   */
  public async notifyTaskOverdue(
    recipientEmail: string,
    taskTitle: string,
    employeeName: string,
    category: NotificationCategory,
    daysOverdue: number,
    taskId: number,
    actionUrl?: string
  ): Promise<void> {
    await this.createNotification({
      Title: 'Task Overdue',
      Message: `Task "${taskTitle}" for ${employeeName} is ${daysOverdue} day(s) overdue. Please complete as soon as possible.`,
      Type: 'task_overdue',
      Category: category,
      Priority: daysOverdue > 3 ? 'urgent' : 'high',
      RecipientEmail: recipientEmail,
      RelatedEntityType: 'Task',
      RelatedEntityId: taskId,
      ActionUrl: actionUrl,
    });
  }

  /**
   * Create approval required notification
   */
  public async notifyApprovalRequired(
    approverEmail: string,
    requestTitle: string,
    requestorName: string,
    approvalId: number,
    actionUrl: string
  ): Promise<void> {
    await this.createNotification({
      Title: 'Approval Required',
      Message: `${requestorName} is requesting your approval for: ${requestTitle}`,
      Type: 'approval_required',
      Category: 'Approval',
      Priority: 'high',
      RecipientEmail: approverEmail,
      RelatedEntityType: 'Approval',
      RelatedEntityId: approvalId,
      ActionUrl: actionUrl,
    });
  }

  /**
   * Create approval decision notification
   */
  public async notifyApprovalDecision(
    recipientEmail: string,
    requestTitle: string,
    decision: 'approved' | 'rejected',
    decisionBy: string,
    approvalId: number
  ): Promise<void> {
    await this.createNotification({
      Title: decision === 'approved' ? 'Request Approved' : 'Request Rejected',
      Message: `Your request "${requestTitle}" has been ${decision} by ${decisionBy}.`,
      Type: decision === 'approved' ? 'approval_approved' : 'approval_rejected',
      Category: 'Approval',
      Priority: 'medium',
      RecipientEmail: recipientEmail,
      RelatedEntityType: 'Approval',
      RelatedEntityId: approvalId,
    });
  }

  /**
   * Create onboarding started notification
   */
  public async notifyOnboardingStarted(
    recipientEmail: string,
    employeeName: string,
    startDate: Date,
    onboardingId: number,
    actionUrl?: string
  ): Promise<void> {
    await this.createNotification({
      Title: 'New Onboarding Started',
      Message: `Onboarding for ${employeeName} has been initiated. Start date: ${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      Type: 'onboarding_started',
      Category: 'Onboarding',
      Priority: 'high',
      RecipientEmail: recipientEmail,
      RelatedEntityType: 'Onboarding',
      RelatedEntityId: onboardingId,
      ActionUrl: actionUrl,
    });
  }

  /**
   * Create document uploaded notification
   */
  public async notifyDocumentUploaded(
    recipientEmail: string,
    documentName: string,
    employeeName: string,
    uploadedBy: string
  ): Promise<void> {
    await this.createNotification({
      Title: 'Document Uploaded',
      Message: `${uploadedBy} has uploaded "${documentName}" for ${employeeName}.`,
      Type: 'document_uploaded',
      Category: 'Task',
      Priority: 'low',
      RecipientEmail: recipientEmail,
    });
  }

  /**
   * Create reminder notification
   */
  public async createReminder(
    recipientEmail: string,
    title: string,
    message: string,
    category: NotificationCategory,
    priority: NotificationPriority = 'medium'
  ): Promise<void> {
    await this.createNotification({
      Title: title,
      Message: message,
      Type: 'reminder',
      Category: category,
      Priority: priority,
      RecipientEmail: recipientEmail,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CACHE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  private getFromCache(): ICachedNotifications | null {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private saveToCache(notifications: INotification[]): void {
    try {
      const cached: ICachedNotifications = {
        notifications,
        timestamp: Date.now(),
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
    } catch {
      // localStorage may be unavailable
    }
  }

  private isCacheExpired(cached: ICachedNotifications): boolean {
    return Date.now() - cached.timestamp > CACHE_EXPIRY_MS;
  }

  private updateCacheItem(id: number, updates: Partial<INotification>): void {
    const cached = this.getFromCache();
    if (cached) {
      cached.notifications = cached.notifications.map(n =>
        n.Id === id ? { ...n, ...updates } : n
      );
      this.saveToCache(cached.notifications);
    }
  }

  private removeFromCache(id: number): void {
    const cached = this.getFromCache();
    if (cached) {
      cached.notifications = cached.notifications.filter(n => n.Id !== id);
      this.saveToCache(cached.notifications);
    }
  }

  private clearCache(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // fail silently
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MAPPING HELPERS
  // ═══════════════════════════════════════════════════════════════

  private mapToNotification(item: any): INotification {
    return {
      Id: item.Id,
      Title: item.Title,
      Message: item.Message,
      Type: item.NotificationType as NotificationType,
      Category: item.Category as NotificationCategory,
      Priority: item.Priority as NotificationPriority,
      RecipientId: item.RecipientId,
      RecipientEmail: item.RecipientEmail,
      RelatedEntityType: item.RelatedEntityType,
      RelatedEntityId: item.RelatedEntityId,
      ActionUrl: item.ActionUrl,
      IsRead: item.IsRead || false,
      IsDismissed: item.IsDismissed || false,
      ReadAt: item.ReadAt ? new Date(item.ReadAt) : undefined,
      Created: new Date(item.Created),
      ExpiresAt: item.ExpiresAt ? new Date(item.ExpiresAt) : undefined,
    };
  }

  private mapTypeToActivityType(type: NotificationType): 'task' | 'approval' | 'reminder' | 'alert' {
    if (type.startsWith('task_')) return 'task';
    if (type.startsWith('approval_')) return 'approval';
    if (type === 'reminder') return 'reminder';
    return 'alert';
  }

  private mapPriorityToActivityPriority(priority: NotificationPriority): 'high' | 'medium' | 'low' {
    if (priority === 'urgent') return 'high';
    return priority;
  }
}

export default InAppNotificationService;
