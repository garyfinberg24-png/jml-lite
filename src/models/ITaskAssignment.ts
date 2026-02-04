// Task Assignment Model for JML Lite
// Defines role-based task assignment across Onboarding, Mover, and Offboarding processes

/**
 * Task Assignee Role - Who is responsible for completing the task
 *
 * Tasks can be assigned to specific roles rather than individual users.
 * When a JML process is initiated, tasks are automatically assigned to:
 * - The specific user filling that role for this process (e.g., the actual employee)
 * - Or left for the role-holder to claim/be assigned
 */
export enum TaskAssigneeRole {
  /** The employee being onboarded/transferred/offboarded */
  Employee = 'Employee',

  /** HR Manager responsible for this process */
  HRManager = 'HR Manager',

  /** IT Manager/Technician for system access and equipment */
  ITManager = 'IT Manager',

  /** The employee's current/sending line manager */
  LineManager = 'Line Manager',

  /** The employee's new/receiving manager (for transfers) */
  NewManager = 'New Manager',

  /** Finance department for payroll, expenses, etc. */
  Finance = 'Finance',

  /** Facilities team for workspace, access cards, etc. */
  Facilities = 'Facilities',

  /** Security team for access control, badges, etc. */
  Security = 'Security',

  /** The hiring manager who approved the hire */
  HiringManager = 'Hiring Manager',

  /** Training coordinator for scheduling courses */
  TrainingCoordinator = 'Training Coordinator',
}

/**
 * Task Priority Level
 */
export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

/**
 * Task Status
 */
export enum TaskStatus {
  /** Task has not been started */
  Pending = 'Pending',

  /** Task is currently being worked on */
  InProgress = 'In Progress',

  /** Task has been completed successfully */
  Completed = 'Completed',

  /** Task is blocked by a dependency or issue */
  Blocked = 'Blocked',

  /** Task is not applicable for this process */
  NotApplicable = 'Not Applicable',

  /** Task was skipped with approval */
  Skipped = 'Skipped',
}

/**
 * Process Type - Which JML process this task belongs to
 */
export enum ProcessType {
  Onboarding = 'Onboarding',
  Mover = 'Mover',
  Offboarding = 'Offboarding',
}

/**
 * Task Template - Defines a reusable task that can be applied to JML processes
 * Used by admins to configure standard checklists
 */
export interface ITaskTemplate {
  Id?: number;
  Title: string;
  Description?: string;

  /** Which process this template belongs to */
  ProcessType: ProcessType;

  /** Category for grouping (e.g., System Access, Documentation) */
  Category: string;

  /** Default role to assign this task to */
  AssignToRole: TaskAssigneeRole;

  /** Days relative to key date (negative = before, positive = after)
   * For Onboarding: relative to StartDate
   * For Mover: relative to EffectiveDate
   * For Offboarding: relative to LastWorkingDate
   */
  DaysRelativeToKeyDate: number;

  /** Priority level */
  Priority: TaskPriority;

  /** Is this task mandatory? */
  IsMandatory: boolean;

  /** Estimated hours to complete */
  EstimatedHours?: number;

  /** Department-specific (empty = all departments) */
  ApplicableDepartments?: string[];

  /** Job title specific (empty = all job titles) */
  ApplicableJobTitles?: string[];

  /** Sort order for display */
  SortOrder: number;

  /** Is this template active? */
  IsActive: boolean;

  /** Instructions or guidance for completing the task */
  Instructions?: string;

  /** URL to related documentation */
  DocumentUrl?: string;
}

/**
 * Task Instance - An actual task assigned to someone for a specific JML process
 */
export interface ITaskInstance {
  Id?: number;
  Title: string;
  Description?: string;

  /** Link to the parent process */
  ProcessType: ProcessType;
  ProcessId: number; // OnboardingId, MoverId, or OffboardingId

  /** Category for grouping */
  Category: string;

  /** Task status */
  Status: TaskStatus;

  /** The role this task is assigned to */
  AssignedRole: TaskAssigneeRole;

  /** The actual user ID assigned (resolved from role) */
  AssignedToId?: number;

  /** The assigned user's name (denormalized for display) */
  AssignedToName?: string;

  /** The assigned user's email */
  AssignedToEmail?: string;

  /** Due date calculated from template */
  DueDate?: Date;

