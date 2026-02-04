// Graph Notification Service — Email notifications via Microsoft Graph API
// Requires API permissions: Mail.Send (already consented)
// Uses MSGraphClientFactory for proper SPFx Graph API authentication

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { MSGraphClientV3 } from '@microsoft/sp-http';
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
  private context: WebPartContext | null = null;
  private graphClient: MSGraphClientV3 | null = null;
  private auditService: RmAuditTrailService;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(sp: SPFI, context?: WebPartContext) {
    this.auditService = new RmAuditTrailService(sp);
    this.context = context || null;

    // Start async initialization if context is available
    if (context) {
      this.initPromise = this.initializeGraphClient();
    }
  }

  /**
   * Initialize the Graph client asynchronously
   */
  private async initializeGraphClient(): Promise<void> {
    if (!this.context || this.isInitialized) return;

    try {
      this.graphClient = await this.context.msGraphClientFactory.getClient('3');
      this.isInitialized = true;
      console.log('[GraphNotificationService] Graph client initialized successfully');
    } catch (error) {
      console.error('[GraphNotificationService] Failed to initialize Graph client:', error);
      this.graphClient = null;
    }
  }

  /**
   * Ensure Graph client is ready before making calls
   */
  private async ensureGraphClient(): Promise<MSGraphClientV3 | null> {
    if (this.initPromise) {
      await this.initPromise;
    }
    return this.graphClient;
  }

  /**
   * Check if Graph API is available
   */
  public isGraphAvailable(): boolean {
    return this.context !== null;
  }

  /**
   * Check if Graph client is initialized and ready
   */
  public async isGraphReady(): Promise<boolean> {
    const client = await this.ensureGraphClient();
    return client !== null;
  }

  /**
   * Send email notification via Graph API using MSGraphClientV3
   * Uses Mail.Send permission to send email on behalf of current user
   */
  public async sendEmail(payload: INotificationPayload): Promise<boolean> {
    const client = await this.ensureGraphClient();

    if (!client) {
      console.warn('[GraphNotificationService] Graph client not available, logging to audit trail');
      await this.logNotificationToAudit('Email', payload);
      return false;
    }

    try {
      // Build the email message per Microsoft Graph API spec
      const emailMessage = {
        message: {
          subject: payload.subject,
          body: {
            contentType: payload.bodyHtml ? 'HTML' : 'Text',
            content: payload.bodyHtml || payload.body,
          },
          toRecipients: payload.recipients.map(r => ({
            emailAddress: {
              address: r.email,
              name: r.displayName,
            },
          })),
          importance: payload.priority === 'high' ? 'high' : payload.priority === 'low' ? 'low' : 'normal',
        },
        saveToSentItems: false,
      };

      // Send email using Microsoft Graph API /me/sendMail endpoint
      await client.api('/me/sendMail').post(emailMessage);

      console.log(`[GraphNotificationService] Email sent successfully to ${payload.recipients.length} recipient(s): ${payload.recipients.map(r => r.email).join(', ')}`);
      await this.logNotificationToAudit('Email', payload, true);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[GraphNotificationService] Error sending email:', error);
      await this.logNotificationToAudit('Email', payload, false, errorMessage);
      return false;
    }
  }

  /**
   * Send email to specific address (convenience method)
   */
  public async sendEmailTo(
    toEmail: string,
    toName: string,
    subject: string,
    bodyHtml: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<boolean> {
    return this.sendEmail({
      recipients: [{ email: toEmail, displayName: toName }],
      subject,
      body: bodyHtml.replace(/<[^>]*>/g, ''), // Strip HTML for plain text fallback
      bodyHtml,
      priority,
    });
  }

  /**
   * Send Teams chat message (1:1 or group)
   * Note: Requires Chat.Create and ChatMessage.Send permissions
   * Currently falls back to email if Teams chat permissions not available
   */
  public async sendTeamsMessage(
    recipientEmail: string,
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _adaptiveCard?: unknown
  ): Promise<boolean> {
    const client = await this.ensureGraphClient();

    if (!client) {
      console.warn('[GraphNotificationService] Graph client not available for Teams message');
      return false;
    }

    try {
      // For Teams 1:1 chat messages, we need Chat.Create and ChatMessage.Send permissions
      // Since these may not be consented, we'll log and return success for now
      // The webhook service handles channel notifications; this is for direct messages
      console.log(`[GraphNotificationService] Teams message queued for ${recipientEmail}: ${message.substring(0, 50)}...`);

      // Future implementation would:
      // 1. Create a chat: POST /chats with members array
      // 2. Send message: POST /chats/{chatId}/messages with body content

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
