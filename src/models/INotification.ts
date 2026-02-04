// Notification Model — In-app notification system

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'approval_required'
  | 'approval_approved'
  | 'approval_rejected'
  | 'onboarding_started'
  | 'transfer_started'
  | 'offboarding_started'
  | 'document_uploaded'
  | 'reminder'
  | 'system'
  | 'info';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationCategory = 'Onboarding' | 'Transfer' | 'Offboarding' | 'Approval' | 'Task' | 'System';

export interface INotification {
  Id: number;
  Title: string;
  Message: string;
  Type: NotificationType;
  Category: NotificationCategory;
  Priority: NotificationPriority;

  // Recipient
  RecipientId: number;
  RecipientEmail: string;

  // Related entity
  RelatedEntityType?: 'Onboarding' | 'Mover' | 'Offboarding' | 'Task' | 'Approval';
  RelatedEntityId?: number;
  ActionUrl?: string;

  // Status
  IsRead: boolean;
  IsDismissed: boolean;
  ReadAt?: Date;

  // Timestamps
  Created: Date;
  ExpiresAt?: Date;
}

export interface INotificationInput {
  Title: string;
  Message: string;
  Type: NotificationType;
  Category: NotificationCategory;
  Priority: NotificationPriority;
  RecipientId?: number;
  RecipientEmail: string;
  RelatedEntityType?: 'Onboarding' | 'Mover' | 'Offboarding' | 'Task' | 'Approval';
  RelatedEntityId?: number;
  ActionUrl?: string;
  ExpiresAt?: Date;
}

// Notification icons and colors by type
export const NOTIFICATION_TYPE_INFO: Record<NotificationType, {
  icon: string;
  color: string;
  bgColor: string;
  label: string;
}> = {
  task_assigned: { icon: 'TaskManager', color: '#005BAA', bgColor: '#e6f0f8', label: 'Task Assigned' },
  task_completed: { icon: 'Completed', color: '#107c10', bgColor: '#e6f7e6', label: 'Task Completed' },
  task_overdue: { icon: 'Clock', color: '#d13438', bgColor: '#fbeaea', label: 'Task Overdue' },
  approval_required: { icon: 'Taskboard', color: '#7c3aed', bgColor: '#f3e8ff', label: 'Approval Required' },
  approval_approved: { icon: 'Accept', color: '#107c10', bgColor: '#e6f7e6', label: 'Approved' },
  approval_rejected: { icon: 'Cancel', color: '#d13438', bgColor: '#fbeaea', label: 'Rejected' },
  onboarding_started: { icon: 'AddFriend', color: '#005BAA', bgColor: '#e6f0f8', label: 'Onboarding Started' },
  transfer_started: { icon: 'Sync', color: '#ea580c', bgColor: '#fef3ed', label: 'Transfer Started' },
  offboarding_started: { icon: 'UserRemove', color: '#d13438', bgColor: '#fbeaea', label: 'Offboarding Started' },
  document_uploaded: { icon: 'DocumentSet', color: '#0078d4', bgColor: '#e6f2fa', label: 'Document Uploaded' },
  reminder: { icon: 'Ringer', color: '#ea580c', bgColor: '#fef3ed', label: 'Reminder' },
  system: { icon: 'Settings', color: '#605e5c', bgColor: '#f5f5f5', label: 'System' },
  info: { icon: 'Info', color: '#0078d4', bgColor: '#e6f2fa', label: 'Information' },
};

// Category colors
export const NOTIFICATION_CATEGORY_COLORS: Record<NotificationCategory, { color: string; bgColor: string }> = {
  Onboarding: { color: '#005BAA', bgColor: '#e6f0f8' },
  Transfer: { color: '#ea580c', bgColor: '#fef3ed' },
  Offboarding: { color: '#d13438', bgColor: '#fbeaea' },
  Approval: { color: '#7c3aed', bgColor: '#f3e8ff' },
  Task: { color: '#107c10', bgColor: '#e6f7e6' },
  System: { color: '#605e5c', bgColor: '#f5f5f5' },
};

// Priority styles
export const NOTIFICATION_PRIORITY_STYLES: Record<NotificationPriority, { color: string; label: string }> = {
  low: { color: '#666', label: 'Low' },
  medium: { color: '#ea580c', label: 'Medium' },
  high: { color: '#d13438', label: 'High' },
  urgent: { color: '#a4262c', label: 'Urgent' },
};
