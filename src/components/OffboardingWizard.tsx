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
import { OffboardingService } from '../services/OffboardingService';
import { OnboardingConfigService } from '../services/OnboardingConfigService';
import {
  OffboardingStatus, OffboardingTaskCategory,
  OffboardingTaskStatus, TerminationType, AssetReturnStatus, IEligibleEmployee
} from '../models/IOffboarding';
import styles from '../styles/JmlPanelStyles.module.scss';
import '../styles/FieldBorders.module.scss';

interface IProps {
  sp: SPFI;
  isOpen: boolean;
  onDismiss: () => void;
  onCompleted: () => void;
}

interface IAssetToReturn {
  assetTypeId?: number;
  assetName: string;
  assetTag?: string;
  quantity: number;
  requiresDataWipe: boolean;
  selected: boolean;
}

interface ISystemToRevoke {
  systemAccessTypeId?: number;
  systemName: string;
  currentRole: string;
  selected: boolean;
}

interface IKnowledgeTransfer {
  description: string;
  assignedTo?: string;
  dueDate?: Date;
}

const STEPS = [
  { label: 'Employee', icon: 'Contact' },
  { label: 'Termination', icon: 'UserRemove' },
  { label: 'Assets', icon: 'Devices3' },
  { label: 'Systems', icon: 'Permissions' },
  { label: 'Exit Interview', icon: 'CannedChat' },
  { label: 'Knowledge', icon: 'BookAnswers' },
  { label: 'Review', icon: 'CheckList' },
];

const TERMINATION_OPTIONS: IDropdownOption[] = [
  { key: TerminationType.Resignation, text: 'Resignation' },
  { key: TerminationType.Termination, text: 'Termination' },
  { key: TerminationType.Redundancy, text: 'Redundancy' },
  { key: TerminationType.Retirement, text: 'Retirement' },
  { key: TerminationType.ContractEnd, text: 'Contract End' },
  { key: TerminationType.Other, text: 'Other' },
];

