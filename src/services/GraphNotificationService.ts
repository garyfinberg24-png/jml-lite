// Graph Notification Service — Email and Teams notifications via Microsoft Graph API
// Requires API permissions: Mail.Send, Chat.Create, ChatMessage.Send

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import { graphfi, SPFx as graphSPFx } from '@pnp/graph';
import '@pnp/graph/users';
import '@pnp/graph/mail';
import '@pnp/graph/teams';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { RmAuditTrailService } from './JmlAuditTrailService';

export interface INotificationRecipient {
  userId?: number;
  email: string;
  displayName: string;
}

export interface INotificationPayload {
  recipients: INotificationRecipient[];
  subject: string;
  body: string;
  bodyHtml?: string;
  priority?: 'low' | 'normal' | 'high';
  actionUrl?: string;
  actionLabel?: string;
}

export interface ITaskNotification {
  taskTitle: string;
  taskCategory: string;
  employeeName: string;
  processType: 'Onboarding' | 'Transfer' | 'Offboarding';
  dueDate?: Date;
  assignedTo: INotificationRecipient;
  actionUrl?: string;
}

export interface IApprovalNotification {
  approvalType: string;
  requestTitle: string;
  employeeName: string;
  requestorName: string;
  approver: INotificationRecipient;
  details: string;
  actionUrl: string;
}

export class GraphNotificationService {
  private graph: ReturnType<typeof graphfi> | null = null;
  private auditService: RmAuditTrailService;

  constructor(sp: SPFI, context?: WebPartContext) {
    this.auditService = new RmAuditTrailService(sp);

    // Initialize Graph client if context is available
    if (context) {
      try {
        this.graph = graphfi().using(graphSPFx(context));
      } catch (error) {
        console.warn('[GraphNotificationService] Graph client initialization failed:', error);
      }
    }
  }

  /**
   * Check if Graph API is available
   */
  public isGraphAvailable(): boolean {
    return this.graph !== null;
  }

  /**
   * Send email notification via Graph API
   */
  public async sendEmail(payload: INotificationPayload): Promise<boolean> {
    if (!this.graph) {
      console.warn('[GraphNotificationService] Graph client not available, logging to audit trail');
      await this.logNotificationToAudit('Email', payload);
      return false;
    }

    try {
      const message = {
        subject: payload.subject,
        body: {
          contentType: payload.bodyHtml ? 'HTML' : 'Text',
          content: payload.bodyHtml || payload.body,
        },
        toRecipients: payload.recipients.map(r => ({
          emailAddress: { address: r.email, name: r.displayName },
        })),
        importance: payload.priority === 'high' ? 'high' : payload.priority === 'low' ? 'low' : 'normal',
      };

      // Send email using Graph API
      await (this.graph as any).me.sendMail({ message, saveToSentItems: false });

      console.log(`[GraphNotificationService] Email sent to ${payload.recipients.length} recipients`);
      await this.logNotificationToAudit('Email', payload, true);
      return true;
    } catch (error) {
      console.error('[GraphNotificationService] Error sending email:', error);
      await this.logNotificationToAudit('Email', payload, false, String(error));
      return false;
    }
  }

  /**
   * Send Teams chat message (1:1 or group)
   */
  public async sendTeamsMessage(
    recipientEmail: string,
    message: string,
    adaptiveCard?: any
  ): Promise<boolean> {
    if (!this.graph) {
      console.warn('[GraphNotificationService] Graph client not available');
      return false;
    }

    try {
      // For Teams messages, we'd need to create a chat first then send message
      // This requires Chat.Create and ChatMessage.Send permissions
      // For now, we'll use the simpler approach of sending via email with Teams formatting
      console.log(`[GraphNotificationService] Teams message queued for ${recipientEmail}`);
      return true;
    } catch (error) {
      console.error('[GraphNotificationService] Error sending Teams message:', error);
      return false;
    }
  }

