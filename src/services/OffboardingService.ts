// Offboarding Service — Employee Exit Management
// Asset returns, license deprovisioning, exit interviews

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import { RM_LISTS } from '../constants/SharePointListNames';
import {
  IOffboarding, IOffboardingTask, IAssetReturn, IEligibleEmployee,
  OffboardingStatus, OffboardingTaskStatus, AssetReturnStatus
} from '../models/IOffboarding';

export class OffboardingService {
  private sp: SPFI;

  constructor(sp: SPFI) {
    this.sp = sp;
  }

  // ═══════════════════════════════════════════════════════════════
  // OFFBOARDING RECORDS
  // ═══════════════════════════════════════════════════════════════

  public async getOffboardings(filters?: { status?: OffboardingStatus[] }): Promise<IOffboarding[]> {
    try {
      const filterParts: string[] = [];
      if (filters?.status?.length) {
        const statusFilters = filters.status.map(s => `Status eq '${s}'`).join(' or ');
        filterParts.push(`(${statusFilters})`);
      }

      let query = this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING).items
        .select(
          'Id', 'Title', 'EmployeeId', 'EmployeeName', 'EmployeeEmail', 'JobTitle', 'Department',
          'ManagerId', 'LastWorkingDate', 'TerminationType', 'Status', 'CompletionPercentage',
          'TotalTasks', 'CompletedTasks', 'ExitInterviewDate', 'ExitInterviewCompleted',
          'ExitInterviewNotes', 'FinalPaymentProcessed', 'ReferenceEligible', 'RehireEligible',
          'AssignedToId', 'Notes', 'Created', 'Modified'
        )
        .orderBy('Modified', false);

      if (filterParts.length > 0) {
        query = query.filter(filterParts.join(' and '));
      }

      const items = await query.getAll();
      return items.map((item: any) => this.mapOffboardingFromSP(item));
    } catch (error) {
      console.error('[OffboardingService] Error getting offboardings:', error);
      return [];
    }
  }

  public async getOffboardingById(id: number): Promise<IOffboarding | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING).items
        .getById(id)
        .select(
          'Id', 'Title', 'EmployeeId', 'EmployeeName', 'EmployeeEmail', 'JobTitle', 'Department',
          'ManagerId', 'LastWorkingDate', 'TerminationType', 'Status', 'CompletionPercentage',
          'TotalTasks', 'CompletedTasks', 'ExitInterviewDate', 'ExitInterviewCompleted',
          'ExitInterviewNotes', 'FinalPaymentProcessed', 'ReferenceEligible', 'RehireEligible',
          'AssignedToId', 'Notes', 'Created', 'Modified'
        )();
      return this.mapOffboardingFromSP(item);
    } catch (error) {
      console.error('[OffboardingService] Error getting offboarding by id:', error);
      return null;
    }
  }

  public async createOffboarding(data: Partial<IOffboarding>): Promise<IOffboarding | null> {
    try {
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING).items.add({
        Title: data.EmployeeName || '',
        EmployeeId: data.EmployeeId,
        EmployeeName: data.EmployeeName,
        EmployeeEmail: data.EmployeeEmail,
        JobTitle: data.JobTitle,
        Department: data.Department,
        ManagerId: data.ManagerId,
        LastWorkingDate: data.LastWorkingDate,
        TerminationType: data.TerminationType,
        Status: data.Status || OffboardingStatus.NotStarted,
        CompletionPercentage: data.CompletionPercentage || 0,
        TotalTasks: data.TotalTasks || 0,
        CompletedTasks: data.CompletedTasks || 0,
        ExitInterviewDate: data.ExitInterviewDate,
        ExitInterviewCompleted: data.ExitInterviewCompleted || false,
        ExitInterviewNotes: data.ExitInterviewNotes,
        FinalPaymentProcessed: data.FinalPaymentProcessed || false,
        ReferenceEligible: data.ReferenceEligible,
        RehireEligible: data.RehireEligible,
        AssignedToId: data.AssignedToId,
        Notes: data.Notes,
      });
      return this.mapOffboardingFromSP(result);
    } catch (error) {
      console.error('[OffboardingService] Error creating offboarding:', error);
      return null;
    }
  }

  public async updateOffboarding(id: number, updates: Partial<IOffboarding>): Promise<boolean> {
    try {
      const updateData: any = {};
      const fields = [
        'Title', 'EmployeeName', 'EmployeeEmail', 'JobTitle', 'Department', 'ManagerId',
        'LastWorkingDate', 'TerminationType', 'Status', 'CompletionPercentage', 'TotalTasks',
        'CompletedTasks', 'ExitInterviewDate', 'ExitInterviewCompleted', 'ExitInterviewNotes',
        'FinalPaymentProcessed', 'ReferenceEligible', 'RehireEligible', 'AssignedToId', 'Notes'
      ];
      fields.forEach(f => {
        if ((updates as any)[f] !== undefined) {
          updateData[f] = (updates as any)[f];
        }
      });
      await this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OffboardingService] Error updating offboarding:', error);
      return false;
    }
  }

  public async deleteOffboarding(id: number): Promise<boolean> {
    try {
      // Cascade delete: tasks and asset returns first
      const tasks = await this.getOffboardingTasks(id);
      for (const task of tasks) {
        if (task.Id) {
          await this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING_TASKS).items.getById(task.Id).delete();
        }
      }

      const assets = await this.getAssetReturns(id);
      for (const asset of assets) {
        if (asset.Id) {
          await this.sp.web.lists.getByTitle(RM_LISTS.ASSET_RETURN).items.getById(asset.Id).delete();
        }
      }

      await this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OffboardingService] Error deleting offboarding:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OFFBOARDING TASKS
  // ═══════════════════════════════════════════════════════════════

  public async getOffboardingTasks(offboardingId: number): Promise<IOffboardingTask[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING_TASKS).items
        .select(
          'Id', 'Title', 'OffboardingId', 'Description', 'Category', 'Status',
          'AssignedToId', 'DueDate', 'CompletedDate', 'CompletedById',
          'Priority', 'SortOrder', 'Notes', 'RelatedAssetId', 'RelatedSystemAccessId',
          'Created', 'Modified'
        )
        .filter(`OffboardingId eq ${offboardingId}`)
        .orderBy('SortOrder', true)
        .getAll();
      return items.map((item: any) => this.mapTaskFromSP(item));
    } catch (error) {
      console.error('[OffboardingService] Error getting offboarding tasks:', error);
      return [];
    }
  }

  public async createOffboardingTask(task: Partial<IOffboardingTask>): Promise<IOffboardingTask | null> {
    try {
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING_TASKS).items.add({
        Title: task.Title,
        OffboardingId: task.OffboardingId,
        Description: task.Description,
        Category: task.Category,
        Status: task.Status || OffboardingTaskStatus.Pending,
        AssignedToId: task.AssignedToId,
        DueDate: task.DueDate,
        Priority: task.Priority || 'Medium',
        SortOrder: task.SortOrder || 0,
        Notes: task.Notes,
        RelatedAssetId: task.RelatedAssetId,
        RelatedSystemAccessId: task.RelatedSystemAccessId,
      });
      return this.mapTaskFromSP(result);
    } catch (error) {
      console.error('[OffboardingService] Error creating offboarding task:', error);
      return null;
    }
  }

  public async updateOffboardingTask(id: number, updates: Partial<IOffboardingTask>): Promise<boolean> {
    try {
      const updateData: any = {};
      const fields = [
        'Title', 'Description', 'Category', 'Status', 'AssignedToId',
        'DueDate', 'CompletedDate', 'CompletedById', 'Priority',
        'SortOrder', 'Notes', 'RelatedAssetId', 'RelatedSystemAccessId'
      ];
      fields.forEach(f => {
        if ((updates as any)[f] !== undefined) {
          updateData[f] = (updates as any)[f];
        }
      });
      await this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING_TASKS).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OffboardingService] Error updating offboarding task:', error);
      return false;
    }
  }

  public async deleteOffboardingTask(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING_TASKS).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OffboardingService] Error deleting offboarding task:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ASSET RETURNS
  // ═══════════════════════════════════════════════════════════════

  public async getAssetReturns(offboardingId: number): Promise<IAssetReturn[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(RM_LISTS.ASSET_RETURN).items
        .select(
          'Id', 'Title', 'OffboardingId', 'AssetTypeId', 'AssetName', 'AssetTag',
          'Quantity', 'Status', 'ReturnedDate', 'ReceivedById', 'Condition',
          'ConditionNotes', 'RequiresDataWipe', 'DataWipeCompleted', 'DataWipeDate',
          'Created', 'Modified'
        )
        .filter(`OffboardingId eq ${offboardingId}`)
        .getAll();
      return items.map((item: any) => this.mapAssetReturnFromSP(item));
    } catch (error) {
      console.error('[OffboardingService] Error getting asset returns:', error);
      return [];
    }
  }

  public async createAssetReturn(data: Partial<IAssetReturn>): Promise<IAssetReturn | null> {
    try {
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.ASSET_RETURN).items.add({
        Title: data.AssetName || '',
        OffboardingId: data.OffboardingId,
        AssetTypeId: data.AssetTypeId,
        AssetName: data.AssetName,
        AssetTag: data.AssetTag,
        Quantity: data.Quantity || 1,
        Status: data.Status || AssetReturnStatus.PendingReturn,
        ReturnedDate: data.ReturnedDate,
        ReceivedById: data.ReceivedById,
        Condition: data.Condition,
        ConditionNotes: data.ConditionNotes,
        RequiresDataWipe: data.RequiresDataWipe || false,
        DataWipeCompleted: data.DataWipeCompleted || false,
        DataWipeDate: data.DataWipeDate,
      });
      return this.mapAssetReturnFromSP(result);
    } catch (error) {
      console.error('[OffboardingService] Error creating asset return:', error);
      return null;
    }
  }

  public async updateAssetReturn(id: number, updates: Partial<IAssetReturn>): Promise<boolean> {
    try {
      const updateData: any = {};
      const fields = [
        'Title', 'AssetName', 'AssetTag', 'Quantity', 'Status', 'ReturnedDate',
        'ReceivedById', 'Condition', 'ConditionNotes', 'RequiresDataWipe',
        'DataWipeCompleted', 'DataWipeDate'
      ];
      fields.forEach(f => {
        if ((updates as any)[f] !== undefined) {
          updateData[f] = (updates as any)[f];
        }
      });
      await this.sp.web.lists.getByTitle(RM_LISTS.ASSET_RETURN).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OffboardingService] Error updating asset return:', error);
      return false;
    }
  }

  public async deleteAssetReturn(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.ASSET_RETURN).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OffboardingService] Error deleting asset return:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PROGRESS CALCULATION
  // ═══════════════════════════════════════════════════════════════

  public async recalculateProgress(offboardingId: number): Promise<void> {
    try {
      const tasks = await this.getOffboardingTasks(offboardingId);
      const total = tasks.length;
      const completed = tasks.filter(t => t.Status === OffboardingTaskStatus.Completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      const updateData: any = {
        TotalTasks: total,
        CompletedTasks: completed,
        CompletionPercentage: percentage,
      };

      if (percentage === 100 && total > 0) {
        updateData.Status = OffboardingStatus.Completed;
      }

      await this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING).items.getById(offboardingId).update(updateData);
    } catch (error) {
      console.error('[OffboardingService] Error recalculating progress:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ELIGIBLE EMPLOYEES (from completed onboardings)
  // ═══════════════════════════════════════════════════════════════

  public async getEligibleEmployeesForOffboarding(): Promise<IEligibleEmployee[]> {
    try {
      // Get employees from completed onboardings who haven't been offboarded yet
      const onboardings = await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING).items
        .select('Id', 'CandidateId', 'CandidateName', 'JobTitle', 'Department', 'StartDate')
        .filter("Status eq 'Completed' or Status eq 'In Progress'")
        .getAll();

      // Get existing offboardings to exclude
      const existingOffboardings = await this.sp.web.lists.getByTitle(RM_LISTS.OFFBOARDING).items
        .select('EmployeeId')
        .filter("Status ne 'Cancelled'")
        .getAll();

      const offboardedIds = new Set(existingOffboardings.map((o: any) => o.EmployeeId));

      // Filter out already offboarded employees
      return onboardings
        .filter((o: any) => !offboardedIds.has(o.CandidateId))
        .map((item: any) => ({
          Id: item.CandidateId,
          EmployeeName: item.CandidateName || '',
          EmployeeEmail: undefined, // Would need to join with Candidates list
          JobTitle: item.JobTitle || '',
          Department: item.Department,
          StartDate: item.StartDate ? new Date(item.StartDate) : undefined,
          OnboardingId: item.Id,
        }));
    } catch (error) {
      console.error('[OffboardingService] Error getting eligible employees:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MAPPERS
  // ═══════════════════════════════════════════════════════════════

  private mapOffboardingFromSP(item: any): IOffboarding {
    return {
      Id: item.Id,
      Title: item.Title,
      EmployeeId: item.EmployeeId,
      EmployeeName: item.EmployeeName || '',
      EmployeeEmail: item.EmployeeEmail,
      JobTitle: item.JobTitle || '',
      Department: item.Department,
      ManagerId: item.ManagerId,
      LastWorkingDate: item.LastWorkingDate ? new Date(item.LastWorkingDate) : new Date(),
      TerminationType: item.TerminationType || 'Resignation',
      Status: item.Status || OffboardingStatus.NotStarted,
      CompletionPercentage: item.CompletionPercentage || 0,
      TotalTasks: item.TotalTasks || 0,
      CompletedTasks: item.CompletedTasks || 0,
      ExitInterviewDate: item.ExitInterviewDate ? new Date(item.ExitInterviewDate) : undefined,
      ExitInterviewCompleted: item.ExitInterviewCompleted || false,
      ExitInterviewNotes: item.ExitInterviewNotes,
      FinalPaymentProcessed: item.FinalPaymentProcessed || false,
      ReferenceEligible: item.ReferenceEligible,
      RehireEligible: item.RehireEligible,
      AssignedToId: item.AssignedToId,
      Notes: item.Notes,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapTaskFromSP(item: any): IOffboardingTask {
    return {
      Id: item.Id,
      Title: item.Title || '',
      OffboardingId: item.OffboardingId,
      Description: item.Description,
      Category: item.Category || 'Other',
      Status: item.Status || OffboardingTaskStatus.Pending,
      AssignedToId: item.AssignedToId,
      DueDate: item.DueDate ? new Date(item.DueDate) : undefined,
      CompletedDate: item.CompletedDate ? new Date(item.CompletedDate) : undefined,
      CompletedById: item.CompletedById,
      Priority: item.Priority || 'Medium',
      SortOrder: item.SortOrder || 0,
      Notes: item.Notes,
      RelatedAssetId: item.RelatedAssetId,
      RelatedSystemAccessId: item.RelatedSystemAccessId,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapAssetReturnFromSP(item: any): IAssetReturn {
    return {
      Id: item.Id,
      Title: item.Title,
      OffboardingId: item.OffboardingId,
      AssetTypeId: item.AssetTypeId,
      AssetName: item.AssetName || '',
      AssetTag: item.AssetTag,
      Quantity: item.Quantity || 1,
      Status: item.Status || AssetReturnStatus.PendingReturn,
      ReturnedDate: item.ReturnedDate ? new Date(item.ReturnedDate) : undefined,
      ReceivedById: item.ReceivedById,
      Condition: item.Condition,
      ConditionNotes: item.ConditionNotes,
      RequiresDataWipe: item.RequiresDataWipe || false,
      DataWipeCompleted: item.DataWipeCompleted || false,
      DataWipeDate: item.DataWipeDate ? new Date(item.DataWipeDate) : undefined,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }
}
