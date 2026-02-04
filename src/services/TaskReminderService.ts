// Task Reminder Service - JML Lite
// Handles task reminders and deadline notifications

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import { JML_LISTS } from '../constants/SharePointListNames';
import { TeamsNotificationService, ITaskNotification } from './TeamsNotificationService';

export interface ITaskWithReminder {
  taskId: number;
  taskTitle: string;
  category: 'Onboarding' | 'Mover' | 'Offboarding';
  employeeName: string;
  employeeId?: number;
  assignedToId?: number;
  assignedToEmail?: string;
  dueDate: Date;
  priority: 'Low' | 'Medium' | 'High';
  status: string;
  parentId: number;
  parentType: 'Onboarding' | 'Mover' | 'Offboarding';
}

export interface IReminderResult {
  taskId: number;
  taskTitle: string;
  sent: boolean;
  error?: string;
}

export class TaskReminderService {
  private sp: SPFI;
  private teamsService: TeamsNotificationService;

  constructor(sp: SPFI, context?: any) {
    this.sp = sp;
    this.teamsService = new TeamsNotificationService(sp, context);
  }

  /**
   * Get all tasks due today
   */
  public async getTasksDueToday(): Promise<ITaskWithReminder[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getTasksInDateRange(today, tomorrow);
  }

  /**
   * Get all overdue tasks
   */
  public async getOverdueTasks(): Promise<ITaskWithReminder[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks: ITaskWithReminder[] = [];

    // Get overdue onboarding tasks
    try {
      const onboardingTasks = await this.sp.web.lists.getByTitle(JML_LISTS.ONBOARDING_TASKS).items
        .select('Id', 'Title', 'OnboardingId', 'AssignedToId', 'DueDate', 'Priority', 'Status')
        .filter(`DueDate lt datetime'${today.toISOString()}' and (Status eq 'Pending' or Status eq 'In Progress')`)
        .getAll();

      for (const task of onboardingTasks) {
        const parent = await this.getOnboardingInfo(task.OnboardingId);
        if (parent) {
          tasks.push({
            taskId: task.Id,
            taskTitle: task.Title,
            category: 'Onboarding',
            employeeName: parent.employeeName,
            employeeId: parent.employeeId,
            assignedToId: task.AssignedToId,
            dueDate: new Date(task.DueDate),
            priority: task.Priority || 'Medium',
            status: task.Status,
            parentId: task.OnboardingId,
            parentType: 'Onboarding',
          });
        }
      }
    } catch (error) {
      console.error('[TaskReminderService] Error getting overdue onboarding tasks:', error);
    }

    // Get overdue mover tasks
    try {
      const moverTasks = await this.sp.web.lists.getByTitle(JML_LISTS.MOVER_TASKS).items
        .select('Id', 'Title', 'MoverId', 'AssignedToId', 'DueDate', 'Priority', 'Status')
        .filter(`DueDate lt datetime'${today.toISOString()}' and (Status eq 'Pending' or Status eq 'In Progress')`)
        .getAll();

      for (const task of moverTasks) {
        const parent = await this.getMoverInfo(task.MoverId);
        if (parent) {
          tasks.push({
            taskId: task.Id,
            taskTitle: task.Title,
            category: 'Mover',
            employeeName: parent.employeeName,
            employeeId: parent.employeeId,
            assignedToId: task.AssignedToId,
            dueDate: new Date(task.DueDate),
            priority: task.Priority || 'Medium',
            status: task.Status,
            parentId: task.MoverId,
            parentType: 'Mover',
          });
        }
      }
    } catch (error) {
      console.error('[TaskReminderService] Error getting overdue mover tasks:', error);
    }

    // Get overdue offboarding tasks
    try {
      const offboardingTasks = await this.sp.web.lists.getByTitle(JML_LISTS.OFFBOARDING_TASKS).items
        .select('Id', 'Title', 'OffboardingId', 'AssignedToId', 'DueDate', 'Priority', 'Status')
        .filter(`DueDate lt datetime'${today.toISOString()}' and (Status eq 'Pending' or Status eq 'In Progress')`)
        .getAll();

      for (const task of offboardingTasks) {
        const parent = await this.getOffboardingInfo(task.OffboardingId);
        if (parent) {
          tasks.push({
            taskId: task.Id,
            taskTitle: task.Title,
            category: 'Offboarding',
            employeeName: parent.employeeName,
            employeeId: parent.employeeId,
            assignedToId: task.AssignedToId,
            dueDate: new Date(task.DueDate),
            priority: task.Priority || 'Medium',
            status: task.Status,
            parentId: task.OffboardingId,
            parentType: 'Offboarding',
          });
        }
      }
    } catch (error) {
      console.error('[TaskReminderService] Error getting overdue offboarding tasks:', error);
    }

    return tasks;
  }

