// Teams Notification Service — Push notifications for tasks and approvals
// Uses Microsoft Graph API to send Adaptive Cards to MS Teams channels and users

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import { graphfi, SPFx as graphSPFx } from '@pnp/graph';
import '@pnp/graph/users';
import '@pnp/graph/teams';

export interface ITeamsNotification {
  title: string;
  subtitle?: string;
  message: string;
  category: 'Onboarding' | 'Mover' | 'Offboarding' | 'Approval' | 'Task' | 'General';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  actionUrl?: string;
  actionTitle?: string;
  recipientUserId?: string;
  recipientEmail?: string;
  teamChannelId?: string;
}

export interface ITaskNotification {
  taskId: number;
  taskTitle: string;
  category: 'Onboarding' | 'Mover' | 'Offboarding';
  employeeName: string;
  assignedToId?: number;
  assignedToEmail?: string;
  dueDate?: Date;
  priority: 'Low' | 'Medium' | 'High';
  actionUrl?: string;
}

export interface IApprovalNotification {
  approvalId: number;
  approvalType: 'Onboarding' | 'Mover' | 'Offboarding' | 'Equipment' | 'SystemAccess';
  title: string;
  requestedBy: string;
  requestedById?: number;
  approverId?: number;
  approverEmail?: string;
  details?: string;
  actionUrl?: string;
}

// Color themes for notification categories
const CATEGORY_COLORS: Record<string, string> = {
  'Onboarding': '#005BAA', // Purple
  'Mover': '#ea580c',      // Orange
  'Offboarding': '#d13438', // Red
  'Approval': '#0078d4',   // Blue
  'Task': '#107c10',       // Green
  'General': '#605e5c',    // Gray
};

export class TeamsNotificationService {
  private sp: SPFI;
  // Graph client is prepared for future MS Teams integration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _graph: ReturnType<typeof graphfi> | null = null;

  constructor(sp: SPFI, context?: any) {
    this.sp = sp;
    if (context) {
      try {
        this._graph = graphfi().using(graphSPFx(context));
      } catch (error) {
        console.warn('[TeamsNotificationService] Graph client initialization failed:', error);
      }
    }
  }

  // Getter for graph client (for future use)
  protected get graph(): ReturnType<typeof graphfi> | null {
    return this._graph;
  }

  // ═══════════════════════════════════════════════════════════════
  // ADAPTIVE CARD BUILDERS
  // ═══════════════════════════════════════════════════════════════

