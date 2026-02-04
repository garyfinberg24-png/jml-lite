// Onboarding Service — Employee Onboarding Management
// Decoupled from JML — uses RM_LISTS constants

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import { RM_LISTS } from '../constants/SharePointListNames';
import { IOnboarding, IOnboardingTask, IOnboardingTemplate, OnboardingStatus, OnboardingTaskStatus } from '../models/IOnboarding';

export class OnboardingService {
  private sp: SPFI;

  constructor(sp: SPFI) {
    this.sp = sp;
  }

  public async getOnboardings(filters?: { status?: OnboardingStatus[] }): Promise<IOnboarding[]> {
    try {
      const filterParts: string[] = [];
      if (filters?.status?.length) {
        const statusFilters = filters.status.map(s => `Status eq '${s}'`).join(' or ');
        filterParts.push(`(${statusFilters})`);
      }

      let query = this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING).items
        .select(
          'Id', 'Title', 'CandidateId', 'CandidateName', 'JobTitle', 'Department',
          'HiringManagerId', 'StartDate', 'Status', 'CompletionPercentage',
          'TotalTasks', 'CompletedTasks', 'DueDate', 'CompletedDate',
          'AssignedToId', 'Notes', 'Created', 'Modified'
        )
        .orderBy('Modified', false);

      if (filterParts.length > 0) {
        query = query.filter(filterParts.join(' and '));
      }

      const items = await query.getAll();
      return items.map((item: any) => this.mapOnboardingFromSP(item));
    } catch (error) {
      console.error('[OnboardingService] Error getting onboardings:', error);
      return [];
    }
  }

  public async getOnboardingById(id: number): Promise<IOnboarding | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING).items
        .getById(id)
        .select(
          'Id', 'Title', 'CandidateId', 'CandidateName', 'JobTitle', 'Department',
          'HiringManagerId', 'StartDate', 'Status', 'CompletionPercentage',
          'TotalTasks', 'CompletedTasks', 'DueDate', 'CompletedDate',
          'AssignedToId', 'Notes', 'Created', 'Modified'
        )();
      return this.mapOnboardingFromSP(item);
    } catch (error) {
      console.error('[OnboardingService] Error getting onboarding by id:', error);
      return null;
    }
  }

  public async getOnboardingTasks(onboardingId: number): Promise<IOnboardingTask[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_TASKS).items
        .select(
          'Id', 'Title', 'OnboardingId', 'Description', 'Category', 'Status',
          'AssignedToId', 'DueDate', 'CompletedDate', 'CompletedById',
          'Priority', 'EstimatedHours', 'ActualHours', 'DocumentUrl',
          'SortOrder', 'Notes', 'Created', 'Modified'
        )
        .filter(`OnboardingId eq ${onboardingId}`)
        .orderBy('SortOrder', true)
        .getAll();
      return items.map((item: any) => this.mapTaskFromSP(item));
    } catch (error) {
      console.error('[OnboardingService] Error getting onboarding tasks:', error);
      return [];
    }
  }

  public async createOnboarding(data: Partial<IOnboarding>): Promise<IOnboarding | null> {
    try {
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING).items.add({
        Title: data.CandidateName || '',
        CandidateId: data.CandidateId,
        CandidateName: data.CandidateName,
        JobTitle: data.JobTitle,
        Department: data.Department,
        HiringManagerId: data.HiringManagerId,
        StartDate: data.StartDate,
        Status: data.Status || OnboardingStatus.NotStarted,
        CompletionPercentage: data.CompletionPercentage || 0,
        TotalTasks: data.TotalTasks || 0,
        CompletedTasks: data.CompletedTasks || 0,
        DueDate: data.DueDate,
        AssignedToId: data.AssignedToId,
        Notes: data.Notes,
      });
      return this.mapOnboardingFromSP(result);
    } catch (error) {
      console.error('[OnboardingService] Error creating onboarding:', error);
      return null;
    }
  }

  public async updateOnboarding(id: number, updates: Partial<IOnboarding>): Promise<boolean> {
    try {
      const updateData: any = {};
      const fields = [
        'Title', 'CandidateName', 'JobTitle', 'Department', 'HiringManagerId',
        'StartDate', 'Status', 'CompletionPercentage', 'TotalTasks', 'CompletedTasks',
        'DueDate', 'CompletedDate', 'AssignedToId', 'Notes'
      ];
      fields.forEach(f => {
        if ((updates as any)[f] !== undefined) {
          updateData[f] = (updates as any)[f];
        }
      });
      await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OnboardingService] Error updating onboarding:', error);
      return false;
    }
  }

  public async deleteOnboarding(id: number): Promise<boolean> {
    try {
      const tasks = await this.getOnboardingTasks(id);
      for (const task of tasks) {
        if (task.Id) {
          await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_TASKS).items.getById(task.Id).delete();
        }
      }
      await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OnboardingService] Error deleting onboarding:', error);
      return false;
    }
  }

  public async createOnboardingTask(task: Partial<IOnboardingTask>): Promise<IOnboardingTask | null> {
    try {
      const result = await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_TASKS).items.add({
        Title: task.Title,
        OnboardingId: task.OnboardingId,
        Description: task.Description,
        Category: task.Category,
        Status: task.Status || OnboardingTaskStatus.Pending,
        AssignedToId: task.AssignedToId,
        DueDate: task.DueDate,
        Priority: task.Priority || 'Medium',
        EstimatedHours: task.EstimatedHours,
        DocumentUrl: task.DocumentUrl,
        SortOrder: task.SortOrder || 0,
        Notes: task.Notes,
      });
      return this.mapTaskFromSP(result);
    } catch (error) {
      console.error('[OnboardingService] Error creating onboarding task:', error);
      return null;
    }
  }

  public async updateOnboardingTask(id: number, updates: Partial<IOnboardingTask>): Promise<boolean> {
    try {
      const updateData: any = {};
      const fields = [
        'Title', 'Description', 'Category', 'Status', 'AssignedToId',
        'DueDate', 'CompletedDate', 'CompletedById', 'Priority',
        'EstimatedHours', 'ActualHours', 'DocumentUrl', 'SortOrder', 'Notes'
      ];
      fields.forEach(f => {
        if ((updates as any)[f] !== undefined) {
          updateData[f] = (updates as any)[f];
        }
      });
      await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_TASKS).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[OnboardingService] Error updating onboarding task:', error);
      return false;
    }
  }

  public async deleteOnboardingTask(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_TASKS).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[OnboardingService] Error deleting onboarding task:', error);
      return false;
    }
  }

  public async recalculateProgress(onboardingId: number): Promise<void> {
    try {
      const tasks = await this.getOnboardingTasks(onboardingId);
      const total = tasks.length;
      const completed = tasks.filter(t => t.Status === OnboardingTaskStatus.Completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      const updateData: any = {
        TotalTasks: total,
        CompletedTasks: completed,
        CompletionPercentage: percentage,
      };

      if (percentage === 100 && total > 0) {
        updateData.Status = OnboardingStatus.Completed;
        updateData.CompletedDate = new Date();
      }

      await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING).items.getById(onboardingId).update(updateData);
    } catch (error) {
      console.error('[OnboardingService] Error recalculating progress:', error);
    }
  }

  // In JML Lite standalone, employees are entered directly in the wizard
  // For testing purposes, we provide sample candidates
  public async getEligibleCandidates(): Promise<{ Id: number; Name: string; Email: string; Status: string }[]> {
    // Sample candidates for testing JML Lite onboarding wizard
    return [
      { Id: 1, Name: 'Sarah Chen', Email: 'sarah.chen@company.com', Status: 'Hired' },
      { Id: 2, Name: 'Marcus Williams', Email: 'marcus.williams@company.com', Status: 'Offer Accepted' },
      { Id: 3, Name: 'Emily Rodriguez', Email: 'emily.rodriguez@company.com', Status: 'Hired' },
      { Id: 4, Name: 'James Thompson', Email: 'james.thompson@company.com', Status: 'Offer Accepted' },
      { Id: 5, Name: 'Priya Patel', Email: 'priya.patel@company.com', Status: 'Hired' },
      { Id: 6, Name: 'David Kim', Email: 'david.kim@company.com', Status: 'Offer Accepted' },
      { Id: 7, Name: 'Sophie Taylor', Email: 'sophie.taylor@company.com', Status: 'Hired' },
      { Id: 8, Name: 'Ahmed Hassan', Email: 'ahmed.hassan@company.com', Status: 'Hired' },
    ];
  }

  public async getOnboardingTemplates(): Promise<IOnboardingTemplate[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(RM_LISTS.ONBOARDING_TEMPLATES).items
        .select('Id', 'Title', 'Description', 'Department', 'JobTitle', 'IsActive', 'TasksJSON', 'EstimatedDurationDays', 'Created', 'Modified')
        .filter('IsActive eq 1')
        .getAll();
      return items.map((item: any) => this.mapTemplateFromSP(item));
    } catch (error) {
      console.error('[OnboardingService] Error getting onboarding templates:', error);
      return [];
    }
  }

  private mapOnboardingFromSP(item: any): IOnboarding {
    return {
      Id: item.Id,
      Title: item.Title,
      CandidateId: item.CandidateId,
      CandidateName: item.CandidateName || '',
      JobTitle: item.JobTitle || '',
      Department: item.Department || '',
      HiringManagerId: item.HiringManagerId,
      StartDate: item.StartDate ? new Date(item.StartDate) : new Date(),
      Status: item.Status || OnboardingStatus.NotStarted,
      CompletionPercentage: item.CompletionPercentage || 0,
      TotalTasks: item.TotalTasks || 0,
      CompletedTasks: item.CompletedTasks || 0,
      DueDate: item.DueDate ? new Date(item.DueDate) : undefined,
      CompletedDate: item.CompletedDate ? new Date(item.CompletedDate) : undefined,
      AssignedToId: item.AssignedToId,
      Notes: item.Notes,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapTaskFromSP(item: any): IOnboardingTask {
    return {
      Id: item.Id,
      Title: item.Title || '',
      OnboardingId: item.OnboardingId,
      Description: item.Description,
      Category: item.Category || 'Documentation',
      Status: item.Status || OnboardingTaskStatus.Pending,
      AssignedToId: item.AssignedToId,
      DueDate: item.DueDate ? new Date(item.DueDate) : undefined,
      CompletedDate: item.CompletedDate ? new Date(item.CompletedDate) : undefined,
      CompletedById: item.CompletedById,
      Priority: item.Priority || 'Medium',
      EstimatedHours: item.EstimatedHours,
      ActualHours: item.ActualHours,
      DocumentUrl: item.DocumentUrl,
      SortOrder: item.SortOrder || 0,
      Notes: item.Notes,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }

  private mapTemplateFromSP(item: any): IOnboardingTemplate {
    return {
      Id: item.Id,
      Title: item.Title || '',
      Description: item.Description,
      Department: item.Department,
      JobTitle: item.JobTitle,
      IsActive: item.IsActive || false,
      TasksJSON: item.TasksJSON || '[]',
      EstimatedDurationDays: item.EstimatedDurationDays,
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
    };
  }
}
