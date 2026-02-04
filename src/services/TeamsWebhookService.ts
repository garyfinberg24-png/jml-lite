// Teams Webhook Service — Send notifications to Microsoft Teams via Incoming Webhooks
// No Graph API permissions required — uses Teams channel webhooks
// Reference: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { JML_LISTS } from '../constants/SharePointListNames';
import { RmAuditTrailService } from './JmlAuditTrailService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ITeamsWebhookConfig {
  primaryWebhookUrl: string | null;        // Main JML notifications channel
  hrWebhookUrl: string | null;             // HR-specific notifications
  itWebhookUrl: string | null;             // IT/System access notifications
  managerWebhookUrl: string | null;        // Manager notifications
  isEnabled: boolean;
}

export interface IWebhookMessage {
  title: string;
  subtitle?: string;
  message: string;
  category: 'Onboarding' | 'Transfer' | 'Offboarding' | 'Approval' | 'Task' | 'System';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  facts?: { title: string; value: string }[];
  actionUrl?: string;
  actionTitle?: string;
  mentionEmails?: string[];  // Emails to @mention in the message
}

export interface ITaskWebhookMessage {
  taskId: number;
  taskTitle: string;
  taskCategory: string;
  processType: 'Onboarding' | 'Transfer' | 'Offboarding';
  employeeName: string;
  assigneeName?: string;
  assigneeEmail?: string;
  dueDate?: Date;
  priority: 'Low' | 'Medium' | 'High';
  actionUrl?: string;
  isOverdue?: boolean;
  daysOverdue?: number;
}

export interface IApprovalWebhookMessage {
  approvalId: number;
  approvalType: string;
  title: string;
  employeeName: string;
  requestedBy: string;
  approverName: string;
  approverEmail?: string;
  details?: string;
  actionUrl: string;
  dueDate?: Date;
}

export interface IProcessWebhookMessage {
  processType: 'Onboarding' | 'Transfer' | 'Offboarding';
  processId: number;
  employeeName: string;
  department: string;
  jobTitle: string;
  effectiveDate: Date;
  managerName?: string;
  actionUrl?: string;
  additionalFacts?: { title: string; value: string }[];
}

// Theme colors for JML processes
const PROCESS_COLORS: Record<string, string> = {
  'Onboarding': '#005BAA',  // Blue
  'Transfer': '#ea580c',    // Orange
  'Offboarding': '#d13438', // Red
  'Approval': '#7c3aed',    // Purple
  'Task': '#107c10',        // Green
  'System': '#605e5c',      // Gray
};

