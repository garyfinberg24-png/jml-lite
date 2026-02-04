import * as React from 'react';
import { useState, useEffect } from 'react';
import { SPFI } from '@pnp/sp';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Icon } from '@fluentui/react/lib/Icon';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { OnboardingService } from '../services/OnboardingService';
import { OnboardingConfigService } from '../services/OnboardingConfigService';
import { TaskLibraryService } from '../services/TaskLibraryService';
import { ClassificationRulesService } from '../services/ClassificationRulesService';
import { IOnboardingWizardData, OnboardingStatus, OnboardingTaskStatus } from '../models/IOnboarding';
import { IDocumentType, IAssetType, ISystemAccessType, ITrainingCourse, IPolicyPack, IDepartment } from '../models/IOnboardingConfig';
import { ITaskLibraryItem, TaskProcessType, TaskClassification, TASK_CLASSIFICATION_INFO } from '../models/ITaskLibrary';
import { IClassificationRule } from '../models/IClassificationRules';
import { TaskConfigurationPanel, IConfigurableTask } from './TaskConfigurationPanel';
import styles from '../styles/JmlPanelStyles.module.scss';
import '../styles/FieldBorders.module.scss';

interface IProps {
  sp: SPFI;
  context?: WebPartContext;
  isOpen: boolean;
  onDismiss: () => void;
  onCompleted: () => void;
}

interface IEligibleCandidate { Id: number; Name: string; Email: string; Status: string; JobRequisitionId?: number }

interface IConfigData {
  documentTypes: IDocumentType[];
  assetTypes: IAssetType[];
  systemAccessTypes: ISystemAccessType[];
  trainingCourses: ITrainingCourse[];
  policyPacks: IPolicyPack[];
  departments: IDepartment[];
  taskLibrary: ITaskLibraryItem[];
  classificationRules: IClassificationRule[];
}

interface ISelectedDoc { id: number; name: string; required: boolean; received: boolean }
interface ISelectedSystem { id: number; name: string; role: string; requested: boolean }
interface ISelectedAsset { id: number; name: string; quantity: number; requested: boolean }
interface ISelectedTraining { id: number; name: string; mandatory: boolean; scheduled: boolean }

const STEPS = [
  { label: 'Candidate', icon: 'Contact' },
  { label: 'Details', icon: 'EditContact' },
  { label: 'Policy Pack', icon: 'Package' },
  { label: 'Documents', icon: 'DocumentSet' },
  { label: 'Systems', icon: 'Permissions' },
  { label: 'Equipment', icon: 'Devices3' },
  { label: 'Training', icon: 'Education' },
  { label: 'Configure', icon: 'TaskManager' },
  { label: 'Review', icon: 'CheckList' },
];