  /** Actual completion date */
  CompletedDate?: Date;

  /** User who completed the task */
  CompletedById?: number;
  CompletedByName?: string;

  /** Priority level */
  Priority: TaskPriority;

  /** Is this task mandatory? */
  IsMandatory: boolean;

  /** Estimated hours */
  EstimatedHours?: number;

  /** Actual hours spent */
  ActualHours?: number;

  /** Sort order */
  SortOrder: number;

  /** Notes/comments on this task */
  Notes?: string;

  /** Related document or link */
  DocumentUrl?: string;

  /** Created/Modified timestamps */
  Created?: Date;
  Modified?: Date;
}

/**
 * Role Assignment - Maps roles to actual users for a specific JML process
 * Each process instance has its own role assignments
 */
export interface IRoleAssignment {
  Id?: number;

  /** Process this assignment belongs to */
  ProcessType: ProcessType;
  ProcessId: number;

  /** The role being assigned */
  Role: TaskAssigneeRole;

  /** The user assigned to this role */
  UserId: number;
  UserName: string;
  UserEmail: string;

  /** When was this role assigned */
  AssignedDate?: Date;

  /** Who assigned this role */
  AssignedById?: number;
}

/**
 * Task Summary by Role - For displaying task counts per role
 */
export interface ITaskSummaryByRole {
  role: TaskAssigneeRole;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
}

/**
 * Task Summary for Dashboard/Reporting
 */
export interface ITaskOverview {
  processType: ProcessType;
  processId: number;
  processTitle: string;
  employeeName: string;
  keyDate: Date; // Start date, effective date, or last working date

  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  blockedTasks: number;

  completionPercentage: number;

  tasksByRole: ITaskSummaryByRole[];
}

/**
 * My Tasks Filter - For filtering tasks assigned to current user
 */
export interface IMyTasksFilter {
  processTypes?: ProcessType[];
  statuses?: TaskStatus[];
  priorities?: TaskPriority[];
  dueBefore?: Date;
  dueAfter?: Date;
  includeCompleted?: boolean;
}

/**
 * Helper function to calculate due date from template
 */
export function calculateDueDate(keyDate: Date, daysRelative: number): Date {
  const dueDate = new Date(keyDate);
  dueDate.setDate(dueDate.getDate() + daysRelative);
  return dueDate;
}

/**
 * Helper function to check if a task is overdue
 */
export function isTaskOverdue(task: ITaskInstance): boolean {
  if (!task.DueDate) return false;
  if (task.Status === TaskStatus.Completed || task.Status === TaskStatus.NotApplicable || task.Status === TaskStatus.Skipped) {
    return false;
  }
  return new Date() > new Date(task.DueDate);
}

/**
 * Helper function to get role display color
 */
export function getRoleColor(role: TaskAssigneeRole): string {
  const roleColors: Record<TaskAssigneeRole, string> = {
    [TaskAssigneeRole.Employee]: '#005BAA',      // Blue - Joiner color
    [TaskAssigneeRole.HRManager]: '#7c3aed',     // Purple
    [TaskAssigneeRole.ITManager]: '#0891b2',     // Cyan
    [TaskAssigneeRole.LineManager]: '#ea580c',   // Orange - Mover color
    [TaskAssigneeRole.NewManager]: '#f59e0b',    // Amber
    [TaskAssigneeRole.Finance]: '#059669',       // Emerald
    [TaskAssigneeRole.Facilities]: '#6366f1',    // Indigo
    [TaskAssigneeRole.Security]: '#d13438',      // Red - Leaver color
    [TaskAssigneeRole.HiringManager]: '#8b5cf6', // Violet
    [TaskAssigneeRole.TrainingCoordinator]: '#ec4899', // Pink
  };
  return roleColors[role] || '#6b7280';
}

/**
 * Helper function to get status display color
 */
export function getStatusColor(status: TaskStatus): string {
  const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.Pending]: '#f59e0b',      // Amber
    [TaskStatus.InProgress]: '#3b82f6',   // Blue
    [TaskStatus.Completed]: '#10b981',    // Green
    [TaskStatus.Blocked]: '#ef4444',      // Red
    [TaskStatus.NotApplicable]: '#9ca3af', // Gray
    [TaskStatus.Skipped]: '#6b7280',      // Gray
  };
  return statusColors[status] || '#6b7280';
}
