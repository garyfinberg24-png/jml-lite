// Task Library Service - JML Lite
// CRUD operations for task library with classification system

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import { JML_LISTS } from '../constants/SharePointListNames';
import {
  ITaskLibraryItem,
  ITaskLibraryItemInput,
  ITaskLibraryFilters,
  ITaskLibraryStats,
  TaskClassification,
  TaskProcessType,
  TaskAssignmentType,
  generateTaskCode,
  TASK_CLASSIFICATION_INFO,
  DEFAULT_TASK_LIBRARY,
} from '../models/ITaskLibrary';

export class TaskLibraryService {
  private sp: SPFI;
  private listName = JML_LISTS.TASK_LIBRARY;

  constructor(sp: SPFI) {
    this.sp = sp;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get all task library items with optional filtering
   */
  public async getTaskLibraryItems(filters?: ITaskLibraryFilters): Promise<ITaskLibraryItem[]> {
    try {
      const items = await this.sp.web.lists.getByTitle(this.listName).items
        .select(
          'Id', 'TaskCode', 'Classification', 'SequenceNumber', 'Title', 'Description', 'Instructions',
          'ProcessTypes', 'Departments', 'JobTitles',
          'DefaultAssignmentType', 'DefaultAssigneeRole', 'DefaultAssigneeId', 'DefaultAssigneeName',
          'DefaultOffsetType', 'DefaultDaysOffset', 'EstimatedHours',
          'DefaultPriority', 'RequiresApproval', 'DefaultApproverId', 'DefaultApproverName', 'DefaultApproverRole',
          'SendEmailNotification', 'SendTeamsNotification', 'SendReminder', 'ReminderDaysBefore', 'NotifyOnComplete',
          'DependsOnTaskCodes', 'BlockedByTaskCodes',
          'IsActive', 'IsMandatory', 'SortOrder', 'Tags',
          'Created', 'Modified', 'Author/Id', 'Editor/Id'
        )
        .expand('Author', 'Editor')
        .orderBy('Classification', true)
        .orderBy('SequenceNumber', true)
        .getAll();

      let results = items.map((item: any) => this.mapFromSP(item));

      // Apply filters
      if (filters) {
        results = this.applyFilters(results, filters);
      }

      return results;
    } catch (error) {
      console.error('[TaskLibraryService] Error getting task library items:', error);
      return [];
    }
  }

  /**
   * Get task library item by ID
   */
  public async getTaskLibraryItemById(id: number): Promise<ITaskLibraryItem | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(this.listName).items
        .getById(id)
        .select(
          'Id', 'TaskCode', 'Classification', 'SequenceNumber', 'Title', 'Description', 'Instructions',
          'ProcessTypes', 'Departments', 'JobTitles',
          'DefaultAssignmentType', 'DefaultAssigneeRole', 'DefaultAssigneeId', 'DefaultAssigneeName',
          'DefaultOffsetType', 'DefaultDaysOffset', 'EstimatedHours',
          'DefaultPriority', 'RequiresApproval', 'DefaultApproverId', 'DefaultApproverName', 'DefaultApproverRole',
          'SendEmailNotification', 'SendTeamsNotification', 'SendReminder', 'ReminderDaysBefore', 'NotifyOnComplete',
          'DependsOnTaskCodes', 'BlockedByTaskCodes',
          'IsActive', 'IsMandatory', 'SortOrder', 'Tags',
          'Created', 'Modified', 'Author/Id', 'Editor/Id'
        )
        .expand('Author', 'Editor')();
      return this.mapFromSP(item);
    } catch (error) {
      console.error('[TaskLibraryService] Error getting task library item by id:', error);
      return null;
    }
  }

  /**
   * Get task library item by task code
   */
  public async getTaskLibraryItemByCode(taskCode: string): Promise<ITaskLibraryItem | null> {
    try {
      const items = await this.sp.web.lists.getByTitle(this.listName).items
        .filter(`TaskCode eq '${taskCode}'`)
        .select(
          'Id', 'TaskCode', 'Classification', 'SequenceNumber', 'Title', 'Description', 'Instructions',
          'ProcessTypes', 'Departments', 'JobTitles',
          'DefaultAssignmentType', 'DefaultAssigneeRole', 'DefaultAssigneeId', 'DefaultAssigneeName',
          'DefaultOffsetType', 'DefaultDaysOffset', 'EstimatedHours',
          'DefaultPriority', 'RequiresApproval', 'DefaultApproverId', 'DefaultApproverName', 'DefaultApproverRole',
          'SendEmailNotification', 'SendTeamsNotification', 'SendReminder', 'ReminderDaysBefore', 'NotifyOnComplete',
          'DependsOnTaskCodes', 'BlockedByTaskCodes',
          'IsActive', 'IsMandatory', 'SortOrder', 'Tags',
          'Created', 'Modified'
        )
        .top(1)();

      if (items.length === 0) return null;
      return this.mapFromSP(items[0]);
    } catch (error) {
      console.error('[TaskLibraryService] Error getting task library item by code:', error);
      return null;
    }
  }

  /**
   * Create a new task library item
   */
  public async createTaskLibraryItem(input: ITaskLibraryItemInput): Promise<ITaskLibraryItem | null> {
    try {
      // Get next sequence number for classification
      const sequenceNumber = await this.getNextSequenceNumber(input.Classification);
      const taskCode = generateTaskCode(input.Classification, sequenceNumber);

      const result = await this.sp.web.lists.getByTitle(this.listName).items.add({
        Title: input.Title,
        TaskCode: taskCode,
        Classification: input.Classification,
        SequenceNumber: sequenceNumber,
        Description: input.Description,
        Instructions: input.Instructions,
        ProcessTypes: JSON.stringify(input.ProcessTypes),
        Departments: input.Departments ? JSON.stringify(input.Departments) : null,
        JobTitles: input.JobTitles ? JSON.stringify(input.JobTitles) : null,
        DefaultAssignmentType: input.DefaultAssignmentType,
        DefaultAssigneeRole: input.DefaultAssigneeRole,
        DefaultAssigneeId: input.DefaultAssigneeId,
        DefaultAssigneeName: input.DefaultAssigneeName,
        DefaultOffsetType: input.DefaultOffsetType,
        DefaultDaysOffset: input.DefaultDaysOffset,
        EstimatedHours: input.EstimatedHours,
        DefaultPriority: input.DefaultPriority,
        RequiresApproval: input.RequiresApproval,
        DefaultApproverId: input.DefaultApproverId,
        DefaultApproverName: input.DefaultApproverName,
        DefaultApproverRole: input.DefaultApproverRole,
        SendEmailNotification: input.SendEmailNotification,
        SendTeamsNotification: input.SendTeamsNotification,
        SendReminder: input.SendReminder,
        ReminderDaysBefore: input.ReminderDaysBefore,
        NotifyOnComplete: input.NotifyOnComplete,
        DependsOnTaskCodes: input.DependsOnTaskCodes ? JSON.stringify(input.DependsOnTaskCodes) : null,
        IsActive: input.IsActive,
        IsMandatory: input.IsMandatory,
        SortOrder: input.SortOrder || sequenceNumber,
        Tags: input.Tags ? JSON.stringify(input.Tags) : null,
      });

      return this.mapFromSP(result);
    } catch (error) {
      console.error('[TaskLibraryService] Error creating task library item:', error);
      return null;
    }
  }

  /**
   * Update a task library item
   */
  public async updateTaskLibraryItem(id: number, input: Partial<ITaskLibraryItemInput>): Promise<boolean> {
    try {
      const updateData: any = {};

      if (input.Title !== undefined) updateData.Title = input.Title;
      if (input.Description !== undefined) updateData.Description = input.Description;
      if (input.Instructions !== undefined) updateData.Instructions = input.Instructions;
      if (input.ProcessTypes !== undefined) updateData.ProcessTypes = JSON.stringify(input.ProcessTypes);
      if (input.Departments !== undefined) updateData.Departments = input.Departments ? JSON.stringify(input.Departments) : null;
      if (input.JobTitles !== undefined) updateData.JobTitles = input.JobTitles ? JSON.stringify(input.JobTitles) : null;
      if (input.DefaultAssignmentType !== undefined) updateData.DefaultAssignmentType = input.DefaultAssignmentType;
      if (input.DefaultAssigneeRole !== undefined) updateData.DefaultAssigneeRole = input.DefaultAssigneeRole;
      if (input.DefaultAssigneeId !== undefined) updateData.DefaultAssigneeId = input.DefaultAssigneeId;
      if (input.DefaultAssigneeName !== undefined) updateData.DefaultAssigneeName = input.DefaultAssigneeName;
      if (input.DefaultOffsetType !== undefined) updateData.DefaultOffsetType = input.DefaultOffsetType;
      if (input.DefaultDaysOffset !== undefined) updateData.DefaultDaysOffset = input.DefaultDaysOffset;
      if (input.EstimatedHours !== undefined) updateData.EstimatedHours = input.EstimatedHours;
      if (input.DefaultPriority !== undefined) updateData.DefaultPriority = input.DefaultPriority;
      if (input.RequiresApproval !== undefined) updateData.RequiresApproval = input.RequiresApproval;
      if (input.DefaultApproverId !== undefined) updateData.DefaultApproverId = input.DefaultApproverId;
      if (input.DefaultApproverName !== undefined) updateData.DefaultApproverName = input.DefaultApproverName;
      if (input.DefaultApproverRole !== undefined) updateData.DefaultApproverRole = input.DefaultApproverRole;
      if (input.SendEmailNotification !== undefined) updateData.SendEmailNotification = input.SendEmailNotification;
      if (input.SendTeamsNotification !== undefined) updateData.SendTeamsNotification = input.SendTeamsNotification;
      if (input.SendReminder !== undefined) updateData.SendReminder = input.SendReminder;
      if (input.ReminderDaysBefore !== undefined) updateData.ReminderDaysBefore = input.ReminderDaysBefore;
      if (input.NotifyOnComplete !== undefined) updateData.NotifyOnComplete = input.NotifyOnComplete;
      if (input.DependsOnTaskCodes !== undefined) updateData.DependsOnTaskCodes = input.DependsOnTaskCodes ? JSON.stringify(input.DependsOnTaskCodes) : null;
      if (input.IsActive !== undefined) updateData.IsActive = input.IsActive;
      if (input.IsMandatory !== undefined) updateData.IsMandatory = input.IsMandatory;
      if (input.SortOrder !== undefined) updateData.SortOrder = input.SortOrder;
      if (input.Tags !== undefined) updateData.Tags = input.Tags ? JSON.stringify(input.Tags) : null;

      await this.sp.web.lists.getByTitle(this.listName).items.getById(id).update(updateData);
      return true;
    } catch (error) {
      console.error('[TaskLibraryService] Error updating task library item:', error);
      return false;
    }
  }

  /**
   * Delete a task library item
   */
  public async deleteTaskLibraryItem(id: number): Promise<boolean> {
    try {
      await this.sp.web.lists.getByTitle(this.listName).items.getById(id).delete();
      return true;
    } catch (error) {
      console.error('[TaskLibraryService] Error deleting task library item:', error);
      return false;
    }
  }

  /**
   * Toggle active status
   */
  public async toggleActive(id: number): Promise<boolean> {
    try {
      const item = await this.getTaskLibraryItemById(id);
      if (!item) return false;

      await this.sp.web.lists.getByTitle(this.listName).items
        .getById(id)
        .update({ IsActive: !item.IsActive });
      return true;
    } catch (error) {
      console.error('[TaskLibraryService] Error toggling active status:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TASK RETRIEVAL FOR WIZARDS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get tasks for a specific process type, optionally filtered by department/job title
   */
  public async getTasksForProcess(
    processType: TaskProcessType,
    department?: string,
    jobTitle?: string
  ): Promise<ITaskLibraryItem[]> {
    try {
      const allTasks = await this.getTaskLibraryItems({ isActive: true });

      return allTasks.filter(task => {
        // Must match process type or be "All"
        if (!task.ProcessTypes.includes(processType) && !task.ProcessTypes.includes(TaskProcessType.All)) {
          return false;
        }

        // If department filter is specified on task, must match
        if (task.Departments && task.Departments.length > 0 && department) {
          if (!task.Departments.includes(department)) {
            return false;
          }
        }

        // If job title filter is specified on task, must match
        if (task.JobTitles && task.JobTitles.length > 0 && jobTitle) {
          if (!task.JobTitles.includes(jobTitle)) {
            return false;
          }
        }

        return true;
      });
    } catch (error) {
      console.error('[TaskLibraryService] Error getting tasks for process:', error);
      return [];
    }
  }

  /**
   * Get mandatory tasks for a process type
   */
  public async getMandatoryTasks(processType: TaskProcessType): Promise<ITaskLibraryItem[]> {
    try {
      const tasks = await this.getTasksForProcess(processType);
      return tasks.filter(t => t.IsMandatory);
    } catch (error) {
      console.error('[TaskLibraryService] Error getting mandatory tasks:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get task library statistics
   */
  public async getStats(): Promise<ITaskLibraryStats> {
    try {
      const items = await this.getTaskLibraryItems();

      const stats: ITaskLibraryStats = {
        totalTasks: items.length,
        activeTasks: items.filter(i => i.IsActive).length,
        byClassification: {} as Record<TaskClassification, number>,
        byProcessType: {} as Record<TaskProcessType, number>,
        mandatoryTasks: items.filter(i => i.IsMandatory).length,
        requiresApproval: items.filter(i => i.RequiresApproval).length,
      };

      // Initialize classification counts
      Object.values(TaskClassification).forEach(c => {
        stats.byClassification[c] = 0;
      });

      // Initialize process type counts
      Object.values(TaskProcessType).forEach(p => {
        stats.byProcessType[p] = 0;
      });

      // Count
      items.forEach(item => {
        stats.byClassification[item.Classification]++;
        item.ProcessTypes.forEach(pt => {
          stats.byProcessType[pt]++;
        });
      });

      return stats;
    } catch (error) {
      console.error('[TaskLibraryService] Error getting stats:', error);
      return {
        totalTasks: 0,
        activeTasks: 0,
        byClassification: {} as Record<TaskClassification, number>,
        byProcessType: {} as Record<TaskProcessType, number>,
        mandatoryTasks: 0,
        requiresApproval: 0,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // SEEDING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Seed the task library with default tasks
   */
  public async seedDefaultTasks(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    try {
      const existingTasks = await this.getTaskLibraryItems();
      const existingTitles = new Set(existingTasks.map(t => t.Title.toLowerCase()));

      for (const task of DEFAULT_TASK_LIBRARY) {
        // Skip if task with same title already exists
        if (existingTitles.has(task.Title!.toLowerCase())) {
          skipped++;
          continue;
        }

        const input: ITaskLibraryItemInput = {
          Classification: task.Classification!,
          Title: task.Title!,
          Description: task.Description,
          Instructions: task.Instructions,
          ProcessTypes: task.ProcessTypes!,
          Departments: task.Departments,
          JobTitles: task.JobTitles,
          DefaultAssignmentType: task.DefaultAssignmentType || TaskAssignmentType.Role,
          DefaultAssigneeRole: task.DefaultAssigneeRole,
          DefaultAssigneeId: task.DefaultAssigneeId,
          DefaultAssigneeName: task.DefaultAssigneeName,
          DefaultOffsetType: task.DefaultOffsetType || 'on-start',
          DefaultDaysOffset: task.DefaultDaysOffset || 0,
          EstimatedHours: task.EstimatedHours,
          DefaultPriority: task.DefaultPriority || 'Medium',
          RequiresApproval: task.RequiresApproval || false,
          DefaultApproverId: task.DefaultApproverId,
          DefaultApproverName: task.DefaultApproverName,
          DefaultApproverRole: task.DefaultApproverRole,
          SendEmailNotification: task.SendEmailNotification ?? true,
          SendTeamsNotification: task.SendTeamsNotification ?? false,
          SendReminder: task.SendReminder ?? true,
          ReminderDaysBefore: task.ReminderDaysBefore || 1,
          NotifyOnComplete: task.NotifyOnComplete ?? true,
          DependsOnTaskCodes: task.DependsOnTaskCodes,
          IsActive: task.IsActive ?? true,
          IsMandatory: task.IsMandatory ?? false,
          Tags: task.Tags,
        };

        const result = await this.createTaskLibraryItem(input);
        if (result) {
          created++;
        }
      }

      console.log(`[TaskLibraryService] Seeded ${created} tasks, skipped ${skipped} existing`);
      return { created, skipped };
    } catch (error) {
      console.error('[TaskLibraryService] Error seeding default tasks:', error);
      return { created, skipped };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get next sequence number for a classification
   */
  private async getNextSequenceNumber(classification: TaskClassification): Promise<number> {
    try {
      const items = await this.sp.web.lists.getByTitle(this.listName).items
        .filter(`Classification eq '${classification}'`)
        .select('SequenceNumber')
        .orderBy('SequenceNumber', false)
        .top(1)();

      if (items.length === 0) return 1;
      return (items[0].SequenceNumber || 0) + 1;
    } catch (error) {
      console.error('[TaskLibraryService] Error getting next sequence number:', error);
      return 1;
    }
  }

  /**
   * Apply filters to task list
   */
  private applyFilters(items: ITaskLibraryItem[], filters: ITaskLibraryFilters): ITaskLibraryItem[] {
    return items.filter(item => {
      if (filters.classification?.length && !filters.classification.includes(item.Classification)) {
        return false;
      }

      if (filters.processType) {
        if (!item.ProcessTypes.includes(filters.processType) && !item.ProcessTypes.includes(TaskProcessType.All)) {
          return false;
        }
      }

      if (filters.department && item.Departments?.length) {
        if (!item.Departments.includes(filters.department)) {
          return false;
        }
      }

      if (filters.jobTitle && item.JobTitles?.length) {
        if (!item.JobTitles.includes(filters.jobTitle)) {
          return false;
        }
      }

      if (filters.isActive !== undefined && item.IsActive !== filters.isActive) {
        return false;
      }

      if (filters.isMandatory !== undefined && item.IsMandatory !== filters.isMandatory) {
        return false;
      }

      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        if (!item.Title.toLowerCase().includes(search) &&
            !item.TaskCode.toLowerCase().includes(search) &&
            !(item.Description?.toLowerCase().includes(search))) {
          return false;
        }
      }

      if (filters.tags?.length) {
        if (!item.Tags?.some(t => filters.tags!.includes(t))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Map SharePoint item to ITaskLibraryItem
   */
  private mapFromSP(item: any): ITaskLibraryItem {
    return {
      Id: item.Id,
      TaskCode: item.TaskCode || '',
      Classification: item.Classification || TaskClassification.DOC,
      SequenceNumber: item.SequenceNumber || 0,
      Title: item.Title || '',
      Description: item.Description,
      Instructions: item.Instructions,
      ProcessTypes: (this.parseJsonArray(item.ProcessTypes) as TaskProcessType[]) || [TaskProcessType.Onboarding],
      Departments: this.parseJsonArray(item.Departments),
      JobTitles: this.parseJsonArray(item.JobTitles),
      DefaultAssignmentType: item.DefaultAssignmentType || TaskAssignmentType.Role,
      DefaultAssigneeRole: item.DefaultAssigneeRole,
      DefaultAssigneeId: item.DefaultAssigneeId,
      DefaultAssigneeName: item.DefaultAssigneeName,
      DefaultOffsetType: item.DefaultOffsetType || 'on-start',
      DefaultDaysOffset: item.DefaultDaysOffset || 0,
      EstimatedHours: item.EstimatedHours,
      DefaultPriority: item.DefaultPriority || 'Medium',
      RequiresApproval: item.RequiresApproval || false,
      DefaultApproverId: item.DefaultApproverId,
      DefaultApproverName: item.DefaultApproverName,
      DefaultApproverRole: item.DefaultApproverRole,
      SendEmailNotification: item.SendEmailNotification ?? true,
      SendTeamsNotification: item.SendTeamsNotification ?? false,
      SendReminder: item.SendReminder ?? true,
      ReminderDaysBefore: item.ReminderDaysBefore || 1,
      NotifyOnComplete: item.NotifyOnComplete ?? true,
      DependsOnTaskCodes: this.parseJsonArray(item.DependsOnTaskCodes),
      BlockedByTaskCodes: this.parseJsonArray(item.BlockedByTaskCodes),
      IsActive: item.IsActive ?? true,
      IsMandatory: item.IsMandatory ?? false,
      SortOrder: item.SortOrder || 0,
      Tags: this.parseJsonArray(item.Tags),
      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
      CreatedById: item.Author?.Id,
      ModifiedById: item.Editor?.Id,
    };
  }

  /**
   * Parse JSON array from SharePoint field
   */
  private parseJsonArray(value: string | null | undefined): string[] | undefined {
    if (!value) return undefined;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get classification info
   */
  public getClassificationInfo(classification: TaskClassification) {
    return TASK_CLASSIFICATION_INFO[classification];
  }

  /**
   * Get all classification options for dropdown
   */
  public getClassificationOptions(): Array<{ key: TaskClassification; text: string; data: any }> {
    return Object.values(TaskClassification).map(c => ({
      key: c,
      text: `${c} - ${TASK_CLASSIFICATION_INFO[c].label}`,
      data: TASK_CLASSIFICATION_INFO[c],
    }));
  }
}
