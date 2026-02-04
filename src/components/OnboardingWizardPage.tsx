import * as React from 'react';
import { useState, useEffect } from 'react';
import { SPFI } from '@pnp/sp';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown } from '@fluentui/react/lib/Dropdown';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
// Toggle removed - using checkboxes in accordion pattern
import { Icon } from '@fluentui/react/lib/Icon';
import { JmlWizardLayout, JmlWizardSuccess, IJmlWizardStep, IJmlWizardTip, IJmlWizardChecklistItem, ISummaryPanel } from './JmlWizardLayout';
import { IConfigurableTask } from './TaskConfigurationPanel';
import { TaskConfigurationOverlay } from './TaskConfigurationOverlay';
import { OnboardingService } from '../services/OnboardingService';
import { OnboardingConfigService } from '../services/OnboardingConfigService';
import { GraphNotificationService, ITaskNotification as IEmailTaskNotification } from '../services/GraphNotificationService';
import { TeamsNotificationService } from '../services/TeamsNotificationService';
import { InAppNotificationService } from '../services/InAppNotificationService';
import { WorkflowOrchestrator } from '../services/WorkflowOrchestrator';
import { IOnboardingWizardData, OnboardingStatus, OnboardingTaskStatus } from '../models/IOnboarding';
import { IDocumentType, IAssetType, ISystemAccessType, ITrainingCourse, IPolicyPack, IDepartment } from '../models/IOnboardingConfig';
import styles from '../styles/JmlWizard.module.scss';
import { WebPartContext } from '@microsoft/sp-webpart-base';

interface IProps {
  sp: SPFI;
  context?: WebPartContext;
  onComplete: () => void;
  onCancel: () => void;
}

interface IEligibleCandidate {
  Id: number;
  Name: string;
  Email: string;
  Status: string;
  JobRequisitionId?: number;
}

interface IConfigData {
  documentTypes: IDocumentType[];
  assetTypes: IAssetType[];
  systemAccessTypes: ISystemAccessType[];
  trainingCourses: ITrainingCourse[];
  policyPacks: IPolicyPack[];
  departments: IDepartment[];
}

interface ISelectedDoc { id: number; name: string; category: string; required: boolean; received: boolean }
interface ISelectedSystem { id: number; name: string; category: string; role: string; requested: boolean }
interface ISelectedAsset { id: number; name: string; category: string; quantity: number; requested: boolean }
interface ISelectedTraining { id: number; name: string; category: string; mandatory: boolean; scheduled: boolean }

const STEPS: IJmlWizardStep[] = [
  { key: 'candidate', label: 'Select Candidate', icon: 'Contact' },
  { key: 'details', label: 'Employee Details', icon: 'EditContact' },
  // Temporarily disabled - Policy Pack step
  // { key: 'policypack', label: 'Policy Pack', icon: 'Package' },
  { key: 'documents', label: 'Documents', icon: 'DocumentSet' },
  { key: 'systems', label: 'System Access', icon: 'Permissions' },
  { key: 'equipment', label: 'Equipment', icon: 'Devices3' },
  { key: 'training', label: 'Training', icon: 'Education' },
  { key: 'configure', label: 'Configure Tasks', icon: 'TaskManager' },
  { key: 'review', label: 'Review & Submit', icon: 'CheckList' },
];

