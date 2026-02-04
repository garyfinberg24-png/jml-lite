// Workflow Orchestrator — Coordinates task assignment, notifications, and approvals
// This service ties together all the workflow components

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/site-users';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { GraphNotificationService, INotificationRecipient, ITaskNotification } from './GraphNotificationService';
import { ApprovalService } from './ApprovalService';
import { OnboardingService } from './OnboardingService';
import { MoverService } from './MoverService';
import { OffboardingService } from './OffboardingService';
import { RmAuditTrailService } from './JmlAuditTrailService';
import { IOnboarding, IOnboardingTask } from '../models/IOnboarding';
import { IMoverTask } from '../models/IMover';
import { IOffboardingTask } from '../models/IOffboarding';
import { ApprovalType, ApprovalPriority, ICreateApprovalRequest } from '../models/IApproval';

export interface ITaskAssignment {
  taskId: number;
  taskTitle: string;
  category: string;
  processType: 'Onboarding' | 'Mover' | 'Offboarding';
  processId: number;
  employeeName: string;
  assigneeUserId: number;
  assigneeEmail: string;
  assigneeName: string;
  dueDate?: Date;
}

export interface IWorkflowConfig {
  sendEmailNotifications: boolean;
  sendTeamsNotifications: boolean;
  autoCreateApprovals: boolean;
  overdueReminderDays: number[];  // e.g., [1, 3, 7] - send reminders at these day intervals
  approvalDueDays: number;
}

const DEFAULT_CONFIG: IWorkflowConfig = {
  sendEmailNotifications: true,
  sendTeamsNotifications: false,
  autoCreateApprovals: true,
  overdueReminderDays: [1, 3, 7],
  approvalDueDays: 3,
};

export class WorkflowOrchestrator {
  private sp: SPFI;
  private context: WebPartContext | null;
  private notificationService: GraphNotificationService;
  private approvalService: ApprovalService;
  private onboardingService: OnboardingService;
  private moverService: MoverService;
  private offboardingService: OffboardingService;
  private auditService: RmAuditTrailService;
  private config: IWorkflowConfig;
  private siteUrl: string;

  constructor(sp: SPFI, context?: WebPartContext, config?: Partial<IWorkflowConfig>) {
    this.sp = sp;
    this.context = context || null;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.siteUrl = context?.pageContext?.web?.absoluteUrl || '';

    // Initialize all services
    this.notificationService = new GraphNotificationService(sp, context);
    this.approvalService = new ApprovalService(sp);
    this.onboardingService = new OnboardingService(sp);
    this.moverService = new MoverService(sp);
    this.offboardingService = new OffboardingService(sp);
    this.auditService = new RmAuditTrailService(sp);
  }

  // ═══════════════════════════════════════════════════════════════════
  // TASK ASSIGNMENT & NOTIFICATION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Assign a task and send notification
   */
  public async assignTask(assignment: ITaskAssignment): Promise<boolean> {
    try {
      // Update task with assignment
      let success = false;
      switch (assignment.processType) {
        case 'Onboarding':
          success = await this.onboardingService.updateOnboardingTask(assignment.taskId, {
            AssignedToId: assignment.assigneeUserId,
          });
          break;
        case 'Mover':
          success = await this.moverService.updateMoverTask(assignment.taskId, {
            AssignedToId: assignment.assigneeUserId,
          });
          break;
        case 'Offboarding':
          success = await this.offboardingService.updateOffboardingTask(assignment.taskId, {
            AssignedToId: assignment.assigneeUserId,
          });
          break;
      }

      if (!success) return false;

      // Send notification
      if (this.config.sendEmailNotifications) {
        const notification: ITaskNotification = {
          taskTitle: assignment.taskTitle,
          taskCategory: assignment.category,
          employeeName: assignment.employeeName,
          processType: assignment.processType === 'Mover' ? 'Transfer' : assignment.processType,
          dueDate: assignment.dueDate,
          assignedTo: {
            userId: assignment.assigneeUserId,
            email: assignment.assigneeEmail,
            displayName: assignment.assigneeName,
          },
          actionUrl: this.buildTaskUrl(assignment.processType, assignment.processId),
        };

        await this.notificationService.notifyTaskAssigned(notification);
      }

      this.auditService.logEntry({
        Action: 'TaskAssigned',
        EntityType: 'Task',
        EntityId: assignment.taskId,
        EntityTitle: assignment.taskTitle,
        Details: JSON.stringify({
          assignedTo: assignment.assigneeName,
          processType: assignment.processType,
          processId: assignment.processId,
        }),
      });

      return true;
    } catch (error) {
      console.error('[WorkflowOrchestrator] Error assigning task:', error);
      return false;
    }
  }

