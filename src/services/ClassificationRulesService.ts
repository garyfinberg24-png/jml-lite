// Classification Rules Service - JML Lite
// CRUD operations and rule resolution for classification-based routing

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { JML_LISTS } from '../constants/SharePointListNames';
import { TaskClassification, TaskProcessType } from '../models/ITaskLibrary';
import {
  IClassificationRule,
  IClassificationRuleInput,
  IClassificationRuleFilters,
  IResolvedRouting,
  DEFAULT_CLASSIFICATION_RULES,
} from '../models/IClassificationRules';

export class ClassificationRulesService {
  private sp: SPFI;
  private listName = JML_LISTS.CLASSIFICATION_RULES;

  constructor(sp: SPFI) {
    this.sp = sp;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get all classification rules with optional filtering
   */
  async getClassificationRules(filters?: IClassificationRuleFilters): Promise<IClassificationRule[]> {
    try {
      let query = this.sp.web.lists.getByTitle(this.listName).items
        .select('*')
        .orderBy('SortOrder', true);

      const items = await query();
      let rules = items.map(item => this.mapToRule(item));

      // Apply filters
      if (filters) {
        if (filters.classification) {
          rules = rules.filter(r => r.Classification === filters.classification);
        }
        if (filters.processType) {
          rules = rules.filter(r =>
            !r.ProcessTypes || r.ProcessTypes.length === 0 ||
            r.ProcessTypes.includes(filters.processType!)
          );
        }
        if (filters.department) {
          rules = rules.filter(r =>
            !r.Departments || r.Departments.length === 0 ||
            r.Departments.includes(filters.department!)
          );
        }
        if (filters.isActive !== undefined) {
          rules = rules.filter(r => r.IsActive === filters.isActive);
        }
        if (filters.requiresApproval !== undefined) {
          rules = rules.filter(r => r.RequiresApproval === filters.requiresApproval);
        }
      }

      return rules;
    } catch (error) {
      console.error('[ClassificationRulesService] Error getting rules:', error);
      return [];
    }
  }

  /**
   * Get a single rule by ID
   */
  async getRuleById(id: number): Promise<IClassificationRule | null> {
    try {
      const item = await this.sp.web.lists.getByTitle(this.listName).items
        .getById(id)
        .select('*')();
      return this.mapToRule(item);
    } catch (error) {
      console.error('[ClassificationRulesService] Error getting rule:', error);
      return null;
    }
  }

  /**
   * Get rule for a specific classification
   */
  async getRuleByClassification(
    classification: TaskClassification,
    processType?: TaskProcessType,
    department?: string
  ): Promise<IClassificationRule | null> {
    try {
      const rules = await this.getClassificationRules({
        classification,
        processType,
        department,
        isActive: true,
      });

      // Return the most specific matching rule
      // Priority: department-specific > process-specific > general
      if (rules.length === 0) return null;

      // Sort by specificity (more specific first)
      rules.sort((a, b) => {
        const aSpecificity =
          (a.Departments?.length ? 2 : 0) +
          (a.ProcessTypes?.length ? 1 : 0);
        const bSpecificity =
          (b.Departments?.length ? 2 : 0) +
          (b.ProcessTypes?.length ? 1 : 0);
        return bSpecificity - aSpecificity;
      });

      return rules[0];
    } catch (error) {
      console.error('[ClassificationRulesService] Error getting rule by classification:', error);
      return null;
    }
  }

  /**
   * Create a new classification rule
   */
  async createRule(input: IClassificationRuleInput): Promise<IClassificationRule | null> {
    try {
      // Get next sort order if not provided
      if (!input.SortOrder) {
        const rules = await this.getClassificationRules();
        input.SortOrder = Math.max(...rules.map(r => r.SortOrder || 0), 0) + 1;
      }

      const itemData = this.mapToSharePointItem(input);
      const result = await this.sp.web.lists.getByTitle(this.listName).items.add(itemData);

      return this.mapToRule(result.data);
    } catch (error) {
      console.error('[ClassificationRulesService] Error creating rule:', error);
      throw error;
    }
  }

  /**
   * Update an existing rule
   */
  async updateRule(id: number, input: Partial<IClassificationRuleInput>): Promise<void> {
    try {
      const itemData = this.mapToSharePointItem(input);
      await this.sp.web.lists.getByTitle(this.listName).items.getById(id).update(itemData);
    } catch (error) {
      console.error('[ClassificationRulesService] Error updating rule:', error);
      throw error;
    }
  }

  /**
   * Delete a rule
   */
  async deleteRule(id: number): Promise<void> {
    try {
      await this.sp.web.lists.getByTitle(this.listName).items.getById(id).delete();
    } catch (error) {
      console.error('[ClassificationRulesService] Error deleting rule:', error);
      throw error;
    }
  }

  /**
   * Toggle rule active status
   */
  async toggleRuleActive(id: number, isActive: boolean): Promise<void> {
    await this.updateRule(id, { IsActive: isActive });
  }

  // ═══════════════════════════════════════════════════════════════════
  // RULE RESOLUTION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Resolve routing for a task based on its classification
   * This is the main method used by the wizard to auto-assign tasks
   */
  async resolveRouting(
    classification: TaskClassification,
    processType?: TaskProcessType,
    department?: string,
    managerId?: number,
    managerName?: string,
    managerEmail?: string
  ): Promise<IResolvedRouting> {
    // Get the applicable rule
    const rule = await this.getRuleByClassification(classification, processType, department);

    // If no rule found, return defaults
    if (!rule) {
      return this.getDefaultRouting(classification);
    }

    // Build resolved routing
    const routing: IResolvedRouting = {
      assigneeType: rule.DefaultAssigneeType,
      requiresApproval: rule.RequiresApproval,
      offsetType: rule.DefaultOffsetType,
      daysOffset: rule.DefaultDaysOffset,
      priority: rule.DefaultPriority,
      sendEmailNotification: rule.SendEmailNotification,
      sendTeamsNotification: rule.SendTeamsNotification,
      ruleId: rule.Id,
      classification,
    };

    // Resolve assignee
    switch (rule.DefaultAssigneeType) {
      case 'Role':
        routing.assigneeRole = rule.DefaultAssigneeRole;
        break;
      case 'Specific':
        routing.assigneeId = rule.DefaultAssigneeId;
        routing.assigneeName = rule.DefaultAssigneeName;
        routing.assigneeEmail = rule.DefaultAssigneeEmail;
        break;
      case 'Manager':
        routing.assigneeId = managerId;
        routing.assigneeName = managerName;
        routing.assigneeEmail = managerEmail;
        break;
      case 'Employee':
        // Will be resolved at task level
        break;
    }

    // Resolve approver if approval required
    if (rule.RequiresApproval && rule.ApproverType) {
      routing.approverType = rule.ApproverType;
      switch (rule.ApproverType) {
        case 'Role':
          routing.approverRole = rule.ApproverRole;
          break;
        case 'Specific':
          routing.approverId = rule.ApproverId;
          routing.approverName = rule.ApproverName;
          routing.approverEmail = rule.ApproverEmail;
          break;
        case 'Manager':
          routing.approverId = managerId;
          routing.approverName = managerName;
          routing.approverEmail = managerEmail;
          break;
        case 'Skip-Level':
          // Would need to resolve skip-level manager
          break;
      }
    }

    return routing;
  }

  /**
   * Resolve routing for multiple classifications at once (batch)
   */
  async resolveRoutingBatch(
    classifications: TaskClassification[],
    processType?: TaskProcessType,
    department?: string,
    managerId?: number,
    managerName?: string,
    managerEmail?: string
  ): Promise<Map<TaskClassification, IResolvedRouting>> {
    const results = new Map<TaskClassification, IResolvedRouting>();

    // Get all rules at once
    const rules = await this.getClassificationRules({
      isActive: true,
      processType,
      department,
    });

    // Build a map for quick lookup
    const ruleMap = new Map<TaskClassification, IClassificationRule>();
    for (const rule of rules) {
      // Only keep the most specific rule for each classification
      if (!ruleMap.has(rule.Classification) ||
        this.getRuleSpecificity(rule) > this.getRuleSpecificity(ruleMap.get(rule.Classification)!)) {
        ruleMap.set(rule.Classification, rule);
      }
    }

    // Resolve each classification
    for (const classification of classifications) {
      const rule = ruleMap.get(classification);
      if (rule) {
        results.set(classification, this.buildRoutingFromRule(
          rule, classification, managerId, managerName, managerEmail
        ));
      } else {
        results.set(classification, this.getDefaultRouting(classification));
      }
    }

    return results;
  }

  /**
   * Get default routing when no rule is defined
   */
  private getDefaultRouting(classification: TaskClassification): IResolvedRouting {
    // Default mappings
    const defaults: Record<TaskClassification, Partial<IResolvedRouting>> = {
      [TaskClassification.DOC]: { assigneeRole: 'HR Team', offsetType: 'before-start', daysOffset: 5, priority: 'High' },
      [TaskClassification.SYS]: { assigneeRole: 'IT Team', requiresApproval: true, approverRole: 'IT Lead', offsetType: 'before-start', daysOffset: 3, priority: 'High' },
      [TaskClassification.HRD]: { assigneeRole: 'IT Team', requiresApproval: true, approverRole: 'IT Admin', offsetType: 'before-start', daysOffset: 5, priority: 'Medium' },
      [TaskClassification.TRN]: { assigneeRole: 'Training', offsetType: 'after-start', daysOffset: 7, priority: 'Medium' },
      [TaskClassification.ORI]: { assigneeType: 'Manager', offsetType: 'on-start', daysOffset: 0, priority: 'High' },
      [TaskClassification.CMP]: { assigneeRole: 'HR Team', requiresApproval: true, approverRole: 'HR Manager', offsetType: 'before-start', daysOffset: 3, priority: 'High' },
      [TaskClassification.FAC]: { assigneeRole: 'Facilities', offsetType: 'before-start', daysOffset: 2, priority: 'Medium' },
      [TaskClassification.SEC]: { assigneeRole: 'Security', requiresApproval: true, approverRole: 'Security Manager', offsetType: 'before-start', daysOffset: 1, priority: 'High' },
      [TaskClassification.FIN]: { assigneeRole: 'Finance', requiresApproval: true, approverRole: 'Finance Manager', offsetType: 'before-start', daysOffset: 5, priority: 'High' },
      [TaskClassification.COM]: { assigneeRole: 'IT Team', offsetType: 'before-start', daysOffset: 2, priority: 'Medium' },
    };

    const defaultForClassification = defaults[classification] || {};

    return {
      assigneeType: defaultForClassification.assigneeType || 'Role',
      assigneeRole: defaultForClassification.assigneeRole,
      requiresApproval: defaultForClassification.requiresApproval || false,
      approverType: defaultForClassification.requiresApproval ? 'Role' : undefined,
      approverRole: defaultForClassification.approverRole,
      offsetType: defaultForClassification.offsetType || 'on-start',
      daysOffset: defaultForClassification.daysOffset || 0,
      priority: defaultForClassification.priority || 'Medium',
      sendEmailNotification: true,
      sendTeamsNotification: false,
      classification,
    };
  }

  /**
   * Build routing from a rule
   */
  private buildRoutingFromRule(
    rule: IClassificationRule,
    classification: TaskClassification,
    managerId?: number,
    managerName?: string,
    managerEmail?: string
  ): IResolvedRouting {
    const routing: IResolvedRouting = {
      assigneeType: rule.DefaultAssigneeType,
      requiresApproval: rule.RequiresApproval,
      offsetType: rule.DefaultOffsetType,
      daysOffset: rule.DefaultDaysOffset,
      priority: rule.DefaultPriority,
      sendEmailNotification: rule.SendEmailNotification,
      sendTeamsNotification: rule.SendTeamsNotification,
      ruleId: rule.Id,
      classification,
    };

    // Resolve assignee based on type
    if (rule.DefaultAssigneeType === 'Role') {
      routing.assigneeRole = rule.DefaultAssigneeRole;
    } else if (rule.DefaultAssigneeType === 'Specific') {
      routing.assigneeId = rule.DefaultAssigneeId;
      routing.assigneeName = rule.DefaultAssigneeName;
      routing.assigneeEmail = rule.DefaultAssigneeEmail;
    } else if (rule.DefaultAssigneeType === 'Manager') {
      routing.assigneeId = managerId;
      routing.assigneeName = managerName;
      routing.assigneeEmail = managerEmail;
    }

    // Resolve approver
    if (rule.RequiresApproval && rule.ApproverType) {
      routing.approverType = rule.ApproverType;
      if (rule.ApproverType === 'Role') {
        routing.approverRole = rule.ApproverRole;
      } else if (rule.ApproverType === 'Specific') {
        routing.approverId = rule.ApproverId;
        routing.approverName = rule.ApproverName;
        routing.approverEmail = rule.ApproverEmail;
      } else if (rule.ApproverType === 'Manager') {
        routing.approverId = managerId;
        routing.approverName = managerName;
        routing.approverEmail = managerEmail;
      }
    }

    return routing;
  }

  /**
   * Calculate rule specificity for sorting
   */
  private getRuleSpecificity(rule: IClassificationRule): number {
    return (rule.Departments?.length ? 2 : 0) + (rule.ProcessTypes?.length ? 1 : 0);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SEEDING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Seed default classification rules
   */
  async seedDefaultRules(): Promise<{ created: number; skipped: number }> {
    const existingRules = await this.getClassificationRules();
    const existingClassifications = new Set(existingRules.map(r => r.Classification));

    let created = 0;
    let skipped = 0;

    for (const defaultRule of DEFAULT_CLASSIFICATION_RULES) {
      if (existingClassifications.has(defaultRule.Classification!)) {
        skipped++;
        continue;
      }

      try {
        await this.createRule(defaultRule as IClassificationRuleInput);
        created++;
      } catch (error) {
        console.error(`[ClassificationRulesService] Error seeding rule for ${defaultRule.Classification}:`, error);
        skipped++;
      }
    }

    return { created, skipped };
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAPPING HELPERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Map SharePoint item to IClassificationRule
   */
  private mapToRule(item: any): IClassificationRule {
    return {
      Id: item.Id,
      Classification: item.Classification || TaskClassification.DOC,
      ProcessTypes: this.parseJsonArray(item.ProcessTypes) as TaskProcessType[],
      Departments: this.parseJsonArray(item.Departments),

      DefaultAssigneeType: item.DefaultAssigneeType || 'Role',
      DefaultAssigneeRole: item.DefaultAssigneeRole,
      DefaultAssigneeId: item.DefaultAssigneeId,
      DefaultAssigneeName: item.DefaultAssigneeName,
      DefaultAssigneeEmail: item.DefaultAssigneeEmail,

      RequiresApproval: item.RequiresApproval ?? false,
      ApproverType: item.ApproverType,
      ApproverRole: item.ApproverRole,
      ApproverId: item.ApproverId,
      ApproverName: item.ApproverName,
      ApproverEmail: item.ApproverEmail,

      EscalationEnabled: item.EscalationEnabled ?? false,
      EscalationDays: item.EscalationDays,
      EscalationApproverType: item.EscalationApproverType,
      EscalationApproverRole: item.EscalationApproverRole,
      EscalationApproverId: item.EscalationApproverId,
      EscalationApproverName: item.EscalationApproverName,

      AutoApproveEnabled: item.AutoApproveEnabled ?? false,
      AutoApproveMaxCost: item.AutoApproveMaxCost,
      AutoApproveMaxDays: item.AutoApproveMaxDays,

      SendEmailNotification: item.SendEmailNotification ?? true,
      SendTeamsNotification: item.SendTeamsNotification ?? false,
      NotifyOnAssignment: item.NotifyOnAssignment ?? true,
      NotifyOnCompletion: item.NotifyOnCompletion ?? true,
      NotifyManagerOnCompletion: item.NotifyManagerOnCompletion ?? false,
      TeamsChannelWebhook: item.TeamsChannelWebhook,

      DefaultOffsetType: item.DefaultOffsetType || 'on-start',
      DefaultDaysOffset: item.DefaultDaysOffset || 0,
      DefaultPriority: item.DefaultPriority || 'Medium',

      SlaEnabled: item.SlaEnabled ?? false,
      SlaDays: item.SlaDays,
      SlaWarningDays: item.SlaWarningDays,

      Description: item.Description,
      IsActive: item.IsActive ?? true,
      SortOrder: item.SortOrder || 0,

      Created: item.Created ? new Date(item.Created) : undefined,
      Modified: item.Modified ? new Date(item.Modified) : undefined,
      CreatedById: item.AuthorId,
      ModifiedById: item.EditorId,
    };
  }

  /**
   * Map input to SharePoint item format
   */
  private mapToSharePointItem(input: Partial<IClassificationRuleInput>): any {
    const item: any = {};

    if (input.Classification !== undefined) item.Classification = input.Classification;
    if (input.ProcessTypes !== undefined) item.ProcessTypes = JSON.stringify(input.ProcessTypes);
    if (input.Departments !== undefined) item.Departments = JSON.stringify(input.Departments);

    if (input.DefaultAssigneeType !== undefined) item.DefaultAssigneeType = input.DefaultAssigneeType;
    if (input.DefaultAssigneeRole !== undefined) item.DefaultAssigneeRole = input.DefaultAssigneeRole;
    if (input.DefaultAssigneeId !== undefined) item.DefaultAssigneeId = input.DefaultAssigneeId;
    if (input.DefaultAssigneeName !== undefined) item.DefaultAssigneeName = input.DefaultAssigneeName;
    if (input.DefaultAssigneeEmail !== undefined) item.DefaultAssigneeEmail = input.DefaultAssigneeEmail;

    if (input.RequiresApproval !== undefined) item.RequiresApproval = input.RequiresApproval;
    if (input.ApproverType !== undefined) item.ApproverType = input.ApproverType;
    if (input.ApproverRole !== undefined) item.ApproverRole = input.ApproverRole;
    if (input.ApproverId !== undefined) item.ApproverId = input.ApproverId;
    if (input.ApproverName !== undefined) item.ApproverName = input.ApproverName;
    if (input.ApproverEmail !== undefined) item.ApproverEmail = input.ApproverEmail;

    if (input.EscalationEnabled !== undefined) item.EscalationEnabled = input.EscalationEnabled;
    if (input.EscalationDays !== undefined) item.EscalationDays = input.EscalationDays;
    if (input.EscalationApproverType !== undefined) item.EscalationApproverType = input.EscalationApproverType;
    if (input.EscalationApproverRole !== undefined) item.EscalationApproverRole = input.EscalationApproverRole;
    if (input.EscalationApproverId !== undefined) item.EscalationApproverId = input.EscalationApproverId;
    if (input.EscalationApproverName !== undefined) item.EscalationApproverName = input.EscalationApproverName;

    if (input.AutoApproveEnabled !== undefined) item.AutoApproveEnabled = input.AutoApproveEnabled;
    if (input.AutoApproveMaxCost !== undefined) item.AutoApproveMaxCost = input.AutoApproveMaxCost;
    if (input.AutoApproveMaxDays !== undefined) item.AutoApproveMaxDays = input.AutoApproveMaxDays;

    if (input.SendEmailNotification !== undefined) item.SendEmailNotification = input.SendEmailNotification;
    if (input.SendTeamsNotification !== undefined) item.SendTeamsNotification = input.SendTeamsNotification;
    if (input.NotifyOnAssignment !== undefined) item.NotifyOnAssignment = input.NotifyOnAssignment;
    if (input.NotifyOnCompletion !== undefined) item.NotifyOnCompletion = input.NotifyOnCompletion;
    if (input.NotifyManagerOnCompletion !== undefined) item.NotifyManagerOnCompletion = input.NotifyManagerOnCompletion;
    if (input.TeamsChannelWebhook !== undefined) item.TeamsChannelWebhook = input.TeamsChannelWebhook;

    if (input.DefaultOffsetType !== undefined) item.DefaultOffsetType = input.DefaultOffsetType;
    if (input.DefaultDaysOffset !== undefined) item.DefaultDaysOffset = input.DefaultDaysOffset;
    if (input.DefaultPriority !== undefined) item.DefaultPriority = input.DefaultPriority;

    if (input.SlaEnabled !== undefined) item.SlaEnabled = input.SlaEnabled;
    if (input.SlaDays !== undefined) item.SlaDays = input.SlaDays;
    if (input.SlaWarningDays !== undefined) item.SlaWarningDays = input.SlaWarningDays;

    if (input.Description !== undefined) item.Description = input.Description;
    if (input.IsActive !== undefined) item.IsActive = input.IsActive;
    if (input.SortOrder !== undefined) item.SortOrder = input.SortOrder;

    // Title is required for SharePoint lists
    if (input.Classification) {
      item.Title = `Rule: ${input.Classification}`;
    }

    return item;
  }

  /**
   * Parse JSON array from SharePoint Note field
   */
  private parseJsonArray(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