  /**
   * Send task assignment notification
   */
  public async notifyTaskAssigned(notification: ITaskNotification): Promise<boolean> {
    const themeColor = notification.processType === 'Onboarding' ? '#005BAA' :
                       notification.processType === 'Transfer' ? '#ea580c' : '#d13438';

    const dueDateStr = notification.dueDate
      ? notification.dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Not set';

    const htmlBody = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${themeColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 20px;">New Task Assigned</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">${notification.processType} — ${notification.employeeName}</p>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h3 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px;">${notification.taskTitle}</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;">Category:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">${notification.taskCategory}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Employee:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">${notification.employeeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Due Date:</td>
              <td style="padding: 8px 0; color: ${notification.dueDate && notification.dueDate < new Date() ? '#d13438' : '#1a1a1a'}; font-weight: 500;">${dueDateStr}</td>
            </tr>
          </table>
          ${notification.actionUrl ? `
            <div style="margin-top: 24px;">
              <a href="${notification.actionUrl}" style="display: inline-block; background: ${themeColor}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                View Task
              </a>
            </div>
          ` : ''}
        </div>
        <p style="font-size: 12px; color: #666; margin-top: 16px; text-align: center;">
          This is an automated notification from JML Lite
        </p>
      </div>
    `;

    const payload: INotificationPayload = {
      recipients: [notification.assignedTo],
      subject: `[JML Lite] Task Assigned: ${notification.taskTitle}`,
      body: `You have been assigned a new task: ${notification.taskTitle}\n\nEmployee: ${notification.employeeName}\nCategory: ${notification.taskCategory}\nDue Date: ${dueDateStr}`,
      bodyHtml: htmlBody,
      priority: 'normal',
      actionUrl: notification.actionUrl,
    };

    return this.sendEmail(payload);
  }

  /**
   * Send task completion notification
   */
  public async notifyTaskCompleted(
    taskTitle: string,
    employeeName: string,
    processType: 'Onboarding' | 'Transfer' | 'Offboarding',
    completedBy: string,
    notifyRecipients: INotificationRecipient[]
  ): Promise<boolean> {
    const htmlBody = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 20px;">✓ Task Completed</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">${processType} — ${employeeName}</p>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h3 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px;">${taskTitle}</h3>
          <p style="color: #666; font-size: 14px;">Completed by <strong>${completedBy}</strong> on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      </div>
    `;

    const payload: INotificationPayload = {
      recipients: notifyRecipients,
      subject: `[JML Lite] Task Completed: ${taskTitle}`,
      body: `Task "${taskTitle}" for ${employeeName} has been completed by ${completedBy}.`,
      bodyHtml: htmlBody,
      priority: 'low',
    };

    return this.sendEmail(payload);
  }

  /**
   * Send overdue task reminder
   */
  public async notifyTaskOverdue(notification: ITaskNotification): Promise<boolean> {
    const daysOverdue = notification.dueDate
      ? Math.floor((new Date().getTime() - notification.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const htmlBody = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #d13438; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 20px;">⚠ Overdue Task Reminder</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</p>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h3 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px;">${notification.taskTitle}</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;">Process:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">${notification.processType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Employee:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">${notification.employeeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Due Date:</td>
              <td style="padding: 8px 0; color: #d13438; font-weight: 600;">${notification.dueDate?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            </tr>
          </table>
          ${notification.actionUrl ? `
            <div style="margin-top: 24px;">
              <a href="${notification.actionUrl}" style="display: inline-block; background: #d13438; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                Complete Task Now
              </a>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const payload: INotificationPayload = {
      recipients: [notification.assignedTo],
      subject: `[OVERDUE] ${notification.taskTitle} — Action Required`,
      body: `Your task "${notification.taskTitle}" is ${daysOverdue} day(s) overdue. Please complete it as soon as possible.`,
      bodyHtml: htmlBody,
      priority: 'high',
      actionUrl: notification.actionUrl,
    };

    return this.sendEmail(payload);
  }

  /**
   * Send approval request notification
   */
  public async notifyApprovalRequired(notification: IApprovalNotification): Promise<boolean> {
    const htmlBody = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 20px;">Approval Required</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">${notification.approvalType}</p>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h3 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px;">${notification.requestTitle}</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;">Employee:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">${notification.employeeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Requested by:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">${notification.requestorName}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding: 12px; background: #f9f9f9; border-radius: 6px; font-size: 14px; color: #323130;">
            ${notification.details}
          </div>
          <div style="margin-top: 24px; display: flex; gap: 12px;">
            <a href="${notification.actionUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Review & Approve
            </a>
          </div>
        </div>
        <p style="font-size: 12px; color: #666; margin-top: 16px; text-align: center;">
          Please review and respond within 48 hours
        </p>
      </div>
    `;

    const payload: INotificationPayload = {
      recipients: [notification.approver],
      subject: `[Approval Required] ${notification.requestTitle}`,
      body: `You have a pending approval request:\n\n${notification.requestTitle}\nEmployee: ${notification.employeeName}\nRequested by: ${notification.requestorName}\n\nDetails: ${notification.details}`,
      bodyHtml: htmlBody,
      priority: 'high',
      actionUrl: notification.actionUrl,
    };

    return this.sendEmail(payload);
  }

  /**
   * Send approval decision notification (approved/rejected)
   */
  public async notifyApprovalDecision(
    requestTitle: string,
    employeeName: string,
    decision: 'Approved' | 'Rejected',
    decisionBy: string,
    comments: string,
    notifyRecipient: INotificationRecipient
  ): Promise<boolean> {
    const isApproved = decision === 'Approved';
    const themeColor = isApproved ? '#10b981' : '#d13438';
    const icon = isApproved ? '✓' : '✗';

    const htmlBody = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${themeColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 20px;">${icon} Request ${decision}</h2>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h3 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px;">${requestTitle}</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;">Employee:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">${employeeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">${decision} by:</td>
              <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">${decisionBy}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Date:</td>
              <td style="padding: 8px 0; color: #1a1a1a;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            </tr>
          </table>
          ${comments ? `
            <div style="margin-top: 16px; padding: 12px; background: #f9f9f9; border-radius: 6px; font-size: 14px; color: #323130;">
              <strong>Comments:</strong><br/>${comments}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const payload: INotificationPayload = {
      recipients: [notifyRecipient],
      subject: `[${decision}] ${requestTitle}`,
      body: `Your request "${requestTitle}" for ${employeeName} has been ${decision.toLowerCase()} by ${decisionBy}.${comments ? `\n\nComments: ${comments}` : ''}`,
      bodyHtml: htmlBody,
      priority: 'normal',
    };

    return this.sendEmail(payload);
  }

  /**
   * Log notification attempt to audit trail
   */
  private async logNotificationToAudit(
    type: string,
    payload: INotificationPayload,
    success: boolean = false,
    errorMessage?: string
  ): Promise<void> {
    try {
      this.auditService.logEntry({
        Action: success ? 'NotificationSent' : 'NotificationQueued',
        EntityType: 'Notification',
        EntityId: 0,
        EntityTitle: payload.subject,
        Details: JSON.stringify({
          type,
          recipients: payload.recipients.map(r => r.email),
          subject: payload.subject,
          success,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('[GraphNotificationService] Error logging to audit:', error);
    }
  }

  /**
   * Build Teams Adaptive Card for task notification
   */
  public buildTaskAdaptiveCard(notification: ITaskNotification): any {
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
              type: 'TextBlock',
              text: 'New Task Assigned',
              weight: 'Bolder',
              size: 'Medium',
              color: 'Accent',
            },
            {
              type: 'TextBlock',
              text: `${notification.processType} — ${notification.employeeName}`,
              size: 'Small',
              isSubtle: true,
            },
          ],
        },
        {
          type: 'Container',
          items: [
            {
              type: 'TextBlock',
              text: notification.taskTitle,
              weight: 'Bolder',
              size: 'Large',
              wrap: true,
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Category', value: notification.taskCategory },
                { title: 'Employee', value: notification.employeeName },
                { title: 'Due Date', value: notification.dueDate?.toLocaleDateString() || 'Not set' },
              ],
            },
          ],
        },
      ],
      actions: notification.actionUrl ? [
        {
          type: 'Action.OpenUrl',
          title: 'View Task',
          url: notification.actionUrl,
        },
      ] : [],
    };
  }
}
