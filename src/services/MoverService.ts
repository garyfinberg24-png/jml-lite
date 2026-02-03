// Mover Service — Internal Employee Transfers
// Department changes, role changes, location changes, promotions

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import { RM_LISTS } from '../constants/SharePointListNames';
import {
  IMover, IMoverTask, IMoverSystemAccess, IEligibleEmployeeForMove,
  MoverStatus, MoverTaskStatus
} from '../models/IMover';

export class MoverService {
  private sp: SPFI;

  constructor(sp: SPFI) {
    this.sp = sp;
  }

  // ═══════════════════════════════════════════════════════════════
  // MOVER RECORDS
  // ═══════════════════════════════════════════════════════════════

  public async getMovers(filters?: { status?: MoverStatus[] }): Promise<IMover[]> {
    try {
      const filterParts: string[] = [];
      if (filters?.status?.length) {
        const statusFilters = filters.status.map(s => `Status eq '${s}'`).join(' or ');
        filterParts.push(`(${statusFilters})`);
      }

      let query = this.sp.web.lists.getByTitle(RM_LISTS.MOVER).items
        .select(
          'Id', 'Title', 'EmployeeId', 'EmployeeName', 'EmployeeEmail',
          'CurrentJobTitle', 'CurrentDepartment', 'CurrentLocation', 'CurrentManagerId',
          'NewJobTitle', 'NewDepartment', 'NewLocation', 'NewManagerId',
          'MoverType', 'EffectiveDate', 'Status', 'Reason',
          'CompletionPercentage', 'TotalTasks', 'CompletedTasks',
          'CurrentSalary', 'NewSalary', 'SalaryChangePercentage',
          'AssignedToId', 'HRContactId', 'Notes',
          'ApprovalRequired', 'ApprovedById', 'ApprovalDate',
          'Created', 'Modified'
        )
        .orderBy('Modified', false);

      if (filterParts.length > 0) {
        query = query.filter(filterParts.join(' and '));
      }

      const items = await query.getAll();
      return items.map((item: any) => this.mapMoverFromSP(item));
    } catch (error) {
      console.error('[MoverService] Error getting movers:', error);
      return [];
    }
  }