  /**
   * Handle task completion
   */
  public async onTaskCompleted(
    taskId: number,
    taskTitle: string,
    processType: 'Onboarding' | 'Mover' | 'Offboarding',
    processId: number,
    employeeName: string,
    completedByName: string,
    notifyUserIds?: number[]
  ): Promise<void> {
    try {
      // Get users to notify (e.g., manager, HR)
      const recipients: INotificationRecipient[] = [];
      if (notifyUserIds?.length) {
        for (const userId of notifyUserIds) {
          try {
            const user = await this.sp.web.siteUsers.getById(userId)();
            recipients.push({
              userId: user.Id,
              email: user.Email,
              displayName: user.Title,
            });
          } catch {
            // User not found, skip
          }
        }
      }

      if (recipients.length > 0 && this.config.sendEmailNotifications) {
        await this.notificationService.notifyTaskCompleted(
          taskTitle,
          employeeName,
          processType === 'Mover' ? 'Transfer' : processType,
          completedByName,
          recipients
        );
      }

      this.auditService.logEntry({
        Action: 'TaskCompleted',
        EntityType: 'Task',
        EntityId: taskId,
        EntityTitle: taskTitle,
        Details: JSON.stringify({
          completedBy: completedByName,
          processType,
          processId,
        }),
      });
    } catch (error) {
      console.error('[WorkflowOrchestrator] Error handling task completion:', error);
    }
  }

  /**
   * Send overdue task reminders
   */
  public async sendOverdueReminders(): Promise<number> {
    let remindersSent = 0;
    try {
      // Get all active onboardings
      const onboardings = await this.onboardingService.getOnboardings();
      for (const ob of onboardings) {
        if (!ob.Id || ob.Status === 'Completed' || ob.Status === 'Cancelled') continue;
        const tasks = await this.onboardingService.getOnboardingTasks(ob.Id);
        for (const task of tasks) {
          if (await this.shouldSendReminder(task.DueDate, task.Status as string)) {
            await this.sendTaskReminder(task, 'Onboarding', ob.Id, ob.CandidateName);
            remindersSent++;
          }
        }
      }

      // Get all active movers
      const movers = await this.moverService.getMovers();
      for (const mv of movers) {
        if (!mv.Id || mv.Status === 'Completed' || mv.Status === 'Cancelled') continue;
        const tasks = await this.moverService.getMoverTasks(mv.Id);
        for (const task of tasks) {
          if (await this.shouldSendReminder(task.DueDate, task.Status as string)) {
            await this.sendTaskReminder(task, 'Mover', mv.Id, mv.EmployeeName);
            remindersSent++;
          }
        }
      }

      // Get all active offboardings
      const offboardings = await this.offboardingService.getOffboardings();
      for (const off of offboardings) {
        if (!off.Id || off.Status === 'Completed' || off.Status === 'Cancelled') continue;
        const tasks = await this.offboardingService.getOffboardingTasks(off.Id);
        for (const task of tasks) {
          if (await this.shouldSendReminder(task.DueDate, task.Status as string)) {
            await this.sendTaskReminder(task, 'Offboarding', off.Id, off.EmployeeName);
            remindersSent++;
          }
        }
      }

      console.log(`[WorkflowOrchestrator] Sent ${remindersSent} overdue reminders`);
      return remindersSent;
    } catch (error) {
      console.error('[WorkflowOrchestrator] Error sending overdue reminders:', error);
      return remindersSent;
    }
  }

  private async shouldSendReminder(dueDate?: Date, status?: string): Promise<boolean> {
    if (!dueDate || status === 'Completed' || status === 'Not Applicable') return false;
    const now = new Date();
    const due = new Date(dueDate);
    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 0 && this.config.overdueReminderDays.includes(daysOverdue);
  }

