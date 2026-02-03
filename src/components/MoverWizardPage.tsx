import * as React from 'react';
import { useState, useEffect } from 'react';
import { SPFI } from '@pnp/sp';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
// Toggle removed - using checkboxes in accordion pattern
import { Icon } from '@fluentui/react/lib/Icon';
import { JmlWizardLayout, JmlWizardSuccess, IJmlWizardStep, IJmlWizardTip, IJmlWizardChecklistItem, ISummaryPanel } from './JmlWizardLayout';
import { MoverService } from '../services/MoverService';
import { OnboardingConfigService } from '../services/OnboardingConfigService';
import {
  MoverStatus, MoverType, MoverTaskCategory,
  MoverTaskStatus, SystemAccessAction, IEligibleEmployeeForMove
} from '../models/IMover';
import { SystemAccessCategory, TrainingCategory } from '../models/IOnboardingConfig';
import styles from '../styles/JmlWizard.module.scss';

interface IProps {
  sp: SPFI;
  onComplete: () => void;
  onCancel: () => void;
}

const STEPS: IJmlWizardStep[] = [
  { key: 'employee', label: 'Select Employee', icon: 'Contact' },
  { key: 'current', label: 'Current Position', icon: 'History' },
  { key: 'new', label: 'New Position', icon: 'MoveToFolder' },
  { key: 'systems', label: 'System Access', icon: 'Permissions' },
  { key: 'training', label: 'Training', icon: 'Education' },
  { key: 'review', label: 'Review & Submit', icon: 'CheckList' },
];

const MOVER_TYPE_OPTIONS: IDropdownOption[] = [
  { key: MoverType.DepartmentTransfer, text: 'Department Transfer' },
  { key: MoverType.RoleChange, text: 'Role Change' },
  { key: MoverType.LocationChange, text: 'Location Change' },
  { key: MoverType.Promotion, text: 'Promotion' },
  { key: MoverType.Demotion, text: 'Demotion' },
  { key: MoverType.LateralMove, text: 'Lateral Move' },
  { key: MoverType.TeamRestructure, text: 'Team Restructure' },
  { key: MoverType.Other, text: 'Other' },
];

const SYSTEM_ACTION_OPTIONS: IDropdownOption[] = [
  { key: SystemAccessAction.NoChange, text: 'No Change' },
  { key: SystemAccessAction.Grant, text: 'Grant Access' },
  { key: SystemAccessAction.Revoke, text: 'Revoke Access' },
  { key: SystemAccessAction.Modify, text: 'Modify Role' },
];