  public async getMoverById(id: number): Promise<IMover | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER).items
        .getById(id)
        .select(
          'Id', 'Title', 'EmployeeId', 'EmployeeName', 'EmployeeEmail',
          'CurrentJobTitle', 'CurrentDepartment', 'CurrentLocation', 'CurrentManagerId',
          'NewJobTitle', 'NewDepartment', 'NewLocation', 'NewManagerId',
          'MoverType', 'EffectiveDate', 'Status', 'Reason',
          'CompletionPercentage', 'TotalTasks', 'CompletedTasks',
          'CurrentSalary', 'NewSalary', 'SalaryChangePercentage',
          'AssignedToId', 'HRContactId', 'Notes',
          'ApprovalRequired', 'ApprovedById', 'ApprovalDate',
          'Created', 'Modified'
        )();
      return this.mapMoverFromSP(item);
    } catch (error) {
      console.error('[MoverService] Error getting mover by id:', error);
      return null;
    }
  }

  public async createMover(data: Partial<IMover>): Promise<IMover | null> {
    try {
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER).items.add({
        Title: data.EmployeeName || '',
        EmployeeId: data.EmployeeId,
        EmployeeName: data.EmployeeName,
        EmployeeEmail: data.EmployeeEmail,
        CurrentJobTitle: data.CurrentJobTitle,
        CurrentDepartment: data.CurrentDepartment,
        CurrentLocation: data.CurrentLocation,
        CurrentManagerId: data.CurrentManagerId,
        NewJobTitle: data.NewJobTitle,
        NewDepartment: data.NewDepartment,
        NewLocation: data.NewLocation,
        NewManagerId: data.NewManagerId,
        MoverType: data.MoverType,
        EffectiveDate: data.EffectiveDate,
        Status: data.Status || MoverStatus.NotStarted,
        Reason: data.Reason,
        CompletionPercentage: data.CompletionPercentage || 0,
        TotalTasks: data.TotalTasks || 0,
        CompletedTasks: data.CompletedTasks || 0,
        CurrentSalary: data.CurrentSalary,
        NewSalary: data.NewSalary,
        SalaryChangePercentage: data.SalaryChangePercentage,
        AssignedToId: data.AssignedToId,
        HRContactId: data.HRContactId,
        Notes: data.Notes,
        ApprovalRequired: data.ApprovalRequired || false,
        ApprovedById: data.ApprovedById,
        ApprovalDate: data.ApprovalDate,
      });
      return this.mapMoverFromSP(result);
    } catch (error) {
      console.error('[MoverService] Error creating mover:', error);
      return null;
    }
  }

  public async updateMover(id: number, updates: Partial<IMover>): Promise<boolean> {
    try {
      const updateData: any = {};
      const fields = [
        'Title', 'EmployeeName', 'EmployeeEmail',
        'CurrentJobTitle', 'CurrentDepartment', 'CurrentLocation', 'CurrentManagerId',
        'NewJobTitle', 'NewDepartment', 'NewLocation', 'NewManagerId',
        'MoverType', 'EffectiveDate', 'Status', 'Reason',
        'CompletionPercentage', 'TotalTasks', 'CompletedTasks',
        'CurrentSalary', 'NewSalary', 'SalaryChangePercentage',
        'AssignedToId', 'HRContactId', 'Notes',
        'ApprovalRequired', 'ApprovedById', 'ApprovalDate'
      ];
      fields.forEach(f => {
        if ((updates as any)[f] !== undefined) {
          updateData[f] = (updates as any)[f];
        }
      });
      await this.sp.web.lists.getByTitle(RM_LISTS.MOVER).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[MoverService] Error updating mover:', error);
      return false;
    }
  }

  public async deleteMover(id: number): Promise<boolean> {
    try {
      // Cascade delete: tasks and system access records first
      const tasks = await this.getMoverTasks(id);
      for (const task of tasks) {
        if (task.Id) {
          await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_TASKS).items.getById(task.Id).delete();
        }
      }

      const systemAccess = await this.getMoverSystemAccess(id);
      for (const sa of systemAccess) {
        if (sa.Id) {
          await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_SYSTEM_ACCESS).items.getById(sa.Id).delete();
        }
      }

      await this.sp.web.lists.getByTitle(RM_LISTS.MOVER).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[MoverService] Error deleting mover:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MOVER TASKS
  // ═══════════════════════════════════════════════════════════════

  public async getMoverTasks(moverId: number): Promise<IMoverTask[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_TASKS).items
        .select(
          'Id', 'Title', 'MoverId', 'Description', 'Category', 'Status',
          'AssignedToId', 'DueDate', 'CompletedDate', 'CompletedById',
          'Priority', 'SortOrder', 'Notes', 'RelatedSystemAccessId',
          'SystemAccessAction', 'RelatedAssetId', 'Created', 'Modified'
        )
        .filter(`MoverId eq ${moverId}`)
        .orderBy('SortOrder', true)
        .getAll();
      return items.map((item: any) => this.mapTaskFromSP(item));
    } catch (error) {
      console.error('[MoverService] Error getting mover tasks:', error);
      return [];
    }
  }

  public async createMoverTask(task: Partial<IMoverTask>): Promise<IMoverTask | null> {
    try {
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_TASKS).items.add({
        Title: task.Title,
        MoverId: task.MoverId,
        Description: task.Description,
        Category: task.Category,
        Status: task.Status || MoverTaskStatus.Pending,
        AssignedToId: task.AssignedToId,
        DueDate: task.DueDate,
        Priority: task.Priority || 'Medium',
        SortOrder: task.SortOrder || 0,
        Notes: task.Notes,
        RelatedSystemAccessId: task.RelatedSystemAccessId,
        SystemAccessAction: task.SystemAccessAction,
        RelatedAssetId: task.RelatedAssetId,
      });
      return this.mapTaskFromSP(result);
    } catch (error) {
      console.error('[MoverService] Error creating mover task:', error);
      return null;
    }
  }

  public async updateMoverTask(id: number, updates: Partial<IMoverTask>): Promise<boolean> {
    try {
      const updateData: any = {};
      const fields = [
        'Title', 'Description', 'Category', 'Status', 'AssignedToId',
        'DueDate', 'CompletedDate', 'CompletedById', 'Priority',
        'SortOrder', 'Notes', 'RelatedSystemAccessId', 'SystemAccessAction', 'RelatedAssetId'
      ];
      fields.forEach(f => {
        if ((updates as any)[f] !== undefined) {
          updateData[f] = (updates as any)[f];
        }
      });
      await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_TASKS).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[MoverService] Error updating mover task:', error);
      return false;
    }
  }

  public async deleteMoverTask(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_TASKS).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[MoverService] Error deleting mover task:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MOVER SYSTEM ACCESS
  // ═══════════════════════════════════════════════════════════════

  public async getMoverSystemAccess(moverId: number): Promise<IMoverSystemAccess[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_SYSTEM_ACCESS).items
        .select(
          'Id', 'Title', 'MoverId', 'SystemAccessTypeId', 'SystemName',
          'Action', 'CurrentRole', 'NewRole', 'Status',
          'ProcessedDate', 'ProcessedById', 'Notes', 'Created', 'Modified'
        )
        .filter(`MoverId eq ${moverId}`)
        .getAll();
      return items.map((item: any) => this.mapSystemAccessFromSP(item));
    } catch (error) {
      console.error('[MoverService] Error getting mover system access:', error);
      return [];
    }
  }

  public async createMoverSystemAccess(data: Partial<IMoverSystemAccess>): Promise<IMoverSystemAccess | null> {
    try {
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_SYSTEM_ACCESS).items.add({
        Title: data.SystemName || '',
        MoverId: data.MoverId,
        SystemAccessTypeId: data.SystemAccessTypeId,
        SystemName: data.SystemName,
        Action: data.Action,
        CurrentRole: data.CurrentRole,
        NewRole: data.NewRole,
        Status: data.Status || MoverTaskStatus.Pending,
        ProcessedDate: data.ProcessedDate,
        ProcessedById: data.ProcessedById,
        Notes: data.Notes,
      });
      return this.mapSystemAccessFromSP(result);
    } catch (error) {
      console.error('[MoverService] Error creating mover system access:', error);
      return null;
    }
  }

  public async updateMoverSystemAccess(id: number, updates: Partial<IMoverSystemAccess>): Promise<boolean> {
    try {
      const updateData: any = {};
      const fields = [
        'Title', 'SystemName', 'Action', 'CurrentRole', 'NewRole',
        'Status', 'ProcessedDate', 'ProcessedById', 'Notes'
      ];
      fields.forEach(f => {
        if ((updates as any)[f] !== undefined) {
          updateData[f] = (updates as any)[f];
        }
      });
      await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_SYSTEM_ACCESS).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[MoverService] Error updating mover system access:', error);
      return false;
    }
  }

  public async deleteMoverSystemAccess(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_SYSTEM_ACCESS).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[MoverService] Error deleting mover system access:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PROGRESS CALCULATION
  // ═══════════════════════════════════════════════════════════════

  public async recalculateProgress(moverId: number): Promise<void> {
    try {
      const tasks = await this.getMoverTasks(moverId);
      const total = tasks.length;
      const completed = tasks.filter(t => t.Status === MoverTaskStatus.Completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      const updateData: any = {
        TotalTasks: total,
        CompletedTasks: completed,
        CompletionPercentage: percentage,
      };

      if (percentage === 100 && total > 0) {
        updateData.Status = MoverStatus.Completed;
      }

      await this.sp.web.lists.getByTitle(RM_LISTS.MOVER).items.getById(moverId).update(updateData);
    } catch (error) {
      console.error('[MoverService] Error recalculating progress:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ELIGIBLE EMPLOYEES (from completed onboardings, not currently moving)
  // ═══════════════════════════════════════════════════════════════

  public async getEligibleEmployeesForMove(): Promise<IEligibleEmployeeForMove[]> {
    try {
      // Get employees from completed onboardings
      const onboardings = await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING).items
        .select('Id', 'CandidateId', 'CandidateName', 'JobTitle', 'Department', 'StartDate')
        .filter("Status eq 'Completed' or Status eq 'In Progress'")
        .getAll();

      // Get existing active movers to exclude
      const existingMovers = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER).items
        .select('EmployeeId')
        .filter("Status ne 'Completed' and Status ne 'Cancelled'")
        .getAll();

      const activeMovingIds = new Set(existingMovers.map((m: any) => m.EmployeeId));

      // Filter out employees who are currently in an active move
      return onboardings
        .filter((o: any) => !activeMovingIds.has(o.CandidateId))
        .map((item: any) => ({
          Id: item.CandidateId,
          EmployeeName: item.CandidateName || '',
          EmployeeEmail: undefined,
          JobTitle: item.JobTitle || '',
          Department: item.Department,
          Location: undefined,
          ManagerId: undefined,
          StartDate: item.StartDate ? new Date(item.StartDate) : undefined,
          OnboardingId: item.Id,
        }));
    } catch (error) {
      console.error('[MoverService] Error getting eligible employees:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MAPPERS
  // ═══════════════════════════════════════════════════════════════

  private mapMoverFromSP(item: any): IMover {
    return {
      Id: item.Id,
      Title: item.Title,
      EmployeeId: item.EmployeeId,
      EmployeeName: item.EmployeeName || '',
      EmployeeEmail: item.EmployeeEmail,
      CurrentJobTitle: item.CurrentJobTitle || '',
      CurrentDepartment: item.CurrentDepartment,
      CurrentLocation: item.CurrentLocation,
      CurrentManagerId: item.CurrentManagerId,
      NewJobTitle: item.NewJobTitle || '',
      NewDepartment: item.NewDepartment,
      NewLocation: item.NewLocation,
      NewManagerId: item.NewManagerId,
      MoverType: item.MoverType || 'Department Transfer',
      EffectiveDate: item.EffectiveDate ? new Date(item.EffectiveDate) : new Date(),
      Status: item.Status || MoverStatus.NotStarted,
      Reason: item.Reason,
      CompletionPercentage: item.CompletionPercentage || 0,
      TotalTasks: item.TotalTasks || 0,
      CompletedTasks: item.CompletedTasks || 0,
      CurrentSalary: item.CurrentSalary,
      NewSalary: item.NewSalary,
      SalaryChangePercentage: item.SalaryChangePercentage,
      AssignedToId: item.AssignedToId,
      HRContactId: item.HRContactId,
      Notes: item.Notes,
      ApprovalRequired: item.ApprovalRequired || false,
      ApprovedById: item.ApprovedById,
      ApprovalDate: item.ApprovalDate ? new Date(item.ApprovalDate) : undefined,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapTaskFromSP(item: any): IMoverTask {
    return {
      Id: item.Id,
      Title: item.Title || '',
      MoverId: item.MoverId,
      Description: item.Description,
      Category: item.Category || 'Other',
      Status: item.Status || MoverTaskStatus.Pending,
      AssignedToId: item.AssignedToId,
      DueDate: item.DueDate ? new Date(item.DueDate) : undefined,
      CompletedDate: item.CompletedDate ? new Date(item.CompletedDate) : undefined,
      CompletedById: item.CompletedById,
      Priority: item.Priority || 'Medium',
      SortOrder: item.SortOrder || 0,
      Notes: item.Notes,
      RelatedSystemAccessId: item.RelatedSystemAccessId,
      SystemAccessAction: item.SystemAccessAction,
      RelatedAssetId: item.RelatedAssetId,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapSystemAccessFromSP(item: any): IMoverSystemAccess {
    return {
      Id: item.Id,
      Title: item.Title,
      MoverId: item.MoverId,
      SystemAccessTypeId: item.SystemAccessTypeId,
      SystemName: item.SystemName || '',
      Action: item.Action || 'No Change',
      CurrentRole: item.CurrentRole,
      NewRole: item.NewRole,
      Status: item.Status || MoverTaskStatus.Pending,
      ProcessedDate: item.ProcessedDate ? new Date(item.ProcessedDate) : undefined,
      ProcessedById: item.ProcessedById,
      Notes: item.Notes,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }
}
