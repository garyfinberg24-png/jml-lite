// Approval Service - JML Lite
// Manages approval workflow operations

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import { JML_LISTS } from '../constants/SharePointListNames';
import {
  IApproval,
  IApprovalFilters,
  IApprovalStats,
  IApprovalAction,
  ICreateApprovalRequest,
  ApprovalStatus,
  ApprovalType,
  ApprovalPriority,
} from '../models/IApproval';

export class ApprovalService {
  private sp: SPFI;

  constructor(sp: SPFI) {
    this.sp = sp;
  }

  /**
   * Get all approvals with optional filtering
   */
  public async getApprovals(filters?: IApprovalFilters): Promise<IApproval[]> {
    try {
      const filterParts: string[] = [];

      if (filters?.status?.length) {
        const statusFilters = filters.status.map(s => `Status eq '${s}'`).join(' or ');
        filterParts.push(`(${statusFilters})`);
      }

      if (filters?.type?.length) {
        const typeFilters = filters.type.map(t => `ApprovalType eq '${t}'`).join(' or ');
        filterParts.push(`(${typeFilters})`);
      }

      if (filters?.priority?.length) {
        const priorityFilters = filters.priority.map(p => `Priority eq '${p}'`).join(' or ');
        filterParts.push(`(${priorityFilters})`);
      }

      if (filters?.approverId) {
        filterParts.push(`ApproverId eq ${filters.approverId}`);
      }

      if (filters?.requestorId) {
        filterParts.push(`RequestorId eq ${filters.requestorId}`);
      }

      if (filters?.relatedItemId) {
        filterParts.push(`RelatedItemId eq ${filters.relatedItemId}`);
      }

      if (filters?.relatedItemType) {
        filterParts.push(`RelatedItemType eq '${filters.relatedItemType}'`);
      }

      if (filters?.dueBefore) {
        filterParts.push(`DueDate le datetime'${filters.dueBefore.toISOString()}'`);
      }

      if (filters?.dueAfter) {
        filterParts.push(`DueDate ge datetime'${filters.dueAfter.toISOString()}'`);
      }

      let query = this.sp.web.lists.getByTitle(JML_LISTS.APPROVALS).items
        .select(
          'Id', 'Title', 'ApprovalType', 'Status', 'Priority',
          'RelatedItemId', 'RelatedItemType', 'RelatedItemTitle',
          'EmployeeName', 'EmployeeEmail', 'Department', 'JobTitle',
          'RequestorId', 'RequestorName', 'RequestorEmail', 'RequestedDate',
          'ApproverId', 'ApproverName', 'ApproverEmail',
          'ApprovedById', 'ApprovedByName', 'ApprovedDate',
          'RequestComments', 'ApprovalComments', 'RejectionReason',
          'DueDate', 'DelegatedToId', 'DelegatedToName', 'DelegatedDate',
          'Created', 'Modified'
        )
        .orderBy('Priority', false)
        .orderBy('DueDate', true)
        .orderBy('Created', false);

      if (filterParts.length > 0) {
        query = query.filter(filterParts.join(' and '));
      }

      const items = await query.getAll();
      return items.map((item: any) => this.mapApprovalFromSP(item));
    } catch (error) {
      console.error('[ApprovalService] Error getting approvals:', error);
      return [];
    }
  }

  /**
   * Get pending approvals for a specific approver
   */
  public async getPendingApprovalsForUser(userId: number): Promise<IApproval[]> {
    return this.getApprovals({
      status: [ApprovalStatus.Pending],
      approverId: userId,
    });
  }