  private async sendTaskReminder(
    task: IOnboardingTask | IMoverTask | IOffboardingTask,
    processType: 'Onboarding' | 'Mover' | 'Offboarding',
    processId: number,
    employeeName: string
  ): Promise<void> {
    if (!task.AssignedToId) return;

    try {
      const user = await this.sp.web.siteUsers.getById(task.AssignedToId)();
      const notification: ITaskNotification = {
        taskTitle: task.Title,
        taskCategory: task.Category,
        employeeName,
        processType: processType === 'Mover' ? 'Transfer' : processType,
        dueDate: task.DueDate,
        assignedTo: {
          userId: user.Id,
          email: user.Email,
          displayName: user.Title,
        },
        actionUrl: this.buildTaskUrl(processType, processId),
      };

      await this.notificationService.notifyTaskOverdue(notification);
    } catch (error) {
      console.error('[WorkflowOrchestrator] Error sending reminder:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Request approval for system access
   */
  public async requestSystemAccessApproval(
    systemName: string,
    requestedRole: string,
    employee: { name: string; email: string; department: string; jobTitle: string },
    processType: 'Onboarding' | 'Mover' | 'Offboarding',
    processId: number,
    approverId: number
  ): Promise<boolean> {
    try {
      const approver = await this.sp.web.siteUsers.getById(approverId)();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + this.config.approvalDueDays);

      const request: ICreateApprovalRequest = {
        title: `System Access: ${systemName} for ${employee.name}`,
        approvalType: ApprovalType.SystemAccess,
        priority: ApprovalPriority.High,
        relatedItemId: processId,
        relatedItemType: processType,
        relatedItemTitle: `${systemName} - ${requestedRole}`,
        employeeName: employee.name,
        employeeEmail: employee.email,
        department: employee.department,
        jobTitle: employee.jobTitle,
        approverId: approver.Id,
        approverName: approver.Title,
        approverEmail: approver.Email,
        dueDate,
        requestComments: `Requesting ${requestedRole} access to ${systemName}`,
      };

      const approval = await this.approvalService.createApproval(request);
      if (!approval) return false;

      // Send notification to approver
      if (this.config.sendEmailNotifications) {
        await this.notificationService.notifyApprovalRequired({
          approvalType: 'System Access Request',
          requestTitle: request.title,
          employeeName: employee.name,
          requestorName: this.context?.pageContext?.user?.displayName || 'System',
          approver: {
            userId: approver.Id,
            email: approver.Email,
            displayName: approver.Title,
          },
          details: `Requesting ${requestedRole} role access to ${systemName}`,
          actionUrl: this.buildApprovalUrl(approval.Id!),
        });
      }

      return true;
    } catch (error) {
      console.error('[WorkflowOrchestrator] Error requesting system access approval:', error);
      return false;
    }
  }

  /**
   * Request approval for equipment/asset
   */
  public async requestEquipmentApproval(
    assetName: string,
    assetType: string,
    employeeName: string,
    processType: 'Onboarding' | 'Mover' | 'Offboarding',
    processId: number,
    approverId: number
  ): Promise<boolean> {
    try {
      const approver = await this.sp.web.siteUsers.getById(approverId)();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + this.config.approvalDueDays);

      const request: ICreateApprovalRequest = {
        title: `Equipment Request: ${assetName} for ${employeeName}`,
        approvalType: ApprovalType.Equipment,
        priority: ApprovalPriority.Medium,
        relatedItemId: processId,
        relatedItemType: processType,
        relatedItemTitle: `${assetType} - ${assetName}`,
        employeeName,
        approverId: approver.Id,
        approverName: approver.Title,
        approverEmail: approver.Email,
        dueDate,
        requestComments: `Requesting ${assetName} (${assetType})`,
      };

      const approval = await this.approvalService.createApproval(request);
      if (!approval) return false;

      // Send notification to approver
      if (this.config.sendEmailNotifications) {
        await this.notificationService.notifyApprovalRequired({
          approvalType: 'Equipment Request',
          requestTitle: request.title,
          employeeName,
          requestorName: this.context?.pageContext?.user?.displayName || 'System',
          approver: {
            userId: approver.Id,
            email: approver.Email,
            displayName: approver.Title,
          },
          details: `Requesting ${assetName} (${assetType})`,
          actionUrl: this.buildApprovalUrl(approval.Id!),
        });
      }

      return true;
    } catch (error) {
      console.error('[WorkflowOrchestrator] Error requesting equipment approval:', error);
      return false;
    }
  }

  /**
   * Process approval decision and send notification
   */
  public async processApprovalDecision(
    approvalId: number,
    decision: 'approve' | 'reject',
    comments: string
  ): Promise<boolean> {
    try {
      const approval = await this.approvalService.getApprovalById(approvalId);
      if (!approval) return false;

      const currentUser = await this.sp.web.currentUser();

      // Process the approval
      const success = decision === 'approve'
        ? await this.approvalService.approve(approvalId, comments, currentUser.Title, currentUser.Id)
        : await this.approvalService.reject(approvalId, comments, currentUser.Title, currentUser.Id);

      if (!success) return false;

      // Notify requestor
      if (this.config.sendEmailNotifications && approval.RequestorEmail) {
        await this.notificationService.notifyApprovalDecision(
          approval.Title,
          approval.EmployeeName,
          decision === 'approve' ? 'Approved' : 'Rejected',
          currentUser.Title,
          comments,
          {
            userId: approval.RequestorId,
            email: approval.RequestorEmail,
            displayName: approval.RequestorName || 'Requestor',
          }
        );
      }

      // If approved, potentially trigger next action
      if (decision === 'approve') {
        await this.onApprovalGranted(approval);
      }

      return true;
    } catch (error) {
      console.error('[WorkflowOrchestrator] Error processing approval decision:', error);
      return false;
    }
  }

  /**
   * Handle post-approval actions
   */
  private async onApprovalGranted(approval: any): Promise<void> {
    // This is where you could trigger automated actions after approval
    // e.g., mark related task as complete, trigger next workflow step, etc.
    console.log(`[WorkflowOrchestrator] Approval granted: ${approval.Title}`);

    // Example: If this was a system access approval, mark the related task as ready
    // await this.markRelatedTaskAsApproved(approval.RelatedItemType, approval.RelatedItemId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PROCESS LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Start onboarding workflow
   */
  public async startOnboardingWorkflow(onboarding: IOnboarding): Promise<void> {
    try {
      // Log workflow start
      this.auditService.logEntry({
        Action: 'WorkflowStarted',
        EntityType: 'Onboarding',
        EntityId: onboarding.Id!,
        EntityTitle: onboarding.Title || onboarding.CandidateName,
        Details: JSON.stringify({
          employee: onboarding.CandidateName,
          startDate: onboarding.StartDate,
          department: onboarding.Department,
        }),
      });

      // TODO: Auto-assign tasks based on policy pack
      // TODO: Send welcome notification to employee
      // TODO: Notify HR and manager

      console.log(`[WorkflowOrchestrator] Started onboarding workflow for ${onboarding.CandidateName}`);
    } catch (error) {
      console.error('[WorkflowOrchestrator] Error starting onboarding workflow:', error);
    }
  }

  /**
   * Complete onboarding workflow
   */
  public async completeOnboardingWorkflow(onboardingId: number): Promise<void> {
    try {
      const onboarding = await this.onboardingService.getOnboardingById(onboardingId);
      if (!onboarding) return;

      this.auditService.logEntry({
        Action: 'WorkflowCompleted',
        EntityType: 'Onboarding',
        EntityId: onboardingId,
        EntityTitle: onboarding.Title || onboarding.CandidateName,
        Details: JSON.stringify({
          employee: onboarding.CandidateName,
          completedDate: new Date(),
        }),
      });

      console.log(`[WorkflowOrchestrator] Completed onboarding workflow for ${onboarding.CandidateName}`);
    } catch (error) {
      console.error('[WorkflowOrchestrator] Error completing onboarding workflow:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════

  private buildTaskUrl(processType: string, processId: number): string {
    const view = processType.toLowerCase();
    return `${this.siteUrl}?view=${view}&id=${processId}`;
  }

  private buildApprovalUrl(approvalId: number): string {
    return `${this.siteUrl}?view=approvals&id=${approvalId}`;
  }

  /**
   * Get user details by ID
   */
  public async getUserById(userId: number): Promise<INotificationRecipient | null> {
    try {
      const user = await this.sp.web.siteUsers.getById(userId)();
      return {
        userId: user.Id,
        email: user.Email,
        displayName: user.Title,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get users by group name
   */
  public async getUsersByGroup(groupName: string): Promise<INotificationRecipient[]> {
    try {
      const users = await this.sp.web.siteGroups.getByName(groupName).users();
      return users.map((u: any) => ({
        userId: u.Id,
        email: u.Email,
        displayName: u.Title,
      }));
    } catch {
      return [];
    }
  }
}