export const MoverWizardPage: React.FC<IProps> = ({ sp, onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [employees, setEmployees] = useState<IEligibleEmployeeForMove[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Wizard data
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');

  // Current position
  const [currentJobTitle, setCurrentJobTitle] = useState('');
  const [currentDepartment, setCurrentDepartment] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');

  // New position
  const [moverType, setMoverType] = useState<MoverType>(MoverType.DepartmentTransfer);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState('');

  // Salary
  const [currentSalary, setCurrentSalary] = useState<number | undefined>(undefined);
  const [newSalary, setNewSalary] = useState<number | undefined>(undefined);

  // System access changes
  const [systemAccessChanges, setSystemAccessChanges] = useState<{
    systemAccessTypeId?: number;
    systemName: string;
    category: string;
    action: SystemAccessAction;
    currentRole?: string;
    newRole?: string;
    selected: boolean;
  }[]>([]);

  // Training requirements
  const [trainingRequired, setTrainingRequired] = useState<{
    trainingCourseId?: number;
    courseName: string;
    category: string;
    selected: boolean;
  }[]>([]);

  // Accordion expand states for categorized lists
  const [expandedSystemCategories, setExpandedSystemCategories] = useState<Set<string>>(new Set(['Core']));
  const [expandedTrainingCategories, setExpandedTrainingCategories] = useState<Set<string>>(new Set(['Orientation']));

  const [notes, setNotes] = useState('');
  const [createdMover, setCreatedMover] = useState<{ name: string; type: string; effectiveDate: Date } | null>(null);

  useEffect(() => {
    loadData();
  }, [sp]);

  const loadData = async (): Promise<void> => {
    setLoadingData(true);
    try {
      const moverSvc = new MoverService(sp);
      const configSvc = new OnboardingConfigService(sp);

      const [emps, systemTypesData, trainingCoursesData] = await Promise.all([
        moverSvc.getEligibleEmployeesForMove(),
        configSvc.getSystemAccessTypes({ isActive: true }),
        configSvc.getTrainingCourses({ isActive: true }),
      ]);

      setEmployees(emps);

      setSystemAccessChanges(systemTypesData.map(s => ({
        systemAccessTypeId: s.Id,
        systemName: s.Title,
        category: s.Category || SystemAccessCategory.Core,
        action: SystemAccessAction.NoChange,
        currentRole: s.DefaultRole || 'Standard',
        newRole: s.DefaultRole || 'Standard',
        selected: false
      })));

      setTrainingRequired(trainingCoursesData.map(t => ({
        trainingCourseId: t.Id,
        courseName: t.Title,
        category: t.Category || TrainingCategory.Orientation,
        selected: false
      })));
    } catch (err) {
      console.error('[MoverWizardPage] Error loading data:', err);
    }
    setLoadingData(false);
  };

  const handleEmployeeSelect = (employeeId: number): void => {
    const emp = employees.find(e => e.Id === employeeId);
    if (emp) {
      setSelectedEmployeeId(employeeId);
      setEmployeeName(emp.EmployeeName);
      setEmployeeEmail(emp.EmployeeEmail || '');
      setCurrentJobTitle(emp.JobTitle || '');
      setCurrentDepartment(emp.Department || '');
      setCurrentLocation(emp.Location || '');
      setNewJobTitle(emp.JobTitle || '');
      setNewDepartment(emp.Department || '');
      setNewLocation(emp.Location || '');
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return selectedEmployeeId !== null;
      case 1: return currentJobTitle.trim() !== '';
      case 2: return newJobTitle.trim() !== '' && effectiveDate !== undefined;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError('');

    try {
      const svc = new MoverService(sp);

      const mover = await svc.createMover({
        EmployeeId: selectedEmployeeId!,
        EmployeeName: employeeName,
        EmployeeEmail: employeeEmail || undefined,
        CurrentJobTitle: currentJobTitle,
        CurrentDepartment: currentDepartment || undefined,
        CurrentLocation: currentLocation || undefined,
        NewJobTitle: newJobTitle,
        NewDepartment: newDepartment || undefined,
        NewLocation: newLocation || undefined,
        MoverType: moverType,
        EffectiveDate: effectiveDate!,
        Status: MoverStatus.InProgress,
        Reason: reason || undefined,
        CurrentSalary: currentSalary,
        NewSalary: newSalary,
        SalaryChangePercentage: currentSalary && newSalary
          ? Math.round(((newSalary - currentSalary) / currentSalary) * 100)
          : undefined,
        Notes: notes || undefined,
      });

      if (!mover?.Id) {
        throw new Error('Failed to create mover record');
      }

      const selectedSystems = systemAccessChanges.filter(s => s.selected && s.action !== SystemAccessAction.NoChange);
      for (const sys of selectedSystems) {
        await svc.createMoverSystemAccess({
          MoverId: mover.Id,
          SystemAccessTypeId: sys.systemAccessTypeId,
          SystemName: sys.systemName,
          Action: sys.action,
          CurrentRole: sys.currentRole,
          NewRole: sys.newRole,
          Status: MoverTaskStatus.Pending,
        });

        await svc.createMoverTask({
          MoverId: mover.Id,
          Title: `${sys.action} - ${sys.systemName}`,
          Category: MoverTaskCategory.SystemAccess,
          Status: MoverTaskStatus.Pending,
          Priority: 'High',
          SortOrder: 10,
          RelatedSystemAccessId: sys.systemAccessTypeId,
          SystemAccessAction: sys.action,
        });
      }

      const selectedTraining = trainingRequired.filter(t => t.selected);
      let sortOrder = 20;
      for (const training of selectedTraining) {
        await svc.createMoverTask({
          MoverId: mover.Id,
          Title: `Complete: ${training.courseName}`,
          Category: MoverTaskCategory.Training,
          Status: MoverTaskStatus.Pending,
          Priority: 'Medium',
          SortOrder: sortOrder++,
        });
      }

      const standardTasks = [
        { title: 'Update organizational chart', category: MoverTaskCategory.Documentation, priority: 'Medium' as const },
        { title: 'Update internal directory', category: MoverTaskCategory.Documentation, priority: 'Medium' as const },
        { title: 'Team introduction meeting', category: MoverTaskCategory.Orientation, priority: 'High' as const },
        { title: 'Knowledge transfer sessions', category: MoverTaskCategory.KnowledgeTransfer, priority: 'High' as const },
        { title: 'Update payroll/HR records', category: MoverTaskCategory.Documentation, priority: 'High' as const },
      ];

      for (const task of standardTasks) {
        await svc.createMoverTask({
          MoverId: mover.Id,
          Title: task.title,
          Category: task.category,
          Status: MoverTaskStatus.Pending,
          Priority: task.priority,
          SortOrder: sortOrder++,
        });
      }

      await svc.recalculateProgress(mover.Id);

      setCreatedMover({
        name: employeeName,
        type: moverType,
        effectiveDate: effectiveDate!,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('[MoverWizardPage] Submit error:', err);
      setError('Failed to create transfer. Please try again.');
    }
    setSubmitting(false);
  };

  const getTips = (): IJmlWizardTip[] => {
    switch (currentStep) {
      case 0:
        return [
          { icon: 'Contact', title: 'Eligible Employees', content: 'Only employees with completed or in-progress onboarding can be transferred.' },
          { icon: 'Info', title: 'No employees?', content: 'Ensure employees have been onboarded first in the Onboarding section.' },
        ];
      case 1:
        return [
          { icon: 'History', title: 'Current Details', content: 'Review and confirm the employee\'s current position details before proceeding.' },
          { icon: 'Money', title: 'Salary', content: 'Current salary is optional but helpful for tracking compensation changes.' },
        ];
      case 2:
        return [
          { icon: 'MoveToFolder', title: 'Transfer Type', content: 'Select the type of transfer to categorize this move correctly.' },
          { icon: 'Calendar', title: 'Effective Date', content: 'The date when the new position officially takes effect.' },
        ];
      case 3:
        return [
          { icon: 'Permissions', title: 'System Changes', content: 'Select systems that need access changes due to the role change.' },
          { icon: 'Settings', title: 'Actions', content: 'You can grant, revoke, or modify access for each system.' },
        ];
      case 4:
        return [
          { icon: 'Education', title: 'New Training', content: 'Select any training courses required for the new role.' },
          { icon: 'Lightbulb', title: 'Tip', content: 'Consider compliance training if moving to a new department.' },
        ];
      case 5:
        return [
          { icon: 'CheckList', title: 'Review', content: 'Review all transfer details before submitting.' },
          { icon: 'Warning', title: 'Important', content: 'Standard transfer tasks will be created automatically.' },
        ];
      default:
        return [];
    }
  };

  const getChecklist = (): IJmlWizardChecklistItem[] => [
    { label: 'Employee selected', completed: selectedEmployeeId !== null },
    { label: 'Current position confirmed', completed: currentJobTitle.trim() !== '' },
    { label: 'New position defined', completed: newJobTitle.trim() !== '' && effectiveDate !== undefined },
    { label: 'System access reviewed', completed: currentStep > 3 },
    { label: 'Training considered', completed: currentStep > 4 },
  ];

  const renderStepContent = (): JSX.Element => {
    switch (currentStep) {
      case 0: return renderEmployeeStep();
      case 1: return renderCurrentPositionStep();
      case 2: return renderNewPositionStep();
      case 3: return renderSystemAccessStep();
      case 4: return renderTrainingStep();
      case 5: return renderReviewStep();
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
          <p className={styles.formCardDescription}>Choose an employee to transfer to a new role or department</p>
        </div>
      </div>

      {employees.length > 0 ? (
        <div className={styles.scrollableList}>
          {employees.map(emp => (
            <div
              key={emp.Id}
              className={`${styles.listItem} ${selectedEmployeeId === emp.Id ? styles.listItemSelected : ''}`}
              onClick={() => handleEmployeeSelect(emp.Id)}
              style={selectedEmployeeId === emp.Id ? { borderLeftColor: '#ea580c' } : {}}
            >
              <Icon iconName="Contact" style={{ fontSize: 20, color: '#ea580c' }} />
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
          <div>No eligible employees found. Employees must have an active onboarding record.</div>
        </div>
      )}
    </div>
  );

  const renderCurrentPositionStep = (): JSX.Element => (
    <div className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div className={styles.formCardIcon}>
          <Icon iconName="History" style={{ fontSize: 18 }} />
        </div>
        <div>
          <h3 className={styles.formCardTitle}>Current Position</h3>
          <p className={styles.formCardDescription}>Confirm the employee's current position details</p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <TextField
          label="Employee Name"
          value={employeeName}
          disabled
        />
        <TextField
          label="Email"
          value={employeeEmail}
          disabled
        />
        <TextField
          label="Current Job Title"
          value={currentJobTitle}
          onChange={(_, v) => setCurrentJobTitle(v || '')}
          required
        />
        <TextField
          label="Current Department"
          value={currentDepartment}
          onChange={(_, v) => setCurrentDepartment(v || '')}
        />
        <TextField
          label="Current Location"
          value={currentLocation}
          onChange={(_, v) => setCurrentLocation(v || '')}
        />
        <TextField
          label="Current Salary"
          type="number"
          prefix="$"
          value={currentSalary?.toString() || ''}
          onChange={(_, v) => setCurrentSalary(v ? parseFloat(v) : undefined)}
        />
      </div>
    </div>
  );

  const renderNewPositionStep = (): JSX.Element => (
    <div className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div className={styles.formCardIcon}>
          <Icon iconName="MoveToFolder" style={{ fontSize: 18 }} />
        </div>
        <div>
          <h3 className={styles.formCardTitle}>New Position</h3>
          <p className={styles.formCardDescription}>Enter the details of the new position</p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <Dropdown
          label="Transfer Type"
          selectedKey={moverType}
          options={MOVER_TYPE_OPTIONS}
          onChange={(_, opt) => opt && setMoverType(opt.key as MoverType)}
          required
        />
        <DatePicker
          label="Effective Date"
          value={effectiveDate}
          onSelectDate={(d) => setEffectiveDate(d || undefined)}
          isRequired
        />
        <TextField
          label="New Job Title"
          value={newJobTitle}
          onChange={(_, v) => setNewJobTitle(v || '')}
          required
        />
        <TextField
          label="New Department"
          value={newDepartment}
          onChange={(_, v) => setNewDepartment(v || '')}
        />
        <TextField
          label="New Location"
          value={newLocation}
          onChange={(_, v) => setNewLocation(v || '')}
        />
        <TextField
          label="New Salary"
          type="number"
          prefix="$"
          value={newSalary?.toString() || ''}
          onChange={(_, v) => setNewSalary(v ? parseFloat(v) : undefined)}
        />
      </div>

      {currentSalary && newSalary && (
        <div className={`${styles.infoBox} ${newSalary >= currentSalary ? styles.infoBoxSuccess : styles.infoBoxWarning}`} style={{ marginTop: 16 }}>
          <Icon iconName={newSalary >= currentSalary ? 'TrendingUp' : 'TrendingDown'} className={styles.infoBoxIcon} />
          <div>
            Salary Change: {newSalary >= currentSalary ? '+' : ''}
            {Math.round(((newSalary - currentSalary) / currentSalary) * 100)}%
            (${(newSalary - currentSalary).toLocaleString()})
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <TextField
          label="Reason for Transfer"
          value={reason}
          onChange={(_, v) => setReason(v || '')}
          multiline
          rows={3}
          placeholder="Explain the reason for this transfer..."
        />
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // SYSTEM ACCESS STEP - Accordion by Category (Core, Department, Optional, Admin)
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

  const groupedSystems = systemAccessChanges.reduce((acc, sys) => {
    const cat = sys.category || 'Core';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sys);
    return acc;
  }, {} as Record<string, typeof systemAccessChanges>);

  const renderSystemAccessStep = (): JSX.Element => {
    const categories = Object.keys(SYSTEM_CATEGORY_CONFIG).filter(cat => groupedSystems[cat]?.length > 0);

    if (systemAccessChanges.length === 0) {
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
                    {selectedCount}/{systemsInCategory.length} selected for changes
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
                    const sysIndex = systemAccessChanges.findIndex(s => s.systemAccessTypeId === sys.systemAccessTypeId);
                    return (
                      <div key={sys.systemAccessTypeId} className={styles.accordionItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="checkbox"
                            checked={sys.selected}
                            onChange={(e) => {
                              const arr = [...systemAccessChanges];
                              arr[sysIndex] = { ...arr[sysIndex], selected: e.target.checked };
                              setSystemAccessChanges(arr);
                            }}
                            className={styles.accordionItemCheckbox}
                          />
                          <span className={styles.accordionItemLabel}>{sys.systemName}</span>
                          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8a8886' }}>
                            Current: {sys.currentRole}
                          </div>
                        </div>
                        {sys.selected && (
                          <div style={{ marginLeft: 32, marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Dropdown
                              label="Action"
                              selectedKey={sys.action}
                              options={SYSTEM_ACTION_OPTIONS}
                              onChange={(_, opt) => {
                                if (opt) {
                                  const arr = [...systemAccessChanges];
                                  arr[sysIndex] = { ...arr[sysIndex], action: opt.key as SystemAccessAction };
                                  setSystemAccessChanges(arr);
                                }
                              }}
                            />
                            {sys.action === SystemAccessAction.Modify && (
                              <TextField
                                label="New Role"
                                value={sys.newRole || ''}
                                onChange={(_, v) => {
                                  const arr = [...systemAccessChanges];
                                  arr[sysIndex] = { ...arr[sysIndex], newRole: v || '' };
                                  setSystemAccessChanges(arr);
                                }}
                              />
                            )}
                          </div>
                        )}
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

  const groupedTraining = trainingRequired.reduce((acc, tr) => {
    const cat = tr.category || 'Orientation';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tr);
    return acc;
  }, {} as Record<string, typeof trainingRequired>);

  const renderTrainingStep = (): JSX.Element => {
    const categories = Object.keys(TRAINING_CATEGORY_CONFIG).filter(cat => groupedTraining[cat]?.length > 0);

    if (trainingRequired.length === 0) {
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
          const selectedCount = trainingInCategory.filter(t => t.selected).length;
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
                    {selectedCount}/{trainingInCategory.length} selected
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
                    const trIndex = trainingRequired.findIndex(t => t.trainingCourseId === tr.trainingCourseId);
                    return (
                      <div key={tr.trainingCourseId} className={styles.accordionItem}>
                        <input
                          type="checkbox"
                          checked={tr.selected}
                          onChange={(e) => {
                            const arr = [...trainingRequired];
                            arr[trIndex] = { ...arr[trIndex], selected: e.target.checked };
                            setTrainingRequired(arr);
                          }}
                          className={styles.accordionItemCheckbox}
                        />
                        <span className={styles.accordionItemLabel}>{tr.courseName}</span>
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

  const renderReviewStep = (): JSX.Element => {
    const selectedSystems = systemAccessChanges.filter(s => s.selected && s.action !== SystemAccessAction.NoChange);
    const selectedTrainingItems = trainingRequired.filter(t => t.selected);

    return (
      <>
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <div className={styles.formCardIcon}>
              <Icon iconName="Contact" style={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className={styles.formCardTitle}>Employee</h3>
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{employeeName}</div>
          {employeeEmail && <div style={{ fontSize: 13, color: '#605e5c' }}>{employeeEmail}</div>}
        </div>

        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <div className={styles.formCardIcon}>
              <Icon iconName="Sync" style={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className={styles.formCardTitle}>Position Change</h3>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 16, alignItems: 'center' }}>
            <div style={{ background: '#fef2f2', padding: 16, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#991b1b', marginBottom: 4 }}>FROM</div>
              <div style={{ fontWeight: 500 }}>{currentJobTitle}</div>
              <div style={{ fontSize: 13, color: '#605e5c' }}>{currentDepartment || 'No department'}</div>
              {currentSalary && <div style={{ fontSize: 13, color: '#605e5c' }}>${currentSalary.toLocaleString()}</div>}
            </div>
            <Icon iconName="Forward" style={{ fontSize: 20, color: '#ea580c', justifySelf: 'center' }} />
            <div style={{ background: '#dcfce7', padding: 16, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#166534', marginBottom: 4 }}>TO</div>
              <div style={{ fontWeight: 500 }}>{newJobTitle}</div>
              <div style={{ fontSize: 13, color: '#605e5c' }}>{newDepartment || 'No department'}</div>
              {newSalary && <div style={{ fontSize: 13, color: '#605e5c' }}>${newSalary.toLocaleString()}</div>}
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            <div><strong>Transfer Type:</strong> {moverType}</div>
            <div><strong>Effective Date:</strong> {effectiveDate?.toLocaleDateString()}</div>
          </div>
        </div>

        {selectedSystems.length > 0 && (
          <div className={styles.formCard}>
            <div className={styles.formCardHeader}>
              <div className={styles.formCardIcon}>
                <Icon iconName="Permissions" style={{ fontSize: 18 }} />
              </div>
              <div>
                <h3 className={styles.formCardTitle}>System Access Changes ({selectedSystems.length})</h3>
              </div>
            </div>
            {selectedSystems.map((s, i) => (
              <div key={i} style={{ padding: '6px 0', fontSize: 13, color: '#605e5c' }}>
                • {s.action}: {s.systemName} {s.newRole && `(→ ${s.newRole})`}
              </div>
            ))}
          </div>
        )}

        {selectedTrainingItems.length > 0 && (
          <div className={styles.formCard}>
            <div className={styles.formCardHeader}>
              <div className={styles.formCardIcon}>
                <Icon iconName="Education" style={{ fontSize: 18 }} />
              </div>
              <div>
                <h3 className={styles.formCardTitle}>Required Training ({selectedTrainingItems.length})</h3>
              </div>
            </div>
            {selectedTrainingItems.map((t, i) => (
              <div key={i} style={{ padding: '6px 0', fontSize: 13, color: '#605e5c' }}>• {t.courseName}</div>
            ))}
          </div>
        )}

        <div className={styles.formCard}>
          <TextField
            label="Additional Notes"
            value={notes}
            onChange={(_, v) => setNotes(v || '')}
            multiline
            rows={3}
          />
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

  if (submitted && createdMover) {
    const systemChanges = systemAccessChanges.filter(s => s.selected && s.action !== SystemAccessAction.NoChange);
    const trainingItems = trainingRequired.filter(t => t.selected);

    const summaryPanels: ISummaryPanel[] = [
      {
        title: 'Position Change',
        icon: 'MoveToFolder',
        items: [
          { label: `From: ${currentDepartment || 'N/A'}`, completed: true },
          { label: `To: ${newDepartment || 'Same'}`, completed: true },
          { label: `Type: ${createdMover.type}`, completed: true },
        ],
      },
      {
        title: 'System Changes',
        icon: 'Permissions',
        items: systemChanges.map(s => ({ label: `${s.systemName} — ${s.action}`, completed: true })),
      },
      {
        title: 'Training Required',
        icon: 'Education',
        items: trainingItems.map(t => ({ label: t.courseName, completed: false })),
      },
    ];

    return (
      <JmlWizardSuccess
        theme="mover"
        icon="Sync"
        title="Transfer Initiated!"
        subtitle={`${createdMover.name} • ${createdMover.type} • Effective ${createdMover.effectiveDate.toLocaleDateString()}`}
        stats={[
          { value: systemChanges.length, label: 'System Changes' },
          { value: trainingItems.length, label: 'Training Items' },
          { value: 5, label: 'Standard Tasks' },
          { value: 'In Progress', label: 'Status' },
        ]}
        summaryPanels={summaryPanels}
        primaryAction={{ label: 'View Transfers', onClick: onComplete }}
        secondaryAction={{ label: 'Start Another', onClick: () => { setSubmitted(false); setCurrentStep(0); } }}
      />
    );
  }

  const progressPercent = Math.round((currentStep / (STEPS.length - 1)) * 100);

  return (
    <JmlWizardLayout
      theme="mover"
      title="Transfer"
      subtitle="Internal Move"
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
      submitLabel="Create Transfer"
      backToTrackerLabel="Back to Transfers"
      onBackToTracker={onCancel}
    >
      {renderStepContent()}
    </JmlWizardLayout>
  );
};