  /**
   * Get approval by ID
   */
  public async getApprovalById(id: number): Promise<IApproval | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(JML_LISTS.APPROVALS).items
        .getById(id)
        .select(
          'Id', 'Title', 'ApprovalType', 'Status', 'Priority',
          'RelatedItemId', 'RelatedItemType', 'RelatedItemTitle',
          'EmployeeName', 'EmployeeEmail', 'Department', 'JobTitle',
          'RequestorId', 'RequestorName', 'RequestorEmail', 'RequestedDate',
          'ApproverId', 'ApproverName', 'ApproverEmail',
          'ApprovedById', 'ApprovedByName', 'ApprovedDate',
          'RequestComments', 'ApprovalComments', 'RejectionReason',
          'DueDate', 'DelegatedToId', 'DelegatedToName', 'DelegatedDate',
          'Created', 'Modified'
        )();
      return this.mapApprovalFromSP(item);
    } catch (error) {
      console.error('[ApprovalService] Error getting approval by id:', error);
      return null;
    }
  }

  /**
   * Create a new approval request
   */
  public async createApproval(request: ICreateApprovalRequest): Promise<IApproval | null> {
    try {
      const result = await this.sp.web.lists.getByTitle(JML_LISTS.APPROVALS).items.add({
        Title: request.title,
        ApprovalType: request.approvalType,
        Status: ApprovalStatus.Pending,
        Priority: request.priority || ApprovalPriority.Medium,
        RelatedItemId: request.relatedItemId,
        RelatedItemType: request.relatedItemType,
        RelatedItemTitle: request.relatedItemTitle,
        EmployeeName: request.employeeName,
        EmployeeEmail: request.employeeEmail,
        Department: request.department,
        JobTitle: request.jobTitle,
        ApproverId: request.approverId,
        ApproverName: request.approverName,
        ApproverEmail: request.approverEmail,
        RequestedDate: new Date(),
        DueDate: request.dueDate,
        RequestComments: request.requestComments,
      });
      return this.mapApprovalFromSP(result);
    } catch (error) {
      console.error('[ApprovalService] Error creating approval:', error);
      return null;
    }
  }

  /**
   * Process an approval action (approve, reject, delegate, cancel)
   */
  public async processApproval(action: IApprovalAction): Promise<boolean> {
    try {
      const updateData: any = {};

      switch (action.action) {
        case 'approve':
          updateData.Status = ApprovalStatus.Approved;
          updateData.ApprovedDate = new Date();
          updateData.ApprovalComments = action.comments;
          break;

        case 'reject':
          updateData.Status = ApprovalStatus.Rejected;
          updateData.ApprovedDate = new Date();
          updateData.RejectionReason = action.comments;
          break;

        case 'delegate':
          updateData.DelegatedToId = action.delegateToId;
          updateData.DelegatedToName = action.delegateToName;
          updateData.DelegatedDate = new Date();
          updateData.ApprovalComments = action.comments;
          // Update the approver to the delegate
          updateData.ApproverId = action.delegateToId;
          updateData.ApproverName = action.delegateToName;
          break;

        case 'cancel':
          updateData.Status = ApprovalStatus.Cancelled;
          updateData.ApprovalComments = action.comments;
          break;
      }

      await this.sp.web.lists.getByTitle(JML_LISTS.APPROVALS).items
        .getById(action.approvalId)
        .update(updateData);

      return true;
    } catch (error) {
      console.error('[ApprovalService] Error processing approval:', error);
      return false;
    }
  }

  /**
   * Approve an approval request
   */
  public async approve(id: number, comments?: string, approverName?: string, approverId?: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(JML_LISTS.APPROVALS).items
        .getById(id)
        .update({
          Status: ApprovalStatus.Approved,
          ApprovedDate: new Date(),
          ApprovedById: approverId,
          ApprovedByName: approverName,
          ApprovalComments: comments,
        });
      return true;
    } catch (error) {
      console.error('[ApprovalService] Error approving:', error);
      return false;
    }
  }

  /**
   * Reject an approval request
   */
  public async reject(id: number, reason: string, approverName?: string, approverId?: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(JML_LISTS.APPROVALS).items
        .getById(id)
        .update({
          Status: ApprovalStatus.Rejected,
          ApprovedDate: new Date(),
          ApprovedById: approverId,
          ApprovedByName: approverName,
          RejectionReason: reason,
        });
      return true;
    } catch (error) {
      console.error('[ApprovalService] Error rejecting:', error);
      return false;
    }
  }

  /**
   * Delete an approval
   */
  public async deleteApproval(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(JML_LISTS.APPROVALS).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[ApprovalService] Error deleting approval:', error);
      return false;
    }
  }

  /**
   * Get approval statistics
   */
  public async getApprovalStats(approverId?: number): Promise<IApprovalStats> {
    try {
      const filters: IApprovalFilters = {};
      if (approverId) {
        filters.approverId = approverId;
      }

      const approvals = await this.getApprovals(filters);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const stats: IApprovalStats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        overdue: 0,
        dueToday: 0,
        dueSoon: 0,
      };

      for (const approval of approvals) {
        switch (approval.Status) {
          case ApprovalStatus.Pending:
            stats.pending++;
            if (approval.DueDate) {
              const dueDate = new Date(approval.DueDate);
              if (dueDate < today) {
                stats.overdue++;
              } else if (dueDate.toDateString() === today.toDateString()) {
                stats.dueToday++;
              } else if (dueDate <= threeDaysFromNow) {
                stats.dueSoon++;
              }
            }
            break;
          case ApprovalStatus.Approved:
            stats.approved++;
            break;
          case ApprovalStatus.Rejected:
            stats.rejected++;
            break;
        }
      }

      return stats;
    } catch (error) {
      console.error('[ApprovalService] Error getting approval stats:', error);
      return { pending: 0, approved: 0, rejected: 0, overdue: 0, dueToday: 0, dueSoon: 0 };
    }
  }

  /**
   * Check if a related item has pending approvals
   */
  public async hasPendingApproval(relatedItemId: number, relatedItemType: string): Promise<boolean> {
    const approvals = await this.getApprovals({
      status: [ApprovalStatus.Pending],
      relatedItemId,
      relatedItemType,
    });
    return approvals.length > 0;
  }

  /**
   * Expire overdue approvals
   */
  public async expireOverdueApprovals(): Promise<number> {
    try {
      const overdue = await this.getApprovals({
        status: [ApprovalStatus.Pending],
        dueBefore: new Date(),
      });

      let expiredCount = 0;
      for (const approval of overdue) {
        if (approval.Id) {
          await this.sp.web.lists.getByTitle(JML_LISTS.APPROVALS).items
            .getById(approval.Id)
            .update({ Status: ApprovalStatus.Expired });
          expiredCount++;
        }
      }

      return expiredCount;
    } catch (error) {
      console.error('[ApprovalService] Error expiring approvals:', error);
      return 0;
    }
  }

  private mapApprovalFromSP(item: any): IApproval {
    return {
      Id: item.Id,
      Title: item.Title || '',
      ApprovalType: item.ApprovalType || ApprovalType.Onboarding,
      Status: item.Status || ApprovalStatus.Pending,
      Priority: item.Priority || ApprovalPriority.Medium,
      RelatedItemId: item.RelatedItemId,
      RelatedItemType: item.RelatedItemType || 'Onboarding',
      RelatedItemTitle: item.RelatedItemTitle,
      EmployeeName: item.EmployeeName || '',
      EmployeeEmail: item.EmployeeEmail,
      Department: item.Department,
      JobTitle: item.JobTitle,
      RequestorId: item.RequestorId,
      RequestorName: item.RequestorName,
      RequestorEmail: item.RequestorEmail,
      RequestedDate: item.RequestedDate ? new Date(item.RequestedDate) : undefined,
      ApproverId: item.ApproverId,
      ApproverName: item.ApproverName,
      ApproverEmail: item.ApproverEmail,
      ApprovedById: item.ApprovedById,
      ApprovedByName: item.ApprovedByName,
      ApprovedDate: item.ApprovedDate ? new Date(item.ApprovedDate) : undefined,
      RequestComments: item.RequestComments,
      ApprovalComments: item.ApprovalComments,
      RejectionReason: item.RejectionReason,
      DueDate: item.DueDate ? new Date(item.DueDate) : undefined,
      DelegatedToId: item.DelegatedToId,
      DelegatedToName: item.DelegatedToName,
      DelegatedDate: item.DelegatedDate ? new Date(item.DelegatedDate) : undefined,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }
}
