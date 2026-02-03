// Offboarding Models for DWx Recruitment Manager
// Employee exit management — asset returns, license deprovisioning, exit interviews

export enum OffboardingStatus {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  Completed = 'Completed',
  OnHold = 'On Hold',
  Cancelled = 'Cancelled'
}

export enum TerminationType {
  Resignation = 'Resignation',
  Termination = 'Termination',
  Redundancy = 'Redundancy',
  Retirement = 'Retirement',
  ContractEnd = 'Contract End',
  Other = 'Other'
}

export enum OffboardingTaskStatus {
  Pending = 'Pending',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Blocked = 'Blocked',
  NotApplicable = 'Not Applicable'
}

export enum OffboardingTaskCategory {
  AssetReturn = 'Asset Return',
  SystemAccess = 'System Access',
  Documentation = 'Documentation',
  ExitInterview = 'Exit Interview',
  KnowledgeTransfer = 'Knowledge Transfer',
  FinalPay = 'Final Pay',
  Other = 'Other'
}

export enum AssetReturnStatus {
  PendingReturn = 'Pending Return',
  Returned = 'Returned',
  Damaged = 'Damaged',
  Lost = 'Lost',
  WrittenOff = 'Written Off'
}

export enum AssetCondition {
  Excellent = 'Excellent',
  Good = 'Good',
  Fair = 'Fair',
  Poor = 'Poor',
  NonFunctional = 'Non-Functional'
}

export interface IOffboarding {
  Id?: number;
  Title?: string;
  EmployeeId: number;
  EmployeeName: string;
  EmployeeEmail?: string;
  JobTitle: string;
  Department?: string;
  ManagerId?: number;
  LastWorkingDate: Date;
  TerminationType: TerminationType;
  Status: OffboardingStatus;
  CompletionPercentage: number;
  TotalTasks: number;
  CompletedTasks: number;
  ExitInterviewDate?: Date;
  ExitInterviewCompleted: boolean;
  ExitInterviewNotes?: string;
  FinalPaymentProcessed: boolean;
  ReferenceEligible?: boolean;
  RehireEligible?: boolean;
  AssignedToId?: number;
  Notes?: string;
  Created?: Date;
  Modified?: Date;
}

export interface IOffboardingTask {
  Id?: number;
  Title: string;
  OffboardingId: number;
  Description?: string;
  Category: OffboardingTaskCategory;
  Status: OffboardingTaskStatus;
  AssignedToId?: number;
  DueDate?: Date;
  CompletedDate?: Date;
  CompletedById?: number;
  Priority: 'Low' | 'Medium' | 'High';
  SortOrder: number;
  Notes?: string;
  RelatedAssetId?: number;
  RelatedSystemAccessId?: number;
  Created?: Date;
  Modified?: Date;
}

export interface IAssetReturn {
  Id?: number;
  Title?: string;
  OffboardingId: number;
  AssetTypeId?: number;
  AssetName: string;
  AssetTag?: string;
  Quantity: number;
  Status: AssetReturnStatus;
  ReturnedDate?: Date;
  ReceivedById?: number;
  Condition?: AssetCondition;
  ConditionNotes?: string;
  RequiresDataWipe: boolean;
  DataWipeCompleted: boolean;
  DataWipeDate?: Date;
  Created?: Date;
  Modified?: Date;
}

export interface IOffboardingWizardData {
  employeeId?: number;
  employeeName?: string;
  employeeEmail?: string;
  jobTitle?: string;
  department?: string;
  lastWorkingDate?: Date;
  terminationType?: TerminationType;
  managerId?: number;
  notes?: string;
  assetsToReturn: {
    assetTypeId?: number;
    assetName: string;
    assetTag?: string;
    quantity: number;
    requiresDataWipe: boolean;
  }[];
  systemsToRevoke: {
    systemAccessTypeId?: number;
    systemName: string;
    currentRole: string;
  }[];
  exitInterview: {
    scheduledDate?: Date;
    interviewerId?: number;
    notes?: string;
  };
  knowledgeTransfer: {
    description: string;
    assignedToId?: number;
    dueDate?: Date;
  }[];
}

// Employee eligible for offboarding (from completed onboardings)
export interface IEligibleEmployee {
  Id: number;
  EmployeeName: string;
  EmployeeEmail?: string;
  JobTitle: string;
  Department?: string;
  StartDate?: Date;
  OnboardingId?: number;
}
