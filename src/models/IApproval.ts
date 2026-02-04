// Approval Workflow Model - JML Lite
// Handles approval requests for onboarding, mover, and offboarding workflows

export enum ApprovalStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
}

export enum ApprovalType {
  Onboarding = 'Onboarding',
  Mover = 'Mover',
  Offboarding = 'Offboarding',
  SystemAccess = 'SystemAccess',
  Equipment = 'Equipment',
  Training = 'Training',
}

export enum ApprovalPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Urgent = 'Urgent',
}

export interface IApproval {
  Id?: number;
  Title: string;

  // Request details
  ApprovalType: ApprovalType;
  Status: ApprovalStatus;
  Priority: ApprovalPriority;

  // Related record (e.g., OnboardingId, MoverId, OffboardingId)
  RelatedItemId: number;
  RelatedItemType: 'Onboarding' | 'Mover' | 'Offboarding' | 'Task';
  RelatedItemTitle?: string;

  // Employee being processed
  EmployeeName: string;
  EmployeeEmail?: string;
  Department?: string;
  JobTitle?: string;

  // Requestor (who initiated the approval request)
  RequestorId?: number;
  RequestorName?: string;
  RequestorEmail?: string;
  RequestedDate?: Date;

  // Approver (who needs to approve)
  ApproverId?: number;
  ApproverName?: string;
  ApproverEmail?: string;

  // Approval details
  ApprovedById?: number;
  ApprovedByName?: string;
  ApprovedDate?: Date;

  // Comments and notes
  RequestComments?: string;
  ApprovalComments?: string;
  RejectionReason?: string;

  // Deadline
  DueDate?: Date;

  // Delegation
  DelegatedToId?: number;
  DelegatedToName?: string;
  DelegatedDate?: Date;

  // Metadata
  Created?: Date;
  Modified?: Date;
}

export interface IApprovalFilters {
  status?: ApprovalStatus[];
  type?: ApprovalType[];
  priority?: ApprovalPriority[];
  approverId?: number;
  requestorId?: number;
  relatedItemId?: number;
  relatedItemType?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

export interface IApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  overdue: number;
  dueToday: number;
  dueSoon: number; // Due within 3 days
}

export interface IApprovalAction {
  approvalId: number;
  action: 'approve' | 'reject' | 'delegate' | 'cancel';
  comments?: string;
  delegateToId?: number;
  delegateToName?: string;
}

// Approval request when creating a new approval
export interface ICreateApprovalRequest {
  title: string;
  approvalType: ApprovalType;
  priority?: ApprovalPriority;
  relatedItemId: number;
  relatedItemType: 'Onboarding' | 'Mover' | 'Offboarding' | 'Task';
  relatedItemTitle?: string;
  employeeName: string;
  employeeEmail?: string;
  department?: string;
  jobTitle?: string;
  approverId?: number;
  approverName?: string;
  approverEmail?: string;
  dueDate?: Date;
  requestComments?: string;
}
