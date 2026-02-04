// Task Library Models - JML Lite
// Predefined task templates with classification system

/**
 * Task Classification Prefixes
 *
 * DOC-### : Documentation & Paperwork
 * SYS-### : System Access & IT Setup
 * HRD-### : Hardware & Equipment
 * TRN-### : Training & Development
 * ORI-### : Orientation & Induction
 * CMP-### : Compliance & Legal
 * FAC-### : Facilities & Workspace
 * SEC-### : Security & Access Control
 * FIN-### : Finance & Payroll
 * COM-### : Communication & Accounts
 */

export enum TaskClassification {
  DOC = 'DOC',  // Documentation & Paperwork
  SYS = 'SYS',  // System Access & IT Setup
  HRD = 'HRD',  // Hardware & Equipment
  TRN = 'TRN',  // Training & Development
  ORI = 'ORI',  // Orientation & Induction
  CMP = 'CMP',  // Compliance & Legal
  FAC = 'FAC',  // Facilities & Workspace
  SEC = 'SEC',  // Security & Access Control
  FIN = 'FIN',  // Finance & Payroll
  COM = 'COM',  // Communication & Accounts
}

export const TASK_CLASSIFICATION_INFO: Record<TaskClassification, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  [TaskClassification.DOC]: {
    label: 'Documentation',
    description: 'Paperwork, contracts, and document collection',
    color: '#137333',
    bgColor: '#e6f4ea',
    icon: 'DocumentSet',
  },
  [TaskClassification.SYS]: {
    label: 'System Access',
    description: 'Software, applications, and system provisioning',
    color: '#1967d2',
    bgColor: '#e8f0fe',
    icon: 'Permissions',
  },
  [TaskClassification.HRD]: {
    label: 'Hardware',
    description: 'Laptops, phones, and physical equipment',
    color: '#b06000',
    bgColor: '#fef7e0',
    icon: 'Devices3',
  },
  [TaskClassification.TRN]: {
    label: 'Training',
    description: 'Courses, certifications, and learning',
    color: '#c5221f',
    bgColor: '#fce8e6',
    icon: 'Education',
  },
  [TaskClassification.ORI]: {
    label: 'Orientation',
    description: 'Induction, introductions, and onboarding sessions',
    color: '#7627bb',
    bgColor: '#f3e8fd',
    icon: 'People',
  },
  [TaskClassification.CMP]: {
    label: 'Compliance',
    description: 'Legal, regulatory, and policy requirements',
    color: '#5f6368',
    bgColor: '#e8eaed',
    icon: 'Shield',
  },
  [TaskClassification.FAC]: {
    label: 'Facilities',
    description: 'Workspace, desk, and office setup',
    color: '#0d652d',
    bgColor: '#e6f4ea',
    icon: 'CityNext',
  },
  [TaskClassification.SEC]: {
    label: 'Security',
    description: 'Access cards, badges, and physical security',
    color: '#c5221f',
    bgColor: '#fce8e6',
    icon: 'Lock',
  },
  [TaskClassification.FIN]: {
    label: 'Finance',
    description: 'Payroll, banking, and financial setup',
    color: '#1967d2',
    bgColor: '#e8f0fe',
    icon: 'Money',
  },
  [TaskClassification.COM]: {
    label: 'Communication',
    description: 'Email, Teams, and communication accounts',
    color: '#7627bb',
    bgColor: '#f3e8fd',
    icon: 'Mail',
  },
};

export enum TaskProcessType {
  Onboarding = 'Onboarding',
  Mover = 'Mover',
  Offboarding = 'Offboarding',
  All = 'All', // Applies to all process types
}

export enum TaskAssignmentType {
  Specific = 'Specific',     // Assigned to specific user
  Role = 'Role',             // Assigned to role/team
  Manager = 'Manager',       // Assigned to hiring/line manager
  Employee = 'Employee',     // Self-service by the employee
  Auto = 'Auto',             // Auto-assigned via round robin
}

export interface ITaskLibraryItem {
  Id?: number;

  // Classification
  TaskCode: string;           // e.g., "SYS-001", "HRD-003"
  Classification: TaskClassification;
  SequenceNumber: number;     // The numeric part (001, 002, etc.)

  // Basic info
  Title: string;
  Description?: string;
  Instructions?: string;      // Detailed instructions for the assignee

  // Applicability
  ProcessTypes: TaskProcessType[];  // Which processes this applies to
  Departments?: string[];           // Specific departments (empty = all)
  JobTitles?: string[];             // Specific job titles (empty = all)

