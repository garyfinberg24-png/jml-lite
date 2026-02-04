// Classification Rules Models - JML Lite
// Default assignment and approval routing based on task classification

import { TaskClassification, TaskProcessType } from './ITaskLibrary';

/**
 * Classification Rule - Defines default routing for a task classification
 *
 * Example rules:
 * - HRD (Hardware) → IT Team, approved by IT Admin
 * - SYS (System Access) → IT Team, approved by IT Lead
 * - DOC (Documentation) → HR Team, no approval required
 * - FIN (Finance) → Finance Team, approved by Finance Manager
 */

export interface IClassificationRule {
  Id?: number;

  // Classification this rule applies to
  Classification: TaskClassification;

  // Optional: Only apply to specific process types (empty = all)
  ProcessTypes?: TaskProcessType[];

  // Optional: Only apply to specific departments (empty = all)
  Departments?: string[];

  // ═══════════════════════════════════════════════════════════════════
  // DEFAULT ASSIGNMENT
  // ═══════════════════════════════════════════════════════════════════

  // Who handles tasks in this classification by default
  DefaultAssigneeType: 'Role' | 'Specific' | 'Manager' | 'Employee';
  DefaultAssigneeRole?: string;      // e.g., "IT Team", "HR Team", "Finance"
  DefaultAssigneeId?: number;        // For specific user assignment
  DefaultAssigneeName?: string;
  DefaultAssigneeEmail?: string;

  // ═══════════════════════════════════════════════════════════════════
  // APPROVAL CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════

  // Does this classification require approval?
  RequiresApproval: boolean;

  // Primary approver
  ApproverType?: 'Role' | 'Specific' | 'Manager' | 'Skip-Level';
  ApproverRole?: string;             // e.g., "IT Admin", "HR Manager", "Finance Manager"
  ApproverId?: number;               // For specific user approval
  ApproverName?: string;
  ApproverEmail?: string;

  // Escalation (if primary approver doesn't respond)
  EscalationEnabled: boolean;
  EscalationDays?: number;           // Days before escalating
  EscalationApproverType?: 'Role' | 'Specific' | 'Skip-Level';
  EscalationApproverRole?: string;
  EscalationApproverId?: number;
  EscalationApproverName?: string;

  // Auto-approval threshold (approve automatically if below this value)
  AutoApproveEnabled: boolean;
  AutoApproveMaxCost?: number;       // e.g., auto-approve equipment under $500
  AutoApproveMaxDays?: number;       // e.g., auto-approve if due date > 14 days

  // ═══════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════

  // Default notification settings for this classification
  SendEmailNotification: boolean;
  SendTeamsNotification: boolean;
  NotifyOnAssignment: boolean;
  NotifyOnCompletion: boolean;
  NotifyManagerOnCompletion: boolean;

  // Teams channel for this classification (optional)
  TeamsChannelWebhook?: string;

  // ═══════════════════════════════════════════════════════════════════
  // TIMING DEFAULTS
  // ═══════════════════════════════════════════════════════════════════

  // Default timing for tasks in this classification
  DefaultOffsetType: 'before-start' | 'on-start' | 'after-start';
  DefaultDaysOffset: number;
  DefaultPriority: 'Low' | 'Medium' | 'High' | 'Critical';

  // SLA settings
  SlaEnabled: boolean;
  SlaDays?: number;                  // Target completion days
  SlaWarningDays?: number;           // Days before SLA to warn

  // ═══════════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════════

  Description?: string;
  IsActive: boolean;
  SortOrder: number;

  // Audit
  Created?: Date;
  Modified?: Date;
  CreatedById?: number;
  ModifiedById?: number;
}

// Input type for creating/updating rules
export interface IClassificationRuleInput {
  Classification: TaskClassification;
  ProcessTypes?: TaskProcessType[];
  Departments?: string[];

  DefaultAssigneeType: 'Role' | 'Specific' | 'Manager' | 'Employee';
  DefaultAssigneeRole?: string;
  DefaultAssigneeId?: number;
  DefaultAssigneeName?: string;
  DefaultAssigneeEmail?: string;

  RequiresApproval: boolean;
  ApproverType?: 'Role' | 'Specific' | 'Manager' | 'Skip-Level';
  ApproverRole?: string;
  ApproverId?: number;
  ApproverName?: string;
  ApproverEmail?: string;

  EscalationEnabled: boolean;
  EscalationDays?: number;
  EscalationApproverType?: 'Role' | 'Specific' | 'Skip-Level';
  EscalationApproverRole?: string;
  EscalationApproverId?: number;
  EscalationApproverName?: string;

  AutoApproveEnabled: boolean;
  AutoApproveMaxCost?: number;
  AutoApproveMaxDays?: number;

  SendEmailNotification: boolean;
  SendTeamsNotification: boolean;
  NotifyOnAssignment: boolean;
  NotifyOnCompletion: boolean;
  NotifyManagerOnCompletion: boolean;
  TeamsChannelWebhook?: string;

