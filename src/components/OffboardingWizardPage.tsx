import * as React from 'react';
import { useState, useEffect } from 'react';
import { SPFI } from '@pnp/sp';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { Icon } from '@fluentui/react/lib/Icon';
import { JmlWizardLayout, JmlWizardSuccess, IJmlWizardStep, IJmlWizardTip, IJmlWizardChecklistItem, ISummaryPanel } from './JmlWizardLayout';
import { TaskConfigurationOverlay, IConfigurableTask } from './TaskConfigurationOverlay';
import { OffboardingService } from '../services/OffboardingService';
import { OnboardingConfigService } from '../services/OnboardingConfigService';
import { GraphNotificationService } from '../services/GraphNotificationService';
import { TeamsNotificationService } from '../services/TeamsNotificationService';
import { InAppNotificationService } from '../services/InAppNotificationService';
import {
  OffboardingStatus, OffboardingTaskCategory,
  OffboardingTaskStatus, TerminationType, AssetReturnStatus, IEligibleEmployee
} from '../models/IOffboarding';
import { AssetCategory, SystemAccessCategory } from '../models/IOnboardingConfig';
import styles from '../styles/JmlWizard.module.scss';

interface IProps {
  sp: SPFI;
  context?: WebPartContext;
  onComplete: () => void;
  onCancel: () => void;
}

interface IAssetToReturn {
  assetTypeId?: number;
  assetName: string;
  assetTag?: string;
  category: string;
  quantity: number;
  requiresDataWipe: boolean;
  selected: boolean;
}

interface ISystemToRevoke {
  systemAccessTypeId?: number;
  systemName: string;
  category: string;
  currentRole: string;
  selected: boolean;
}

interface IKnowledgeTransfer {
  description: string;
  assignedTo?: string;
  dueDate?: Date;
}

const STEPS: IJmlWizardStep[] = [
  { key: 'employee', label: 'Select Employee', icon: 'Contact' },
  { key: 'termination', label: 'Termination Details', icon: 'UserRemove' },
  { key: 'assets', label: 'Asset Return', icon: 'Devices3' },
  { key: 'systems', label: 'System Access', icon: 'Permissions' },
  { key: 'interview', label: 'Exit Interview', icon: 'CannedChat' },
  { key: 'knowledge', label: 'Knowledge Transfer', icon: 'BookAnswers' },
  { key: 'tasks', label: 'Configure Tasks', icon: 'TaskManager' },
  { key: 'review', label: 'Review & Submit', icon: 'CheckList' },
];

const TERMINATION_OPTIONS: IDropdownOption[] = [
  { key: TerminationType.Resignation, text: 'Resignation' },
  { key: TerminationType.Termination, text: 'Termination' },
  { key: TerminationType.Redundancy, text: 'Redundancy' },
  { key: TerminationType.Retirement, text: 'Retirement' },
  { key: TerminationType.ContractEnd, text: 'Contract End' },
  { key: TerminationType.Other, text: 'Other' },
];