  // Assignment defaults
  DefaultAssignmentType: TaskAssignmentType;
  DefaultAssigneeRole?: string;     // e.g., "IT Team", "HR Team"
  DefaultAssigneeId?: number;       // For specific assignment
  DefaultAssigneeName?: string;

  // Timing defaults (relative to start date)
  DefaultOffsetType: 'before-start' | 'on-start' | 'after-start';
  DefaultDaysOffset: number;
  EstimatedHours?: number;

  // Priority & approval
  DefaultPriority: 'Low' | 'Medium' | 'High' | 'Critical';
  RequiresApproval: boolean;
  DefaultApproverId?: number;
  DefaultApproverName?: string;
  DefaultApproverRole?: string;     // e.g., "Manager", "IT Lead"

  // Notifications
  SendEmailNotification: boolean;
  SendTeamsNotification: boolean;
  SendReminder: boolean;
  ReminderDaysBefore: number;
  NotifyOnComplete: boolean;

  // Dependencies
  DependsOnTaskCodes?: string[];    // Task codes that must complete first
  BlockedByTaskCodes?: string[];    // Task codes that block this task

  // Metadata
  IsActive: boolean;
  IsMandatory: boolean;             // Cannot be removed from checklist
  SortOrder: number;
  Tags?: string[];                  // For filtering/searching

  // Audit
  Created?: Date;
  Modified?: Date;
  CreatedById?: number;
  ModifiedById?: number;
}

// For creating/updating tasks
export interface ITaskLibraryItemInput {
  Classification: TaskClassification;
  Title: string;
  Description?: string;
  Instructions?: string;
  ProcessTypes: TaskProcessType[];
  Departments?: string[];
  JobTitles?: string[];
  DefaultAssignmentType: TaskAssignmentType;
  DefaultAssigneeRole?: string;
  DefaultAssigneeId?: number;
  DefaultAssigneeName?: string;
  DefaultOffsetType: 'before-start' | 'on-start' | 'after-start';
  DefaultDaysOffset: number;
  EstimatedHours?: number;
  DefaultPriority: 'Low' | 'Medium' | 'High' | 'Critical';
  RequiresApproval: boolean;
  DefaultApproverId?: number;
  DefaultApproverName?: string;
  DefaultApproverRole?: string;
  SendEmailNotification: boolean;
  SendTeamsNotification: boolean;
  SendReminder: boolean;
  ReminderDaysBefore: number;
  NotifyOnComplete: boolean;
  DependsOnTaskCodes?: string[];
  IsActive: boolean;
  IsMandatory: boolean;
  SortOrder?: number;
  Tags?: string[];
}

// Filters for querying tasks
export interface ITaskLibraryFilters {
  classification?: TaskClassification[];
  processType?: TaskProcessType;
  department?: string;
  jobTitle?: string;
  isActive?: boolean;
  isMandatory?: boolean;
  searchText?: string;
  tags?: string[];
}

// Statistics for dashboard
export interface ITaskLibraryStats {
  totalTasks: number;
  activeTasks: number;
  byClassification: Record<TaskClassification, number>;
  byProcessType: Record<TaskProcessType, number>;
  mandatoryTasks: number;
  requiresApproval: number;
}

// Helper function to generate task code
export function generateTaskCode(classification: TaskClassification, sequenceNumber: number): string {
  const numStr = String(sequenceNumber);
  const padded = numStr.length >= 3 ? numStr : ('000' + numStr).slice(-3);
  return `${classification}-${padded}`;
}

// Helper function to parse task code
export function parseTaskCode(taskCode: string): { classification: TaskClassification; sequenceNumber: number } | null {
  const match = taskCode.match(/^([A-Z]{3})-(\d{3})$/);
  if (!match) return null;

  const classification = match[1] as TaskClassification;
  const sequenceNumber = parseInt(match[2], 10);

  if (!Object.values(TaskClassification).includes(classification)) return null;

  return { classification, sequenceNumber };
}