export const OnboardingWizardPage: React.FC<IProps> = ({ sp, context, onComplete, onCancel }) => {
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
  // Temporarily disabled - Policy Pack feature
  // const [selectedPolicyPackId, setSelectedPolicyPackId] = useState<number | null>(null);

  const [selectedDocs, setSelectedDocs] = useState<ISelectedDoc[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<ISelectedSystem[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<ISelectedAsset[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<ISelectedTraining[]>([]);

  // Task configuration state
  const [showTaskConfig, setShowTaskConfig] = useState(false);
  const [configuredTasks, setConfiguredTasks] = useState<IConfigurableTask[]>([]);
  const [tasksConfirmed, setTasksConfirmed] = useState(false);

  // Accordion expand states for categorized lists
  const [expandedDocCategories, setExpandedDocCategories] = useState<Set<string>>(new Set(['HR']));
  const [expandedSystemCategories, setExpandedSystemCategories] = useState<Set<string>>(new Set(['Core']));
  const [expandedAssetCategories, setExpandedAssetCategories] = useState<Set<string>>(new Set(['Hardware']));
  const [expandedTrainingCategories, setExpandedTrainingCategories] = useState<Set<string>>(new Set(['Orientation']));

  useEffect(() => {
    loadData();
  }, [sp]);

  const loadData = async (): Promise<void> => {
    setLoadingConfig(true);
    try {
      const svc = new OnboardingService(sp);
      const configSvc = new OnboardingConfigService(sp);

      const [cands, docs, assets, systems, courses, packs, depts] = await Promise.all([
        svc.getEligibleCandidates(),
        configSvc.getDocumentTypes({ isActive: true }),
        configSvc.getAssetTypes({ isActive: true }),
        configSvc.getSystemAccessTypes({ isActive: true }),
        configSvc.getTrainingCourses({ isActive: true }),
        configSvc.getPolicyPacks({ isActive: true }),
        configSvc.getDepartments({ isActive: true }),
      ]);

      setCandidates(cands);
      setConfigData({
        documentTypes: docs,
        assetTypes: assets,
        systemAccessTypes: systems,
        trainingCourses: courses,
        policyPacks: packs,
        departments: depts,
      });

      setSelectedDocs(docs.map(d => ({
        id: d.Id || 0, name: d.Title, category: d.Category || 'HR', required: d.IsRequired, received: false
      })));
      setSelectedSystems(systems.map(s => ({
        id: s.Id || 0, name: s.Title, category: s.Category || 'Core', role: s.DefaultRole || 'Standard', requested: true
      })));
      setSelectedAssets(assets.filter(a => a.Category === 'Hardware').slice(0, 3).map(a => ({
        id: a.Id || 0, name: a.Title, category: a.Category, quantity: a.DefaultQuantity || 1, requested: true
      })));
      setSelectedTraining(courses.map(t => ({
        id: t.Id || 0, name: t.Title, category: t.Category || 'Orientation', mandatory: t.IsMandatory, scheduled: false
      })));
    } catch (err) {
      console.error('[OnboardingWizardPage] Error loading config:', err);
    }
    setLoadingConfig(false);
  };

  /* Temporarily disabled - Policy Pack feature
  const applyPolicyPack = (packId: number): void => {
    if (!configData) return;
    const pack = configData.policyPacks.find(p => p.Id === packId);
    if (!pack) return;

    setSelectedPolicyPackId(packId);

    setSelectedDocs(configData.documentTypes.map(d => ({
      id: d.Id || 0,
      name: d.Title,
      category: d.Category || 'HR',
      required: pack.DocumentTypeIds.includes(d.Id || 0) ? true : d.IsRequired,
      received: false
    })));

    setSelectedSystems(configData.systemAccessTypes.map(s => ({
      id: s.Id || 0,
      name: s.Title,
      category: s.Category || 'Core',
      role: s.DefaultRole || 'Standard',
      requested: pack.SystemAccessTypeIds.includes(s.Id || 0)
    })));

    setSelectedAssets(configData.assetTypes.filter(a =>
      pack.AssetTypeIds.includes(a.Id || 0)
    ).map(a => ({
      id: a.Id || 0,
      name: a.Title,
      category: a.Category,
      quantity: a.DefaultQuantity || 1,
      requested: true
    })));

    setSelectedTraining(configData.trainingCourses.map(t => ({
      id: t.Id || 0,
      name: t.Title,
      category: t.Category || 'Orientation',
      mandatory: pack.TrainingCourseIds.includes(t.Id || 0) ? true : t.IsMandatory,
      scheduled: false
    })));
  };
  */

  const updateField = (field: keyof IOnboardingWizardData, value: any): void => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    if (currentStep === 0) return !!wizardData.candidateId;
    if (currentStep === 1) return !!wizardData.startDate && !!wizardData.jobTitle;
    return true;
  };

  const handleNext = (): void => { if (canProceed()) setCurrentStep(prev => prev + 1); };
  const handleBack = (): void => setCurrentStep(prev => prev - 1);

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError('');
    try {
      const svc = new OnboardingService(sp);

      // Use configured tasks if available, otherwise build from selections
      const tasksToCreate = tasksConfirmed && configuredTasks.length > 0
        ? configuredTasks
        : buildTasksFromSelections();
      const totalTasks = tasksToCreate.length;

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
        // Create tasks from the configured task list
        let sortOrder = 1;
        const startDate = wizardData.startDate || new Date();

        // Track created tasks for notifications and dependency mapping
        const createdTasks: Array<{
          tempId: string | number;      // Original temp ID from configuredTasks
          spId?: number;                // SharePoint ID after creation
          title: string;
          category: string;
          dueDate: Date;
          assigneeId?: number;
          assigneeName?: string;
          assigneeEmail?: string;
          notifyAssigneeEmail?: boolean;
          notifyTeamsChat?: boolean;
          dependsOnTaskIds?: (string | number)[];  // Original dependency temp IDs
          blockedUntilComplete?: boolean;
        }> = [];

        // PHASE 1: Create all tasks (without dependencies first)
        for (const task of tasksToCreate) {
          // Calculate due date based on offset
          const dueDate = new Date(startDate);
          if (task.offsetType === 'before-start') {
            dueDate.setDate(dueDate.getDate() - Math.abs(task.daysOffset));
          } else if (task.offsetType === 'after-start') {
            dueDate.setDate(dueDate.getDate() + Math.abs(task.daysOffset));
          }
          // 'on-start' keeps the start date

          // Map 'Critical' to 'High' since OnboardingTask doesn't support Critical
          const mappedPriority = task.priority === 'Critical' ? 'High' : (task.priority || 'Medium');

          // Determine initial status - blocked if has dependencies and blockedUntilComplete is true
          const hasDependencies = task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0;
          const initialStatus = hasDependencies && task.blockedUntilComplete
            ? OnboardingTaskStatus.Blocked
            : OnboardingTaskStatus.Pending;

          const createdTask = await svc.createOnboardingTask({
            Title: task.title,
            OnboardingId: onboarding.Id,
            Category: task.category as any,
            Status: initialStatus,
            Priority: mappedPriority as 'Low' | 'Medium' | 'High',
            SortOrder: sortOrder++,
            DueDate: dueDate,
            AssignedToId: task.assigneeId || undefined,
            Notes: task.instructions || undefined,
            // Dependencies will be set in Phase 2 after all tasks are created
            BlockedUntilComplete: task.blockedUntilComplete,
          });

          // Store task info for mapping and notifications
          createdTasks.push({
            tempId: task.id,
            spId: createdTask?.Id,
            title: task.title,
            category: task.category,
            dueDate: dueDate,
            assigneeId: task.assigneeId,
            assigneeName: task.assigneeName,
            assigneeEmail: task.assigneeEmail,
            notifyAssigneeEmail: task.notifyAssigneeEmail,
            notifyTeamsChat: task.notifyTeamsChat,
            dependsOnTaskIds: task.dependsOnTaskIds,
            blockedUntilComplete: task.blockedUntilComplete,
          });
        }

        // PHASE 2: Update tasks with dependencies (map temp IDs to SharePoint IDs)
        // Build temp ID to SharePoint ID mapping
        const idMapping = new Map<string | number, number>();
        for (const ct of createdTasks) {
          if (ct.spId) {
            idMapping.set(ct.tempId, ct.spId);
          }
        }

        // Update tasks that have dependencies
        for (const ct of createdTasks) {
          if (ct.dependsOnTaskIds && ct.dependsOnTaskIds.length > 0 && ct.spId) {
            // Map temp IDs to SharePoint IDs
            const mappedDepIds = ct.dependsOnTaskIds
              .map(tempId => idMapping.get(tempId))
              .filter((id): id is number => id !== undefined);

            if (mappedDepIds.length > 0) {
              // Update the task with dependency IDs (stored as JSON string)
              await svc.updateOnboardingTask(ct.spId, {
                DependsOnTaskIds: JSON.stringify(mappedDepIds),
              });
            }
          }
        }

        await svc.recalculateProgress(onboarding.Id);

        // ═══════════════════════════════════════════════════════════════
        // SEND NOTIFICATIONS
        // ═══════════════════════════════════════════════════════════════

        // Initialize notification services
        const graphNotificationService = new GraphNotificationService(sp, context);
        const teamsNotificationService = new TeamsNotificationService(sp, context);

        // Get current user email for in-app notifications
        const currentUserEmail = context?.pageContext?.user?.email || '';
        const inAppNotificationService = new InAppNotificationService(sp, currentUserEmail);

        // Build site URL for action links
        const siteUrl = context?.pageContext?.web?.absoluteUrl || '';
        const actionUrl = siteUrl ? `${siteUrl}/SitePages/JML-Lite.aspx?view=onboarding` : undefined;

        // Send notifications for each task with an assignee
        for (const task of createdTasks) {
          if (task.assigneeEmail) {
            // 1. EMAIL NOTIFICATION (via Graph API)
            if (task.notifyAssigneeEmail !== false) {
              const emailNotification: IEmailTaskNotification = {
                taskTitle: task.title,
                taskCategory: task.category,
                employeeName: wizardData.candidateName || 'New Employee',
                processType: 'Onboarding',
                dueDate: task.dueDate,
                assignedTo: {
                  email: task.assigneeEmail,
                  displayName: task.assigneeName || task.assigneeEmail,
                },
                actionUrl: actionUrl,
              };

              // Fire-and-forget email notification
              graphNotificationService.notifyTaskAssigned(emailNotification).catch(err => {
                console.warn('[OnboardingWizardPage] Email notification failed:', err);
              });
            }

            // 2. TEAMS NOTIFICATION
            if (task.notifyTeamsChat !== false) {
              const teamsNotification = {
                taskId: 0, // We don't have the task ID here, use 0
                taskTitle: task.title,
                category: 'Onboarding' as const,
                employeeName: wizardData.candidateName || 'New Employee',
                assignedToEmail: task.assigneeEmail,
                dueDate: task.dueDate,
                priority: 'Medium' as const,
                actionUrl: actionUrl,
              };

              // Fire-and-forget Teams notification
              teamsNotificationService.sendTaskNotification(teamsNotification).catch(err => {
                console.warn('[OnboardingWizardPage] Teams notification failed:', err);
              });
            }

            // 3. IN-APP NOTIFICATION
            // Always create in-app notification for task assignment
            inAppNotificationService.notifyTaskAssigned(
              task.assigneeEmail,
              task.title,
              wizardData.candidateName || 'New Employee',
              'Onboarding',
              onboarding.Id,
              actionUrl
            ).catch(err => {
              console.warn('[OnboardingWizardPage] In-app notification failed:', err);
            });
          }
        }

        // Send onboarding started notification to the current user/manager
        if (currentUserEmail) {
          inAppNotificationService.notifyOnboardingStarted(
            currentUserEmail,
            wizardData.candidateName || 'New Employee',
            startDate,
            onboarding.Id,
            actionUrl
          ).catch(err => {
            console.warn('[OnboardingWizardPage] Onboarding started notification failed:', err);
          });

          // Also send Teams notification about onboarding started
          teamsNotificationService.notifyOnboardingStarted(
            wizardData.candidateName || 'New Employee',
            startDate,
            currentUserEmail
          ).catch(err => {
            console.warn('[OnboardingWizardPage] Teams onboarding notification failed:', err);
          });
        }

        // ═══════════════════════════════════════════════════════════════
        // TRIGGER WORKFLOW ORCHESTRATOR for Teams webhook notifications
        // ═══════════════════════════════════════════════════════════════
        const workflowOrchestrator = new WorkflowOrchestrator(sp, context, {
          sendTeamsNotifications: true, // Enable Teams webhook notifications
        });

        // Fire-and-forget workflow start (sends Teams channel webhook)
        workflowOrchestrator.startOnboardingWorkflow({
          Id: onboarding.Id,
          CandidateName: wizardData.candidateName || 'New Employee',
          CandidateId: wizardData.candidateId || 0,
          JobTitle: wizardData.jobTitle || '',
          Department: wizardData.department || '',
          StartDate: startDate,
          Status: OnboardingStatus.InProgress,
          CompletionPercentage: 0,
          TotalTasks: totalTasks,
          CompletedTasks: 0,
        }).catch(err => {
          console.warn('[OnboardingWizardPage] Workflow orchestrator notification failed:', err);
        });

        // ═══════════════════════════════════════════════════════════════
        // CREATE APPROVAL REQUESTS for tasks that require approval
        // ═══════════════════════════════════════════════════════════════
        const tasksRequiringApproval = tasksToCreate.filter(t => t.requiresApproval && t.approverId);

        for (const task of tasksRequiringApproval) {
          // Determine approval type based on task category
          if (task.sourceType === 'system' && task.approverId) {
            // System Access approval
            workflowOrchestrator.requestSystemAccessApproval(
              task.title, // system name
              'Standard', // requested role
              {
                name: wizardData.candidateName || 'New Employee',
                email: '', // Could be enhanced
                department: wizardData.department || '',
                jobTitle: wizardData.jobTitle || '',
              },
              'Onboarding',
              onboarding.Id,
              task.approverId
            ).catch(err => {
              console.warn(`[OnboardingWizardPage] System access approval request failed for ${task.title}:`, err);
            });
          } else if (task.sourceType === 'asset' && task.approverId) {
            // Equipment/Asset approval
            workflowOrchestrator.requestEquipmentApproval(
              task.title, // asset name
              task.category, // asset type (Equipment)
              wizardData.candidateName || 'New Employee',
              'Onboarding',
              onboarding.Id,
              task.approverId
            ).catch(err => {
              console.warn(`[OnboardingWizardPage] Equipment approval request failed for ${task.title}:`, err);
            });
          }
        }

        if (tasksRequiringApproval.length > 0) {
          console.log(`[OnboardingWizardPage] Created ${tasksRequiringApproval.length} approval requests`);
        }

        console.log(`[OnboardingWizardPage] Notifications sent for ${createdTasks.filter(t => t.assigneeEmail).length} tasks`);

        setSubmitted(true);
      }
    } catch (err) {
      console.error('[OnboardingWizardPage] Error submitting:', err);
      setError('Failed to create onboarding. Please try again.');
    }
    setSubmitting(false);
  };

  const onSelectCandidate = (candidateId: number): void => {
    const candidate = candidates.find(c => c.Id === candidateId);
    if (candidate) {
      updateField('candidateId', candidate.Id);
      updateField('candidateName', candidate.Name);
    }
  };

  // Generate tips based on current step
  // Note: Policy Pack step (index 2) is temporarily disabled, so indices shifted
  const getTips = (): IJmlWizardTip[] => {
    switch (currentStep) {
      case 0:
        return [
          { icon: 'Contact', title: 'Eligible Candidates', content: 'Only candidates with status "Hired" or "Offer Accepted" are shown here.' },
          { icon: 'Info', title: 'No candidates?', content: 'If no candidates appear, ensure offers have been accepted in the Offers section.' },
        ];
      case 1:
        return [
          { icon: 'Calendar', title: 'Start Date', content: 'Set the employee\'s first day. This determines when onboarding tasks should be completed.' },
          { icon: 'Briefcase', title: 'Department', content: 'Selecting a department may auto-apply a policy pack with pre-configured settings.' },
        ];
      // Policy Pack tips (disabled)
      // case 2:
      //   return [
      //     { icon: 'Package', title: 'Policy Packs', content: 'Policy packs pre-configure documents, systems, equipment, and training based on role or department.' },
      //     { icon: 'Lightbulb', title: 'Tip', content: 'You can customize individual selections in the following steps after applying a pack.' },
      //   ];
      case 2: // Documents (was case 3)
        return [
          { icon: 'DocumentSet', title: 'Required Documents', content: 'Mark documents as required to create tasks for collecting them.' },
          { icon: 'CheckboxComposite', title: 'Already Received?', content: 'Toggle "Received" for any documents already collected during hiring.' },
        ];
      case 3: // Systems (was case 4)
        return [
          { icon: 'Permissions', title: 'System Access', content: 'Select which systems the new employee needs access to.' },
          { icon: 'Settings', title: 'Roles', content: 'You can customize the access role for each system.' },
        ];
      case 4: // Equipment (was case 5)
        return [
          { icon: 'Devices3', title: 'Equipment', content: 'Select hardware and equipment to be provisioned for the employee.' },
          { icon: 'Add', title: 'Add More', content: 'Use the dropdown at the bottom to add additional equipment items.' },
        ];
      case 5: // Training
        return [
          { icon: 'Education', title: 'Training', content: 'Mandatory training courses will create tasks that must be completed.' },
          { icon: 'Calendar', title: 'Scheduling', content: 'Mark courses as "Scheduled" if training dates have already been set.' },
        ];
      case 6: // Configure Tasks
        return [
          { icon: 'TaskManager', title: 'Task Configuration', content: 'Review and customize the tasks that will be created for this onboarding.' },
          { icon: 'People', title: 'Assign Owners', content: 'Assign specific people to each task and set due dates.' },
          { icon: 'Calendar', title: 'Scheduling', content: 'Set due dates relative to the start date or as specific dates.' },
        ];
      case 7: // Review & Submit
        return [
          { icon: 'CheckList', title: 'Review Carefully', content: 'Review all selections before submitting. You can go back to make changes.' },
          { icon: 'Warning', title: 'Submit', content: 'Once submitted, the onboarding will be created with all tasks.' },
        ];
      default:
        return [];
    }
  };

  // Generate checklist based on wizard state
  const getChecklist = (): IJmlWizardChecklistItem[] => [
    { label: 'Candidate selected', completed: !!wizardData.candidateId },
    { label: 'Employee details entered', completed: !!wizardData.jobTitle && !!wizardData.startDate },
    { label: 'Documents configured', completed: selectedDocs.some(d => d.required) },
    { label: 'Systems selected', completed: selectedSystems.some(s => s.requested) },
    { label: 'Equipment assigned', completed: selectedAssets.some(a => a.requested) },
    { label: 'Training defined', completed: selectedTraining.some(t => t.mandatory) },
    { label: 'Tasks configured', completed: tasksConfirmed },
  ];

  // Step content renderers
  // Note: Policy Pack step (index 2) is temporarily disabled
  const renderStepContent = (): JSX.Element => {
    switch (currentStep) {
      case 0: return renderCandidateStep();
      case 1: return renderDetailsStep();
      // case 2: return renderPolicyPackStep(); // Temporarily disabled
      case 2: return renderDocumentsStep();
      case 3: return renderSystemsStep();
      case 4: return renderEquipmentStep();
      case 5: return renderTrainingStep();
      case 6: return renderConfigureTasksStep();
      case 7: return renderReviewStep();
      default: return <div />;
    }
  };

  const renderCandidateStep = (): JSX.Element => (
    <div className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div className={styles.formCardIcon}>
          <Icon iconName="Contact" style={{ fontSize: 18 }} />
        </div>
        <div>
          <h3 className={styles.formCardTitle}>Select Candidate</h3>
          <p className={styles.formCardDescription}>Choose a candidate who has been hired or accepted an offer</p>
        </div>
      </div>

      {candidates.length > 0 ? (
        <div className={styles.scrollableList}>
          {candidates.map(c => (
            <div
              key={c.Id}
              className={`${styles.listItem} ${wizardData.candidateId === c.Id ? styles.listItemSelected : ''}`}
              onClick={() => onSelectCandidate(c.Id)}
            >
              <Icon iconName="Contact" style={{ fontSize: 20, color: '#005BAA' }} />
              <div>
                <div className={styles.listItemTitle}>{c.Name}</div>
                <div className={styles.listItemSubtitle}>{c.Email}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`${styles.infoBox} ${styles.infoBoxWarning}`}>
          <Icon iconName="Warning" className={styles.infoBoxIcon} />
          <div>No eligible candidates found. Candidates must have status "Hired" or "Offer Accepted".</div>
        </div>
      )}

      {wizardData.candidateId && (
        <div className={`${styles.infoBox} ${styles.infoBoxSuccess}`} style={{ marginTop: 16 }}>
          <Icon iconName="CheckMark" className={styles.infoBoxIcon} />
          <div>
            <strong>{wizardData.candidateName}</strong> selected for onboarding.
          </div>
        </div>
      )}
    </div>
  );

  const renderDetailsStep = (): JSX.Element => (
    <div className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div className={styles.formCardIcon}>
          <Icon iconName="EditContact" style={{ fontSize: 18 }} />
        </div>
        <div>
          <h3 className={styles.formCardTitle}>Employee Details</h3>
          <p className={styles.formCardDescription}>Enter the new employee's position and start date</p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <TextField
          label="Candidate Name"
          value={wizardData.candidateName || ''}
          disabled
        />
        <TextField
          label="Job Title"
          value={wizardData.jobTitle || ''}
          required
          onChange={(_, v) => updateField('jobTitle', v)}
        />
        <Dropdown
          label="Department"
          placeholder="Select department..."
          selectedKey={wizardData.department || undefined}
          options={configData?.departments.map(d => ({ key: d.Title, text: d.Title })) || []}
          onChange={(_, opt) => updateField('department', opt?.key as string)}
        />
        <DatePicker
          label="Start Date"
          value={wizardData.startDate ? new Date(wizardData.startDate) : undefined}
          onSelectDate={(date) => updateField('startDate', date)}
          isRequired
        />
        <div className={styles.formGridFull}>
          <TextField
            label="Notes"
            multiline
            rows={3}
            value={wizardData.notes || ''}
            onChange={(_, v) => updateField('notes', v)}
            placeholder="Any additional notes for this onboarding..."
          />
        </div>
      </div>
    </div>
  );

  /* Temporarily disabled - Policy Pack step
  const renderPolicyPackStep = (): JSX.Element => (
    <div className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div className={styles.formCardIcon}>
          <Icon iconName="Package" style={{ fontSize: 18 }} />
        </div>
        <div>
          <h3 className={styles.formCardTitle}>Policy Pack</h3>
          <p className={styles.formCardDescription}>Optionally select a policy pack to pre-configure onboarding items</p>
        </div>
      </div>

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
            <div key={pack.Id} className={`${styles.infoBox} ${styles.infoBoxInfo}`}>
              <Icon iconName="Package" className={styles.infoBoxIcon} />
              <div>
                <strong>{pack.Title}</strong>
                {pack.Description && <div style={{ marginTop: 4 }}>{pack.Description}</div>}
                <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <span><Icon iconName="DocumentSet" style={{ marginRight: 4 }} />{pack.DocumentTypeIds.length} Documents</span>
                  <span><Icon iconName="Permissions" style={{ marginRight: 4 }} />{pack.SystemAccessTypeIds.length} Systems</span>
                  <span><Icon iconName="Devices3" style={{ marginRight: 4 }} />{pack.AssetTypeIds.length} Assets</span>
                  <span><Icon iconName="Education" style={{ marginRight: 4 }} />{pack.TrainingCourseIds.length} Training</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(!configData?.policyPacks || configData.policyPacks.length === 0) && (
        <div className={`${styles.infoBox} ${styles.infoBoxWarning}`} style={{ marginTop: 16 }}>
          <Icon iconName="Info" className={styles.infoBoxIcon} />
          <div>No policy packs configured. You can create policy packs in the Admin Center.</div>
        </div>
      )}
    </div>
  );
  */

  // Helper function to get icon style class for document category
  const getDocCategoryIconClass = (category: string): string => {
    switch (category) {
      case 'HR': return styles.accordionIconHR;
      case 'Legal': return styles.accordionIconLegal;
      case 'Finance': return styles.accordionIconFinance;
      case 'Compliance': return styles.accordionIconCompliance;
      case 'IT': return styles.accordionIconIT;
      default: return styles.accordionIconHR;
    }
  };

  // Toggle accordion category expand/collapse
  const toggleDocCategory = (category: string): void => {
    setExpandedDocCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Group documents by category
  const groupedDocs = selectedDocs.reduce((acc, doc) => {
    const cat = doc.category || 'HR';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, ISelectedDoc[]>);

  // Document category order and icons
  const DOC_CATEGORY_CONFIG: Record<string, { icon: string; label: string }> = {
    HR: { icon: 'ContactInfo', label: 'HR' },
    Legal: { icon: 'Library', label: 'Legal' },
    Finance: { icon: 'Money', label: 'Finance' },
    Compliance: { icon: 'Shield', label: 'Compliance' },
    IT: { icon: 'Settings', label: 'IT' },
  };

  const renderDocumentsStep = (): JSX.Element => {
    const categories = Object.keys(DOC_CATEGORY_CONFIG).filter(cat => groupedDocs[cat]?.length > 0);

    if (selectedDocs.length === 0) {
      return (
        <div className={`${styles.infoBox} ${styles.infoBoxWarning}`}>
          <Icon iconName="Info" className={styles.infoBoxIcon} />
          <div>No document types configured. Add document types in the Admin Center.</div>
        </div>
      );
    }

    return (
      <div className={styles.accordionContainer}>
        {categories.map(category => {
          const docsInCategory = groupedDocs[category] || [];
          const receivedCount = docsInCategory.filter(d => d.received).length;
          const requiredCount = docsInCategory.filter(d => d.required).length;
          const isExpanded = expandedDocCategories.has(category);
          const config = DOC_CATEGORY_CONFIG[category];

          return (
            <div key={category} className={styles.accordionCategory}>
              {/* Accordion Header */}
              <div className={styles.accordionHeader} onClick={() => toggleDocCategory(category)}>
                <div className={`${styles.accordionIcon} ${getDocCategoryIconClass(category)}`}>
                  <Icon iconName={config.icon} style={{ fontSize: 18 }} />
                </div>
                <div className={styles.accordionTitleGroup}>
                  <h4 className={styles.accordionTitle}>{config.label}</h4>
                  <div className={styles.accordionMeta}>
                    {receivedCount}/{docsInCategory.length} received • {requiredCount} required
                  </div>
                </div>
                <div className={styles.accordionBadge}>
                  {docsInCategory.length} items
                </div>
                <div className={`${styles.accordionChevron} ${isExpanded ? styles.accordionChevronOpen : ''}`}>
                  <Icon iconName="ChevronDown" style={{ fontSize: 12 }} />
                </div>
              </div>

              {/* Accordion Body */}
              <div className={`${styles.accordionBody} ${isExpanded ? styles.accordionBodyOpen : ''}`}>
                <div className={styles.accordionList}>
                  {docsInCategory.map(doc => {
                    const docIndex = selectedDocs.findIndex(d => d.id === doc.id);
                    return (
                      <div key={doc.id} className={styles.accordionItem}>
                        <input
                          type="checkbox"
                          checked={doc.required}
                          onChange={(e) => {
                            const docs = [...selectedDocs];
                            docs[docIndex] = { ...docs[docIndex], required: e.target.checked };
                            setSelectedDocs(docs);
                          }}
                          className={styles.accordionItemCheckbox}
                        />
                        <span className={styles.accordionItemLabel}>
                          {doc.name}
                          {doc.required && <span className={styles.accordionItemRequired}>*Required</span>}
                        </span>
                        <div className={styles.accordionItemActions}>
                          {doc.received ? (
                            <button
                              className={styles.accordionItemBtn}
                              style={{ background: '#e6ffed', color: '#047857', border: '1px solid #86efac' }}
                              onClick={() => {
                                const docs = [...selectedDocs];
                                docs[docIndex] = { ...docs[docIndex], received: false };
                                setSelectedDocs(docs);
                              }}
                            >
                              <Icon iconName="CheckMark" style={{ fontSize: 12, marginRight: 4 }} />
                              Received
                            </button>
                          ) : (
                            <button
                              className={styles.accordionItemBtn}
                              onClick={() => {
                                const docs = [...selectedDocs];
                                docs[docIndex] = { ...docs[docIndex], received: true };
                                setSelectedDocs(docs);
                              }}
                            >
                              Mark Received
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // SYSTEMS STEP - Accordion by Category (Core, Department, Optional, Admin)
  // ═══════════════════════════════════════════════════════════════════════════════

  const SYSTEM_CATEGORY_CONFIG: Record<string, { icon: string; label: string; styleClass: string }> = {
    Core: { icon: 'Globe', label: 'Core Systems', styleClass: styles.accordionIconIT },
    Department: { icon: 'Group', label: 'Department Systems', styleClass: styles.accordionIconHR },
    Optional: { icon: 'Add', label: 'Optional Systems', styleClass: styles.accordionIconCompliance },
    Admin: { icon: 'Admin', label: 'Admin Systems', styleClass: styles.accordionIconLegal },
  };

  const toggleSystemCategory = (category: string): void => {
    setExpandedSystemCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) newSet.delete(category);
      else newSet.add(category);
      return newSet;
    });
  };

  const groupedSystems = selectedSystems.reduce((acc, sys) => {
    const cat = sys.category || 'Core';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sys);
    return acc;
  }, {} as Record<string, ISelectedSystem[]>);

  const renderSystemsStep = (): JSX.Element => {
    const categories = Object.keys(SYSTEM_CATEGORY_CONFIG).filter(cat => groupedSystems[cat]?.length > 0);

    if (selectedSystems.length === 0) {
      return (
        <div className={`${styles.infoBox} ${styles.infoBoxWarning}`}>
          <Icon iconName="Info" className={styles.infoBoxIcon} />
          <div>No system access types configured. Add systems in the Admin Center.</div>
        </div>
      );
    }

    return (
      <div className={styles.accordionContainer}>
        {categories.map(category => {
          const systemsInCategory = groupedSystems[category] || [];
          const requestedCount = systemsInCategory.filter(s => s.requested).length;
          const isExpanded = expandedSystemCategories.has(category);
          const config = SYSTEM_CATEGORY_CONFIG[category];

          return (
            <div key={category} className={styles.accordionCategory}>
              <div className={styles.accordionHeader} onClick={() => toggleSystemCategory(category)}>
                <div className={`${styles.accordionIcon} ${config.styleClass}`}>
                  <Icon iconName={config.icon} style={{ fontSize: 18 }} />
                </div>
                <div className={styles.accordionTitleGroup}>
                  <h4 className={styles.accordionTitle}>{config.label}</h4>
                  <div className={styles.accordionMeta}>
                    {requestedCount}/{systemsInCategory.length} selected
                  </div>
                </div>
                <div className={styles.accordionBadge}>{systemsInCategory.length} items</div>
                <div className={`${styles.accordionChevron} ${isExpanded ? styles.accordionChevronOpen : ''}`}>
                  <Icon iconName="ChevronDown" style={{ fontSize: 12 }} />
                </div>
              </div>

              <div className={`${styles.accordionBody} ${isExpanded ? styles.accordionBodyOpen : ''}`}>
                <div className={styles.accordionList}>
                  {systemsInCategory.map(sys => {
                    const sysIndex = selectedSystems.findIndex(s => s.id === sys.id);
                    return (
                      <div key={sys.id} className={styles.accordionItem}>
                        <input
                          type="checkbox"
                          checked={sys.requested}
                          onChange={(e) => {
                            const arr = [...selectedSystems];
                            arr[sysIndex] = { ...arr[sysIndex], requested: e.target.checked };
                            setSelectedSystems(arr);
                          }}
                          className={styles.accordionItemCheckbox}
                        />
                        <span className={styles.accordionItemLabel}>{sys.name}</span>
                        <div className={styles.accordionItemActions}>
                          <TextField
                            value={sys.role}
                            style={{ width: 120 }}
                            placeholder="Role"
                            onChange={(_, v) => {
                              const arr = [...selectedSystems];
                              arr[sysIndex] = { ...arr[sysIndex], role: v || '' };
                              setSelectedSystems(arr);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // EQUIPMENT STEP - Accordion by Category (Hardware, Software, Furniture, Access, Other)
  // ═══════════════════════════════════════════════════════════════════════════════

  const ASSET_CATEGORY_CONFIG: Record<string, { icon: string; label: string; styleClass: string }> = {
    Hardware: { icon: 'Devices3', label: 'Hardware', styleClass: styles.accordionIconHardware },
    Software: { icon: 'Code', label: 'Software', styleClass: styles.accordionIconIT },
    Furniture: { icon: 'Presentation', label: 'Furniture', styleClass: styles.accordionIconFinance },
    Access: { icon: 'Permissions', label: 'Access Cards & Keys', styleClass: styles.accordionIconCompliance },
    Other: { icon: 'More', label: 'Other', styleClass: styles.accordionIconHR },
  };

  const toggleAssetCategory = (category: string): void => {
    setExpandedAssetCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) newSet.delete(category);
      else newSet.add(category);
      return newSet;
    });
  };

  const groupedAssets = selectedAssets.reduce((acc, asset) => {
    const cat = asset.category || 'Hardware';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {} as Record<string, ISelectedAsset[]>);

  const renderEquipmentStep = (): JSX.Element => {
    const categories = Object.keys(ASSET_CATEGORY_CONFIG).filter(cat => groupedAssets[cat]?.length > 0);

    return (
      <div className={styles.accordionContainer}>
        {categories.map(category => {
          const assetsInCategory = groupedAssets[category] || [];
          const requestedCount = assetsInCategory.filter(a => a.requested).length;
          const isExpanded = expandedAssetCategories.has(category);
          const config = ASSET_CATEGORY_CONFIG[category];

          return (
            <div key={category} className={styles.accordionCategory}>
              <div className={styles.accordionHeader} onClick={() => toggleAssetCategory(category)}>
                <div className={`${styles.accordionIcon} ${config.styleClass}`}>
                  <Icon iconName={config.icon} style={{ fontSize: 18 }} />
                </div>
                <div className={styles.accordionTitleGroup}>
                  <h4 className={styles.accordionTitle}>{config.label}</h4>
                  <div className={styles.accordionMeta}>
                    {requestedCount}/{assetsInCategory.length} selected
                  </div>
                </div>
                <div className={styles.accordionBadge}>{assetsInCategory.length} items</div>
                <div className={`${styles.accordionChevron} ${isExpanded ? styles.accordionChevronOpen : ''}`}>
                  <Icon iconName="ChevronDown" style={{ fontSize: 12 }} />
                </div>
              </div>

              <div className={`${styles.accordionBody} ${isExpanded ? styles.accordionBodyOpen : ''}`}>
                <div className={styles.accordionList}>
                  {assetsInCategory.map(asset => {
                    const assetIndex = selectedAssets.findIndex(a => a.id === asset.id);
                    return (
                      <div key={asset.id} className={styles.accordionItem}>
                        <input
                          type="checkbox"
                          checked={asset.requested}
                          onChange={(e) => {
                            const arr = [...selectedAssets];
                            arr[assetIndex] = { ...arr[assetIndex], requested: e.target.checked };
                            setSelectedAssets(arr);
                          }}
                          className={styles.accordionItemCheckbox}
                        />
                        <span className={styles.accordionItemLabel}>{asset.name}</span>
                        <div className={styles.accordionItemActions}>
                          <TextField
                            type="number"
                            value={String(asset.quantity)}
                            style={{ width: 60 }}
                            onChange={(_, v) => {
                              const arr = [...selectedAssets];
                              arr[assetIndex] = { ...arr[assetIndex], quantity: parseInt(v || '1', 10) || 1 };
                              setSelectedAssets(arr);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add more equipment dropdown */}
        {configData && (
          <Dropdown
            placeholder="Add more equipment..."
            options={configData.assetTypes
              .filter(a => !selectedAssets.find(s => s.id === a.Id))
              .map(a => ({ key: a.Id || 0, text: `${a.Title} (${a.Category})` }))}
            onChange={(_, opt) => {
              if (opt) {
                const asset = configData.assetTypes.find(a => a.Id === opt.key);
                if (asset) {
                  setSelectedAssets([...selectedAssets, {
                    id: asset.Id || 0, name: asset.Title, category: asset.Category, quantity: asset.DefaultQuantity || 1, requested: true
                  }]);
                  // Auto-expand the category
                  setExpandedAssetCategories(prev => {
                    const newSet = new Set(prev);
                    newSet.add(asset.Category);
                    return newSet;
                  });
                }
              }
            }}
            style={{ marginTop: 12 }}
          />
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TRAINING STEP - Accordion by Category (Orientation, Safety, Compliance, Technical, Soft Skills)
  // ═══════════════════════════════════════════════════════════════════════════════

  const TRAINING_CATEGORY_CONFIG: Record<string, { icon: string; label: string; styleClass: string }> = {
    Orientation: { icon: 'People', label: 'Orientation', styleClass: styles.accordionIconOrientation },
    Safety: { icon: 'Shield', label: 'Health & Safety', styleClass: styles.accordionIconSafety },
    Compliance: { icon: 'Compliance', label: 'Compliance', styleClass: styles.accordionIconCompliance },
    Technical: { icon: 'Code', label: 'Technical', styleClass: styles.accordionIconTechnical },
    'Soft Skills': { icon: 'UserEvent', label: 'Soft Skills', styleClass: styles.accordionIconHR },
  };

  const toggleTrainingCategory = (category: string): void => {
    setExpandedTrainingCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) newSet.delete(category);
      else newSet.add(category);
      return newSet;
    });
  };

  const groupedTraining = selectedTraining.reduce((acc, tr) => {
    const cat = tr.category || 'Orientation';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tr);
    return acc;
  }, {} as Record<string, ISelectedTraining[]>);

  const renderTrainingStep = (): JSX.Element => {
    const categories = Object.keys(TRAINING_CATEGORY_CONFIG).filter(cat => groupedTraining[cat]?.length > 0);

    if (selectedTraining.length === 0) {
      return (
        <div className={`${styles.infoBox} ${styles.infoBoxWarning}`}>
          <Icon iconName="Info" className={styles.infoBoxIcon} />
          <div>No training courses configured. Add courses in the Admin Center.</div>
        </div>
      );
    }

    return (
      <div className={styles.accordionContainer}>
        {categories.map(category => {
          const trainingInCategory = groupedTraining[category] || [];
          const mandatoryCount = trainingInCategory.filter(t => t.mandatory).length;
          const scheduledCount = trainingInCategory.filter(t => t.scheduled).length;
          const isExpanded = expandedTrainingCategories.has(category);
          const config = TRAINING_CATEGORY_CONFIG[category];

          return (
            <div key={category} className={styles.accordionCategory}>
              <div className={styles.accordionHeader} onClick={() => toggleTrainingCategory(category)}>
                <div className={`${styles.accordionIcon} ${config.styleClass}`}>
                  <Icon iconName={config.icon} style={{ fontSize: 18 }} />
                </div>
                <div className={styles.accordionTitleGroup}>
                  <h4 className={styles.accordionTitle}>{config.label}</h4>
                  <div className={styles.accordionMeta}>
                    {mandatoryCount} mandatory • {scheduledCount} scheduled
                  </div>
                </div>
                <div className={styles.accordionBadge}>{trainingInCategory.length} items</div>
                <div className={`${styles.accordionChevron} ${isExpanded ? styles.accordionChevronOpen : ''}`}>
                  <Icon iconName="ChevronDown" style={{ fontSize: 12 }} />
                </div>
              </div>

              <div className={`${styles.accordionBody} ${isExpanded ? styles.accordionBodyOpen : ''}`}>
                <div className={styles.accordionList}>
                  {trainingInCategory.map(tr => {
                    const trIndex = selectedTraining.findIndex(t => t.id === tr.id);
                    return (
                      <div key={tr.id} className={styles.accordionItem}>
                        <input
                          type="checkbox"
                          checked={tr.mandatory}
                          onChange={(e) => {
                            const arr = [...selectedTraining];
                            arr[trIndex] = { ...arr[trIndex], mandatory: e.target.checked };
                            setSelectedTraining(arr);
                          }}
                          className={styles.accordionItemCheckbox}
                        />
                        <span className={styles.accordionItemLabel}>
                          {tr.name}
                          {tr.mandatory && <span className={styles.accordionItemRequired}>*Mandatory</span>}
                        </span>
                        <div className={styles.accordionItemActions}>
                          {tr.scheduled ? (
                            <button
                              className={styles.accordionItemBtn}
                              style={{ background: '#e6ffed', color: '#047857', border: '1px solid #86efac' }}
                              onClick={() => {
                                const arr = [...selectedTraining];
                                arr[trIndex] = { ...arr[trIndex], scheduled: false };
                                setSelectedTraining(arr);
                              }}
                            >
                              <Icon iconName="Calendar" style={{ fontSize: 12, marginRight: 4 }} />
                              Scheduled
                            </button>
                          ) : (
                            <button
                              className={styles.accordionItemBtn}
                              onClick={() => {
                                const arr = [...selectedTraining];
                                arr[trIndex] = { ...arr[trIndex], scheduled: true };
                                setSelectedTraining(arr);
                              }}
                            >
                              Schedule
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Build tasks from selections for the Task Configuration Panel
  const buildTasksFromSelections = (): IConfigurableTask[] => {
    const tasks: IConfigurableTask[] = [];

    // Document tasks
    selectedDocs.filter(d => d.required).forEach(doc => {
      tasks.push({
        id: `doc-${doc.id}`,
        title: `Collect: ${doc.name}`,
        category: 'Documentation',
        sourceType: 'document',
        sourceId: doc.id,
        assignmentType: 'role',
        roleAssignment: 'HR Team',
        daysOffset: -5,
        offsetType: 'before-start',
        priority: 'High',
        requiresApproval: false,
        sendReminder: true,
        reminderDaysBefore: 2,
        notifyOnComplete: true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: false,
        isSelected: true,
        isConfigured: false,
      });
    });

    // System access tasks
    selectedSystems.filter(s => s.requested).forEach(sys => {
      tasks.push({
        id: `sys-${sys.id}`,
        title: `Set up ${sys.name} (${sys.role})`,
        category: 'System Access',
        sourceType: 'system',
        sourceId: sys.id,
        assignmentType: 'role',
        roleAssignment: 'IT Team',
        daysOffset: -3,
        offsetType: 'before-start',
        priority: 'High',
        requiresApproval: true,
        approverRole: 'IT Admin',
        sendReminder: true,
        reminderDaysBefore: 2,
        notifyOnComplete: true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: true,
        isSelected: true,
        isConfigured: false,
      });
    });

    // Equipment tasks
    selectedAssets.filter(e => e.requested).forEach(asset => {
      tasks.push({
        id: `eq-${asset.id}`,
        title: `Provision ${asset.name}${asset.quantity > 1 ? ` x${asset.quantity}` : ''}`,
        category: 'Equipment',
        sourceType: 'asset',
        sourceId: asset.id,
        assignmentType: 'role',
        roleAssignment: 'IT Team',
        daysOffset: -2,
        offsetType: 'before-start',
        priority: 'Medium',
        requiresApproval: false,
        sendReminder: true,
        reminderDaysBefore: 1,
        notifyOnComplete: true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: false,
        isSelected: true,
        isConfigured: false,
      });
    });

    // Training tasks
    selectedTraining.filter(t => t.mandatory).forEach(tr => {
      tasks.push({
        id: `tr-${tr.id}`,
        title: tr.name,
        category: 'Training',
        sourceType: 'training',
        sourceId: tr.id,
        assignmentType: 'manager',
        daysOffset: 7,
        offsetType: 'after-start',
        priority: 'Medium',
        requiresApproval: false,
        sendReminder: true,
        reminderDaysBefore: 3,
        notifyOnComplete: true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: false,
        isSelected: true,
        isConfigured: false,
      });
    });

    return tasks;
  };

  // Handle opening the task configuration panel
  const handleOpenTaskConfig = (): void => {
    // Build tasks from current selections
    const tasks = buildTasksFromSelections();
    setConfiguredTasks(tasks);
    setShowTaskConfig(true);
  };

  // Handle task configuration confirmation
  const handleTasksConfirmed = (tasks: IConfigurableTask[]): void => {
    setConfiguredTasks(tasks);
    setTasksConfirmed(true);
    setShowTaskConfig(false);
  };

  const renderConfigureTasksStep = (): JSX.Element => {
    const totalTasks = buildTasksFromSelections().length;

    return (
      <>
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <div className={styles.formCardIcon}>
              <Icon iconName="TaskManager" style={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className={styles.formCardTitle}>Configure Tasks</h3>
              <p className={styles.formCardDescription}>Review and customize the {totalTasks} tasks that will be created</p>
            </div>
          </div>

          {totalTasks === 0 ? (
            <div className={`${styles.infoBox} ${styles.infoBoxWarning}`}>
              <Icon iconName="Warning" className={styles.infoBoxIcon} />
              <div>
                <strong>No tasks to configure</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>
                  Go back and select documents, systems, equipment, or training to create tasks.
                </p>
              </div>
            </div>
          ) : tasksConfirmed ? (
            <>
              <div className={`${styles.infoBox} ${styles.infoBoxSuccess}`}>
                <Icon iconName="CheckMark" className={styles.infoBoxIcon} />
                <div>
                  <strong>{configuredTasks.length} tasks configured</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>
                    Tasks have been reviewed and customized. Click below to make changes.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  onClick={handleOpenTaskConfig}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 20px',
                    background: '#005BAA',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <Icon iconName="Edit" style={{ fontSize: 16 }} />
                  Edit Task Configuration
                </button>
              </div>

              {/* Task summary */}
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#323130' }}>Configured Tasks Summary</h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  {configuredTasks.slice(0, 5).map(task => (
                    <div key={task.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      background: '#f9f9f9',
                      borderRadius: 8,
                      border: '1px solid #edebe9',
                    }}>
                      <Icon iconName="CheckboxComposite" style={{ fontSize: 14, color: '#005BAA' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{task.title}</div>
                        <div style={{ fontSize: 11, color: '#605e5c' }}>
                          {task.category} • {task.assigneeName || task.roleAssignment || 'Unassigned'} • {task.daysOffset} days {task.offsetType === 'before-start' ? 'before' : task.offsetType === 'after-start' ? 'after' : 'on'} start
                        </div>
                      </div>
                    </div>
                  ))}
                  {configuredTasks.length > 5 && (
                    <div style={{ fontSize: 12, color: '#605e5c', padding: '8px 14px' }}>
                      + {configuredTasks.length - 5} more tasks...
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={`${styles.infoBox} ${styles.infoBoxInfo}`}>
                <Icon iconName="Info" className={styles.infoBoxIcon} />
                <div>
                  <strong>Ready to configure {totalTasks} tasks</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12 }}>
                    Click the button below to open the task configuration panel where you can assign owners, set due dates, and customize each task.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <button
                  onClick={handleOpenTaskConfig}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '14px 24px',
                    background: 'linear-gradient(135deg, #005BAA 0%, #004A8F 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0,91,170,0.25)',
                  }}
                >
                  <Icon iconName="TaskManager" style={{ fontSize: 18 }} />
                  Configure {totalTasks} Tasks
                </button>
              </div>

              {/* Preview of tasks to be created */}
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#323130' }}>Tasks to be created:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 12, background: '#f0f7ff', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon iconName="DocumentSet" style={{ fontSize: 16, color: '#005BAA' }} />
                      <span style={{ fontWeight: 600 }}>{selectedDocs.filter(d => d.required).length}</span>
                      <span style={{ fontSize: 12, color: '#605e5c' }}>Document tasks</span>
                    </div>
                  </div>
                  <div style={{ padding: 12, background: '#f0f7ff', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon iconName="Permissions" style={{ fontSize: 16, color: '#005BAA' }} />
                      <span style={{ fontWeight: 600 }}>{selectedSystems.filter(s => s.requested).length}</span>
                      <span style={{ fontSize: 12, color: '#605e5c' }}>System tasks</span>
                    </div>
                  </div>
                  <div style={{ padding: 12, background: '#f0f7ff', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon iconName="Devices3" style={{ fontSize: 16, color: '#005BAA' }} />
                      <span style={{ fontWeight: 600 }}>{selectedAssets.filter(e => e.requested).length}</span>
                      <span style={{ fontSize: 12, color: '#605e5c' }}>Equipment tasks</span>
                    </div>
                  </div>
                  <div style={{ padding: 12, background: '#f0f7ff', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon iconName="Education" style={{ fontSize: 16, color: '#005BAA' }} />
                      <span style={{ fontWeight: 600 }}>{selectedTraining.filter(t => t.mandatory).length}</span>
                      <span style={{ fontSize: 12, color: '#605e5c' }}>Training tasks</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </>
    );
  };

  const renderReviewStep = (): JSX.Element => {
    const reqDocs = selectedDocs.filter(d => d.required);
    const systems = selectedSystems.filter(s => s.requested);
    const equip = selectedAssets.filter(e => e.requested);
    const mandatoryTraining = selectedTraining.filter(t => t.mandatory);

    return (
      <>
        {/* Employee Details - Full Width */}
        <div className={styles.formCard} style={{ marginBottom: 16 }}>
          <div className={styles.formCardHeader}>
            <div className={styles.formCardIcon}>
              <Icon iconName="Contact" style={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className={styles.formCardTitle}>Employee Details</h3>
            </div>
          </div>
          <div className={styles.formGrid}>
            <div><strong>Name:</strong> {wizardData.candidateName}</div>
            <div><strong>Job Title:</strong> {wizardData.jobTitle}</div>
            <div><strong>Department:</strong> {wizardData.department || 'Not specified'}</div>
            <div><strong>Start Date:</strong> {wizardData.startDate?.toLocaleDateString()}</div>
          </div>
        </div>

        {/* 3-Column Grid for Review Cards */}
        <div className={styles.reviewGrid}>
          {/* Documents Card */}
          <div className={styles.reviewCard}>
            <div className={styles.reviewCardHeader}>
              <div className={styles.reviewCardIcon}>
                <Icon iconName="DocumentSet" style={{ fontSize: 16 }} />
              </div>
              <h4 className={styles.reviewCardTitle}>Documents</h4>
              <span className={styles.reviewCardCount}>{reqDocs.length}</span>
            </div>
            <div className={styles.reviewCardList}>
              {reqDocs.length > 0 ? reqDocs.map(d => (
                <div key={d.id} className={styles.reviewCardItem}>
                  <div className={`${styles.reviewCardItemIcon} ${d.received ? styles.reviewCardItemIconSuccess : styles.reviewCardItemIconPending}`}>
                    <Icon iconName={d.received ? 'CheckMark' : 'Clock'} style={{ fontSize: 9 }} />
                  </div>
                  <span>{d.name}</span>
                </div>
              )) : (
                <div className={styles.reviewCardEmpty}>No documents required</div>
              )}
            </div>
          </div>

          {/* Systems Card */}
          <div className={styles.reviewCard}>
            <div className={styles.reviewCardHeader}>
              <div className={styles.reviewCardIcon}>
                <Icon iconName="Permissions" style={{ fontSize: 16 }} />
              </div>
              <h4 className={styles.reviewCardTitle}>System Access</h4>
              <span className={styles.reviewCardCount}>{systems.length}</span>
            </div>
            <div className={styles.reviewCardList}>
              {systems.length > 0 ? systems.map(s => (
                <div key={s.id} className={styles.reviewCardItem}>
                  <div className={`${styles.reviewCardItemIcon} ${styles.reviewCardItemIconSuccess}`}>
                    <Icon iconName="CheckMark" style={{ fontSize: 9 }} />
                  </div>
                  <span>{s.name} — {s.role}</span>
                </div>
              )) : (
                <div className={styles.reviewCardEmpty}>No systems selected</div>
              )}
            </div>
          </div>

          {/* Equipment Card */}
          <div className={styles.reviewCard}>
            <div className={styles.reviewCardHeader}>
              <div className={styles.reviewCardIcon}>
                <Icon iconName="Devices3" style={{ fontSize: 16 }} />
              </div>
              <h4 className={styles.reviewCardTitle}>Equipment</h4>
              <span className={styles.reviewCardCount}>{equip.length}</span>
            </div>
            <div className={styles.reviewCardList}>
              {equip.length > 0 ? equip.map(e => (
                <div key={e.id} className={styles.reviewCardItem}>
                  <div className={`${styles.reviewCardItemIcon} ${styles.reviewCardItemIconSuccess}`}>
                    <Icon iconName="CheckMark" style={{ fontSize: 9 }} />
                  </div>
                  <span>{e.name}{e.quantity > 1 ? ` x${e.quantity}` : ''}</span>
                </div>
              )) : (
                <div className={styles.reviewCardEmpty}>No equipment assigned</div>
              )}
            </div>
          </div>

          {/* Training Card */}
          <div className={styles.reviewCard}>
            <div className={styles.reviewCardHeader}>
              <div className={styles.reviewCardIcon}>
                <Icon iconName="Education" style={{ fontSize: 16 }} />
              </div>
              <h4 className={styles.reviewCardTitle}>Training</h4>
              <span className={styles.reviewCardCount}>{mandatoryTraining.length}</span>
            </div>
            <div className={styles.reviewCardList}>
              {mandatoryTraining.length > 0 ? mandatoryTraining.map(t => (
                <div key={t.id} className={styles.reviewCardItem}>
                  <div className={`${styles.reviewCardItemIcon} ${t.scheduled ? styles.reviewCardItemIconSuccess : styles.reviewCardItemIconPending}`}>
                    <Icon iconName={t.scheduled ? 'CheckMark' : 'Clock'} style={{ fontSize: 9 }} />
                  </div>
                  <span>{t.name}</span>
                </div>
              )) : (
                <div className={styles.reviewCardEmpty}>No training required</div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className={`${styles.infoBox} ${styles.infoBoxError}`} style={{ marginTop: 16 }}>
            <Icon iconName="Error" className={styles.infoBoxIcon} />
            <div>{error}</div>
          </div>
        )}
      </>
    );
  };

  // Success screen
  if (submitted) {
    const summaryPanels: ISummaryPanel[] = [
      {
        title: 'Documents',
        icon: 'DocumentSet',
        items: selectedDocs.filter(d => d.required).map(d => ({ label: d.name, completed: true })),
      },
      {
        title: 'System Access',
        icon: 'Permissions',
        items: selectedSystems.filter(s => s.requested).map(s => ({ label: `${s.name} (${s.role})`, completed: true })),
      },
      {
        title: 'Equipment',
        icon: 'Devices3',
        items: selectedAssets.filter(e => e.requested).map(e => ({ label: `${e.name}${e.quantity > 1 ? ` x${e.quantity}` : ''}`, completed: true })),
      },
    ];

    // Add training as 4th panel if there are items
    if (selectedTraining.filter(t => t.mandatory).length > 0) {
      summaryPanels.push({
        title: 'Training',
        icon: 'Education',
        items: selectedTraining.filter(t => t.mandatory).map(t => ({ label: t.name, completed: true })),
      });
    }

    return (
      <JmlWizardSuccess
        theme="joiner"
        icon="CheckMark"
        title="Onboarding Created Successfully!"
        subtitle={`${wizardData.candidateName} • ${wizardData.jobTitle} • ${wizardData.department} • Starts ${wizardData.startDate?.toLocaleDateString()}`}
        stats={[
          { value: selectedDocs.filter(d => d.required).length, label: 'Documents' },
          { value: selectedSystems.filter(s => s.requested).length, label: 'Systems' },
          { value: selectedAssets.filter(e => e.requested).length, label: 'Equipment' },
          { value: selectedTraining.filter(t => t.mandatory).length, label: 'Training' },
        ]}
        summaryPanels={summaryPanels}
        primaryAction={{ icon: 'AddFriend', tooltip: 'Onboard Another Employee', onClick: () => { setSubmitted(false); setCurrentStep(0); setWizardData({ documents: [], systemAccess: [], equipment: [], training: [] }); } }}
        secondaryAction={{ icon: 'ChromeClose', tooltip: 'Close', onClick: onComplete }}
      />
    );
  }

  const progressPercent = Math.round((currentStep / (STEPS.length - 1)) * 100);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100vh' }}>
      <JmlWizardLayout
        theme="joiner"
        title="Onboarding"
        subtitle="New Employee"
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
        loading={loadingConfig}
        loadingText="Loading configuration..."
        tips={getTips()}
        checklist={getChecklist()}
        progressPercent={progressPercent}
        progressText={`Step ${currentStep + 1} of ${STEPS.length}`}
        onBack={handleBack}
        onCancel={onCancel}
        onNext={handleNext}
        onSubmit={handleSubmit}
        nextDisabled={!canProceed()}
        submitDisabled={submitting}
        isLastStep={currentStep === STEPS.length - 1}
        isSubmitting={submitting}
        submitLabel="Start Onboarding"
      >
        {renderStepContent()}
      </JmlWizardLayout>

      {/* Task Configuration Overlay (Option B: Full Overlay) */}
      <TaskConfigurationOverlay
        sp={sp}
        context={context}
        isOpen={showTaskConfig}
        tasks={configuredTasks.length > 0 ? configuredTasks : buildTasksFromSelections()}
        startDate={wizardData.startDate || new Date()}
        employeeName={wizardData.candidateName || 'New Employee'}
        processType="onboarding"
        onBack={() => setShowTaskConfig(false)}
        onConfirm={handleTasksConfirmed}
      />
    </div>
  );
};