const PRIORITY_ICONS: Record<string, string> = {
  'Low': '🟢',
  'Medium': '🟡',
  'High': '🟠',
  'Urgent': '🔴',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEAMS WEBHOOK SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class TeamsWebhookService {
  private sp: SPFI;
  private auditService: RmAuditTrailService;
  private configCache: ITeamsWebhookConfig | null = null;
  private configCacheExpiry: Date | null = null;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor(sp: SPFI) {
    this.sp = sp;
    this.auditService = new RmAuditTrailService(sp);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get webhook configuration from JML_Configuration list
   * Results are cached for 5 minutes to reduce SharePoint calls
   */
  public async getWebhookConfig(): Promise<ITeamsWebhookConfig> {
    // Return cached config if valid
    if (this.configCache && this.configCacheExpiry && new Date() < this.configCacheExpiry) {
      return this.configCache;
    }

    try {
      const items = await this.sp.web.lists.getByTitle(JML_LISTS.CONFIGURATION).items
        .filter("substringof('TeamsWebhook', ConfigKey)")
        .select('ConfigKey', 'ConfigValue')();

      const config: ITeamsWebhookConfig = {
        primaryWebhookUrl: null,
        hrWebhookUrl: null,
        itWebhookUrl: null,
        managerWebhookUrl: null,
        isEnabled: false,
      };

      for (const item of items) {
        switch (item.ConfigKey) {
          case 'TeamsWebhookUrl':
          case 'TeamsWebhookPrimary':
            config.primaryWebhookUrl = item.ConfigValue || null;
            break;
          case 'TeamsWebhookHR':
            config.hrWebhookUrl = item.ConfigValue || null;
            break;
          case 'TeamsWebhookIT':
            config.itWebhookUrl = item.ConfigValue || null;
            break;
          case 'TeamsWebhookManager':
            config.managerWebhookUrl = item.ConfigValue || null;
            break;
          case 'TeamsWebhookEnabled':
            config.isEnabled = item.ConfigValue?.toLowerCase() === 'true';
            break;
        }
      }

      // If no explicit enabled flag, default to enabled if primary URL exists
      if (config.primaryWebhookUrl && !items.some(i => i.ConfigKey === 'TeamsWebhookEnabled')) {
        config.isEnabled = true;
      }

      // Cache the config
      this.configCache = config;
      this.configCacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);

      return config;
    } catch (error) {
      console.error('[TeamsWebhookService] Error loading config:', error);
      return {
        primaryWebhookUrl: null,
        hrWebhookUrl: null,
        itWebhookUrl: null,
        managerWebhookUrl: null,
        isEnabled: false,
      };
    }
  }

  /**
   * Save a webhook URL to configuration
   */
  public async saveWebhookConfig(key: string, value: string): Promise<boolean> {
    try {
      // Check if key exists
      const existing = await this.sp.web.lists.getByTitle(JML_LISTS.CONFIGURATION).items
        .filter(`ConfigKey eq '${key}'`)
        .select('Id')();

      if (existing.length > 0) {
        await this.sp.web.lists.getByTitle(JML_LISTS.CONFIGURATION).items
          .getById(existing[0].Id)
          .update({ ConfigValue: value });
      } else {
        await this.sp.web.lists.getByTitle(JML_LISTS.CONFIGURATION).items.add({
          Title: key,
          ConfigKey: key,
          ConfigValue: value,
        });
      }

      // Invalidate cache
      this.configCache = null;
      this.configCacheExpiry = null;

      return true;
    } catch (error) {
      console.error('[TeamsWebhookService] Error saving config:', error);
      return false;
    }
  }

  /**
   * Test a webhook URL by sending a test message
   */
  public async testWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    const testCard = this.buildGeneralCard({
      title: 'JML Lite Webhook Test',
      message: 'This is a test message from JML Lite. If you see this, your webhook is configured correctly!',
      category: 'System',
      priority: 'Low',
      facts: [
        { title: 'Timestamp', value: new Date().toLocaleString() },
        { title: 'Test Type', value: 'Connection Verification' },
      ],
    });

    return this.sendToWebhook(webhookUrl, testCard);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADAPTIVE CARD BUILDERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Build a general notification card
   */
  private buildGeneralCard(message: IWebhookMessage): object {
    // Theme color available for future card customization
    void PROCESS_COLORS[message.category];
    const priorityIcon = PRIORITY_ICONS[message.priority] || '';

    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        // Header with color bar effect
        {
          type: 'Container',
          style: 'emphasis',
          bleed: true,
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
                      text: `${priorityIcon} ${message.title}`,
                      weight: 'Bolder',
                      size: 'Medium',
                      color: 'Accent',
                      wrap: true,
                    },
                    ...(message.subtitle ? [{
                      type: 'TextBlock',
                      text: message.subtitle,
                      size: 'Small',
                      isSubtle: true,
                      spacing: 'None',
                    }] : []),
                  ],
                },
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'TextBlock',
                      text: message.category,
                      size: 'Small',
                      weight: 'Lighter',
                      color: 'Accent',
                    },
                  ],
                },
              ],
            },
          ],
        },
        // Body
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: message.message,
              wrap: true,
            },
            ...(message.facts?.length ? [{
              type: 'FactSet',
              facts: message.facts,
              spacing: 'Medium',
            }] : []),
          ],
        },
      ],
      actions: message.actionUrl ? [
        {
          type: 'Action.OpenUrl',
          title: message.actionTitle || 'View Details',
          url: message.actionUrl,
          style: 'positive',
        },
      ] : [],
      msteams: {
        width: 'Full',
        entities: message.mentionEmails?.map((email, idx) => ({
          type: 'mention',
          text: `<at>User${idx}</at>`,
          mentioned: {
            id: email,
            name: email.split('@')[0],
          },
        })) || [],
      },
    };
  }

  /**
   * Build a task notification card
   */
  private buildTaskCard(message: ITaskWebhookMessage): object {
    // Theme color available for future card customization
    void PROCESS_COLORS[message.processType];
    const priorityIcon = PRIORITY_ICONS[message.priority] || '';
    const isOverdue = message.isOverdue || (message.dueDate && new Date(message.dueDate) < new Date());

    const headerText = isOverdue
      ? `⚠️ Overdue Task${message.daysOverdue ? ` (${message.daysOverdue} day${message.daysOverdue !== 1 ? 's' : ''})` : ''}`
      : `${priorityIcon} New Task Assigned`;

    const facts = [
      { title: 'Employee', value: message.employeeName },
      { title: 'Category', value: message.taskCategory },
      { title: 'Process', value: message.processType },
    ];

    if (message.assigneeName) {
      facts.push({ title: 'Assigned To', value: message.assigneeName });
    }

    if (message.dueDate) {
      const dueDateStr = new Date(message.dueDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      facts.push({ title: 'Due Date', value: isOverdue ? `⚠️ ${dueDateStr}` : dueDateStr });
    }

    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: isOverdue ? 'attention' : 'emphasis',
          bleed: true,
          items: [
            {
              type: 'TextBlock',
              text: headerText,
              weight: 'Bolder',
              size: 'Medium',
              color: isOverdue ? 'Attention' : 'Accent',
            },
            {
              type: 'TextBlock',
              text: `${message.processType} — ${message.employeeName}`,
              size: 'Small',
              isSubtle: true,
              spacing: 'None',
            },
          ],
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: message.taskTitle,
              weight: 'Bolder',
              size: 'Large',
              wrap: true,
            },
            {
              type: 'FactSet',
              facts,
              spacing: 'Medium',
            },
          ],
        },
      ],
      actions: message.actionUrl ? [
        {
          type: 'Action.OpenUrl',
          title: isOverdue ? 'Complete Task Now' : 'View Task',
          url: message.actionUrl,
          style: 'positive',
        },
      ] : [],
      msteams: {
        width: 'Full',
      },
    };
  }

  /**
   * Build an approval request card with action buttons
   */
  private buildApprovalCard(message: IApprovalWebhookMessage): object {
    const facts = [
      { title: 'Type', value: message.approvalType },
      { title: 'Employee', value: message.employeeName },
      { title: 'Requested By', value: message.requestedBy },
    ];

    if (message.approverName) {
      facts.push({ title: 'Approver', value: message.approverName });
    }

    if (message.dueDate) {
      facts.push({
        title: 'Due By',
        value: new Date(message.dueDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      });
    }

    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: 'warning',
          bleed: true,
          items: [
            {
              type: 'TextBlock',
              text: '⚠️ Approval Required',
              weight: 'Bolder',
              size: 'Medium',
              color: 'Warning',
            },
          ],
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: message.title,
              weight: 'Bolder',
              size: 'Large',
              wrap: true,
            },
            {
              type: 'FactSet',
              facts,
              spacing: 'Medium',
            },
            ...(message.details ? [{
              type: 'Container',
              style: 'accent',
              items: [
                {
                  type: 'TextBlock',
                  text: message.details,
                  wrap: true,
                  size: 'Small',
                },
              ],
            }] : []),
          ],
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Review & Approve',
          url: message.actionUrl,
          style: 'positive',
        },
      ],
      msteams: {
        width: 'Full',
      },
    };
  }

  /**
   * Build a process started/completed card (Onboarding, Transfer, Offboarding)
   */
  private buildProcessCard(
    message: IProcessWebhookMessage,
    status: 'started' | 'completed' | 'cancelled'
  ): object {
    // Theme color available for future card customization
    void PROCESS_COLORS[message.processType];

    const statusIcons: Record<string, string> = {
      started: '🚀',
      completed: '✅',
      cancelled: '❌',
    };

    const statusLabels = {
      started: 'Started',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };

    const facts = [
      { title: 'Employee', value: message.employeeName },
      { title: 'Department', value: message.department },
      { title: 'Job Title', value: message.jobTitle },
      {
        title: message.processType === 'Offboarding' ? 'Last Day' : 'Effective Date',
        value: new Date(message.effectiveDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      },
    ];

    if (message.managerName) {
      facts.push({ title: 'Manager', value: message.managerName });
    }

    if (message.additionalFacts) {
      facts.push(...message.additionalFacts);
    }

    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: status === 'completed' ? 'good' : status === 'cancelled' ? 'attention' : 'emphasis',
          bleed: true,
          items: [
            {
              type: 'TextBlock',
              text: `${statusIcons[status]} ${message.processType} ${statusLabels[status]}`,
              weight: 'Bolder',
              size: 'Medium',
              color: status === 'completed' ? 'Good' : status === 'cancelled' ? 'Attention' : 'Accent',
            },
          ],
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: message.employeeName,
              weight: 'Bolder',
              size: 'Large',
            },
            {
              type: 'FactSet',
              facts,
              spacing: 'Medium',
            },
          ],
        },
      ],
      actions: message.actionUrl ? [
        {
          type: 'Action.OpenUrl',
          title: 'View Details',
          url: message.actionUrl,
        },
      ] : [],
      msteams: {
        width: 'Full',
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEND METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Send an adaptive card to a Teams webhook
   */
  private async sendToWebhook(
    webhookUrl: string,
    card: object
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'message',
          attachments: [
            {
              contentType: 'application/vnd.microsoft.card.adaptive',
              contentUrl: null,
              content: card,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TeamsWebhookService] Webhook error:', response.status, errorText);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[TeamsWebhookService] Error sending to webhook:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Send a general notification to the primary webhook
   */
  public async sendNotification(message: IWebhookMessage): Promise<boolean> {
    const config = await this.getWebhookConfig();

    if (!config.isEnabled || !config.primaryWebhookUrl) {
      console.log('[TeamsWebhookService] Webhooks disabled or not configured');
      return false;
    }

    const card = this.buildGeneralCard(message);
    const result = await this.sendToWebhook(config.primaryWebhookUrl, card);

    // Log to audit trail
    this.auditService.logEntry({
      Action: result.success ? 'TeamsNotificationSent' : 'TeamsNotificationFailed',
      EntityType: 'Notification',
      EntityId: 0,
      EntityTitle: message.title,
      Details: JSON.stringify({
        category: message.category,
        priority: message.priority,
        success: result.success,
        error: result.error,
      }),
    });

    return result.success;
  }

  /**
   * Send a task notification
   */
  public async sendTaskNotification(message: ITaskWebhookMessage): Promise<boolean> {
    const config = await this.getWebhookConfig();

    if (!config.isEnabled || !config.primaryWebhookUrl) {
      return false;
    }

    const card = this.buildTaskCard(message);
    const result = await this.sendToWebhook(config.primaryWebhookUrl, card);

    this.auditService.logEntry({
      Action: result.success ? 'TeamsTaskNotificationSent' : 'TeamsTaskNotificationFailed',
      EntityType: 'Task',
      EntityId: message.taskId,
      EntityTitle: message.taskTitle,
      Details: JSON.stringify({
        processType: message.processType,
        employeeName: message.employeeName,
        assignee: message.assigneeName,
        success: result.success,
        error: result.error,
      }),
    });

    return result.success;
  }

  /**
   * Send an overdue task reminder
   */
  public async sendOverdueTaskReminder(message: ITaskWebhookMessage): Promise<boolean> {
    const config = await this.getWebhookConfig();

    if (!config.isEnabled || !config.primaryWebhookUrl) {
      return false;
    }

    // Calculate days overdue
    if (message.dueDate) {
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(message.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      message.isOverdue = true;
      message.daysOverdue = daysOverdue;
    }

    const card = this.buildTaskCard(message);
    const result = await this.sendToWebhook(config.primaryWebhookUrl, card);

    return result.success;
  }

  /**
   * Send an approval request notification
   */
  public async sendApprovalNotification(message: IApprovalWebhookMessage): Promise<boolean> {
    const config = await this.getWebhookConfig();

    if (!config.isEnabled || !config.primaryWebhookUrl) {
      return false;
    }

    const card = this.buildApprovalCard(message);
    const result = await this.sendToWebhook(config.primaryWebhookUrl, card);

    this.auditService.logEntry({
      Action: result.success ? 'TeamsApprovalNotificationSent' : 'TeamsApprovalNotificationFailed',
      EntityType: 'Approval',
      EntityId: message.approvalId,
      EntityTitle: message.title,
      Details: JSON.stringify({
        approvalType: message.approvalType,
        employeeName: message.employeeName,
        approver: message.approverName,
        success: result.success,
        error: result.error,
      }),
    });

    return result.success;
  }

  /**
   * Notify when an onboarding process starts
   */
  public async notifyOnboardingStarted(message: IProcessWebhookMessage): Promise<boolean> {
    const config = await this.getWebhookConfig();

    if (!config.isEnabled || !config.primaryWebhookUrl) {
      return false;
    }

    message.processType = 'Onboarding';
    const card = this.buildProcessCard(message, 'started');
    const result = await this.sendToWebhook(config.primaryWebhookUrl, card);

    // Also send to HR webhook if configured
    if (config.hrWebhookUrl) {
      await this.sendToWebhook(config.hrWebhookUrl, card);
    }

    return result.success;
  }

  /**
   * Notify when a transfer process starts
   */
  public async notifyTransferStarted(message: IProcessWebhookMessage): Promise<boolean> {
    const config = await this.getWebhookConfig();

    if (!config.isEnabled || !config.primaryWebhookUrl) {
      return false;
    }

    message.processType = 'Transfer';
    const card = this.buildProcessCard(message, 'started');
    const result = await this.sendToWebhook(config.primaryWebhookUrl, card);

    // Also send to HR and IT webhooks if configured
    if (config.hrWebhookUrl) {
      await this.sendToWebhook(config.hrWebhookUrl, card);
    }
    if (config.itWebhookUrl) {
      await this.sendToWebhook(config.itWebhookUrl, card);
    }

    return result.success;
  }

  /**
   * Notify when an offboarding process starts
   */
  public async notifyOffboardingStarted(
    message: IProcessWebhookMessage,
    terminationType?: string
  ): Promise<boolean> {
    const config = await this.getWebhookConfig();

    if (!config.isEnabled || !config.primaryWebhookUrl) {
      return false;
    }

    message.processType = 'Offboarding';
    if (terminationType) {
      message.additionalFacts = [
        ...(message.additionalFacts || []),
        { title: 'Type', value: terminationType },
      ];
    }

    const card = this.buildProcessCard(message, 'started');
    const result = await this.sendToWebhook(config.primaryWebhookUrl, card);

    // Also send to HR and IT webhooks if configured
    if (config.hrWebhookUrl) {
      await this.sendToWebhook(config.hrWebhookUrl, card);
    }
    if (config.itWebhookUrl) {
      await this.sendToWebhook(config.itWebhookUrl, card);
    }

    return result.success;
  }

  /**
   * Notify when a process completes
   */
  public async notifyProcessCompleted(message: IProcessWebhookMessage): Promise<boolean> {
    const config = await this.getWebhookConfig();

    if (!config.isEnabled || !config.primaryWebhookUrl) {
      return false;
    }

    const card = this.buildProcessCard(message, 'completed');
    const result = await this.sendToWebhook(config.primaryWebhookUrl, card);

    return result.success;
  }

  /**
   * Send notification to a specific webhook (for targeted routing)
   */
  public async sendToSpecificWebhook(
    webhookType: 'primary' | 'hr' | 'it' | 'manager',
    message: IWebhookMessage
  ): Promise<boolean> {
    const config = await this.getWebhookConfig();

    if (!config.isEnabled) {
      return false;
    }

    let webhookUrl: string | null = null;
    switch (webhookType) {
      case 'primary':
        webhookUrl = config.primaryWebhookUrl;
        break;
      case 'hr':
        webhookUrl = config.hrWebhookUrl || config.primaryWebhookUrl;
        break;
      case 'it':
        webhookUrl = config.itWebhookUrl || config.primaryWebhookUrl;
        break;
      case 'manager':
        webhookUrl = config.managerWebhookUrl || config.primaryWebhookUrl;
        break;
    }

    if (!webhookUrl) {
      return false;
    }

    const card = this.buildGeneralCard(message);
    const result = await this.sendToWebhook(webhookUrl, card);

    return result.success;
  }
}