  DefaultOffsetType: 'before-start' | 'on-start' | 'after-start';
  DefaultDaysOffset: number;
  DefaultPriority: 'Low' | 'Medium' | 'High' | 'Critical';

  SlaEnabled: boolean;
  SlaDays?: number;
  SlaWarningDays?: number;

  Description?: string;
  IsActive: boolean;
  SortOrder?: number;
}

// Filters for querying rules
export interface IClassificationRuleFilters {
  classification?: TaskClassification;
  processType?: TaskProcessType;
  department?: string;
  isActive?: boolean;
  requiresApproval?: boolean;
}

// Resolved assignment/approval info (used when applying rules)
export interface IResolvedRouting {
  // Assignment
  assigneeType: 'Role' | 'Specific' | 'Manager' | 'Employee';
  assigneeRole?: string;
  assigneeId?: number;
  assigneeName?: string;
  assigneeEmail?: string;

  // Approval
  requiresApproval: boolean;
  approverType?: 'Role' | 'Specific' | 'Manager' | 'Skip-Level';
  approverRole?: string;
  approverId?: number;
  approverName?: string;
  approverEmail?: string;

  // Timing
  offsetType: 'before-start' | 'on-start' | 'after-start';
  daysOffset: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';

  // Notifications
  sendEmailNotification: boolean;
  sendTeamsNotification: boolean;

  // Source rule info
  ruleId?: number;
  classification: TaskClassification;
}

