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
import { MoverService } from '../services/MoverService';
import { OnboardingConfigService } from '../services/OnboardingConfigService';
import {
  MoverStatus, MoverType, MoverTaskCategory,
  MoverTaskStatus, SystemAccessAction, IEligibleEmployeeForMove
} from '../models/IMover';
import styles from '../styles/JmlPanelStyles.module.scss';
// Note: fieldStyles imported for potential future use

interface IProps {
  sp: SPFI;
  isOpen: boolean;
  onDismiss: () => void;
  onCompleted: () => void;
}

const STEPS = [
  'Select Employee',
  'Current Position',
  'New Position',
  'System Access',
  'Training',
  'Review'
];

// Mover theme: Orange (#ea580c) for internal changes
const MOVER_COLOR = '#ea580c';
const MOVER_COLOR_LIGHT = '#fb923c';

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

export const MoverWizard: React.FC<IProps> = ({ sp, isOpen, onDismiss, onCompleted }) => {
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
    action: SystemAccessAction;
    currentRole?: string;
    newRole?: string;
    selected: boolean;
  }[]>([]);

  // Training requirements
  const [trainingRequired, setTrainingRequired] = useState<{
    trainingCourseId?: number;
    courseName: string;
    selected: boolean;
  }[]>([]);

  const [notes, setNotes] = useState('');

  // Created record for success screen
  const [createdMover, setCreatedMover] = useState<{ name: string; type: string; effectiveDate: Date } | null>(null);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadData();
    }
  }, [isOpen]);

  const resetForm = (): void => {
    setCurrentStep(0);
    setSelectedEmployeeId(null);
    setEmployeeName('');
    setEmployeeEmail('');
    setCurrentJobTitle('');
    setCurrentDepartment('');
    setCurrentLocation('');
    setMoverType(MoverType.DepartmentTransfer);
    setNewJobTitle('');
    setNewDepartment('');
    setNewLocation('');
    setEffectiveDate(undefined);
    setReason('');
    setCurrentSalary(undefined);
    setNewSalary(undefined);
    setSystemAccessChanges([]);
    setTrainingRequired([]);
    setNotes('');
    setError('');
    setSubmitted(false);
    setCreatedMover(null);
  };

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

      // Initialize system access (default to No Change)
      setSystemAccessChanges(systemTypesData.map(s => ({
        systemAccessTypeId: s.Id,
        systemName: s.Title,
        action: SystemAccessAction.NoChange,
        currentRole: s.DefaultRole || 'Standard',
        newRole: s.DefaultRole || 'Standard',
        selected: false
      })));

      // Initialize training
      setTrainingRequired(trainingCoursesData.map(t => ({
        trainingCourseId: t.Id,
        courseName: t.Title,
        selected: false
      })));
    } catch (err) {
      console.error('[MoverWizard] Error loading data:', err);
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
      // Default new position to current
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

      // Create the mover record
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

      // Create system access change records
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

        // Create corresponding task
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

      // Create training tasks
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

      // Create standard transfer tasks
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

      // Recalculate progress
      await svc.recalculateProgress(mover.Id);

      setCreatedMover({
        name: employeeName,
        type: moverType,
        effectiveDate: effectiveDate!,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('[MoverWizard] Submit error:', err);
      setError('Failed to create transfer. Please try again.');
    }
    setSubmitting(false);
  };

  const handleClose = (): void => {
    if (submitted) {
      onCompleted();
    } else {
      onDismiss();
    }
  };

  const renderStepIndicator = (): JSX.Element => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, padding: '0 8px' }}>
      {STEPS.map((step, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : 'none' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: idx < currentStep ? MOVER_COLOR : idx === currentStep ? MOVER_COLOR_LIGHT : '#edebe9',
            color: idx <= currentStep ? '#fff' : '#605e5c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600,
          }}>
            {idx < currentStep ? <Icon iconName="CheckMark" style={{ fontSize: 12 }} /> : idx + 1}
          </div>
          {idx < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: '0 8px',
              background: idx < currentStep ? MOVER_COLOR : '#edebe9',
            }} />
          )}
        </div>
      ))}
    </div>
  );

  const renderSuccessScreen = (): JSX.Element => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: `linear-gradient(135deg, ${MOVER_COLOR} 0%, ${MOVER_COLOR_LIGHT} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <Icon iconName="Sync" style={{ fontSize: 40, color: '#fff' }} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
        Transfer Initiated!
      </h2>
      <p style={{ fontSize: 14, color: '#605e5c', marginBottom: 32 }}>
        The internal transfer has been successfully created.
      </p>

      <div style={{
        background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8,
        padding: 20, marginBottom: 32, textAlign: 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Icon iconName="Contact" style={{ fontSize: 24, color: MOVER_COLOR }} />
          <div>
            <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{createdMover?.name}</div>
            <div style={{ fontSize: 12, color: '#605e5c' }}>{createdMover?.type}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
          <div>
            <div style={{ color: '#605e5c', marginBottom: 2 }}>Effective Date</div>
            <div style={{ fontWeight: 500 }}>{createdMover?.effectiveDate?.toLocaleDateString()}</div>
          </div>
          <div>
            <div style={{ color: '#605e5c', marginBottom: 2 }}>Status</div>
            <div style={{ fontWeight: 500, color: MOVER_COLOR }}>In Progress</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={handleClose} style={{
          padding: '10px 24px', borderRadius: 4, border: 'none',
          background: MOVER_COLOR, color: '#fff',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          View Transfers
        </button>
        <button onClick={() => { resetForm(); loadData(); }} style={{
          padding: '10px 24px', borderRadius: 4,
          border: `1px solid ${MOVER_COLOR}`, background: '#fff', color: MOVER_COLOR,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          Start Another
        </button>
      </div>
    </div>
  );

  const renderStep = (): JSX.Element => {
    if (loadingData) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner size={SpinnerSize.large} label="Loading data..." />
        </div>
      );
    }

    switch (currentStep) {
      case 0: // Select Employee
        return (
          <div className={styles.formSection}>
            <h3 style={{ color: MOVER_COLOR }}>Select Employee</h3>
            <p style={{ color: '#605e5c', marginBottom: 16 }}>
              Choose the employee who is transferring to a new role or department.
            </p>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {employees.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#8a8886' }}>
                  No eligible employees found. Employees must have an active onboarding record.
                </div>
              ) : (
                employees.map(emp => (
                  <div
                    key={emp.Id}
                    onClick={() => handleEmployeeSelect(emp.Id)}
                    style={{
                      padding: 12, borderRadius: 6, marginBottom: 8, cursor: 'pointer',
                      border: selectedEmployeeId === emp.Id ? `2px solid ${MOVER_COLOR}` : '1px solid #edebe9',
                      background: selectedEmployeeId === emp.Id ? '#fff7ed' : '#fff',
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{emp.EmployeeName}</div>
                    <div style={{ fontSize: 12, color: '#605e5c' }}>
                      {emp.JobTitle} {emp.Department && `• ${emp.Department}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 1: // Current Position
        return (
          <div className={styles.formSection}>
            <h3 style={{ color: MOVER_COLOR }}>Current Position</h3>
            <p style={{ color: '#605e5c', marginBottom: 16 }}>
              Confirm the employee's current position details.
            </p>
            <TextField
              label="Employee Name"
              value={employeeName}
              disabled
              styles={{ root: { marginBottom: 12 } }}
            />
            <TextField
              label="Current Job Title"
              value={currentJobTitle}
              onChange={(_, v) => setCurrentJobTitle(v || '')}
              required
              styles={{ root: { marginBottom: 12 } }}
            />
            <TextField
              label="Current Department"
              value={currentDepartment}
              onChange={(_, v) => setCurrentDepartment(v || '')}
              styles={{ root: { marginBottom: 12 } }}
            />
            <TextField
              label="Current Location"
              value={currentLocation}
              onChange={(_, v) => setCurrentLocation(v || '')}
              styles={{ root: { marginBottom: 12 } }}
            />
            <TextField
              label="Current Salary"
              type="number"
              prefix="$"
              value={currentSalary?.toString() || ''}
              onChange={(_, v) => setCurrentSalary(v ? parseFloat(v) : undefined)}
            />
          </div>
        );

      case 2: // New Position
        return (
          <div className={styles.formSection}>
            <h3 style={{ color: MOVER_COLOR }}>New Position</h3>
            <p style={{ color: '#605e5c', marginBottom: 16 }}>
              Enter the details of the new position.
            </p>
            <Dropdown
              label="Transfer Type"
              selectedKey={moverType}
              options={MOVER_TYPE_OPTIONS}
              onChange={(_, opt) => opt && setMoverType(opt.key as MoverType)}
              required
              styles={{ root: { marginBottom: 12 } }}
            />
            <TextField
              label="New Job Title"
              value={newJobTitle}
              onChange={(_, v) => setNewJobTitle(v || '')}
              required
              styles={{ root: { marginBottom: 12 } }}
            />
            <TextField
              label="New Department"
              value={newDepartment}
              onChange={(_, v) => setNewDepartment(v || '')}
              styles={{ root: { marginBottom: 12 } }}
            />
            <TextField
              label="New Location"
              value={newLocation}
              onChange={(_, v) => setNewLocation(v || '')}
              styles={{ root: { marginBottom: 12 } }}
            />
            <DatePicker
              label="Effective Date"
              value={effectiveDate}
              onSelectDate={(d) => setEffectiveDate(d || undefined)}
              isRequired
              styles={{ root: { marginBottom: 12 } }}
            />
            <TextField
              label="New Salary"
              type="number"
              prefix="$"
              value={newSalary?.toString() || ''}
              onChange={(_, v) => setNewSalary(v ? parseFloat(v) : undefined)}
              styles={{ root: { marginBottom: 12 } }}
            />
            {currentSalary && newSalary && (
              <div style={{
                padding: 12, background: newSalary >= currentSalary ? '#dcfce7' : '#fee2e2',
                borderRadius: 6, fontSize: 13,
              }}>
                Salary Change: {newSalary >= currentSalary ? '+' : ''}
                {Math.round(((newSalary - currentSalary) / currentSalary) * 100)}%
                (${(newSalary - currentSalary).toLocaleString()})
              </div>
            )}
            <TextField
              label="Reason for Transfer"
              value={reason}
              onChange={(_, v) => setReason(v || '')}
              multiline
              rows={3}
              styles={{ root: { marginTop: 12 } }}
            />
          </div>
        );

      case 3: // System Access
        return (
          <div className={styles.formSection}>
            <h3 style={{ color: MOVER_COLOR }}>System Access Changes</h3>
            <p style={{ color: '#605e5c', marginBottom: 16 }}>
              Select systems that need access changes for the new role.
            </p>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {systemAccessChanges.map((sys, idx) => (
                <div key={idx} style={{
                  padding: 12, borderRadius: 6, marginBottom: 8,
                  border: sys.selected ? `2px solid ${MOVER_COLOR}` : '1px solid #edebe9',
                  background: sys.selected ? '#fff7ed' : '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Toggle
                      checked={sys.selected}
                      onChange={(_, checked) => {
                        const updated = [...systemAccessChanges];
                        updated[idx].selected = checked || false;
                        setSystemAccessChanges(updated);
                      }}
                    />
                    <div style={{ fontWeight: 500 }}>{sys.systemName}</div>
                  </div>
                  {sys.selected && (
                    <div style={{ marginLeft: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Dropdown
                        label="Action"
                        selectedKey={sys.action}
                        options={SYSTEM_ACTION_OPTIONS}
                        onChange={(_, opt) => {
                          if (opt) {
                            const updated = [...systemAccessChanges];
                            updated[idx].action = opt.key as SystemAccessAction;
                            setSystemAccessChanges(updated);
                          }
                        }}
                      />
                      {sys.action === SystemAccessAction.Modify && (
                        <TextField
                          label="New Role"
                          value={sys.newRole || ''}
                          onChange={(_, v) => {
                            const updated = [...systemAccessChanges];
                            updated[idx].newRole = v || '';
                            setSystemAccessChanges(updated);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 4: // Training
        return (
          <div className={styles.formSection}>
            <h3 style={{ color: MOVER_COLOR }}>Required Training</h3>
            <p style={{ color: '#605e5c', marginBottom: 16 }}>
              Select any training courses required for the new role.
            </p>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {trainingRequired.map((training, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const updated = [...trainingRequired];
                    updated[idx].selected = !updated[idx].selected;
                    setTrainingRequired(updated);
                  }}
                  style={{
                    padding: 12, borderRadius: 6, marginBottom: 8, cursor: 'pointer',
                    border: training.selected ? `2px solid ${MOVER_COLOR}` : '1px solid #edebe9',
                    background: training.selected ? '#fff7ed' : '#fff',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 4,
                    border: training.selected ? 'none' : '2px solid #8a8886',
                    background: training.selected ? MOVER_COLOR : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {training.selected && <Icon iconName="CheckMark" style={{ color: '#fff', fontSize: 12 }} />}
                  </div>
                  <div style={{ fontWeight: 500 }}>{training.courseName}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 5: // Review
        return (
          <div className={styles.formSection}>
            <h3 style={{ color: MOVER_COLOR }}>Review Transfer</h3>

            <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>Employee</h4>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{employeeName}</div>
              {employeeEmail && <div style={{ fontSize: 13, color: '#605e5c' }}>{employeeEmail}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ background: '#fef2f2', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#991b1b' }}>From</h4>
                <div style={{ fontWeight: 500 }}>{currentJobTitle}</div>
                <div style={{ fontSize: 13, color: '#605e5c' }}>{currentDepartment || 'No department'}</div>
                {currentLocation && <div style={{ fontSize: 13, color: '#605e5c' }}>{currentLocation}</div>}
                {currentSalary && <div style={{ fontSize: 13, color: '#605e5c' }}>${currentSalary.toLocaleString()}</div>}
              </div>
              <div style={{ background: '#dcfce7', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#166534' }}>To</h4>
                <div style={{ fontWeight: 500 }}>{newJobTitle}</div>
                <div style={{ fontSize: 13, color: '#605e5c' }}>{newDepartment || 'No department'}</div>
                {newLocation && <div style={{ fontSize: 13, color: '#605e5c' }}>{newLocation}</div>}
                {newSalary && <div style={{ fontSize: 13, color: '#605e5c' }}>${newSalary.toLocaleString()}</div>}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                <div><strong>Transfer Type:</strong> {moverType}</div>
                <div><strong>Effective Date:</strong> {effectiveDate?.toLocaleDateString()}</div>
              </div>
            </div>

            {systemAccessChanges.filter(s => s.selected && s.action !== SystemAccessAction.NoChange).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>System Access Changes</h4>
                {systemAccessChanges.filter(s => s.selected && s.action !== SystemAccessAction.NoChange).map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#605e5c' }}>
                    • {s.action}: {s.systemName} {s.newRole && `(→ ${s.newRole})`}
                  </div>
                ))}
              </div>
            )}

            {trainingRequired.filter(t => t.selected).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Required Training</h4>
                {trainingRequired.filter(t => t.selected).map((t, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#605e5c' }}>• {t.courseName}</div>
                ))}
              </div>
            )}

            <TextField
              label="Additional Notes"
              value={notes}
              onChange={(_, v) => setNotes(v || '')}
              multiline
              rows={3}
            />

            {error && (
              <div style={{ marginTop: 16, padding: 12, background: '#fee2e2', borderRadius: 6, color: '#dc2626' }}>
                {error}
              </div>
            )}
          </div>
        );

      default:
        return <div />;
    }
  };

  const onRenderHeader = (): JSX.Element => {
    if (submitted) return <div />;
    return (
      <div className={styles.panelHeaderMover}>
        <div className={styles.panelTitleArea}>
          <div className={styles.panelIcon}>
            <Icon iconName="Sync" style={{ fontSize: 22, color: '#ffffff' }} />
          </div>
          <div>
            <div className={styles.panelTitle}>New Internal Transfer</div>
            <div className={styles.panelSubtitle}>
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
            </div>
          </div>
        </div>
        <button className={styles.panelCloseBtn} onClick={handleClose} title="Close">
          &times;
        </button>
      </div>
    );
  };

  const renderFooter = (): JSX.Element => {
    if (submitted) return <div />;

    return (
      <div className={styles.panelFooter} style={{ justifyContent: 'space-between' }}>
        <button
          className={styles.btnSecondary}
          onClick={() => setCurrentStep(s => s - 1)}
          disabled={currentStep === 0}
          style={{ opacity: currentStep === 0 ? 0.5 : 1 }}
        >
          Back
        </button>
        <button
          className={styles.btnPrimaryMover}
          onClick={() => {
            if (currentStep === STEPS.length - 1) {
              handleSubmit();
            } else {
              setCurrentStep(s => s + 1);
            }
          }}
          disabled={!canProceed() || submitting}
        >
          {submitting ? 'Creating...' : currentStep === STEPS.length - 1 ? 'Create Transfer' : 'Next'}
        </button>
      </div>
    );
  };

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={handleClose}
      type={PanelType.large}
      hasCloseButton={false}
      onRenderHeader={onRenderHeader}
      onRenderFooterContent={renderFooter}
      isFooterAtBottom={true}
      className={styles.rmPanel}
    >
      <div className={styles.panelBody}>
        {!submitted && renderStepIndicator()}
        {submitted ? renderSuccessScreen() : renderStep()}
      </div>
    </Panel>
  );
};