export const OffboardingWizardPage: React.FC<IProps> = ({ sp, context, onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [employees, setEmployees] = useState<IEligibleEmployee[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Task configuration state
  const [showTaskConfig, setShowTaskConfig] = useState(false);
  const [configuredTasks, setConfiguredTasks] = useState<IConfigurableTask[]>([]);
  const [tasksConfirmed, setTasksConfirmed] = useState(false);

  // Wizard data
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [lastWorkingDate, setLastWorkingDate] = useState<Date | undefined>(undefined);
  const [terminationType, setTerminationType] = useState<TerminationType>(TerminationType.Resignation);
  const [notes, setNotes] = useState('');
  const [referenceEligible, setReferenceEligible] = useState(true);
  const [rehireEligible, setRehireEligible] = useState(true);

  const [assetsToReturn, setAssetsToReturn] = useState<IAssetToReturn[]>([]);
  const [systemsToRevoke, setSystemsToRevoke] = useState<ISystemToRevoke[]>([]);

  // Accordion expand states for categorized lists
  const [expandedAssetCategories, setExpandedAssetCategories] = useState<Set<string>>(new Set(['Hardware']));
  const [expandedSystemCategories, setExpandedSystemCategories] = useState<Set<string>>(new Set(['Core']));

  const [exitInterviewDate, setExitInterviewDate] = useState<Date | undefined>(undefined);
  const [exitInterviewNotes, setExitInterviewNotes] = useState('');
  const [knowledgeTransfer, setKnowledgeTransfer] = useState<IKnowledgeTransfer[]>([]);

  useEffect(() => {
    loadData();
  }, [sp]);

  const loadData = async (): Promise<void> => {
    setLoadingData(true);
    try {
      const offSvc = new OffboardingService(sp);
      const configSvc = new OnboardingConfigService(sp);

      const [emps, assetTypesData, systemTypesData] = await Promise.all([
        offSvc.getEligibleEmployeesForOffboarding(),
        configSvc.getAssetTypes({ isActive: true }),
        configSvc.getSystemAccessTypes({ isActive: true }),
      ]);

      setEmployees(emps);

      setAssetsToReturn(assetTypesData.filter(a => a.IsReturnable).map(a => ({
        assetTypeId: a.Id,
        assetName: a.Title,
        category: a.Category || AssetCategory.Hardware,
        quantity: 1,
        requiresDataWipe: a.Category === 'Hardware',
        selected: false
      })));

      setSystemsToRevoke(systemTypesData.map(s => ({
        systemAccessTypeId: s.Id,
        systemName: s.Title,
        category: s.Category || SystemAccessCategory.Core,
        currentRole: s.DefaultRole || 'Standard',
        selected: true
      })));
    } catch (err) {
      console.error('[OffboardingWizardPage] Error loading data:', err);
    }
    setLoadingData(false);
  };

  const onSelectEmployee = (employeeId: number): void => {
    const emp = employees.find(e => e.Id === employeeId);
    if (emp) {
      setSelectedEmployeeId(emp.Id);
      setEmployeeName(emp.EmployeeName);
      setEmployeeEmail(emp.EmployeeEmail || '');
      setJobTitle(emp.JobTitle);
      setDepartment(emp.Department || '');
    }
  };

  const canProceed = (): boolean => {
    if (currentStep === 0) return !!selectedEmployeeId;
    if (currentStep === 1) return !!lastWorkingDate && !!terminationType;
    if (currentStep === 6) return tasksConfirmed; // Must confirm tasks before review
    return true;
  };

  // Build tasks from selections for TaskConfigurationOverlay
  const buildTasksFromSelections = (): IConfigurableTask[] => {
    const tasks: IConfigurableTask[] = [];
    let taskIdCounter = 1;

    // Asset return tasks
    const selectedAssets = assetsToReturn.filter(a => a.selected);
    for (const asset of selectedAssets) {
      tasks.push({
        id: `asset-${taskIdCounter++}`,
        title: `Return: ${asset.assetName}${asset.assetTag ? ` (${asset.assetTag})` : ''}`,
        category: 'Equipment',
        sourceType: 'asset',
        sourceId: asset.assetTypeId,
        assignmentType: 'role',
        roleAssignment: asset.category === 'Hardware' ? 'IT Team' : 'Facilities',
        daysOffset: 0,
        offsetType: 'on-start',
        priority: 'High',
        requiresApproval: false,
        sendReminder: true,
        reminderDaysBefore: 2,
        notifyOnComplete: true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: false,
        instructions: asset.requiresDataWipe ? 'Data wipe required before reissuing.' : undefined,
        isSelected: true,
        isConfigured: false,
      });
    }

    // System revocation tasks
    const selectedSystems = systemsToRevoke.filter(s => s.selected);
    for (const sys of selectedSystems) {
      tasks.push({
        id: `sys-${taskIdCounter++}`,
        title: `Revoke access: ${sys.systemName}`,
        category: 'System Access',
        sourceType: 'system',
        sourceId: sys.systemAccessTypeId,
        assignmentType: 'role',
        roleAssignment: 'IT Team',
        daysOffset: 0,
        offsetType: 'on-start',
        priority: 'High',
        requiresApproval: false,
        sendReminder: true,
        reminderDaysBefore: 1,
        notifyOnComplete: true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: false,
        isSelected: true,
        isConfigured: false,
      });
    }

    // Exit interview task
    if (exitInterviewDate) {
      tasks.push({
        id: `interview-${taskIdCounter++}`,
        title: 'Conduct exit interview',
        category: 'General',
        sourceType: 'custom',
        assignmentType: 'role',
        roleAssignment: 'HR Team',
        daysOffset: 0,
        offsetType: 'before-start',
        priority: 'Medium',
        requiresApproval: false,
        sendReminder: true,
        reminderDaysBefore: 2,
        notifyOnComplete: true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: false,
        instructions: exitInterviewNotes || undefined,
        isSelected: true,
        isConfigured: false,
      });
    }

    // Knowledge transfer tasks
    const ktTasks = knowledgeTransfer.filter(k => k.description.trim());
    for (const kt of ktTasks) {
      tasks.push({
        id: `kt-${taskIdCounter++}`,
        title: `Knowledge transfer: ${kt.description}`,
        category: 'General',
        sourceType: 'custom',
        assignmentType: kt.assignedTo ? 'specific' : 'role',
        assigneeName: kt.assignedTo,
        roleAssignment: kt.assignedTo ? undefined : 'Department Head',
        daysOffset: 3,
        offsetType: 'before-start',
        priority: 'Medium',
        requiresApproval: false,
        sendReminder: true,
        reminderDaysBefore: 2,
        notifyOnComplete: true,
        notifyAssigneeEmail: true,
        notifyTeamsChat: false,
        isSelected: true,
        isConfigured: false,
      });
    }

    // Standard offboarding tasks
    tasks.push({
      id: `std-${taskIdCounter++}`,
      title: 'Process final payment',
      category: 'General',
      sourceType: 'custom',
      assignmentType: 'role',
      roleAssignment: 'Finance',
      daysOffset: 0,
      offsetType: 'on-start',
      priority: 'High',
      requiresApproval: false,
      sendReminder: true,
      reminderDaysBefore: 1,
      notifyOnComplete: true,
      notifyAssigneeEmail: true,
      notifyTeamsChat: false,
      isSelected: true,
      isConfigured: false,
    });

    tasks.push({
      id: `std-${taskIdCounter++}`,
      title: 'Complete exit documentation',
      category: 'Documentation',
      sourceType: 'custom',
      assignmentType: 'role',
      roleAssignment: 'HR Team',
      daysOffset: 0,
      offsetType: 'on-start',
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

    return tasks;
  };

  // Handle opening task configuration
  const handleOpenTaskConfig = (): void => {
    const tasks = buildTasksFromSelections();
    setConfiguredTasks(tasks);
    setShowTaskConfig(true);
  };

  // Handle task configuration confirmation
  const handleTaskConfigConfirm = (tasks: IConfigurableTask[]): void => {
    setConfiguredTasks(tasks);
    setTasksConfirmed(true);
    setShowTaskConfig(false);
  };

  // Handle going back from task config
  const handleTaskConfigBack = (): void => {
    setShowTaskConfig(false);
  };

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError('');
    try {
      const svc = new OffboardingService(sp);

      const totalTasks = configuredTasks.filter(t => t.isSelected).length;

      const offboarding = await svc.createOffboarding({
        EmployeeId: selectedEmployeeId!,
        EmployeeName: employeeName,
        EmployeeEmail: employeeEmail,
        JobTitle: jobTitle,
        Department: department,
        LastWorkingDate: lastWorkingDate,
        TerminationType: terminationType,
        Status: OffboardingStatus.InProgress,
        CompletionPercentage: 0,
        TotalTasks: totalTasks,
        CompletedTasks: 0,
        ExitInterviewDate: exitInterviewDate,
        ExitInterviewCompleted: false,
        ExitInterviewNotes: exitInterviewNotes,
        ReferenceEligible: referenceEligible,
        RehireEligible: rehireEligible,
        Notes: notes,
      });

      if (offboarding?.Id) {
        // Create asset return records
        for (const asset of assetsToReturn.filter(a => a.selected)) {
          await svc.createAssetReturn({
            OffboardingId: offboarding.Id,
            AssetTypeId: asset.assetTypeId,
            AssetName: asset.assetName,
            AssetTag: asset.assetTag,
            Quantity: asset.quantity,
            Status: AssetReturnStatus.PendingReturn,
            RequiresDataWipe: asset.requiresDataWipe,
            DataWipeCompleted: false,
          });
        }

        // Map category from IConfigurableTask to OffboardingTaskCategory
        const mapCategory = (cat: string, title: string): OffboardingTaskCategory => {
          if (cat === 'Equipment') return OffboardingTaskCategory.AssetReturn;
          if (cat === 'System Access') return OffboardingTaskCategory.SystemAccess;
          if (cat === 'Documentation') return OffboardingTaskCategory.Documentation;
          if (title.toLowerCase().includes('interview')) return OffboardingTaskCategory.ExitInterview;
          if (title.toLowerCase().includes('knowledge')) return OffboardingTaskCategory.KnowledgeTransfer;
          if (title.toLowerCase().includes('payment') || title.toLowerCase().includes('final pay')) return OffboardingTaskCategory.FinalPay;
          return OffboardingTaskCategory.Documentation;
        };

        // Calculate due date from task configuration
        const calculateDueDate = (task: IConfigurableTask): Date => {
          const date = new Date(lastWorkingDate!);
          if (task.offsetType === 'before-start') {
            date.setDate(date.getDate() - Math.abs(task.daysOffset));
          } else if (task.offsetType === 'after-start') {
            date.setDate(date.getDate() + Math.abs(task.daysOffset));
          }
          return date;
        };

        // Create tasks from configured tasks
        const createdTasks: Array<{ id: number; task: IConfigurableTask }> = [];
        let sortOrder = 1;

        for (const task of configuredTasks.filter(t => t.isSelected)) {
          // Map priority - some interfaces only support Low/Medium/High
          const taskPriority: 'Low' | 'Medium' | 'High' = task.priority === 'Critical' ? 'High' : task.priority;

          const createdTask = await svc.createOffboardingTask({
            Title: task.title,
            OffboardingId: offboarding.Id,
            Category: mapCategory(task.category, task.title),
            Status: OffboardingTaskStatus.Pending,
            Priority: taskPriority,
            SortOrder: sortOrder++,
            DueDate: calculateDueDate(task),
            AssignedToId: task.assigneeId,
            Notes: task.instructions ? `${task.instructions}\n\nAssigned to: ${task.assigneeName || task.roleAssignment || 'Unassigned'}` : `Assigned to: ${task.assigneeName || task.roleAssignment || 'Unassigned'}`,
            RelatedSystemAccessId: task.sourceType === 'system' ? task.sourceId : undefined,
          });

          if (createdTask?.Id) {
            createdTasks.push({ id: createdTask.Id, task });
          }
        }

        await svc.recalculateProgress(offboarding.Id);

        // ═══════════════════════════════════════════════════════════════════════════════
        // SEND NOTIFICATIONS (fire-and-forget to avoid blocking submission)
        // ═══════════════════════════════════════════════════════════════════════════════
        if (context) {
          const currentUserEmail = context.pageContext?.user?.email || '';
          const graphNotificationService = new GraphNotificationService(sp, context);
          const teamsNotificationService = new TeamsNotificationService(sp, context);
          const inAppNotificationService = new InAppNotificationService(sp, currentUserEmail);

          for (const { id: taskId, task } of createdTasks) {
            if (task.assigneeEmail) {
              const dueDate = calculateDueDate(task);
              const actionUrl = `${window.location.origin}${window.location.pathname}?view=offboarding&id=${offboarding.Id}`;

              // Map priority - ITaskNotification doesn't support 'Critical'
              const mappedPriority: 'Low' | 'Medium' | 'High' = task.priority === 'Critical' ? 'High' : task.priority;

              // 1. EMAIL NOTIFICATION via Graph API
              if (task.notifyAssigneeEmail !== false) {
                const emailNotification = {
                  taskTitle: task.title,
                  taskCategory: task.category,
                  employeeName: employeeName,
                  processType: 'Offboarding' as const,
                  dueDate: dueDate,
                  assignedTo: {
                    email: task.assigneeEmail,
                    displayName: task.assigneeName || task.assigneeEmail,
                  },
                  actionUrl: actionUrl,
                };

                graphNotificationService.notifyTaskAssigned(emailNotification).catch(err => {
                  console.warn('[OffboardingWizardPage] Email notification failed (non-blocking):', err);
                });
              }

              // 2. TEAMS NOTIFICATION
              if (task.notifyTeamsChat) {
                const teamsNotification = {
                  taskId: taskId,
                  taskTitle: task.title,
                  category: 'Offboarding' as const,
                  employeeName: employeeName,
                  assignedToEmail: task.assigneeEmail,
                  dueDate: dueDate,
                  priority: mappedPriority,
                  actionUrl: actionUrl,
                };

                teamsNotificationService.sendTaskNotification(teamsNotification).catch(err => {
                  console.warn('[OffboardingWizardPage] Teams notification failed (non-blocking):', err);
                });
              }

              // 3. IN-APP NOTIFICATION
              inAppNotificationService.notifyTaskAssigned(
                task.assigneeEmail,
                task.title,
                employeeName,
                'Offboarding',
                taskId,
                actionUrl
              ).catch(err => {
                console.warn('[OffboardingWizardPage] In-app notification failed (non-blocking):', err);
              });
            }
          }
        }

        setSubmitted(true);
      }
    } catch (err) {
      console.error('[OffboardingWizardPage] Error submitting:', err);
      setError('Failed to create offboarding. Please try again.');
    }
    setSubmitting(false);
  };

  const getTips = (): IJmlWizardTip[] => {
    switch (currentStep) {
      case 0:
        return [
          { icon: 'Contact', title: 'Eligible Employees', content: 'Only employees with completed or in-progress onboarding can be offboarded.' },
          { icon: 'Warning', title: 'Verify Status', content: 'Ensure the employee has formally resigned or been terminated before proceeding.' },
        ];
      case 1:
        return [
          { icon: 'Calendar', title: 'Last Working Date', content: 'This determines task deadlines and system access revocation timing.' },
          { icon: 'Info', title: 'Eligibility', content: 'Set reference and rehire eligibility based on company policy and circumstances.' },
        ];
      case 2:
        return [
          { icon: 'Devices3', title: 'Asset Return', content: 'Select all company assets that need to be returned by the employee.' },
          { icon: 'Shield', title: 'Data Security', content: 'Mark assets for data wipe if they contain sensitive information.' },
        ];
      case 3:
        return [
          { icon: 'Permissions', title: 'Access Revocation', content: 'All selected systems will have access removed on the last working date.' },
          { icon: 'Warning', title: 'Critical', content: 'Review system access carefully to ensure no security gaps.' },
        ];
      case 4:
        return [
          { icon: 'CannedChat', title: 'Exit Interview', content: 'Schedule an exit interview to gather feedback and ensure smooth transition.' },
          { icon: 'Lightbulb', title: 'Topics', content: 'Cover job satisfaction, reasons for leaving, and improvement suggestions.' },
        ];
      case 5:
        return [
          { icon: 'BookAnswers', title: 'Knowledge Transfer', content: 'Document critical knowledge that needs to be transferred before departure.' },
          { icon: 'Clock', title: 'Plan Ahead', content: 'Allow sufficient time for thorough knowledge transfer sessions.' },
        ];
      case 6:
        return [
          { icon: 'TaskManager', title: 'Configure Tasks', content: 'Customize task assignments, due dates, and notification settings.' },
          { icon: 'Contact', title: 'Assignees', content: 'Assign tasks to specific people or teams for accountability.' },
        ];
      case 7:
        return [
          { icon: 'CheckList', title: 'Final Review', content: 'Verify all details before creating the offboarding record.' },
          { icon: 'Warning', title: 'Tasks', content: 'Tasks will be created with your configured settings.' },
        ];
      default:
        return [];
    }
  };

  const getChecklist = (): IJmlWizardChecklistItem[] => [
    { label: 'Employee selected', completed: !!selectedEmployeeId },
    { label: 'Termination details set', completed: !!lastWorkingDate && !!terminationType },
    { label: 'Assets reviewed', completed: currentStep > 2 },
    { label: 'Systems reviewed', completed: currentStep > 3 },
    { label: 'Exit interview scheduled', completed: !!exitInterviewDate },
    { label: 'Knowledge transfer planned', completed: knowledgeTransfer.some(k => k.description.trim()) },
    { label: 'Tasks configured', completed: tasksConfirmed },
  ];

  const renderStepContent = (): JSX.Element => {
    switch (currentStep) {
      case 0: return renderEmployeeStep();
      case 1: return renderTerminationStep();
      case 2: return renderAssetsStep();
      case 3: return renderSystemsStep();
      case 4: return renderInterviewStep();
      case 5: return renderKnowledgeStep();
      case 6: return renderTasksStep();
      case 7: return renderReviewStep();
      default: return <div />;
    }
  };

  const renderEmployeeStep = (): JSX.Element => (
    <div className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div className={styles.formCardIcon}>
          <Icon iconName="Contact" style={{ fontSize: 18 }} />
        </div>
        <div>
          <h3 className={styles.formCardTitle}>Select Employee</h3>
          <p className={styles.formCardDescription}>Choose an employee to begin the offboarding process</p>
        </div>
      </div>

      {employees.length > 0 ? (
        <div className={styles.scrollableList}>
          {employees.map(emp => (
            <div
              key={emp.Id}
              className={`${styles.listItem} ${selectedEmployeeId === emp.Id ? styles.listItemSelected : ''}`}
              onClick={() => onSelectEmployee(emp.Id)}
              style={selectedEmployeeId === emp.Id ? { borderLeftColor: '#d13438' } : {}}
            >
              <Icon iconName="Contact" style={{ fontSize: 20, color: '#d13438' }} />
              <div>
                <div className={styles.listItemTitle}>{emp.EmployeeName}</div>
                <div className={styles.listItemSubtitle}>
                  {emp.JobTitle} {emp.Department && `• ${emp.Department}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`${styles.infoBox} ${styles.infoBoxWarning}`}>
          <Icon iconName="Warning" className={styles.infoBoxIcon} />
          <div>No employees available for offboarding. Employees must have completed or in-progress onboarding.</div>
        </div>
      )}

      {selectedEmployeeId && (
        <div className={`${styles.infoBox} ${styles.infoBoxError}`} style={{ marginTop: 16 }}>
          <Icon iconName="UserRemove" className={styles.infoBoxIcon} />
          <div>
            <strong>{employeeName}</strong> selected for offboarding.
            <div style={{ fontSize: 12, marginTop: 4 }}>{jobTitle} — {department}</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTerminationStep = (): JSX.Element => (
    <div className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div className={styles.formCardIcon}>
          <Icon iconName="UserRemove" style={{ fontSize: 18 }} />
        </div>
        <div>
          <h3 className={styles.formCardTitle}>Termination Details</h3>
          <p className={styles.formCardDescription}>Enter the termination details for this employee</p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <Dropdown
          label="Termination Type"
          required
          selectedKey={terminationType}
          options={TERMINATION_OPTIONS}
          onChange={(_, opt) => setTerminationType(opt?.key as TerminationType)}
        />
        <DatePicker
          label="Last Working Date"
          isRequired
          value={lastWorkingDate}
          onSelectDate={(date) => setLastWorkingDate(date || undefined)}
          minDate={new Date()}
        />
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 24 }}>
        <Toggle
          label="Eligible for reference"
          checked={referenceEligible}
          onChange={(_, c) => setReferenceEligible(!!c)}
        />
        <Toggle
          label="Eligible for rehire"
          checked={rehireEligible}
          onChange={(_, c) => setRehireEligible(!!c)}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <TextField
          label="Notes"
          multiline
          rows={3}
          value={notes}
          onChange={(_, v) => setNotes(v || '')}
          placeholder="Any additional notes about this termination..."
        />
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // ASSETS STEP - Accordion by Category (Hardware, Software, Furniture, Access, Other)
  // ═══════════════════════════════════════════════════════════════════════════════

  const ASSET_CATEGORY_CONFIG: Record<string, { icon: string; label: string; styleClass: string }> = {
    Hardware: { icon: 'Devices3', label: 'Hardware', styleClass: styles.accordionIconHardware },
    Software: { icon: 'Code', label: 'Software', styleClass: styles.accordionIconIT },
    Furniture: { icon: 'Presentation', label: 'Furniture', styleClass: styles.accordionIconFinance },
    Access: { icon: 'Permissions', label: 'Access Cards & Keys', styleClass: styles.accordionIconCompliance },
    Other: { icon: 'More', label: 'Other', styleClass: styles.accordionIconHR },
  };

  // Devices that can have data wiped (contain storage/memory that may hold sensitive data)
  const DATA_WIPEABLE_ASSETS = [
    'laptop', 'computer', 'desktop', 'pc', 'workstation',
    'phone', 'mobile', 'smartphone', 'iphone', 'android',
    'tablet', 'ipad',
    'hard drive', 'hdd', 'ssd', 'external drive', 'storage',
    'usb', 'flash drive', 'thumb drive', 'memory stick',
    'server', 'nas'
  ];

  const canAssetHaveDataWiped = (assetName: string): boolean => {
    const lowerName = assetName.toLowerCase();
    return DATA_WIPEABLE_ASSETS.some(keyword => lowerName.includes(keyword));
  };

  const toggleAssetCategory = (category: string): void => {
    setExpandedAssetCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) newSet.delete(category);
      else newSet.add(category);
      return newSet;
    });
  };

  const groupedAssets = assetsToReturn.reduce((acc, asset) => {
    const cat = asset.category || 'Hardware';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {} as Record<string, typeof assetsToReturn>);

  const renderAssetsStep = (): JSX.Element => {
    const categories = Object.keys(ASSET_CATEGORY_CONFIG).filter(cat => groupedAssets[cat]?.length > 0);

    if (assetsToReturn.length === 0) {
      return (
        <div className={`${styles.infoBox} ${styles.infoBoxWarning}`}>
          <Icon iconName="Info" className={styles.infoBoxIcon} />
          <div>No assets configured for return. Add asset types in the Admin Center.</div>
        </div>
      );
    }

    return (
      <div className={styles.accordionContainer}>
        {categories.map(category => {
          const assetsInCategory = groupedAssets[category] || [];
          const selectedCount = assetsInCategory.filter(a => a.selected).length;
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
                    {selectedCount}/{assetsInCategory.length} for return
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
                    const assetIndex = assetsToReturn.findIndex(a => a.assetTypeId === asset.assetTypeId);
                    return (
                      <div key={asset.assetTypeId || asset.assetName} className={styles.accordionItem}>
                        <input
                          type="checkbox"
                          checked={asset.selected}
                          onChange={(e) => {
                            const arr = [...assetsToReturn];
                            arr[assetIndex] = { ...arr[assetIndex], selected: e.target.checked };
                            setAssetsToReturn(arr);
                          }}
                          className={styles.accordionItemCheckbox}
                        />
                        <span className={styles.accordionItemLabel}>{asset.assetName}</span>
                        <div className={styles.accordionItemActions} style={{ gap: 8 }}>
                          <TextField
                            placeholder="Asset Tag"
                            value={asset.assetTag || ''}
                            style={{ width: 100 }}
                            onChange={(_, v) => {
                              const arr = [...assetsToReturn];
                              arr[assetIndex] = { ...arr[assetIndex], assetTag: v };
                              setAssetsToReturn(arr);
                            }}
                          />
                          {canAssetHaveDataWiped(asset.assetName) && (
                            <Toggle
                              label="Data Wipe"
                              inlineLabel
                              checked={asset.requiresDataWipe}
                              onChange={(_, c) => {
                                const arr = [...assetsToReturn];
                                arr[assetIndex] = { ...arr[assetIndex], requiresDataWipe: !!c };
                                setAssetsToReturn(arr);
                              }}
                              styles={{ root: { marginBottom: 0 } }}
                            />
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

        <button
          onClick={() => setAssetsToReturn([...assetsToReturn, {
            assetName: '', category: 'Other', quantity: 1, requiresDataWipe: false, selected: true
          }])}
          className={styles.btnSecondary}
          style={{ marginTop: 12 }}
        >
          <Icon iconName="Add" style={{ fontSize: 12 }} />
          Add Custom Asset
        </button>
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

  const groupedSystems = systemsToRevoke.reduce((acc, sys) => {
    const cat = sys.category || 'Core';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sys);
    return acc;
  }, {} as Record<string, typeof systemsToRevoke>);

  const renderSystemsStep = (): JSX.Element => {
    const categories = Object.keys(SYSTEM_CATEGORY_CONFIG).filter(cat => groupedSystems[cat]?.length > 0);

    if (systemsToRevoke.length === 0) {
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
          const selectedCount = systemsInCategory.filter(s => s.selected).length;
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
                    {selectedCount}/{systemsInCategory.length} to revoke
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
                    const sysIndex = systemsToRevoke.findIndex(s => s.systemAccessTypeId === sys.systemAccessTypeId);
                    return (
                      <div key={sys.systemAccessTypeId} className={styles.accordionItem}>
                        <input
                          type="checkbox"
                          checked={sys.selected}
                          onChange={(e) => {
                            const arr = [...systemsToRevoke];
                            arr[sysIndex] = { ...arr[sysIndex], selected: e.target.checked };
                            setSystemsToRevoke(arr);
                          }}
                          className={styles.accordionItemCheckbox}
                        />
                        <span className={styles.accordionItemLabel}>{sys.systemName}</span>
                        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8a8886' }}>
                          Current: {sys.currentRole}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        <div className={`${styles.infoBox} ${styles.infoBoxWarning}`} style={{ marginTop: 16 }}>
          <Icon iconName="Warning" className={styles.infoBoxIcon} />
          <div>Access will be revoked on or before the last working date. Ensure all critical handoffs are complete.</div>
        </div>
      </div>
    );
  };

  const renderInterviewStep = (): JSX.Element => (
    <div className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div className={styles.formCardIcon}>
          <Icon iconName="CannedChat" style={{ fontSize: 18 }} />
        </div>
        <div>
          <h3 className={styles.formCardTitle}>Exit Interview</h3>
          <p className={styles.formCardDescription}>Schedule an exit interview (optional)</p>
        </div>
      </div>

      <DatePicker
        label="Exit Interview Date"
        value={exitInterviewDate}
        onSelectDate={(date) => setExitInterviewDate(date || undefined)}
        minDate={new Date()}
      />

      <div style={{ marginTop: 16 }}>
        <TextField
          label="Interview Topics / Notes"
          multiline
          rows={4}
          value={exitInterviewNotes}
          onChange={(_, v) => setExitInterviewNotes(v || '')}
          placeholder="Topics to cover during the exit interview..."
        />
      </div>

      {!exitInterviewDate && (
        <div className={`${styles.infoBox} ${styles.infoBoxInfo}`} style={{ marginTop: 16 }}>
          <Icon iconName="Info" className={styles.infoBoxIcon} />
          <div>Exit interviews are optional but recommended to gather valuable feedback.</div>
        </div>
      )}
    </div>
  );

  const renderKnowledgeStep = (): JSX.Element => (
    <div className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div className={styles.formCardIcon}>
          <Icon iconName="BookAnswers" style={{ fontSize: 18 }} />
        </div>
        <div>
          <h3 className={styles.formCardTitle}>Knowledge Transfer</h3>
          <p className={styles.formCardDescription}>Add knowledge transfer tasks for smooth handover</p>
        </div>
      </div>

      {knowledgeTransfer.map((kt, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
          <TextField
            label={i === 0 ? 'Description' : undefined}
            value={kt.description}
            style={{ flex: 1 }}
            placeholder="What needs to be transferred..."
            onChange={(_, v) => {
              const arr = [...knowledgeTransfer];
              arr[i] = { ...arr[i], description: v || '' };
              setKnowledgeTransfer(arr);
            }}
          />
          <DatePicker
            label={i === 0 ? 'Due Date' : undefined}
            value={kt.dueDate}
            onSelectDate={(date) => {
              const arr = [...knowledgeTransfer];
              arr[i] = { ...arr[i], dueDate: date || undefined };
              setKnowledgeTransfer(arr);
            }}
          />
          <button
            onClick={() => setKnowledgeTransfer(knowledgeTransfer.filter((_, idx) => idx !== i))}
            className={styles.btnGhost}
            style={{ padding: 8 }}
          >
            <Icon iconName="Delete" style={{ fontSize: 14, color: '#d13438' }} />
          </button>
        </div>
      ))}

      <button
        onClick={() => setKnowledgeTransfer([...knowledgeTransfer, { description: '' }])}
        className={styles.btnSecondary}
      >
        <Icon iconName="Add" style={{ fontSize: 12 }} />
        Add Transfer Task
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // TASKS STEP - Configure Tasks with overlay
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderTasksStep = (): JSX.Element => {
    const selectedAssets = assetsToReturn.filter(a => a.selected);
    const selectedSystems = systemsToRevoke.filter(s => s.selected);
    const ktTasks = knowledgeTransfer.filter(k => k.description.trim());
    const totalTasks = selectedAssets.length + selectedSystems.length + ktTasks.length + (exitInterviewDate ? 1 : 0) + 2;

    return (
      <div className={styles.formCard}>
        <div className={styles.formCardHeader}>
          <div className={styles.formCardIcon} style={{ background: '#fef2f2' }}>
            <Icon iconName="TaskManager" style={{ fontSize: 18, color: '#d13438' }} />
          </div>
          <div>
            <h3 className={styles.formCardTitle}>Configure Tasks</h3>
            <p className={styles.formCardDescription}>
              Review and customize offboarding tasks before submission
            </p>
          </div>
        </div>

        <div className={`${styles.infoBox} ${styles.infoBoxInfo}`} style={{ marginBottom: 20 }}>
          <Icon iconName="Info" className={styles.infoBoxIcon} />
          <div>
            Based on your selections, <strong>{totalTasks} tasks</strong> will be created for this offboarding.
            Configure task assignments, due dates, and notifications before proceeding.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ padding: 12, background: '#fef7e0', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#b06000' }}>{selectedAssets.length}</div>
            <div style={{ fontSize: 11, color: '#5f6368' }}>Asset Returns</div>
          </div>
          <div style={{ padding: 12, background: '#e8f0fe', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#1967d2' }}>{selectedSystems.length}</div>
            <div style={{ fontSize: 11, color: '#5f6368' }}>System Access</div>
          </div>
          <div style={{ padding: 12, background: '#f3e8fd', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#7627bb' }}>{ktTasks.length + (exitInterviewDate ? 1 : 0)}</div>
            <div style={{ fontSize: 11, color: '#5f6368' }}>KT & Interview</div>
          </div>
          <div style={{ padding: 12, background: '#e8eaed', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#5f6368' }}>2</div>
            <div style={{ fontSize: 11, color: '#5f6368' }}>Standard Tasks</div>
          </div>
        </div>

        {tasksConfirmed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#dcfce7', borderRadius: 8 }}>
            <Icon iconName="CheckMark" style={{ fontSize: 20, color: '#10b981' }} />
            <div>
              <div style={{ fontWeight: 600, color: '#166534' }}>Tasks Configured</div>
              <div style={{ fontSize: 13, color: '#15803d' }}>
                {configuredTasks.filter(t => t.isConfigured).length} of {configuredTasks.length} tasks customized
              </div>
            </div>
            <button
              onClick={handleOpenTaskConfig}
              className={styles.btnSecondary}
              style={{ marginLeft: 'auto' }}
            >
              <Icon iconName="Edit" style={{ fontSize: 12, marginRight: 6 }} />
              Edit Tasks
            </button>
          </div>
        ) : (
          <button
            onClick={handleOpenTaskConfig}
            className={styles.btnPrimary}
            style={{
              width: '100%',
              padding: '14px 20px',
              fontSize: 15,
              background: 'linear-gradient(135deg, #d13438 0%, #a52828 100%)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon iconName="TaskManager" style={{ fontSize: 16 }} />
            Configure Tasks
          </button>
        )}
      </div>
    );
  };

  const renderReviewStep = (): JSX.Element => {
    const selectedAssets = assetsToReturn.filter(a => a.selected);
    const selectedSystems = systemsToRevoke.filter(s => s.selected);
    const ktTasks = knowledgeTransfer.filter(k => k.description.trim());

    return (
      <>
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <div className={styles.formCardIcon}>
              <Icon iconName="Contact" style={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className={styles.formCardTitle}>Employee Details</h3>
            </div>
          </div>
          <div className={styles.formGrid}>
            <div><strong>Name:</strong> {employeeName}</div>
            <div><strong>Job Title:</strong> {jobTitle}</div>
            <div><strong>Department:</strong> {department || 'Not specified'}</div>
            <div><strong>Last Working Date:</strong> {lastWorkingDate?.toLocaleDateString()}</div>
            <div><strong>Termination Type:</strong> {terminationType}</div>
            <div>
              <strong>Eligibility:</strong>{' '}
              {referenceEligible && 'Reference'}{referenceEligible && rehireEligible && ', '}{rehireEligible && 'Rehire'}
              {!referenceEligible && !rehireEligible && 'None'}
            </div>
          </div>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <div className={styles.formCardIcon}>
              <Icon iconName="Devices3" style={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className={styles.formCardTitle}>Assets to Return ({selectedAssets.length})</h3>
            </div>
          </div>
          {selectedAssets.length > 0 ? (
            selectedAssets.map((a, i) => (
              <div key={i} style={{ padding: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon iconName="Devices3" style={{ fontSize: 12 }} />
                {a.assetName}{a.assetTag ? ` (${a.assetTag})` : ''}{a.requiresDataWipe ? ' — Data Wipe Required' : ''}
              </div>
            ))
          ) : (
            <div style={{ color: '#8a8886' }}>No assets selected</div>
          )}
        </div>

        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <div className={styles.formCardIcon}>
              <Icon iconName="Permissions" style={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className={styles.formCardTitle}>Systems to Revoke ({selectedSystems.length})</h3>
            </div>
          </div>
          {selectedSystems.map((s, i) => (
            <div key={i} style={{ padding: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon iconName="Permissions" style={{ fontSize: 12 }} />
              {s.systemName}
            </div>
          ))}
        </div>

        {exitInterviewDate && (
          <div className={styles.formCard}>
            <div className={styles.formCardHeader}>
              <div className={styles.formCardIcon}>
                <Icon iconName="CannedChat" style={{ fontSize: 18 }} />
              </div>
              <div>
                <h3 className={styles.formCardTitle}>Exit Interview</h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon iconName="Calendar" style={{ fontSize: 12 }} />
              Scheduled: {exitInterviewDate.toLocaleDateString()}
            </div>
          </div>
        )}

        {ktTasks.length > 0 && (
          <div className={styles.formCard}>
            <div className={styles.formCardHeader}>
              <div className={styles.formCardIcon}>
                <Icon iconName="BookAnswers" style={{ fontSize: 18 }} />
              </div>
              <div>
                <h3 className={styles.formCardTitle}>Knowledge Transfer ({ktTasks.length})</h3>
              </div>
            </div>
            {ktTasks.map((k, i) => (
              <div key={i} style={{ padding: '6px 0' }}>{k.description}</div>
            ))}
          </div>
        )}

        {/* Configured Tasks Summary */}
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <div className={styles.formCardIcon} style={{ background: '#fef2f2' }}>
              <Icon iconName="TaskManager" style={{ fontSize: 18, color: '#d13438' }} />
            </div>
            <div>
              <h3 className={styles.formCardTitle}>Configured Tasks ({configuredTasks.filter(t => t.isSelected).length})</h3>
            </div>
          </div>
          {configuredTasks.filter(t => t.isSelected).slice(0, 5).map((task, i) => (
            <div key={i} style={{ padding: '6px 0', fontSize: 13, color: '#605e5c', display: 'flex', justifyContent: 'space-between' }}>
              <span>• {task.taskCode && <span style={{ fontFamily: 'monospace', marginRight: 8 }}>{task.taskCode}</span>}{task.title}</span>
              <span style={{ color: '#8a8886' }}>{task.roleAssignment || task.assigneeName}</span>
            </div>
          ))}
          {configuredTasks.filter(t => t.isSelected).length > 5 && (
            <div style={{ padding: '6px 0', fontSize: 13, color: '#d13438', fontStyle: 'italic' }}>
              + {configuredTasks.filter(t => t.isSelected).length - 5} more tasks...
            </div>
          )}
        </div>

        {error && (
          <div className={`${styles.infoBox} ${styles.infoBoxError}`}>
            <Icon iconName="Error" className={styles.infoBoxIcon} />
            <div>{error}</div>
          </div>
        )}
      </>
    );
  };

  if (submitted) {
    const selectedAssets = assetsToReturn.filter(a => a.selected);
    const selectedSystems = systemsToRevoke.filter(s => s.selected);
    const transfers = knowledgeTransfer.filter(k => k.description.trim());

    const summaryPanels: ISummaryPanel[] = [
      {
        title: 'Assets to Return',
        icon: 'Devices3',
        items: selectedAssets.map(a => ({
          label: `${a.assetName}${a.assetTag ? ` (${a.assetTag})` : ''}${a.requiresDataWipe ? ' — Data wipe' : ''}`,
          completed: false,
        })),
      },
      {
        title: 'System Access Revocation',
        icon: 'Permissions',
        items: selectedSystems.map(s => ({ label: `${s.systemName} (${s.currentRole})`, completed: false })),
      },
      {
        title: 'Knowledge Transfer',
        icon: 'Education',
        items: transfers.map(k => ({ label: k.description, completed: false })),
      },
    ];

    return (
      <JmlWizardSuccess
        theme="leaver"
        icon="CheckMark"
        title="Offboarding Created Successfully!"
        subtitle={`${employeeName} • ${jobTitle} • ${department} • Last Day: ${lastWorkingDate?.toLocaleDateString()}`}
        stats={[
          { value: configuredTasks.filter(t => t.isSelected).length, label: 'Total Tasks' },
          { value: selectedAssets.length, label: 'Assets' },
          { value: selectedSystems.length, label: 'Systems' },
          { value: transfers.length, label: 'Transfers' },
        ]}
        summaryPanels={summaryPanels}
        primaryAction={{ icon: 'UserRemove', tooltip: 'Offboard Another Employee', onClick: () => { setSubmitted(false); setCurrentStep(0); } }}
        secondaryAction={{ icon: 'ChromeClose', tooltip: 'Close', onClick: onComplete }}
      />
    );
  }

  const progressPercent = Math.round((currentStep / (STEPS.length - 1)) * 100);

  return (
    <div style={{ position: 'relative' }}>
      <JmlWizardLayout
        theme="leaver"
        title="Offboarding"
        subtitle="Employee Exit"
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
        loading={loadingData}
        loadingText="Loading employee data..."
        tips={getTips()}
        checklist={getChecklist()}
        progressPercent={progressPercent}
        progressText={`Step ${currentStep + 1} of ${STEPS.length}`}
        onBack={() => setCurrentStep(s => s - 1)}
        onCancel={onCancel}
        onNext={() => setCurrentStep(s => s + 1)}
        onSubmit={handleSubmit}
        nextDisabled={!canProceed()}
        submitDisabled={submitting}
        isLastStep={currentStep === STEPS.length - 1}
        isSubmitting={submitting}
        submitLabel="Start Offboarding"
      >
        {renderStepContent()}
      </JmlWizardLayout>

      {/* Task Configuration Overlay - replaces wizard when open */}
      <TaskConfigurationOverlay
        sp={sp}
        context={context}
        isOpen={showTaskConfig}
        tasks={configuredTasks}
        startDate={lastWorkingDate}
        employeeName={employeeName}
        processType="offboarding"
        onBack={handleTaskConfigBack}
        onConfirm={handleTaskConfigConfirm}
      />
    </div>
  );
};
