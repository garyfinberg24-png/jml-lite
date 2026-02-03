// Onboarding Models for DWx Recruitment Manager
// Standalone — no JML dependencies

export enum OnboardingStatus {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  Completed = 'Completed',
  OnHold = 'On Hold',
  Cancelled = 'Cancelled'
}

export enum OnboardingTaskStatus {
  Pending = 'Pending',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Blocked = 'Blocked',
  NotApplicable = 'Not Applicable'
}

export enum OnboardingTaskCategory {
  Documentation = 'Documentation',
  SystemAccess = 'System Access',
  Equipment = 'Equipment',
  Training = 'Training',
  Orientation = 'Orientation',
  Compliance = 'Compliance'
}

export interface IOnboarding {
  Id?: number;
  Title?: string;
  CandidateId: number;
  CandidateName: string;
  JobTitle: string;
  Department: string;
  HiringManagerId?: number;
  StartDate: Date;
  Status: OnboardingStatus;
  CompletionPercentage: number;
  TotalTasks: number;
  CompletedTasks: number;
  DueDate?: Date;
  CompletedDate?: Date;
  AssignedToId?: number;
  Notes?: string;
  Created?: Date;
  Modified?: Date;
}

export interface IOnboardingTask {
  Id?: number;
  Title: string;
  OnboardingId: number;
  Description?: string;
  Category: OnboardingTaskCategory;
  Status: OnboardingTaskStatus;
  AssignedToId?: number;
  DueDate?: Date;
  CompletedDate?: Date;
  CompletedById?: number;
  Priority: 'Low' | 'Medium' | 'High';
  EstimatedHours?: number;
  ActualHours?: number;
  DocumentUrl?: string;
  SortOrder: number;
  Notes?: string;
  Created?: Date;
  Modified?: Date;
}

export interface IOnboardingTemplate {
  Id?: number;
  Title: string;
  Description?: string;
  Department?: string;
  JobTitle?: string;
  IsActive: boolean;
  TasksJSON: string;
  EstimatedDurationDays?: number;
  Created?: Date;
  Modified?: Date;
}

export interface IOnboardingWizardData {
  candidateId?: number;
  candidateName?: string;
  jobTitle?: string;
  department?: string;
  startDate?: Date;
  hiringManagerId?: number;
  notes?: string;
  documents: { name: string; required: boolean; received: boolean }[];
  systemAccess: { system: string; role: string; requested: boolean }[];
  equipment: { item: string; quantity: number; requested: boolean }[];
  training: { course: string; mandatory: boolean; scheduled: boolean }[];
}
