// Mover Models for DWx Recruitment Manager
// Internal transfers — department changes, role changes, location changes, promotions

export enum MoverStatus {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  Completed = 'Completed',
  OnHold = 'On Hold',
  Cancelled = 'Cancelled'
}

export enum MoverType {
  DepartmentTransfer = 'Department Transfer',
  RoleChange = 'Role Change',
  LocationChange = 'Location Change',
  Promotion = 'Promotion',
  Demotion = 'Demotion',
  LateralMove = 'Lateral Move',
  TeamRestructure = 'Team Restructure',
  Other = 'Other'
}

export enum MoverTaskStatus {
  Pending = 'Pending',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Blocked = 'Blocked',
  NotApplicable = 'Not Applicable'
}

export enum MoverTaskCategory {
  SystemAccess = 'System Access',
  AssetTransfer = 'Asset Transfer',
  Documentation = 'Documentation',
  Training = 'Training',
  KnowledgeTransfer = 'Knowledge Transfer',
  Orientation = 'Orientation',
  Compliance = 'Compliance',
  Other = 'Other'
}

export enum SystemAccessAction {
  Grant = 'Grant',
  Revoke = 'Revoke',
  Modify = 'Modify',
  NoChange = 'No Change'
}

export interface IMover {
  Id?: number;
  Title?: string;
  EmployeeId: number;
  EmployeeName: string;
  EmployeeEmail?: string;
  // Current position details
  CurrentJobTitle: string;
  CurrentDepartment?: string;
  CurrentLocation?: string;
  CurrentManagerId?: number;
  CurrentManagerName?: string;
  // New position details
  NewJobTitle: string;
  NewDepartment?: string;
  NewLocation?: string;
  NewManagerId?: number;
  NewManagerName?: string;
  // Transfer details
  MoverType: MoverType;
  EffectiveDate: Date;
  Status: MoverStatus;
  Reason?: string;
  // Progress tracking
  CompletionPercentage: number;
  TotalTasks: number;
  CompletedTasks: number;
  // Salary changes (optional)
  CurrentSalary?: number;
  NewSalary?: number;
  SalaryChangePercentage?: number;
  // Assignments
  AssignedToId?: number;
  HRContactId?: number;
  // Additional info
  Notes?: string;
  ApprovalRequired?: boolean;
  ApprovedById?: number;
  ApprovalDate?: Date;
  Created?: Date;
  Modified?: Date;
}

export interface IMoverTask {
  Id?: number;
  Title: string;
  MoverId: number;
  Description?: string;
  Category: MoverTaskCategory;
  Status: MoverTaskStatus;
  AssignedToId?: number;
  DueDate?: Date;
  CompletedDate?: Date;
  CompletedById?: number;
  Priority: 'Low' | 'Medium' | 'High';
  SortOrder: number;
  Notes?: string;
  // For system access tasks
  RelatedSystemAccessId?: number;
  SystemAccessAction?: SystemAccessAction;
  // For asset tasks
  RelatedAssetId?: number;
  Created?: Date;
  Modified?: Date;
}

export interface IMoverSystemAccess {
  Id?: number;
  Title?: string;
  MoverId: number;
  SystemAccessTypeId?: number;
  SystemName: string;
  Action: SystemAccessAction;
  CurrentRole?: string;
  NewRole?: string;
  Status: MoverTaskStatus;
  ProcessedDate?: Date;
  ProcessedById?: number;
  Notes?: string;
  Created?: Date;
  Modified?: Date;
}

export interface IMoverWizardData {
  employeeId?: number;
  employeeName?: string;
  employeeEmail?: string;
  // Current position
  currentJobTitle?: string;
  currentDepartment?: string;
  currentLocation?: string;
  currentManagerId?: number;
  // New position
  newJobTitle?: string;
  newDepartment?: string;
  newLocation?: string;
  newManagerId?: number;
  // Transfer
  moverType?: MoverType;
  effectiveDate?: Date;
  reason?: string;
  // Salary
  currentSalary?: number;
  newSalary?: number;
  // System access changes
  systemAccessChanges: {
    systemAccessTypeId?: number;
    systemName: string;
    action: SystemAccessAction;
    currentRole?: string;
    newRole?: string;
    selected: boolean;
  }[];
  // Training requirements
  trainingRequired: {
    trainingCourseId?: number;
    courseName: string;
    selected: boolean;
  }[];
  // Knowledge transfer
  knowledgeTransfer: {
    description: string;
    assignedToId?: number;
    dueDate?: Date;
  }[];
  notes?: string;
}

// Employee eligible for moves (from completed onboardings, not currently in a move)
export interface IEligibleEmployeeForMove {
  Id: number;
  EmployeeName: string;
  EmployeeEmail?: string;
  JobTitle: string;
  Department?: string;
  Location?: string;
  ManagerId?: number;
  StartDate?: Date;
  OnboardingId?: number;
}