  /**
   * Get tasks due within a specific date range
   */
  public async getTasksInDateRange(startDate: Date, endDate: Date): Promise<ITaskWithReminder[]> {
    const tasks: ITaskWithReminder[] = [];
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Get onboarding tasks
    try {
      const onboardingTasks = await this.sp.web.lists.getByTitle(JML_LISTS.ONBOARDING_TASKS).items
        .select('Id', 'Title', 'OnboardingId', 'AssignedToId', 'DueDate', 'Priority', 'Status')
        .filter(`DueDate ge datetime'${startISO}' and DueDate lt datetime'${endISO}' and (Status eq 'Pending' or Status eq 'In Progress')`)
        .getAll();

      for (const task of onboardingTasks) {
        const parent = await this.getOnboardingInfo(task.OnboardingId);
        if (parent) {
          tasks.push({
            taskId: task.Id,
            taskTitle: task.Title,
            category: 'Onboarding',
            employeeName: parent.employeeName,
            employeeId: parent.employeeId,
            assignedToId: task.AssignedToId,
            dueDate: new Date(task.DueDate),
            priority: task.Priority || 'Medium',
            status: task.Status,
            parentId: task.OnboardingId,
            parentType: 'Onboarding',
          });
        }
      }
    } catch (error) {
      console.error('[TaskReminderService] Error getting onboarding tasks:', error);
    }

    // Get mover tasks
    try {
      const moverTasks = await this.sp.web.lists.getByTitle(JML_LISTS.MOVER_TASKS).items
        .select('Id', 'Title', 'MoverId', 'AssignedToId', 'DueDate', 'Priority', 'Status')
        .filter(`DueDate ge datetime'${startISO}' and DueDate lt datetime'${endISO}' and (Status eq 'Pending' or Status eq 'In Progress')`)
        .getAll();

      for (const task of moverTasks) {
        const parent = await this.getMoverInfo(task.MoverId);
        if (parent) {
          tasks.push({
            taskId: task.Id,
            taskTitle: task.Title,
            category: 'Mover',
            employeeName: parent.employeeName,
            employeeId: parent.employeeId,
            assignedToId: task.AssignedToId,
            dueDate: new Date(task.DueDate),
            priority: task.Priority || 'Medium',
            status: task.Status,
            parentId: task.MoverId,
            parentType: 'Mover',
          });
        }
      }
    } catch (error) {
      console.error('[TaskReminderService] Error getting mover tasks:', error);
    }

    // Get offboarding tasks
    try {
      const offboardingTasks = await this.sp.web.lists.getByTitle(JML_LISTS.OFFBOARDING_TASKS).items
        .select('Id', 'Title', 'OffboardingId', 'AssignedToId', 'DueDate', 'Priority', 'Status')
        .filter(`DueDate ge datetime'${startISO}' and DueDate lt datetime'${endISO}' and (Status eq 'Pending' or Status eq 'In Progress')`)
        .getAll();

      for (const task of offboardingTasks) {
        const parent = await this.getOffboardingInfo(task.OffboardingId);
        if (parent) {
          tasks.push({
            taskId: task.Id,
            taskTitle: task.Title,
            category: 'Offboarding',
            employeeName: parent.employeeName,
            employeeId: parent.employeeId,
            assignedToId: task.AssignedToId,
            dueDate: new Date(task.DueDate),
            priority: task.Priority || 'Medium',
            status: task.Status,
            parentId: task.OffboardingId,
            parentType: 'Offboarding',
          });
        }
      }
    } catch (error) {
      console.error('[TaskReminderService] Error getting offboarding tasks:', error);
    }

    return tasks;
  }