export const OnboardingWizard: React.FC<IProps> = ({ sp, context, isOpen, onDismiss, onCompleted }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<IOnboardingWizardData>({
    documents: [], systemAccess: [], equipment: [], training: []
  });
  const [candidates, setCandidates] = useState<IEligibleCandidate[]>([]);
  const [configData, setConfigData] = useState<IConfigData | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [selectedPolicyPackId, setSelectedPolicyPackId] = useState<number | null>(null);

  // Selected items for each category
  const [selectedDocs, setSelectedDocs] = useState<ISelectedDoc[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<ISelectedSystem[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<ISelectedAsset[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<ISelectedTraining[]>([]);

  // Task configuration state
  const [showTaskConfig, setShowTaskConfig] = useState(false);
  const [configuredTasks, setConfiguredTasks] = useState<IConfigurableTask[]>([]);
  const [tasksConfirmed, setTasksConfirmed] = useState(false); // True after user confirms in TaskConfigurationPanel

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setWizardData({ documents: [], systemAccess: [], equipment: [], training: [] });
      setError('');
      setSubmitting(false);
      setSubmitted(false);
      setSelectedPolicyPackId(null);
      setSelectedDocs([]);
      setSelectedSystems([]);
      setSelectedAssets([]);
      setSelectedTraining([]);
      setShowTaskConfig(false);
      setConfiguredTasks([]);
      setTasksConfirmed(false);
      loadData();
    }
  }, [isOpen, sp]);

  const loadData = async (): Promise<void> => {
    setLoadingConfig(true);
    try {
      const svc = new OnboardingService(sp);
      const configSvc = new OnboardingConfigService(sp);
      const taskLibrarySvc = new TaskLibraryService(sp);
      const classRulesSvc = new ClassificationRulesService(sp);

      const [cands, docs, assets, systems, courses, packs, depts, taskLib, classRules] = await Promise.all([
        svc.getEligibleCandidates(),
        configSvc.getDocumentTypes({ isActive: true }),
        configSvc.getAssetTypes({ isActive: true }),
        configSvc.getSystemAccessTypes({ isActive: true }),
        configSvc.getTrainingCourses({ isActive: true }),
        configSvc.getPolicyPacks({ isActive: true }),
        configSvc.getDepartments({ isActive: true }),
        taskLibrarySvc.getTaskLibraryItems({ isActive: true, processType: TaskProcessType.Onboarding }),
        classRulesSvc.getClassificationRules({ isActive: true }),
      ]);

      setCandidates(cands);
      setConfigData({
        documentTypes: docs,
        assetTypes: assets,
        systemAccessTypes: systems,
        trainingCourses: courses,
        policyPacks: packs,
        departments: depts,
        taskLibrary: taskLib,
        classificationRules: classRules,
      });

      // Initialize with default selections
      setSelectedDocs(docs.map(d => ({
        id: d.Id || 0, name: d.Title, required: d.IsRequired, received: false
      })));
      setSelectedSystems(systems.map(s => ({
        id: s.Id || 0, name: s.Title, role: s.DefaultRole || 'Standard', requested: true
      })));
      setSelectedAssets(assets.filter(a => a.Category === 'Hardware').slice(0, 3).map(a => ({
        id: a.Id || 0, name: a.Title, quantity: a.DefaultQuantity || 1, requested: true
      })));
      setSelectedTraining(courses.map(t => ({
        id: t.Id || 0, name: t.Title, mandatory: t.IsMandatory, scheduled: false
      })));
    } catch (err) {
      console.error('[OnboardingWizard] Error loading config:', err);
    }
    setLoadingConfig(false);
  };

  const applyPolicyPack = (packId: number): void => {
    if (!configData) return;
    const pack = configData.policyPacks.find(p => p.Id === packId);
    if (!pack) return;

    setSelectedPolicyPackId(packId);

    // Apply document selections from policy pack
    setSelectedDocs(configData.documentTypes.map(d => ({
      id: d.Id || 0,
      name: d.Title,
      required: pack.DocumentTypeIds.includes(d.Id || 0) ? true : d.IsRequired,
      received: false
    })));

    // Apply system selections
    setSelectedSystems(configData.systemAccessTypes.map(s => ({
      id: s.Id || 0,
      name: s.Title,
      role: s.DefaultRole || 'Standard',
      requested: pack.SystemAccessTypeIds.includes(s.Id || 0)
    })));

    // Apply asset selections
    setSelectedAssets(configData.assetTypes.filter(a =>
      pack.AssetTypeIds.includes(a.Id || 0)
    ).map(a => ({
      id: a.Id || 0,
      name: a.Title,
      quantity: a.DefaultQuantity || 1,
      requested: true
    })));

    // Apply training selections
    setSelectedTraining(configData.trainingCourses.map(t => ({
      id: t.Id || 0,
      name: t.Title,
      mandatory: pack.TrainingCourseIds.includes(t.Id || 0) ? true : t.IsMandatory,
      scheduled: false
    })));
  };

  const updateField = (field: keyof IOnboardingWizardData, value: any): void => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  };

  // Map task library classification to configurable task category
  const classificationToCategory = (classification: string): IConfigurableTask['category'] => {
    const map: Record<string, IConfigurableTask['category']> = {
      'DOC': 'Documentation',
      'SYS': 'System Access',
      'HRD': 'Equipment',
      'TRN': 'Training',
      'ORI': 'Orientation',
      'CMP': 'Compliance',
      'FAC': 'General',
      'SEC': 'General',
      'FIN': 'General',
      'COM': 'General',
    };
    return map[classification] || 'General';
  };

  // Find matching task library item by classification and title keywords
  const findMatchingTaskLibraryItem = (
    category: string,
    titleKeywords: string[]
  ): ITaskLibraryItem | undefined => {
    if (!configData?.taskLibrary) return undefined;

    // Map category to classification
    const classificationMap: Record<string, string[]> = {
      'Documentation': ['DOC'],
      'System Access': ['SYS', 'COM'],
      'Equipment': ['HRD'],
      'Training': ['TRN'],
      'Orientation': ['ORI'],
      'Compliance': ['CMP'],
      'General': ['FAC', 'SEC', 'FIN'],
    };

    const targetClassifications = classificationMap[category] || [];

    // Find a matching task from the library
    return configData.taskLibrary.find(task => {
      if (!targetClassifications.includes(task.Classification)) return false;

      // Check if any keyword matches the task title
      const titleLower = task.Title.toLowerCase();
      return titleKeywords.some(kw => titleLower.includes(kw.toLowerCase()));
    });
  };

  // Get classification rule for a specific classification
  const getClassificationRule = (classification: TaskClassification): IClassificationRule | undefined => {
    if (!configData?.classificationRules) return undefined;
    return configData.classificationRules.find(r => r.Classification === classification && r.IsActive);
  };

  // Apply classification rule to task configuration
  const applyClassificationRule = (
    classification: TaskClassification,
    defaults: Partial<IConfigurableTask>
  ): Partial<IConfigurableTask> => {
    const rule = getClassificationRule(classification);
    if (!rule) return defaults;

    return {
      ...defaults,
      // Assignment from rule
      assignmentType: rule.DefaultAssigneeType === 'Role' ? 'role' :
        rule.DefaultAssigneeType === 'Manager' ? 'manager' :
          rule.DefaultAssigneeType === 'Specific' ? 'specific' : 'auto',
      roleAssignment: rule.DefaultAssigneeRole || defaults.roleAssignment,
      assigneeId: rule.DefaultAssigneeId,
      assigneeName: rule.DefaultAssigneeName,
      // Approval from rule
      requiresApproval: rule.RequiresApproval,
      approverRole: rule.ApproverRole,
      approverId: rule.ApproverId,
      approverName: rule.ApproverName,
      // Timing from rule
      daysOffset: rule.DefaultDaysOffset ?? defaults.daysOffset,
      offsetType: rule.DefaultOffsetType || defaults.offsetType,
      priority: rule.DefaultPriority || defaults.priority,
      // Notifications from rule
      sendReminder: rule.SendEmailNotification ?? defaults.sendReminder,
      notifyOnComplete: rule.NotifyOnCompletion ?? defaults.notifyOnComplete,
      notifyAssigneeEmail: rule.SendEmailNotification ?? defaults.notifyAssigneeEmail,
      notifyTeamsChat: rule.SendTeamsNotification ?? defaults.notifyTeamsChat,
    };
  };

  // Build configurable tasks from selections, enhanced with task library defaults and classification rules
  const buildConfigurableTasks = (): IConfigurableTask[] => {
    const tasks: IConfigurableTask[] = [];
    const taskLibrary = configData?.taskLibrary || [];

    // Document tasks - enhanced with task library and classification rules
    selectedDocs.filter(d => d.required).forEach((doc) => {
      // Try to find a matching task library item
      const libraryItem = findMatchingTaskLibraryItem('Documentation', [doc.name, 'document', 'collect']);

      // Base task configuration from library or defaults
      const baseTask: Partial<IConfigurableTask> = {
        id: `doc-${doc.id}`,
        taskCode: libraryItem?.TaskCode,
        title: `Collect: ${doc.name}`,
        category: 'Documentation',
        sourceType: 'document',
        sourceId: doc.id,
        assignmentType: (libraryItem?.DefaultAssignmentType as any) || 'role',
        roleAssignment: libraryItem?.DefaultAssigneeRole || 'HR Team',
        daysOffset: libraryItem?.DefaultDaysOffset ?? 0,
        offsetType: (libraryItem?.DefaultOffsetType as any) || 'before-start',
        priority: (libraryItem?.DefaultPriority as any) || 'High',
        requiresApproval: libraryItem?.RequiresApproval ?? false,
        sendReminder: libraryItem?.SendReminder ?? true,
        reminderDaysBefore: libraryItem?.ReminderDaysBefore ?? 2,
        notifyOnComplete: libraryItem?.NotifyOnComplete ?? true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: false,
        estimatedHours: libraryItem?.EstimatedHours,
        instructions: libraryItem?.Instructions,
        isSelected: true,
        isConfigured: !!libraryItem,
      };

      // Apply classification rule for DOC tasks (auto-routing)
      const configuredTask = applyClassificationRule(TaskClassification.DOC, baseTask);
      tasks.push(configuredTask as IConfigurableTask);
    });

    // System access tasks - enhanced with task library and classification rules
    selectedSystems.filter(s => s.requested).forEach((sys) => {
      const libraryItem = findMatchingTaskLibraryItem('System Access', [sys.name, 'system', 'access', 'setup']);

      const baseTask: Partial<IConfigurableTask> = {
        id: `sys-${sys.id}`,
        taskCode: libraryItem?.TaskCode,
        title: `Set up ${sys.name} (${sys.role})`,
        category: 'System Access',
        sourceType: 'system',
        sourceId: sys.id,
        assignmentType: (libraryItem?.DefaultAssignmentType as any) || 'role',
        roleAssignment: libraryItem?.DefaultAssigneeRole || 'IT Team',
        daysOffset: libraryItem?.DefaultDaysOffset ?? 1,
        offsetType: (libraryItem?.DefaultOffsetType as any) || 'before-start',
        priority: (libraryItem?.DefaultPriority as any) || 'High',
        requiresApproval: libraryItem?.RequiresApproval ?? true,
        sendReminder: libraryItem?.SendReminder ?? true,
        reminderDaysBefore: libraryItem?.ReminderDaysBefore ?? 1,
        notifyOnComplete: libraryItem?.NotifyOnComplete ?? true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: true,
        estimatedHours: libraryItem?.EstimatedHours,
        instructions: libraryItem?.Instructions,
        isSelected: true,
        isConfigured: !!libraryItem,
      };

      // Apply classification rule for SYS tasks (auto-routing with IT Admin approval)
      const configuredTask = applyClassificationRule(TaskClassification.SYS, baseTask);
      tasks.push(configuredTask as IConfigurableTask);
    });

    // Equipment tasks - enhanced with task library and classification rules (HRD classification)
    selectedAssets.filter(e => e.requested).forEach((asset) => {
      const libraryItem = findMatchingTaskLibraryItem('Equipment', [asset.name, 'hardware', 'provision', 'equipment']);

      const baseTask: Partial<IConfigurableTask> = {
        id: `asset-${asset.id}`,
        taskCode: libraryItem?.TaskCode,
        title: `Provision ${asset.name}${asset.quantity > 1 ? ` x${asset.quantity}` : ''}`,
        category: 'Equipment',
        sourceType: 'asset',
        sourceId: asset.id,
        assignmentType: (libraryItem?.DefaultAssignmentType as any) || 'role',
        roleAssignment: libraryItem?.DefaultAssigneeRole || 'IT Team',
        daysOffset: libraryItem?.DefaultDaysOffset ?? 3,
        offsetType: (libraryItem?.DefaultOffsetType as any) || 'before-start',
        priority: (libraryItem?.DefaultPriority as any) || 'Medium',
        requiresApproval: libraryItem?.RequiresApproval ?? false,
        sendReminder: libraryItem?.SendReminder ?? true,
        reminderDaysBefore: libraryItem?.ReminderDaysBefore ?? 2,
        notifyOnComplete: libraryItem?.NotifyOnComplete ?? true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: false,
        estimatedHours: libraryItem?.EstimatedHours,
        instructions: libraryItem?.Instructions,
        isSelected: true,
        isConfigured: !!libraryItem,
      };

      // Apply classification rule for HRD tasks (Hardware/Equipment with IT Admin approval)
      const configuredTask = applyClassificationRule(TaskClassification.HRD, baseTask);
      tasks.push(configuredTask as IConfigurableTask);
    });

    // Training tasks - enhanced with task library and classification rules
    selectedTraining.filter(t => t.mandatory).forEach((tr) => {
      const libraryItem = findMatchingTaskLibraryItem('Training', [tr.name, 'training', 'course']);

      const baseTask: Partial<IConfigurableTask> = {
        id: `train-${tr.id}`,
        taskCode: libraryItem?.TaskCode,
        title: tr.name,
        category: 'Training',
        sourceType: 'training',
        sourceId: tr.id,
        assignmentType: (libraryItem?.DefaultAssignmentType as any) || 'role',
        roleAssignment: libraryItem?.DefaultAssigneeRole || 'Training',
        daysOffset: libraryItem?.DefaultDaysOffset ?? 5,
        offsetType: (libraryItem?.DefaultOffsetType as any) || 'after-start',
        priority: (libraryItem?.DefaultPriority as any) || 'Medium',
        requiresApproval: libraryItem?.RequiresApproval ?? false,
        sendReminder: libraryItem?.SendReminder ?? true,
        reminderDaysBefore: libraryItem?.ReminderDaysBefore ?? 1,
        notifyOnComplete: libraryItem?.NotifyOnComplete ?? true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: false,
        estimatedHours: libraryItem?.EstimatedHours,
        instructions: libraryItem?.Instructions,
        isSelected: true,
        isConfigured: !!libraryItem,
      };

      // Apply classification rule for TRN tasks (Training)
      const configuredTask = applyClassificationRule(TaskClassification.TRN, baseTask);
      tasks.push(configuredTask as IConfigurableTask);
    });

    // Add additional predefined tasks from task library that aren't covered by selections
    // These are tasks that should always be included (e.g., orientation, compliance tasks)
    const additionalTasks = taskLibrary.filter(t => {
      // Include orientation, compliance, security, finance, and facility tasks
      const alwaysIncludeClassifications = ['ORI', 'CMP', 'SEC', 'FIN', 'FAC'];
      return alwaysIncludeClassifications.includes(t.Classification);
    });

    additionalTasks.forEach((libTask) => {
      // Check if this task isn't already added
      const alreadyExists = tasks.some(t => t.taskCode === libTask.TaskCode);
      if (alreadyExists) return;

      const category = classificationToCategory(libTask.Classification as string);
      const classificationInfo = TASK_CLASSIFICATION_INFO[libTask.Classification as TaskClassification];
      const classificationLabel = classificationInfo?.label || libTask.Classification;

      const baseTask: Partial<IConfigurableTask> = {
        id: `lib-${libTask.Id}`,
        taskCode: libTask.TaskCode,
        title: libTask.Title,
        category: category,
        sourceType: 'custom',
        assignmentType: (libTask.DefaultAssignmentType as any) || 'role',
        roleAssignment: libTask.DefaultAssigneeRole || classificationLabel,
        daysOffset: libTask.DefaultDaysOffset ?? 0,
        offsetType: (libTask.DefaultOffsetType as any) || 'on-start',
        priority: (libTask.DefaultPriority as any) || 'Medium',
        requiresApproval: libTask.RequiresApproval ?? false,
        sendReminder: libTask.SendReminder ?? true,
        reminderDaysBefore: libTask.ReminderDaysBefore ?? 1,
        notifyOnComplete: libTask.NotifyOnComplete ?? true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: false,
        estimatedHours: libTask.EstimatedHours,
        instructions: libTask.Instructions,
        isSelected: true,
        isConfigured: true, // Pre-configured from library
      };

      // Apply classification rule based on the task's classification
      const configuredTask = applyClassificationRule(
        libTask.Classification as TaskClassification,
        baseTask
      );
      tasks.push(configuredTask as IConfigurableTask);
    });

    return tasks;
  };

  const canProceed = (): boolean => {
    if (currentStep === 0) return !!wizardData.candidateId;
    if (currentStep === 1) return !!wizardData.startDate && !!wizardData.jobTitle;
    return true;
  };

  const handleNext = (): void => {
    if (!canProceed()) return;

    console.log('[OnboardingWizard] handleNext called, currentStep:', currentStep);

    // When moving to Configure step (step 7), build tasks but DON'T auto-open panel
    // Let user see the Configure step first, then click button to open panel
    if (currentStep === 6) {
      const tasks = buildConfigurableTasks();
      console.log('[OnboardingWizard] Built tasks count:', tasks.length);
      setConfiguredTasks(tasks);
      console.log('[OnboardingWizard] Moving to step 7 (Configure Tasks)');
      setCurrentStep(7); // ALWAYS move to Configure step (shows configure prompt UI)
      // Don't auto-open panel - let user click "Configure Tasks" button
    } else if (currentStep === 7) {
      // If on Configure step and tasks configured, move to Review
      console.log('[OnboardingWizard] Moving from step 7 to step 8 (Review)');
      setCurrentStep(8);
    } else {
      console.log('[OnboardingWizard] Moving to next step:', currentStep + 1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = (): void => {
    if (currentStep === 7) {
      // If going back from Configure, close the panel and go to Training
      setShowTaskConfig(false);
      setCurrentStep(6);
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleTaskConfigConfirm = (tasks: IConfigurableTask[]): void => {
    setConfiguredTasks(tasks);
    setTasksConfirmed(true); // Mark as confirmed so summary view shows
    setShowTaskConfig(false);
    setCurrentStep(8); // Move to Review step
  };

  const handleTaskConfigDismiss = (): void => {
    setShowTaskConfig(false);
    setCurrentStep(6); // Go back to Training step if dismissed
  };

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError('');
    try {
      const svc = new OnboardingService(sp);

      // Use configured tasks
      const totalTasks = configuredTasks.length;

      const onboarding = await svc.createOnboarding({
        CandidateId: wizardData.candidateId,
        CandidateName: wizardData.candidateName,
        JobTitle: wizardData.jobTitle,
        Department: wizardData.department,
        StartDate: wizardData.startDate,
        Status: OnboardingStatus.InProgress,
        CompletionPercentage: 0,
        TotalTasks: totalTasks,
        CompletedTasks: 0,
        Notes: wizardData.notes,
      });

      if (onboarding?.Id) {
        let sortOrder = 1;

        // Create tasks from configured tasks
        for (const task of configuredTasks) {
          // Calculate due date based on offset
          let dueDate: Date | undefined;
          if (wizardData.startDate) {
            dueDate = new Date(wizardData.startDate);
            switch (task.offsetType) {
              case 'before-start':
                dueDate.setDate(dueDate.getDate() - Math.abs(task.daysOffset));
                break;
              case 'on-start':
                // No change
                break;
              case 'after-start':
                dueDate.setDate(dueDate.getDate() + Math.abs(task.daysOffset));
                break;
            }
          }

          // Map 'Critical' to 'High' for IOnboardingTask compatibility
          const mappedPriority: 'Low' | 'Medium' | 'High' = task.priority === 'Critical' ? 'High' : task.priority;

          await svc.createOnboardingTask({
            Title: task.title,
            OnboardingId: onboarding.Id,
            Category: task.category as any,
            Status: OnboardingTaskStatus.Pending,
            Priority: mappedPriority,
            SortOrder: sortOrder++,
            DueDate: dueDate,
            AssignedToId: task.assigneeId,
            EstimatedHours: task.estimatedHours,
            Notes: task.instructions,
          });

          // TODO: If task.requiresApproval is true, create approval record
          // TODO: If notifications enabled, queue notification
        }

        // Recalculate progress
        await svc.recalculateProgress(onboarding.Id);
        setSubmitted(true);
      }
    } catch (err) {
      console.error('[OnboardingWizard] Error submitting:', err);
      setError('Failed to create onboarding. Please try again.');
    }
    setSubmitting(false);
  };

  const onSelectCandidate = (_: any, option?: IDropdownOption): void => {
    if (!option) return;
    const candidate = candidates.find(c => c.Id === option.key);
    if (candidate) {
      updateField('candidateId', candidate.Id);
      updateField('candidateName', candidate.Name);
    }
  };

  // Step renderers
  const renderStep0 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>Select a candidate who has been hired or accepted an offer.</p>
      <Dropdown
        label="Candidate"
        placeholder="Select a candidate..."
        selectedKey={wizardData.candidateId}
        options={candidates.map(c => ({ key: c.Id, text: `${c.Name} (${c.Email})` }))}
        onChange={onSelectCandidate}
      />
      {wizardData.candidateId && (
        <div style={{ marginTop: 16, padding: 16, background: '#f9f8ff', borderRadius: 8, border: '1px solid #e9e5f5' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#005BAA', marginBottom: 8 }}>
            <Icon iconName="Contact" style={{ marginRight: 8 }} />{wizardData.candidateName}
          </div>
          <div style={{ fontSize: 13, color: '#605e5c' }}>
            {candidates.find(c => c.Id === wizardData.candidateId)?.Email}
          </div>
        </div>
      )}
      {candidates.length === 0 && (
        <div style={{ marginTop: 16, padding: 16, background: '#fff4ce', borderRadius: 8, fontSize: 13, color: '#605e5c' }}>
          No eligible candidates found. Candidates must have status "Hired" or "Offer Accepted".
        </div>
      )}
    </div>
  );

  const renderStep1 = (): JSX.Element => (
    <div>
      <div className={styles.formGrid}>
        <TextField label="Candidate Name" value={wizardData.candidateName || ''} disabled />
        <TextField label="Job Title" value={wizardData.jobTitle || ''} required
          onChange={(_, v) => updateField('jobTitle', v)} />
        <Dropdown
          label="Department"
          placeholder="Select department..."
          selectedKey={wizardData.department || undefined}
          options={configData?.departments.map(d => ({ key: d.Title, text: d.Title })) || []}
          onChange={(_, opt) => updateField('department', opt?.key as string)}
        />
        <DatePicker label="Start Date" value={wizardData.startDate ? new Date(wizardData.startDate) : undefined}
          onSelectDate={(date) => updateField('startDate', date)} isRequired />
      </div>
      <div style={{ marginTop: 16 }}>
        <TextField label="Notes" multiline rows={3} value={wizardData.notes || ''}
          onChange={(_, v) => updateField('notes', v)} />
      </div>
    </div>
  );

  const renderStep2 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>
        Select a policy pack to pre-configure documents, systems, equipment, and training. You can customize selections in the following steps.
      </p>
      <Dropdown
        label="Policy Pack"
        placeholder="Select a policy pack (optional)..."
        selectedKey={selectedPolicyPackId || undefined}
        options={[
          { key: '', text: '-- No Policy Pack (Manual Selection) --' },
          ...(configData?.policyPacks.map(p => ({
            key: p.Id || 0,
            text: `${p.Title}${p.Department ? ` (${p.Department})` : ''}${p.IsDefault ? ' - Default' : ''}`
          })) || [])
        ]}
        onChange={(_, opt) => {
          if (opt?.key) {
            applyPolicyPack(opt.key as number);
          } else {
            setSelectedPolicyPackId(null);
          }
        }}
      />
      {selectedPolicyPackId && configData && (
        <div style={{ marginTop: 16 }}>
          {configData.policyPacks.filter(p => p.Id === selectedPolicyPackId).map(pack => (
            <div key={pack.Id} style={{ background: '#f9f8ff', borderRadius: 8, padding: 16, border: '1px solid #e9e5f5' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#005BAA', marginBottom: 8 }}>
                <Icon iconName="Package" style={{ marginRight: 8 }} />{pack.Title}
              </div>
              {pack.Description && <div style={{ fontSize: 13, color: '#605e5c', marginBottom: 12 }}>{pack.Description}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ fontSize: 12, color: '#8a8886' }}>
                  <Icon iconName="DocumentSet" style={{ marginRight: 4 }} />{pack.DocumentTypeIds.length} Documents
                </div>
                <div style={{ fontSize: 12, color: '#8a8886' }}>
                  <Icon iconName="Permissions" style={{ marginRight: 4 }} />{pack.SystemAccessTypeIds.length} Systems
                </div>
                <div style={{ fontSize: 12, color: '#8a8886' }}>
                  <Icon iconName="Devices3" style={{ marginRight: 4 }} />{pack.AssetTypeIds.length} Assets
                </div>
                <div style={{ fontSize: 12, color: '#8a8886' }}>
                  <Icon iconName="Education" style={{ marginRight: 4 }} />{pack.TrainingCourseIds.length} Training
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {(!configData?.policyPacks || configData.policyPacks.length === 0) && (
        <div style={{ marginTop: 16, padding: 16, background: '#f3f2f1', borderRadius: 8, fontSize: 13, color: '#605e5c' }}>
          No policy packs configured. You can create policy packs in the Admin Center.
        </div>
      )}
    </div>
  );

  const renderStep3 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>Configure required documents for this employee.</p>
      {selectedDocs.map((doc, i) => (
        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid #edebe9' }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{doc.name}</div>
          <Toggle label="Required" inlineLabel checked={doc.required} onChange={(_, checked) => {
            const docs = [...selectedDocs];
            docs[i] = { ...docs[i], required: !!checked };
            setSelectedDocs(docs);
          }} styles={{ root: { marginBottom: 0 } }} />
          <Toggle label="Received" inlineLabel checked={doc.received} onChange={(_, checked) => {
            const docs = [...selectedDocs];
            docs[i] = { ...docs[i], received: !!checked };
            setSelectedDocs(docs);
          }} styles={{ root: { marginBottom: 0 } }} />
        </div>
      ))}
      {selectedDocs.length === 0 && (
        <div style={{ padding: 16, background: '#f3f2f1', borderRadius: 8, fontSize: 13, color: '#605e5c' }}>
          No document types configured. Add document types in the Admin Center.
        </div>
      )}
    </div>
  );

  const renderStep4 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>Configure system access for this employee.</p>
      {selectedSystems.map((sys, i) => (
        <div key={sys.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid #edebe9' }}>
          <Toggle checked={sys.requested} onChange={(_, checked) => {
            const arr = [...selectedSystems];
            arr[i] = { ...arr[i], requested: !!checked };
            setSelectedSystems(arr);
          }} styles={{ root: { marginBottom: 0 } }} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{sys.name}</div>
          <TextField value={sys.role} style={{ width: 150 }} placeholder="Role" onChange={(_, v) => {
            const arr = [...selectedSystems];
            arr[i] = { ...arr[i], role: v || '' };
            setSelectedSystems(arr);
          }} />
        </div>
      ))}
      {selectedSystems.length === 0 && (
        <div style={{ padding: 16, background: '#f3f2f1', borderRadius: 8, fontSize: 13, color: '#605e5c' }}>
          No system access types configured. Add systems in the Admin Center.
        </div>
      )}
    </div>
  );

  const renderStep5 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>Configure equipment for this employee.</p>
      {selectedAssets.map((asset, i) => (
        <div key={asset.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid #edebe9' }}>
          <Toggle checked={asset.requested} onChange={(_, checked) => {
            const arr = [...selectedAssets];
            arr[i] = { ...arr[i], requested: !!checked };
            setSelectedAssets(arr);
          }} styles={{ root: { marginBottom: 0 } }} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{asset.name}</div>
          <TextField type="number" value={String(asset.quantity)} style={{ width: 60 }} onChange={(_, v) => {
            const arr = [...selectedAssets];
            arr[i] = { ...arr[i], quantity: parseInt(v || '1', 10) || 1 };
            setSelectedAssets(arr);
          }} />
        </div>
      ))}
      {configData && (
        <Dropdown
          placeholder="Add more equipment..."
          options={configData.assetTypes.filter(a => !selectedAssets.find(s => s.id === a.Id)).map(a => ({
            key: a.Id || 0, text: a.Title
          }))}
          onChange={(_, opt) => {
            if (opt) {
              const asset = configData.assetTypes.find(a => a.Id === opt.key);
              if (asset) {
                setSelectedAssets([...selectedAssets, {
                  id: asset.Id || 0, name: asset.Title, quantity: asset.DefaultQuantity || 1, requested: true
                }]);
              }
            }
          }}
          style={{ marginTop: 12 }}
        />
      )}
    </div>
  );

  const renderStep6 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>Configure training requirements for this employee.</p>
      {selectedTraining.map((tr, i) => (
        <div key={tr.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid #edebe9' }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{tr.name}</div>
          <Toggle label="Mandatory" inlineLabel checked={tr.mandatory} onChange={(_, checked) => {
            const arr = [...selectedTraining];
            arr[i] = { ...arr[i], mandatory: !!checked };
            setSelectedTraining(arr);
          }} styles={{ root: { marginBottom: 0 } }} />
          <Toggle label="Scheduled" inlineLabel checked={tr.scheduled} onChange={(_, checked) => {
            const arr = [...selectedTraining];
            arr[i] = { ...arr[i], scheduled: !!checked };
            setSelectedTraining(arr);
          }} styles={{ root: { marginBottom: 0 } }} />
        </div>
      ))}
      {selectedTraining.length === 0 && (
        <div style={{ padding: 16, background: '#f3f2f1', borderRadius: 8, fontSize: 13, color: '#605e5c' }}>
          No training courses configured. Add courses in the Admin Center.
        </div>
      )}
    </div>
  );

  // Step 7 - Task Configuration (handled by TaskConfigurationPanel)
  // This renders when the TaskConfigurationPanel is closed but user is on step 7
  const renderStep7 = (): JSX.Element => {
    const taskCount = configuredTasks.length || buildConfigurableTasks().length;
    const configuredCount = configuredTasks.filter(t => t.isConfigured).length;

    // If tasks have been confirmed via TaskConfigurationPanel, show summary with option to reconfigure
    if (tasksConfirmed && configuredTasks.length > 0 && !showTaskConfig) {
      return (
        <div style={{ padding: '20px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#e6ffed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Icon iconName="CheckMark" style={{ fontSize: 28, color: '#059669' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#323130', marginBottom: 4, marginTop: 0 }}>
              Tasks Configured
            </h2>
            <p style={{ fontSize: 13, color: '#605e5c', margin: 0 }}>
              {configuredCount} of {taskCount} tasks have been configured
            </p>
          </div>

          {/* Task Summary by Category */}
          <div style={{ background: '#f9f8ff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            {Object.entries(configuredTasks.reduce((acc, task) => {
              if (!acc[task.category]) acc[task.category] = [];
              acc[task.category].push(task);
              return acc;
            }, {} as Record<string, typeof configuredTasks>)).map(([category, tasks]) => (
              <div key={category} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#005BAA', marginBottom: 6 }}>{category}</div>
                {tasks.slice(0, 3).map(task => (
                  <div key={task.id} style={{ fontSize: 13, color: '#323130', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon iconName="CheckboxComposite" style={{ fontSize: 12, color: '#059669' }} />
                    <span style={{ flex: 1 }}>{task.title}</span>
                    {task.roleAssignment && <span style={{ fontSize: 11, color: '#8a8886' }}>{task.roleAssignment}</span>}
                  </div>
                ))}
                {tasks.length > 3 && (
                  <div style={{ fontSize: 12, color: '#8a8886', marginLeft: 20 }}>+{tasks.length - 3} more</div>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setShowTaskConfig(true)}
              style={{
                padding: '10px 24px', borderRadius: 8, border: '1px solid #005BAA',
                background: 'transparent', color: '#005BAA', fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Icon iconName="Edit" style={{ marginRight: 8 }} />
              Edit Task Configuration
            </button>
          </div>
        </div>
      );
    }

    // Initial view - prompt to configure tasks (or show message if no tasks)
    if (taskCount === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: '#f3f2f1',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
          }}>
            <Icon iconName="TaskManager" style={{ fontSize: 36, color: '#8a8886' }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#323130', marginBottom: 8, marginTop: 0 }}>No Tasks to Configure</h2>
          <p style={{ fontSize: 14, color: '#605e5c', marginBottom: 24 }}>
            No documents, systems, equipment, or training were selected in the previous steps.
            <br />You can go back to add selections, or proceed to review.
          </p>
          <div style={{ background: '#fff4ce', borderRadius: 8, padding: 16, textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8a6d3b', marginBottom: 8 }}>
              <Icon iconName="Info" style={{ marginRight: 8 }} />Tip
            </div>
            <div style={{ fontSize: 13, color: '#8a6d3b' }}>
              Go back to the Documents, Systems, Equipment, or Training steps to select items that will create tasks for this onboarding.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #005BAA 0%, #004A8F 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
        }}>
          <Icon iconName="TaskManager" style={{ fontSize: 36, color: '#fff' }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#323130', marginBottom: 8, marginTop: 0 }}>Configure Tasks</h2>
        <p style={{ fontSize: 14, color: '#605e5c', marginBottom: 24 }}>
          You have selected <strong>{taskCount}</strong> tasks for this onboarding.
          <br />Click below to assign, schedule, and set priorities for each task.
        </p>
        <button
          onClick={() => {
            if (configuredTasks.length === 0) {
              const tasks = buildConfigurableTasks();
              setConfiguredTasks(tasks);
            }
            setShowTaskConfig(true);
          }}
          style={{
            padding: '12px 32px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #005BAA 0%, #004A8F 100%)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}
        >
          <Icon iconName="Settings" style={{ marginRight: 8 }} />
          Configure Tasks
        </button>
      </div>
    );
  };

  // Step 8 - Review
  const renderStep8 = (): JSX.Element => {
    const summaryCard: React.CSSProperties = { background: '#f9f8ff', borderRadius: 8, padding: 16, marginBottom: 12 };
    const summaryLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 8 };
    const summaryValue: React.CSSProperties = { fontSize: 13, color: '#323130', marginBottom: 4 };

    // Group tasks by category
    const tasksByCategory = configuredTasks.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    }, {} as Record<string, IConfigurableTask[]>);

    return (
      <div>
        <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>Review the onboarding configuration before submitting.</p>

        <div style={summaryCard}>
          <div style={summaryLabel}>Candidate</div>
          <div style={summaryValue}><strong>{wizardData.candidateName}</strong></div>
          <div style={summaryValue}>{wizardData.jobTitle} — {wizardData.department}</div>
          <div style={summaryValue}>Start Date: {wizardData.startDate?.toLocaleDateString()}</div>
        </div>

        <div style={summaryCard}>
          <div style={summaryLabel}>Tasks Summary ({configuredTasks.length} total)</div>
          {Object.entries(tasksByCategory).map(([category, tasks]) => (
            <div key={category} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#605e5c', marginBottom: 4 }}>
                {category} ({tasks.length})
              </div>
              {tasks.map(task => (
                <div key={task.id} style={{ ...summaryValue, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon
                    iconName={task.isConfigured ? 'CheckboxComposite' : 'Checkbox'}
                    style={{ fontSize: 12, color: task.isConfigured ? '#059669' : '#8a8886' }}
                  />
                  <span style={{ flex: 1 }}>{task.title}</span>
                  {task.assignmentType === 'role' && task.roleAssignment && (
                    <span style={{ fontSize: 11, color: '#8a8886' }}>{task.roleAssignment}</span>
                  )}
                  {task.requiresApproval && (
                    <Icon iconName="Shield" style={{ fontSize: 11, color: '#d97706' }} title="Requires approval" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {error && <div style={{ padding: 12, background: '#fde7e9', borderRadius: 8, color: '#d13438', fontSize: 13, marginTop: 12 }}>{error}</div>}
      </div>
    );
  };

  const renderSuccessScreen = (): JSX.Element => {
    const totalTasks = configuredTasks.length;

    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
        }}>
          <Icon iconName="CheckMark" style={{ fontSize: 40, color: '#fff' }} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#323130', marginBottom: 8 }}>Onboarding Created Successfully!</h2>
        <p style={{ fontSize: 14, color: '#605e5c', marginBottom: 32 }}>
          {wizardData.candidateName}'s onboarding has been set up with {totalTasks} tasks to complete.
        </p>
        <div style={{ background: '#f9f8ff', borderRadius: 12, padding: 24, maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <Icon iconName="Contact" style={{ fontSize: 20, color: '#005BAA', marginRight: 12 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#323130' }}>{wizardData.candidateName}</div>
              <div style={{ fontSize: 12, color: '#605e5c' }}>{wizardData.jobTitle} — {wizardData.department}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #e9e5f5' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#005BAA' }}>{configuredTasks.filter(t => t.category === 'Documentation').length}</div>
              <div style={{ fontSize: 11, color: '#8a8886' }}>Documents</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #e9e5f5' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#005BAA' }}>{configuredTasks.filter(t => t.category === 'System Access').length}</div>
              <div style={{ fontSize: 11, color: '#8a8886' }}>Systems</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #e9e5f5' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#005BAA' }}>{configuredTasks.filter(t => t.category === 'Equipment').length}</div>
              <div style={{ fontSize: 11, color: '#8a8886' }}>Equipment</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #e9e5f5' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#005BAA' }}>{configuredTasks.filter(t => t.category === 'Training').length}</div>
              <div style={{ fontSize: 11, color: '#8a8886' }}>Training</div>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 12, background: '#e6ffed', borderRadius: 8, fontSize: 13, color: '#047857' }}>
            <Icon iconName="Calendar" style={{ marginRight: 8 }} />
            Start Date: {wizardData.startDate?.toLocaleDateString()}
          </div>
        </div>
        <button
          onClick={() => { onCompleted(); }}
          style={{
            marginTop: 32, padding: '12px 32px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #005BAA 0%, #004A8F 100%)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}
        >
          View Onboarding Tracker
        </button>
      </div>
    );
  };

  const renderCurrentStep = (): JSX.Element => {
    if (loadingConfig) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner size={SpinnerSize.large} label="Loading configuration..." />
        </div>
      );
    }
    if (submitted) {
      return renderSuccessScreen();
    }
    switch (currentStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      default: return renderStep0();
    }
  };

  const onRenderHeader = (): JSX.Element => (
    <div className={styles.panelHeader}>
      <div className={styles.panelIcon}>
        <Icon iconName={submitted ? 'CheckMark' : 'TaskManager'} style={{ fontSize: 20, color: '#fff' }} />
      </div>
      <div>
        <div className={styles.panelTitle}>{submitted ? 'Onboarding Complete' : 'Start Onboarding'}</div>
        <div className={styles.panelSubtitle}>
          {submitted ? 'Employee onboarding has been created' : `Step ${currentStep + 1} of 9 — ${STEPS[currentStep]?.label || 'Review'}`}
        </div>
      </div>
    </div>
  );

  const onRenderFooter = (): JSX.Element => {
    if (submitted) return <></>;
    return (
      <div className={styles.panelFooter} style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          {currentStep > 0 && <button className={styles.btnSecondary} onClick={handleBack}>Back</button>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={styles.btnSecondary} onClick={onDismiss}>Cancel</button>
          {currentStep < 8 ? (
            <button className={styles.btnPrimary} onClick={handleNext} disabled={!canProceed()}>
              {currentStep === 6 ? 'Next' : currentStep === 7 ? (tasksConfirmed ? 'Review & Submit' : 'Skip Configuration') : 'Next'}
            </button>
          ) : (
            <button className={styles.btnPrimary} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Start Onboarding'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Panel
        isOpen={isOpen && !showTaskConfig}
        type={PanelType.large}
        onDismiss={onDismiss}
        hasCloseButton={false}
        isBlocking={true}
        onRenderHeader={onRenderHeader}
        onRenderFooterContent={onRenderFooter}
        isFooterAtBottom={true}
        className={styles.rmPanel}
      >
        <div className={styles.panelBody}>
          {/* Step indicator */}
          {!submitted && !loadingConfig && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 0 24px', marginBottom: 24, borderBottom: '1px solid #edebe9' }}>
              {STEPS.map((step, i) => (
                <React.Fragment key={i}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: i < currentStep ? '#059669' : i === currentStep ? '#005BAA' : '#edebe9',
                      color: i <= currentStep ? '#fff' : '#8a8886',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 600, fontSize: 11, transition: 'all 0.3s ease',
                    }}>
                      {i < currentStep ? <Icon iconName="CheckMark" style={{ fontSize: 12 }} /> : i + 1}
                    </div>
                    <div style={{
                      fontSize: 9, color: i === currentStep ? '#005BAA' : '#605e5c',
                      fontWeight: i === currentStep ? 600 : 400, marginTop: 4, whiteSpace: 'nowrap',
                    }}>{step.label}</div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: i < currentStep ? '#059669' : '#edebe9', margin: '0 2px', marginBottom: 18 }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Step content */}
          {renderCurrentStep()}
        </div>
      </Panel>

      {/* Task Configuration Panel (full screen when open) */}
      <TaskConfigurationPanel
        sp={sp}
        context={context}
        isOpen={showTaskConfig}
        tasks={configuredTasks}
        startDate={wizardData.startDate}
        employeeName={wizardData.candidateName}
        processType="onboarding"
        onDismiss={handleTaskConfigDismiss}
        onConfirm={handleTaskConfigConfirm}
      />
    </>
  );
};