// Default tasks for seeding
export const DEFAULT_TASK_LIBRARY: Partial<ITaskLibraryItem>[] = [
  // Documentation Tasks
  {
    Classification: TaskClassification.DOC,
    Title: 'Collect Employment Contract',
    Description: 'Ensure signed employment contract is received and filed',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'HR Team',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 5,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 2,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
  },
  {
    Classification: TaskClassification.DOC,
    Title: 'Collect ID Documents',
    Description: 'Collect and verify identification documents (passport, ID card)',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'HR Team',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 5,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 2,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
  },
  {
    Classification: TaskClassification.DOC,
    Title: 'Complete Tax Forms',
    Description: 'Ensure all required tax documentation is completed',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'HR Team',
    DefaultOffsetType: 'on-start',
    DefaultDaysOffset: 0,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
  },

  // System Access Tasks
  {
    Classification: TaskClassification.SYS,
    Title: 'Create Active Directory Account',
    Description: 'Create AD account with appropriate group memberships',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'IT Team',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 3,
    DefaultPriority: 'High',
    RequiresApproval: true,
    DefaultApproverRole: 'IT Lead',
    SendEmailNotification: true,
    SendTeamsNotification: true,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
  },
  {
    Classification: TaskClassification.SYS,
    Title: 'Provision Microsoft 365 License',
    Description: 'Assign appropriate M365 license (E3/E5/F3)',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'IT Team',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 2,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: true,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
    DependsOnTaskCodes: ['SYS-001'],
  },
  {
    Classification: TaskClassification.SYS,
    Title: 'Set Up Email & Teams',
    Description: 'Configure email signature and add to relevant Teams channels',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'IT Team',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 1,
    DefaultPriority: 'Medium',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: true,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
    DependsOnTaskCodes: ['SYS-002'],
  },
  {
    Classification: TaskClassification.SYS,
    Title: 'Grant SharePoint Access',
    Description: 'Add to appropriate SharePoint sites and document libraries',
    ProcessTypes: [TaskProcessType.Onboarding, TaskProcessType.Mover],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'IT Team',
    DefaultOffsetType: 'on-start',
    DefaultDaysOffset: 0,
    DefaultPriority: 'Medium',
    RequiresApproval: true,
    DefaultApproverRole: 'Manager',
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: false,
    IsActive: true,
  },

  // Hardware Tasks
  {
    Classification: TaskClassification.HRD,
    Title: 'Provision Laptop',
    Description: 'Prepare and configure laptop with standard software',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'IT Team',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 5,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: true,
    SendReminder: true,
    ReminderDaysBefore: 2,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
    EstimatedHours: 2,
  },
  {
    Classification: TaskClassification.HRD,
    Title: 'Set Up Mobile Phone',
    Description: 'Configure company mobile phone with MDM enrollment',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'IT Team',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 2,
    DefaultPriority: 'Medium',
    RequiresApproval: true,
    DefaultApproverRole: 'Manager',
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: false,
    IsActive: true,
    EstimatedHours: 0.5,
  },
  {
    Classification: TaskClassification.HRD,
    Title: 'Provision Monitors & Peripherals',
    Description: 'Set up monitors, keyboard, mouse, and other peripherals',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'IT Team',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 1,
    DefaultPriority: 'Medium',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: false,
    IsActive: true,
    EstimatedHours: 0.5,
  },

  // Training Tasks
  {
    Classification: TaskClassification.TRN,
    Title: 'Complete Company Induction Course',
    Description: 'Complete mandatory company induction e-learning module',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Employee,
    DefaultOffsetType: 'after-start',
    DefaultDaysOffset: 5,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 2,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
    EstimatedHours: 4,
  },
  {
    Classification: TaskClassification.TRN,
    Title: 'Complete IT Security Training',
    Description: 'Complete mandatory cybersecurity awareness training',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Employee,
    DefaultOffsetType: 'after-start',
    DefaultDaysOffset: 7,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 2,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
    EstimatedHours: 2,
  },
  {
    Classification: TaskClassification.TRN,
    Title: 'Complete Health & Safety Training',
    Description: 'Complete mandatory H&S training for the workplace',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Employee,
    DefaultOffsetType: 'after-start',
    DefaultDaysOffset: 14,
    DefaultPriority: 'Medium',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 3,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
    EstimatedHours: 1,
  },

  // Orientation Tasks
  {
    Classification: TaskClassification.ORI,
    Title: 'Schedule Manager Introduction',
    Description: 'Arrange initial meeting with line manager',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Manager,
    DefaultOffsetType: 'on-start',
    DefaultDaysOffset: 0,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: true,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: false,
    IsMandatory: true,
    IsActive: true,
    EstimatedHours: 1,
  },
  {
    Classification: TaskClassification.ORI,
    Title: 'Team Introduction Meeting',
    Description: 'Introduce new starter to immediate team members',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Manager,
    DefaultOffsetType: 'on-start',
    DefaultDaysOffset: 0,
    DefaultPriority: 'Medium',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: false,
    IsMandatory: true,
    IsActive: true,
    EstimatedHours: 1,
  },
  {
    Classification: TaskClassification.ORI,
    Title: 'Office Tour & Facilities Overview',
    Description: 'Tour of office facilities including kitchen, meeting rooms, etc.',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'Facilities',
    DefaultOffsetType: 'on-start',
    DefaultDaysOffset: 0,
    DefaultPriority: 'Low',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: false,
    ReminderDaysBefore: 0,
    NotifyOnComplete: false,
    IsMandatory: false,
    IsActive: true,
    EstimatedHours: 0.5,
  },

  // Security Tasks
  {
    Classification: TaskClassification.SEC,
    Title: 'Issue Access Badge',
    Description: 'Create and issue building access badge/card',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'Security',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 1,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
    EstimatedHours: 0.5,
  },
  {
    Classification: TaskClassification.SEC,
    Title: 'Configure Building Access Zones',
    Description: 'Set up access permissions for appropriate building zones',
    ProcessTypes: [TaskProcessType.Onboarding, TaskProcessType.Mover],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'Security',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 1,
    DefaultPriority: 'Medium',
    RequiresApproval: true,
    DefaultApproverRole: 'Manager',
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: false,
    IsActive: true,
    DependsOnTaskCodes: ['SEC-001'],
  },

  // Finance Tasks
  {
    Classification: TaskClassification.FIN,
    Title: 'Set Up Payroll',
    Description: 'Add employee to payroll system with correct details',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'Finance',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 3,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 2,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
  },
  {
    Classification: TaskClassification.FIN,
    Title: 'Collect Banking Details',
    Description: 'Obtain and verify bank account details for salary payments',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'HR Team',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 5,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 2,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
  },

  // Compliance Tasks
  {
    Classification: TaskClassification.CMP,
    Title: 'Sign NDA',
    Description: 'Ensure Non-Disclosure Agreement is signed and filed',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'HR Team',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 3,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
  },
  {
    Classification: TaskClassification.CMP,
    Title: 'Acknowledge IT Acceptable Use Policy',
    Description: 'Employee acknowledgement of IT acceptable use policy',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Employee,
    DefaultOffsetType: 'on-start',
    DefaultDaysOffset: 0,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
  },

  // Facilities Tasks
  {
    Classification: TaskClassification.FAC,
    Title: 'Set Up Desk/Workspace',
    Description: 'Prepare desk with required furniture and supplies',
    ProcessTypes: [TaskProcessType.Onboarding, TaskProcessType.Mover],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'Facilities',
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 1,
    DefaultPriority: 'Medium',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: false,
    IsActive: true,
    EstimatedHours: 1,
  },
  {
    Classification: TaskClassification.FAC,
    Title: 'Order Business Cards',
    Description: 'Order business cards with correct details',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'Facilities',
    DefaultOffsetType: 'after-start',
    DefaultDaysOffset: 3,
    DefaultPriority: 'Low',
    RequiresApproval: true,
    DefaultApproverRole: 'Manager',
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: false,
    ReminderDaysBefore: 0,
    NotifyOnComplete: true,
    IsMandatory: false,
    IsActive: true,
  },

  // Offboarding Tasks
  {
    Classification: TaskClassification.SYS,
    Title: 'Disable Active Directory Account',
    Description: 'Disable AD account and remove from all groups',
    ProcessTypes: [TaskProcessType.Offboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'IT Team',
    DefaultOffsetType: 'on-start', // "on-start" = last day for offboarding
    DefaultDaysOffset: 0,
    DefaultPriority: 'Critical',
    RequiresApproval: true,
    DefaultApproverRole: 'IT Lead',
    SendEmailNotification: true,
    SendTeamsNotification: true,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
  },
  {
    Classification: TaskClassification.HRD,
    Title: 'Collect Laptop',
    Description: 'Retrieve company laptop from departing employee',
    ProcessTypes: [TaskProcessType.Offboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'IT Team',
    DefaultOffsetType: 'on-start',
    DefaultDaysOffset: 0,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: true,
    SendReminder: true,
    ReminderDaysBefore: 2,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
  },
  {
    Classification: TaskClassification.SEC,
    Title: 'Collect Access Badge',
    Description: 'Retrieve building access badge/card from departing employee',
    ProcessTypes: [TaskProcessType.Offboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'Security',
    DefaultOffsetType: 'on-start',
    DefaultDaysOffset: 0,
    DefaultPriority: 'High',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsMandatory: true,
    IsActive: true,
  },
];
