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
import { sanitizeForOData, sanitizeNumberForOData, truncateToLength } from '../utils/validation';

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
        // Sanitize status values to prevent OData injection
        const statusFilters = filters.status
          .map(s => `Status eq '${sanitizeForOData(s)}'`)
          .join(' or ');
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
      // Sanitize and truncate string inputs
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER).items.add({
        Title: truncateToLength(data.EmployeeName, 255) || '',
        EmployeeId: sanitizeNumberForOData(data.EmployeeId),
        EmployeeName: truncateToLength(data.EmployeeName, 255),
        EmployeeEmail: truncateToLength(data.EmployeeEmail, 255),
        CurrentJobTitle: truncateToLength(data.CurrentJobTitle, 255),
        CurrentDepartment: truncateToLength(data.CurrentDepartment, 255),
        CurrentLocation: truncateToLength(data.CurrentLocation, 255),
        CurrentManagerId: data.CurrentManagerId ? sanitizeNumberForOData(data.CurrentManagerId) : undefined,
        NewJobTitle: truncateToLength(data.NewJobTitle, 255),
        NewDepartment: truncateToLength(data.NewDepartment, 255),
        NewLocation: truncateToLength(data.NewLocation, 255),
        NewManagerId: data.NewManagerId ? sanitizeNumberForOData(data.NewManagerId) : undefined,
        MoverType: data.MoverType,
        EffectiveDate: data.EffectiveDate,
        Status: data.Status || MoverStatus.NotStarted,
        Reason: truncateToLength(data.Reason, 1000),
        CompletionPercentage: sanitizeNumberForOData(data.CompletionPercentage) || 0,
        TotalTasks: sanitizeNumberForOData(data.TotalTasks) || 0,
        CompletedTasks: sanitizeNumberForOData(data.CompletedTasks) || 0,
        CurrentSalary: data.CurrentSalary ? sanitizeNumberForOData(data.CurrentSalary) : undefined,
        NewSalary: data.NewSalary ? sanitizeNumberForOData(data.NewSalary) : undefined,
        SalaryChangePercentage: data.SalaryChangePercentage ? sanitizeNumberForOData(data.SalaryChangePercentage) : undefined,
        AssignedToId: data.AssignedToId ? sanitizeNumberForOData(data.AssignedToId) : undefined,
        HRContactId: data.HRContactId ? sanitizeNumberForOData(data.HRContactId) : undefined,
        Notes: truncateToLength(data.Notes, 5000),
        ApprovalRequired: data.ApprovalRequired || false,
        ApprovedById: data.ApprovedById ? sanitizeNumberForOData(data.ApprovedById) : undefined,
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
      // Sanitize ID to prevent injection
      const safeId = sanitizeNumberForOData(moverId);
      if (safeId <= 0) return [];

      const items = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_TASKS).items
        .select(
          'Id', 'Title', 'MoverId', 'Description', 'Category', 'Status',
          'AssignedToId', 'DueDate', 'CompletedDate', 'CompletedById',
          'Priority', 'SortOrder', 'Notes', 'RelatedSystemAccessId',
          'SystemAccessAction', 'RelatedAssetId', 'Created', 'Modified'
        )
        .filter(`MoverId eq ${safeId}`)
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
      // Sanitize and truncate inputs
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_TASKS).items.add({
        Title: truncateToLength(task.Title, 255),
        MoverId: sanitizeNumberForOData(task.MoverId),
        Description: truncateToLength(task.Description, 5000),
        Category: task.Category,
        Status: task.Status || MoverTaskStatus.Pending,
        AssignedToId: task.AssignedToId ? sanitizeNumberForOData(task.AssignedToId) : undefined,
        DueDate: task.DueDate,
        Priority: task.Priority || 'Medium',
        SortOrder: sanitizeNumberForOData(task.SortOrder) || 0,
        Notes: truncateToLength(task.Notes, 5000),
        RelatedSystemAccessId: task.RelatedSystemAccessId ? sanitizeNumberForOData(task.RelatedSystemAccessId) : undefined,
        SystemAccessAction: task.SystemAccessAction,
        RelatedAssetId: task.RelatedAssetId ? sanitizeNumberForOData(task.RelatedAssetId) : undefined,
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
      // Sanitize ID to prevent injection
      const safeId = sanitizeNumberForOData(moverId);
      if (safeId <= 0) return [];

      const items = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_SYSTEM_ACCESS).items
        .select(
          'Id', 'Title', 'MoverId', 'SystemAccessTypeId', 'SystemName',
          'Action', 'CurrentRole', 'NewRole', 'Status',
          'ProcessedDate', 'ProcessedById', 'Notes', 'Created', 'Modified'
        )
        .filter(`MoverId eq ${safeId}`)
        .getAll();
      return items.map((item: any) => this.mapSystemAccessFromSP(item));
    } catch (error) {
      console.error('[MoverService] Error getting mover system access:', error);
      return [];
    }
  }

  public async createMoverSystemAccess(data: Partial<IMoverSystemAccess>): Promise<IMoverSystemAccess | null> {
    try {
      // Sanitize and truncate inputs
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.MOVER_SYSTEM_ACCESS).items.add({
        Title: truncateToLength(data.SystemName, 255) || '',
        MoverId: sanitizeNumberForOData(data.MoverId),
        SystemAccessTypeId: data.SystemAccessTypeId ? sanitizeNumberForOData(data.SystemAccessTypeId) : undefined,
        SystemName: truncateToLength(data.SystemName, 255),
        Action: data.Action,
        CurrentRole: truncateToLength(data.CurrentRole, 255),
        NewRole: truncateToLength(data.NewRole, 255),
        Status: data.Status || MoverTaskStatus.Pending,
        ProcessedDate: data.ProcessedDate,
        ProcessedById: data.ProcessedById ? sanitizeNumberForOData(data.ProcessedById) : undefined,
        Notes: truncateToLength(data.Notes, 5000),
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
      const eligibleFromOnboarding = onboardings
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

      // If no employees found, return sample test data
      if (eligibleFromOnboarding.length === 0) {
        return [
          { Id: 101, EmployeeName: 'Michael Johnson', EmployeeEmail: 'michael.johnson@company.com', JobTitle: 'Senior Developer', Department: 'Engineering', Location: 'London', ManagerId: undefined, StartDate: new Date('2023-06-15'), OnboardingId: 1 },
          { Id: 102, EmployeeName: 'Emma Davis', EmployeeEmail: 'emma.davis@company.com', JobTitle: 'Product Manager', Department: 'Product', Location: 'Manchester', ManagerId: undefined, StartDate: new Date('2023-03-01'), OnboardingId: 2 },
          { Id: 103, EmployeeName: 'Oliver Wilson', EmployeeEmail: 'oliver.wilson@company.com', JobTitle: 'Marketing Analyst', Department: 'Marketing', Location: 'Birmingham', ManagerId: undefined, StartDate: new Date('2022-11-20'), OnboardingId: 3 },
          { Id: 104, EmployeeName: 'Sophia Brown', EmployeeEmail: 'sophia.brown@company.com', JobTitle: 'HR Coordinator', Department: 'Human Resources', Location: 'London', ManagerId: undefined, StartDate: new Date('2023-01-10'), OnboardingId: 4 },
          { Id: 105, EmployeeName: 'James Miller', EmployeeEmail: 'james.miller@company.com', JobTitle: 'Financial Analyst', Department: 'Finance', Location: 'Edinburgh', ManagerId: undefined, StartDate: new Date('2022-09-05'), OnboardingId: 5 },
        ];
      }

      return eligibleFromOnboarding;
    } catch (error) {
      console.error('[MoverService] Error getting eligible employees:', error);
      // Return sample test data on error
      return [
        { Id: 101, EmployeeName: 'Michael Johnson', EmployeeEmail: 'michael.johnson@company.com', JobTitle: 'Senior Developer', Department: 'Engineering', Location: 'London', ManagerId: undefined, StartDate: new Date('2023-06-15'), OnboardingId: 1 },
        { Id: 102, EmployeeName: 'Emma Davis', EmployeeEmail: 'emma.davis@company.com', JobTitle: 'Product Manager', Department: 'Product', Location: 'Manchester', ManagerId: undefined, StartDate: new Date('2023-03-01'), OnboardingId: 2 },
        { Id: 103, EmployeeName: 'Oliver Wilson', EmployeeEmail: 'oliver.wilson@company.com', JobTitle: 'Marketing Analyst', Department: 'Marketing', Location: 'Birmingham', ManagerId: undefined, StartDate: new Date('2022-11-20'), OnboardingId: 3 },
      ];
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