export const OffboardingWizard: React.FC<IProps> = ({ sp, isOpen, onDismiss, onCompleted }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [employees, setEmployees] = useState<IEligibleEmployee[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

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
  const [exitInterviewDate, setExitInterviewDate] = useState<Date | undefined>(undefined);
  const [exitInterviewNotes, setExitInterviewNotes] = useState('');
  const [knowledgeTransfer, setKnowledgeTransfer] = useState<IKnowledgeTransfer[]>([]);

  useEffect(() => {
    if (isOpen) {
      resetWizard();
      loadData();
    }
  }, [isOpen, sp]);

  const resetWizard = (): void => {
    setCurrentStep(0);
    setSelectedEmployeeId(null);
    setEmployeeName('');
    setEmployeeEmail('');
    setJobTitle('');
    setDepartment('');
    setLastWorkingDate(undefined);
    setTerminationType(TerminationType.Resignation);
    setNotes('');
    setReferenceEligible(true);
    setRehireEligible(true);
    setAssetsToReturn([]);
    setSystemsToRevoke([]);
    setExitInterviewDate(undefined);
    setExitInterviewNotes('');
    setKnowledgeTransfer([]);
    setError('');
    setSubmitting(false);
    setSubmitted(false);
  };

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

      // Initialize assets from config (returnable only)
      setAssetsToReturn(assetTypesData.filter(a => a.IsReturnable).map(a => ({
        assetTypeId: a.Id,
        assetName: a.Title,
        quantity: 1,
        requiresDataWipe: a.Category === 'Hardware',
        selected: false
      })));

      // Initialize systems
      setSystemsToRevoke(systemTypesData.map(s => ({
        systemAccessTypeId: s.Id,
        systemName: s.Title,
        currentRole: s.DefaultRole || 'Standard',
        selected: true
      })));
    } catch (err) {
      console.error('[OffboardingWizard] Error loading data:', err);
    }
    setLoadingData(false);
  };

  const onSelectEmployee = (_: any, option?: IDropdownOption): void => {
    if (!option) return;
    const emp = employees.find(e => e.Id === option.key);
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
    return true;
  };

  const handleNext = (): void => { if (canProceed()) setCurrentStep(prev => prev + 1); };
  const handleBack = (): void => setCurrentStep(prev => prev - 1);

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError('');
    try {
      const svc = new OffboardingService(sp);

      // Count tasks
      const assetTasks = assetsToReturn.filter(a => a.selected).length;
      const systemTasks = systemsToRevoke.filter(s => s.selected).length;
      const ktTasks = knowledgeTransfer.filter(k => k.description.trim()).length;
      const exitTask = exitInterviewDate ? 1 : 0;
      const totalTasks = assetTasks + systemTasks + ktTasks + exitTask + 2; // +2 for final pay & documentation

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
        let sortOrder = 1;

        // Asset return tasks
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

          await svc.createOffboardingTask({
            Title: `Return: ${asset.assetName}${asset.assetTag ? ` (${asset.assetTag})` : ''}`,
            OffboardingId: offboarding.Id,
            Category: OffboardingTaskCategory.AssetReturn,
            Status: OffboardingTaskStatus.Pending,
            Priority: 'High',
            SortOrder: sortOrder++,
          });
        }

        // System revocation tasks
        for (const sys of systemsToRevoke.filter(s => s.selected)) {
          await svc.createOffboardingTask({
            Title: `Revoke access: ${sys.systemName}`,
            OffboardingId: offboarding.Id,
            Category: OffboardingTaskCategory.SystemAccess,
            Status: OffboardingTaskStatus.Pending,
            Priority: 'High',
            SortOrder: sortOrder++,
            RelatedSystemAccessId: sys.systemAccessTypeId,
          });
        }

        // Exit interview task
        if (exitInterviewDate) {
          await svc.createOffboardingTask({
            Title: 'Conduct exit interview',
            OffboardingId: offboarding.Id,
            Category: OffboardingTaskCategory.ExitInterview,
            Status: OffboardingTaskStatus.Pending,
            Priority: 'Medium',
            DueDate: exitInterviewDate,
            SortOrder: sortOrder++,
            Notes: exitInterviewNotes,
          });
        }

        // Knowledge transfer tasks
        for (const kt of knowledgeTransfer.filter(k => k.description.trim())) {
          await svc.createOffboardingTask({
            Title: `Knowledge transfer: ${kt.description}`,
            OffboardingId: offboarding.Id,
            Category: OffboardingTaskCategory.KnowledgeTransfer,
            Status: OffboardingTaskStatus.Pending,
            Priority: 'Medium',
            DueDate: kt.dueDate,
            SortOrder: sortOrder++,
          });
        }

        // Standard tasks
        await svc.createOffboardingTask({
          Title: 'Process final payment',
          OffboardingId: offboarding.Id,
          Category: OffboardingTaskCategory.FinalPay,
          Status: OffboardingTaskStatus.Pending,
          Priority: 'High',
          DueDate: lastWorkingDate,
          SortOrder: sortOrder++,
        });

        await svc.createOffboardingTask({
          Title: 'Complete exit documentation',
          OffboardingId: offboarding.Id,
          Category: OffboardingTaskCategory.Documentation,
          Status: OffboardingTaskStatus.Pending,
          Priority: 'Medium',
          SortOrder: sortOrder++,
        });

        await svc.recalculateProgress(offboarding.Id);
        setSubmitted(true);
      }
    } catch (err) {
      console.error('[OffboardingWizard] Error submitting:', err);
      setError('Failed to create offboarding. Please try again.');
    }
    setSubmitting(false);
  };

  // Step renderers
  const renderStep0 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>
        Select an employee to begin the offboarding process. Only employees with completed onboarding are shown.
      </p>
      <Dropdown
        label="Employee"
        placeholder="Select an employee..."
        selectedKey={selectedEmployeeId || undefined}
        options={employees.map(e => ({ key: e.Id, text: `${e.EmployeeName} — ${e.JobTitle}` }))}
        onChange={onSelectEmployee}
      />
      {selectedEmployeeId && (
        <div style={{ marginTop: 16, padding: 16, background: '#fff4f4', borderRadius: 8, border: '1px solid #fde7e9' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#d13438', marginBottom: 8 }}>
            <Icon iconName="UserRemove" style={{ marginRight: 8 }} />{employeeName}
          </div>
          <div style={{ fontSize: 13, color: '#605e5c' }}>{jobTitle} — {department}</div>
          {employeeEmail && <div style={{ fontSize: 12, color: '#8a8886', marginTop: 4 }}>{employeeEmail}</div>}
        </div>
      )}
      {employees.length === 0 && (
        <div style={{ marginTop: 16, padding: 16, background: '#f3f2f1', borderRadius: 8, fontSize: 13, color: '#605e5c' }}>
          No employees available for offboarding. Employees must have completed or in-progress onboarding.
        </div>
      )}
    </div>
  );

  const renderStep1 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>Enter termination details for this employee.</p>
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
      <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
        <Toggle label="Eligible for reference" checked={referenceEligible} onChange={(_, c) => setReferenceEligible(!!c)} />
        <Toggle label="Eligible for rehire" checked={rehireEligible} onChange={(_, c) => setRehireEligible(!!c)} />
      </div>
      <div style={{ marginTop: 16 }}>
        <TextField label="Notes" multiline rows={3} value={notes} onChange={(_, v) => setNotes(v || '')} />
      </div>
    </div>
  );

  const renderStep2 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>
        Select assets that need to be returned. You can add asset tags for tracking.
      </p>
      {assetsToReturn.map((asset, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #edebe9' }}>
          <Toggle checked={asset.selected} onChange={(_, c) => {
            const arr = [...assetsToReturn];
            arr[i] = { ...arr[i], selected: !!c };
            setAssetsToReturn(arr);
          }} styles={{ root: { marginBottom: 0 } }} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{asset.assetName}</div>
          <TextField placeholder="Asset Tag" value={asset.assetTag || ''} style={{ width: 120 }}
            onChange={(_, v) => {
              const arr = [...assetsToReturn];
              arr[i] = { ...arr[i], assetTag: v };
              setAssetsToReturn(arr);
            }} />
          <Toggle label="Data Wipe" inlineLabel checked={asset.requiresDataWipe}
            onChange={(_, c) => {
              const arr = [...assetsToReturn];
              arr[i] = { ...arr[i], requiresDataWipe: !!c };
              setAssetsToReturn(arr);
            }} styles={{ root: { marginBottom: 0 } }} />
        </div>
      ))}
      <button onClick={() => setAssetsToReturn([...assetsToReturn, {
        assetName: '', quantity: 1, requiresDataWipe: false, selected: true
      }])} style={{ marginTop: 12, padding: '6px 16px', borderRadius: 4, border: '1px solid #d13438', background: 'transparent', color: '#d13438', fontSize: 13, cursor: 'pointer' }}>
        <Icon iconName="Add" style={{ marginRight: 6, fontSize: 12 }} />Add Custom Asset
      </button>
    </div>
  );

  const renderStep3 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>
        Select system access to revoke. All selected systems will have access removed.
      </p>
      {systemsToRevoke.map((sys, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #edebe9' }}>
          <Toggle checked={sys.selected} onChange={(_, c) => {
            const arr = [...systemsToRevoke];
            arr[i] = { ...arr[i], selected: !!c };
            setSystemsToRevoke(arr);
          }} styles={{ root: { marginBottom: 0 } }} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{sys.systemName}</div>
          <div style={{ fontSize: 12, color: '#8a8886' }}>Current: {sys.currentRole}</div>
        </div>
      ))}
    </div>
  );

  const renderStep4 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>Schedule an exit interview (optional).</p>
      <DatePicker
        label="Exit Interview Date"
        value={exitInterviewDate}
        onSelectDate={(date) => setExitInterviewDate(date || undefined)}
        minDate={new Date()}
      />
      <div style={{ marginTop: 16 }}>
        <TextField label="Interview Topics / Notes" multiline rows={4} value={exitInterviewNotes}
          onChange={(_, v) => setExitInterviewNotes(v || '')}
          placeholder="Topics to cover during the exit interview..." />
      </div>
    </div>
  );

  const renderStep5 = (): JSX.Element => (
    <div>
      <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>
        Add knowledge transfer tasks to ensure smooth handover.
      </p>
      {knowledgeTransfer.map((kt, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
          <TextField label={i === 0 ? 'Description' : undefined} value={kt.description} style={{ flex: 1 }}
            placeholder="What needs to be transferred..."
            onChange={(_, v) => {
              const arr = [...knowledgeTransfer];
              arr[i] = { ...arr[i], description: v || '' };
              setKnowledgeTransfer(arr);
            }} />
          <DatePicker label={i === 0 ? 'Due Date' : undefined} value={kt.dueDate}
            onSelectDate={(date) => {
              const arr = [...knowledgeTransfer];
              arr[i] = { ...arr[i], dueDate: date || undefined };
              setKnowledgeTransfer(arr);
            }} />
          <button onClick={() => setKnowledgeTransfer(knowledgeTransfer.filter((_, idx) => idx !== i))}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8 }}>
            <Icon iconName="Delete" style={{ fontSize: 14, color: '#d13438' }} />
          </button>
        </div>
      ))}
      <button onClick={() => setKnowledgeTransfer([...knowledgeTransfer, { description: '' }])}
        style={{ padding: '6px 16px', borderRadius: 4, border: '1px solid #d13438', background: 'transparent', color: '#d13438', fontSize: 13, cursor: 'pointer' }}>
        <Icon iconName="Add" style={{ marginRight: 6, fontSize: 12 }} />Add Transfer Task
      </button>
    </div>
  );

  const renderStep6 = (): JSX.Element => {
    const selectedAssets = assetsToReturn.filter(a => a.selected);
    const selectedSystems = systemsToRevoke.filter(s => s.selected);
    const ktTasks = knowledgeTransfer.filter(k => k.description.trim());

    const summaryCard: React.CSSProperties = { background: '#fff4f4', borderRadius: 8, padding: 16, marginBottom: 12 };
    const summaryLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#d13438', textTransform: 'uppercase', marginBottom: 8 };
    const summaryValue: React.CSSProperties = { fontSize: 13, color: '#323130', marginBottom: 4 };

    return (
      <div>
        <p style={{ fontSize: 13, color: '#605e5c', marginBottom: 16 }}>Review the offboarding configuration before submitting.</p>

        <div style={summaryCard}>
          <div style={summaryLabel}>Employee</div>
          <div style={summaryValue}><strong>{employeeName}</strong></div>
          <div style={summaryValue}>{jobTitle} — {department}</div>
          <div style={summaryValue}>Last Day: {lastWorkingDate?.toLocaleDateString()}</div>
          <div style={summaryValue}>Type: {terminationType}</div>
        </div>

        <div style={summaryCard}>
          <div style={summaryLabel}>Assets to Return ({selectedAssets.length})</div>
          {selectedAssets.map((a, i) => (
            <div key={i} style={summaryValue}>
              <Icon iconName="Devices3" style={{ marginRight: 8, fontSize: 12 }} />
              {a.assetName}{a.assetTag ? ` (${a.assetTag})` : ''}{a.requiresDataWipe ? ' — Data Wipe Required' : ''}
            </div>
          ))}
          {selectedAssets.length === 0 && <div style={{ ...summaryValue, color: '#8a8886' }}>No assets selected</div>}
        </div>

        <div style={summaryCard}>
          <div style={summaryLabel}>Systems to Revoke ({selectedSystems.length})</div>
          {selectedSystems.map((s, i) => (
            <div key={i} style={summaryValue}>
              <Icon iconName="Permissions" style={{ marginRight: 8, fontSize: 12 }} />{s.systemName}
            </div>
          ))}
        </div>

        {exitInterviewDate && (
          <div style={summaryCard}>
            <div style={summaryLabel}>Exit Interview</div>
            <div style={summaryValue}>
              <Icon iconName="Calendar" style={{ marginRight: 8, fontSize: 12 }} />
              Scheduled: {exitInterviewDate.toLocaleDateString()}
            </div>
          </div>
        )}

        {ktTasks.length > 0 && (
          <div style={summaryCard}>
            <div style={summaryLabel}>Knowledge Transfer ({ktTasks.length})</div>
            {ktTasks.map((k, i) => <div key={i} style={summaryValue}>{k.description}</div>)}
          </div>
        )}

        {error && <div style={{ padding: 12, background: '#fde7e9', borderRadius: 8, color: '#d13438', fontSize: 13, marginTop: 12 }}>{error}</div>}
      </div>
    );
  };

  const renderSuccessScreen = (): JSX.Element => {
    const totalTasks = assetsToReturn.filter(a => a.selected).length +
      systemsToRevoke.filter(s => s.selected).length +
      knowledgeTransfer.filter(k => k.description.trim()).length +
      (exitInterviewDate ? 1 : 0) + 2;

    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #d13438 0%, #a4262c 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
        }}>
          <Icon iconName="CheckMark" style={{ fontSize: 40, color: '#fff' }} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#323130', marginBottom: 8 }}>Offboarding Created Successfully!</h2>
        <p style={{ fontSize: 14, color: '#605e5c', marginBottom: 32 }}>
          {employeeName}'s offboarding has been set up with {totalTasks} tasks to complete.
        </p>
        <div style={{ background: '#fff4f4', borderRadius: 12, padding: 24, maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <Icon iconName="UserRemove" style={{ fontSize: 20, color: '#d13438', marginRight: 12 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#323130' }}>{employeeName}</div>
              <div style={{ fontSize: 12, color: '#605e5c' }}>{jobTitle} — {department}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #fde7e9' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#d13438' }}>{assetsToReturn.filter(a => a.selected).length}</div>
              <div style={{ fontSize: 11, color: '#8a8886' }}>Assets</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #fde7e9' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#d13438' }}>{systemsToRevoke.filter(s => s.selected).length}</div>
              <div style={{ fontSize: 11, color: '#8a8886' }}>Systems</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #fde7e9' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#d13438' }}>{knowledgeTransfer.filter(k => k.description.trim()).length}</div>
              <div style={{ fontSize: 11, color: '#8a8886' }}>Transfers</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #fde7e9' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#d13438' }}>{exitInterviewDate ? 1 : 0}</div>
              <div style={{ fontSize: 11, color: '#8a8886' }}>Interview</div>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 12, background: '#fff0f0', borderRadius: 8, fontSize: 13, color: '#a4262c' }}>
            <Icon iconName="Calendar" style={{ marginRight: 8 }} />
            Last Working Day: {lastWorkingDate?.toLocaleDateString()}
          </div>
        </div>
        <button
          onClick={() => { onCompleted(); }}
          style={{
            marginTop: 32, padding: '12px 32px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #d13438 0%, #a4262c 100%)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}
        >
          View Offboarding Tracker
        </button>
      </div>
    );
  };

  const renderCurrentStep = (): JSX.Element => {
    if (loadingData) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner size={SpinnerSize.large} label="Loading data..." />
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
      default: return renderStep0();
    }
  };

  const onRenderHeader = (): JSX.Element => (
    <div className={styles.panelHeader} style={{ background: 'linear-gradient(135deg, #d13438 0%, #a4262c 100%)' }}>
      <div className={styles.panelIcon} style={{ background: 'rgba(255,255,255,0.2)' }}>
        <Icon iconName={submitted ? 'CheckMark' : 'UserRemove'} style={{ fontSize: 20, color: '#fff' }} />
      </div>
      <div>
        <div className={styles.panelTitle}>{submitted ? 'Offboarding Complete' : 'Start Offboarding'}</div>
        <div className={styles.panelSubtitle}>
          {submitted ? 'Employee offboarding has been created' : `Step ${currentStep + 1} of 7 — ${STEPS[currentStep].label}`}
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
          {currentStep < 6 ? (
            <button className={styles.btnPrimary} onClick={handleNext} disabled={!canProceed()}
              style={{ background: 'linear-gradient(135deg, #d13438 0%, #a4262c 100%)' }}>Next</button>
          ) : (
            <button className={styles.btnPrimary} onClick={handleSubmit} disabled={submitting}
              style={{ background: 'linear-gradient(135deg, #d13438 0%, #a4262c 100%)' }}>
              {submitting ? 'Creating...' : 'Start Offboarding'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Panel
      isOpen={isOpen}
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
        {!submitted && !loadingData && (
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 0 24px', marginBottom: 24, borderBottom: '1px solid #edebe9' }}>
            {STEPS.map((step, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: i < currentStep ? '#d13438' : i === currentStep ? '#a4262c' : '#edebe9',
                    color: i <= currentStep ? '#fff' : '#8a8886',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: 11, transition: 'all 0.3s ease',
                  }}>
                    {i < currentStep ? <Icon iconName="CheckMark" style={{ fontSize: 12 }} /> : i + 1}
                  </div>
                  <div style={{
                    fontSize: 9, color: i === currentStep ? '#d13438' : '#605e5c',
                    fontWeight: i === currentStep ? 600 : 400, marginTop: 4, whiteSpace: 'nowrap',
                  }}>{step.label}</div>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: i < currentStep ? '#d13438' : '#edebe9', margin: '0 2px', marginBottom: 18 }} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Step content */}
        {renderCurrentStep()}
      </div>
    </Panel>
  );
};