  /**
   * Send reminders for all overdue tasks
   */
  public async sendOverdueReminders(): Promise<IReminderResult[]> {
    const results: IReminderResult[] = [];
    const overdueTasks = await this.getOverdueTasks();

    for (const task of overdueTasks) {
      try {
        await this.teamsService.sendOverdueTaskReminder(
          task.taskTitle,
          task.category,
          task.employeeName,
          task.dueDate,
          task.assignedToEmail
        );
        results.push({ taskId: task.taskId, taskTitle: task.taskTitle, sent: true });
      } catch (error) {
        results.push({
          taskId: task.taskId,
          taskTitle: task.taskTitle,
          sent: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Send reminders for tasks due today
   */
  public async sendDueTodayReminders(): Promise<IReminderResult[]> {
    const results: IReminderResult[] = [];
    const tasksDueToday = await this.getTasksDueToday();

    for (const task of tasksDueToday) {
      try {
        const notification: ITaskNotification = {
          taskId: task.taskId,
          taskTitle: task.taskTitle,
          category: task.category,
          employeeName: task.employeeName,
          assignedToId: task.assignedToId,
          assignedToEmail: task.assignedToEmail,
          dueDate: task.dueDate,
          priority: task.priority,
        };
        await this.teamsService.sendTaskNotification(notification);
        results.push({ taskId: task.taskId, taskTitle: task.taskTitle, sent: true });
      } catch (error) {
        results.push({
          taskId: task.taskId,
          taskTitle: task.taskTitle,
          sent: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Get task statistics for reminder dashboard
   */
  public async getTaskStats(): Promise<{
    overdue: number;
    dueToday: number;
    dueSoon: number;
    total: number;
  }> {
    const overdueTasks = await this.getOverdueTasks();
    const tasksDueToday = await this.getTasksDueToday();

    // Due within 3 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const tasksDueSoon = await this.getTasksInDateRange(today, threeDaysLater);

    return {
      overdue: overdueTasks.length,
      dueToday: tasksDueToday.length,
      dueSoon: tasksDueSoon.length,
      total: overdueTasks.length + tasksDueSoon.length,
    };
  }

  // Helper methods to get parent record info
  private async getOnboardingInfo(id: number): Promise<{ employeeName: string; employeeId?: number } | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(JML_LISTS.ONBOARDING).items
        .getById(id)
        .select('CandidateName', 'CandidateId')();
      return { employeeName: item.CandidateName, employeeId: item.CandidateId };
    } catch {
      return null;
    }
  }

  private async getMoverInfo(id: number): Promise<{ employeeName: string; employeeId?: number } | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(JML_LISTS.MOVER).items
        .getById(id)
        .select('EmployeeName', 'EmployeeId')();
      return { employeeName: item.EmployeeName, employeeId: item.EmployeeId };
    } catch {
      return null;
    }
  }

  private async getOffboardingInfo(id: number): Promise<{ employeeName: string; employeeId?: number } | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(JML_LISTS.OFFBOARDING).items
        .getById(id)
        .select('EmployeeName', 'EmployeeId')();
      return { employeeName: item.EmployeeName, employeeId: item.EmployeeId };
    } catch {
      return null;
    }
  }
}