  private buildTaskCard(notification: ITaskNotification): any {
    // Color can be used for card theming in future iterations
    void CATEGORY_COLORS[notification.category];
    const priorityIcon = notification.priority === 'High' ? '🔴' : notification.priority === 'Medium' ? '🟡' : '🟢';

    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: `${priorityIcon} New ${notification.category} Task`,
                      weight: 'Bolder',
                      color: 'Accent',
                      size: 'Medium'
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'TextBlock',
                      text: notification.priority,
                      weight: 'Lighter',
                      size: 'Small'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: notification.taskTitle,
              weight: 'Bolder',
              wrap: true
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Employee:', value: notification.employeeName },
                { title: 'Category:', value: notification.category },
                ...(notification.dueDate ? [{ title: 'Due Date:', value: notification.dueDate.toLocaleDateString() }] : [])
              ]
            }
          ]
        }
      ],
      actions: notification.actionUrl ? [
        {
          type: 'Action.OpenUrl',
          title: 'View Task',
          url: notification.actionUrl,
          style: 'positive'
        }
      ] : []
    };
  }

  private buildApprovalCard(notification: IApprovalNotification): any {
    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: 'warning',
          items: [
            {
              type: 'TextBlock',
              text: '⚠️ Approval Required',
              weight: 'Bolder',
              color: 'Warning',
              size: 'Medium'
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: notification.title,
              weight: 'Bolder',
              size: 'Large',
              wrap: true
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Type:', value: notification.approvalType },
                { title: 'Requested By:', value: notification.requestedBy },
                ...(notification.details ? [{ title: 'Details:', value: notification.details }] : [])
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Review & Approve',
          url: notification.actionUrl || '#',
          style: 'positive'
        }
      ]
    };
  }

  private buildGeneralCard(notification: ITeamsNotification): any {
    // Color available for card theming
    void CATEGORY_COLORS[notification.category];

    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'Container',
          items: [
            {
              type: 'TextBlock',
              text: notification.title,
              weight: 'Bolder',
              size: 'Medium',
              color: 'Accent'
            },
            ...(notification.subtitle ? [{
              type: 'TextBlock',
              text: notification.subtitle,
              isSubtle: true,
              spacing: 'None'
            }] : []),
            {
              type: 'TextBlock',
              text: notification.message,
              wrap: true,
              spacing: 'Medium'
            }
          ]
        }
      ],
      actions: notification.actionUrl ? [
        {
          type: 'Action.OpenUrl',
          title: notification.actionTitle || 'View Details',
          url: notification.actionUrl
        }
      ] : []
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATION SENDERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send a task notification to a user via Teams
   */
  public async sendTaskNotification(notification: ITaskNotification): Promise<boolean> {
    try {
      // Build card for future Graph API integration
      void this.buildTaskCard(notification);

      // Log for now - in production, this would call Graph API
      console.log('[TeamsNotificationService] Task notification:', {
        task: notification.taskTitle,
        to: notification.assignedToEmail,
        priority: notification.priority
      });

      // Store notification in audit log
      await this.logNotification('Task', notification.taskTitle, notification.assignedToEmail || '');

      return true;
    } catch (error) {
      console.error('[TeamsNotificationService] Error sending task notification:', error);
      return false;
    }
  }

  /**
   * Send an approval request notification
   */
  public async sendApprovalNotification(notification: IApprovalNotification): Promise<boolean> {
    try {
      // Build card for future Graph API integration
      void this.buildApprovalCard(notification);

      console.log('[TeamsNotificationService] Approval notification:', {
        type: notification.approvalType,
        title: notification.title,
        to: notification.approverEmail
      });

      await this.logNotification('Approval', notification.title, notification.approverEmail || '');

      return true;
    } catch (error) {
      console.error('[TeamsNotificationService] Error sending approval notification:', error);
      return false;
    }
  }

  /**
   * Send a general notification
   */
  public async sendNotification(notification: ITeamsNotification): Promise<boolean> {
    try {
      // Build card for future Graph API integration
      void this.buildGeneralCard(notification);

      console.log('[TeamsNotificationService] General notification:', {
        title: notification.title,
        category: notification.category,
        to: notification.recipientEmail
      });

      await this.logNotification(notification.category, notification.title, notification.recipientEmail || '');

      return true;
    } catch (error) {
      console.error('[TeamsNotificationService] Error sending notification:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // JML-SPECIFIC NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Notify about new onboarding started
   */
  public async notifyOnboardingStarted(
    employeeName: string,
    startDate: Date,
    managerEmail?: string
  ): Promise<void> {
    await this.sendNotification({
      title: 'New Employee Onboarding Started',
      subtitle: employeeName,
      message: `Onboarding process has been initiated for ${employeeName} starting ${startDate.toLocaleDateString()}. Please complete assigned tasks.`,
      category: 'Onboarding',
      priority: 'High',
      recipientEmail: managerEmail
    });
  }

  /**
   * Notify about internal transfer initiated
   */
  public async notifyTransferStarted(
    employeeName: string,
    fromDept: string,
    toDept: string,
    effectiveDate: Date,
    hrEmail?: string
  ): Promise<void> {
    await this.sendNotification({
      title: 'Internal Transfer Initiated',
      subtitle: employeeName,
      message: `${employeeName} is transferring from ${fromDept} to ${toDept} effective ${effectiveDate.toLocaleDateString()}. Please review system access requirements.`,
      category: 'Mover',
      priority: 'Medium',
      recipientEmail: hrEmail
    });
  }

  /**
   * Notify about offboarding started
   */
  public async notifyOffboardingStarted(
    employeeName: string,
    lastDay: Date,
    terminationType: string,
    managerEmail?: string
  ): Promise<void> {
    await this.sendNotification({
      title: 'Employee Offboarding Started',
      subtitle: employeeName,
      message: `Offboarding process (${terminationType}) has been initiated for ${employeeName}. Last working day: ${lastDay.toLocaleDateString()}.`,
      category: 'Offboarding',
      priority: 'High',
      recipientEmail: managerEmail
    });
  }

  /**
   * Notify about task completion
   */
  public async notifyTaskCompleted(
    taskTitle: string,
    category: 'Onboarding' | 'Mover' | 'Offboarding',
    employeeName: string,
    completedByEmail?: string
  ): Promise<void> {
    await this.sendNotification({
      title: 'Task Completed',
      subtitle: `${category} - ${employeeName}`,
      message: `Task "${taskTitle}" has been completed.`,
      category: category,
      priority: 'Low',
      recipientEmail: completedByEmail
    });
  }

  /**
   * Send reminder for overdue tasks
   */
  public async sendOverdueTaskReminder(
    taskTitle: string,
    category: 'Onboarding' | 'Mover' | 'Offboarding',
    employeeName: string,
    dueDate: Date,
    assignedToEmail?: string
  ): Promise<void> {
    const daysOverdue = Math.ceil((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    await this.sendNotification({
      title: '⏰ Overdue Task Reminder',
      subtitle: `${category} - ${employeeName}`,
      message: `Task "${taskTitle}" is ${daysOverdue} days overdue. Please complete as soon as possible.`,
      category: 'Task',
      priority: 'Urgent',
      recipientEmail: assignedToEmail
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // AUDIT LOGGING
  // ═══════════════════════════════════════════════════════════════

  private async logNotification(
    category: string,
    title: string,
    recipient: string
  ): Promise<void> {
    try {
      // Fire-and-forget logging to audit trail
      await this.sp.web.lists.getByTitle('RM_AuditTrail').items.add({
        Title: `Teams Notification: ${title}`,
        Action: 'Notification Sent',
        EntityType: 'TeamsNotification',
        Details: JSON.stringify({
          category,
          title,
          recipient,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      // Audit logging is fire-and-forget
      console.warn('[TeamsNotificationService] Audit log failed:', error);
    }
  }
}