// Default classification rules (for seeding)
export const DEFAULT_CLASSIFICATION_RULES: Partial<IClassificationRule>[] = [
  // DOC - Documentation → HR Team
  {
    Classification: TaskClassification.DOC,
    DefaultAssigneeType: 'Role',
    DefaultAssigneeRole: 'HR Team',
    RequiresApproval: false,
    EscalationEnabled: false,
    AutoApproveEnabled: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    NotifyOnAssignment: true,
    NotifyOnCompletion: true,
    NotifyManagerOnCompletion: false,
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 5,
    DefaultPriority: 'High',
    SlaEnabled: true,
    SlaDays: 5,
    SlaWarningDays: 2,
    Description: 'Documentation tasks assigned to HR Team, no approval required',
    IsActive: true,
    SortOrder: 1,
  },

  // SYS - System Access → IT Team, approved by IT Lead
  {
    Classification: TaskClassification.SYS,
    DefaultAssigneeType: 'Role',
    DefaultAssigneeRole: 'IT Team',
    RequiresApproval: true,
    ApproverType: 'Role',
    ApproverRole: 'IT Lead',
    EscalationEnabled: true,
    EscalationDays: 2,
    EscalationApproverType: 'Role',
    EscalationApproverRole: 'IT Manager',
    AutoApproveEnabled: false,
    SendEmailNotification: true,
    SendTeamsNotification: true,
    NotifyOnAssignment: true,
    NotifyOnCompletion: true,
    NotifyManagerOnCompletion: true,
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 3,
    DefaultPriority: 'High',
    SlaEnabled: true,
    SlaDays: 3,
    SlaWarningDays: 1,
    Description: 'System access tasks assigned to IT Team, approved by IT Lead with escalation to IT Manager',
    IsActive: true,
    SortOrder: 2,
  },

  // HRD - Hardware → IT Team, approved by IT Admin
  {
    Classification: TaskClassification.HRD,
    DefaultAssigneeType: 'Role',
    DefaultAssigneeRole: 'IT Team',
    RequiresApproval: true,
    ApproverType: 'Role',
    ApproverRole: 'IT Admin',
    EscalationEnabled: true,
    EscalationDays: 3,
    EscalationApproverType: 'Role',
    EscalationApproverRole: 'IT Manager',
    AutoApproveEnabled: true,
    AutoApproveMaxCost: 500, // Auto-approve equipment under $500
    SendEmailNotification: true,
    SendTeamsNotification: true,
    NotifyOnAssignment: true,
    NotifyOnCompletion: true,
    NotifyManagerOnCompletion: true,
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 5,
    DefaultPriority: 'Medium',
    SlaEnabled: true,
    SlaDays: 5,
    SlaWarningDays: 2,
    Description: 'Hardware tasks assigned to IT Team, approved by IT Admin (auto-approve under $500)',
    IsActive: true,
    SortOrder: 3,
  },

  // TRN - Training → Training Team / L&D
  {
    Classification: TaskClassification.TRN,
    DefaultAssigneeType: 'Role',
    DefaultAssigneeRole: 'Training',
    RequiresApproval: false,
    EscalationEnabled: false,
    AutoApproveEnabled: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    NotifyOnAssignment: true,
    NotifyOnCompletion: true,
    NotifyManagerOnCompletion: false,
    DefaultOffsetType: 'after-start',
    DefaultDaysOffset: 7,
    DefaultPriority: 'Medium',
    SlaEnabled: true,
    SlaDays: 14,
    SlaWarningDays: 3,
    Description: 'Training tasks assigned to Training/L&D team, no approval required',
    IsActive: true,
    SortOrder: 4,
  },

  // ORI - Orientation → Manager
  {
    Classification: TaskClassification.ORI,
    DefaultAssigneeType: 'Manager',
    RequiresApproval: false,
    EscalationEnabled: false,
    AutoApproveEnabled: false,
    SendEmailNotification: true,
    SendTeamsNotification: true,
    NotifyOnAssignment: true,
    NotifyOnCompletion: false,
    NotifyManagerOnCompletion: false,
    DefaultOffsetType: 'on-start',
    DefaultDaysOffset: 0,
    DefaultPriority: 'High',
    SlaEnabled: true,
    SlaDays: 1,
    SlaWarningDays: 0,
    Description: 'Orientation tasks assigned to hiring manager',
    IsActive: true,
    SortOrder: 5,
  },

  // CMP - Compliance → HR Team, approved by HR Manager
  {
    Classification: TaskClassification.CMP,
    DefaultAssigneeType: 'Role',
    DefaultAssigneeRole: 'HR Team',
    RequiresApproval: true,
    ApproverType: 'Role',
    ApproverRole: 'HR Manager',
    EscalationEnabled: true,
    EscalationDays: 2,
    EscalationApproverType: 'Role',
    EscalationApproverRole: 'Legal',
    AutoApproveEnabled: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    NotifyOnAssignment: true,
    NotifyOnCompletion: true,
    NotifyManagerOnCompletion: true,
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 3,
    DefaultPriority: 'High',
    SlaEnabled: true,
    SlaDays: 3,
    SlaWarningDays: 1,
    Description: 'Compliance tasks assigned to HR Team, approved by HR Manager',
    IsActive: true,
    SortOrder: 6,
  },

  // FAC - Facilities → Facilities Team
  {
    Classification: TaskClassification.FAC,
    DefaultAssigneeType: 'Role',
    DefaultAssigneeRole: 'Facilities',
    RequiresApproval: false,
    EscalationEnabled: false,
    AutoApproveEnabled: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    NotifyOnAssignment: true,
    NotifyOnCompletion: true,
    NotifyManagerOnCompletion: false,
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 2,
    DefaultPriority: 'Medium',
    SlaEnabled: true,
    SlaDays: 2,
    SlaWarningDays: 1,
    Description: 'Facilities tasks assigned to Facilities team',
    IsActive: true,
    SortOrder: 7,
  },

  // SEC - Security → Security Team, approved by Security Manager
  {
    Classification: TaskClassification.SEC,
    DefaultAssigneeType: 'Role',
    DefaultAssigneeRole: 'Security',
    RequiresApproval: true,
    ApproverType: 'Role',
    ApproverRole: 'Security Manager',
    EscalationEnabled: true,
    EscalationDays: 1,
    EscalationApproverType: 'Role',
    EscalationApproverRole: 'Operations Manager',
    AutoApproveEnabled: false,
    SendEmailNotification: true,
    SendTeamsNotification: true,
    NotifyOnAssignment: true,
    NotifyOnCompletion: true,
    NotifyManagerOnCompletion: true,
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 1,
    DefaultPriority: 'High',
    SlaEnabled: true,
    SlaDays: 1,
    SlaWarningDays: 0,
    Description: 'Security tasks assigned to Security team, approved by Security Manager',
    IsActive: true,
    SortOrder: 8,
  },

  // FIN - Finance → Finance Team, approved by Finance Manager
  {
    Classification: TaskClassification.FIN,
    DefaultAssigneeType: 'Role',
    DefaultAssigneeRole: 'Finance',
    RequiresApproval: true,
    ApproverType: 'Role',
    ApproverRole: 'Finance Manager',
    EscalationEnabled: true,
    EscalationDays: 2,
    EscalationApproverType: 'Role',
    EscalationApproverRole: 'CFO',
    AutoApproveEnabled: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    NotifyOnAssignment: true,
    NotifyOnCompletion: true,
    NotifyManagerOnCompletion: false,
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 5,
    DefaultPriority: 'High',
    SlaEnabled: true,
    SlaDays: 5,
    SlaWarningDays: 2,
    Description: 'Finance tasks assigned to Finance team, approved by Finance Manager',
    IsActive: true,
    SortOrder: 9,
  },

  // COM - Communication → IT Team (for email/Teams setup)
  {
    Classification: TaskClassification.COM,
    DefaultAssigneeType: 'Role',
    DefaultAssigneeRole: 'IT Team',
    RequiresApproval: false,
    EscalationEnabled: false,
    AutoApproveEnabled: false,
    SendEmailNotification: true,
    SendTeamsNotification: true,
    NotifyOnAssignment: true,
    NotifyOnCompletion: true,
    NotifyManagerOnCompletion: false,
    DefaultOffsetType: 'before-start',
    DefaultDaysOffset: 2,
    DefaultPriority: 'Medium',
    SlaEnabled: true,
    SlaDays: 2,
    SlaWarningDays: 1,
    Description: 'Communication/account setup tasks assigned to IT Team',
    IsActive: true,
    SortOrder: 10,
  },
];
