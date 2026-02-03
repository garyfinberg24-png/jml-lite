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
import { OnboardingService } from '../services/OnboardingService';
import { OnboardingConfigService } from '../services/OnboardingConfigService';
import { IOnboardingWizardData, OnboardingStatus, OnboardingTaskStatus } from '../models/IOnboarding';
import { IDocumentType, IAssetType, ISystemAccessType, ITrainingCourse, IPolicyPack, IDepartment } from '../models/IOnboardingConfig';
import styles from '../styles/JmlPanelStyles.module.scss';
import '../styles/FieldBorders.module.scss';

interface IProps {
  sp: SPFI;
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
  { label: 'Review', icon: 'CheckList' },
];

export const OnboardingWizard: React.FC<IProps> = ({ sp, isOpen, onDismiss, onCompleted }) => {
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
      loadData();
    }
  }, [isOpen, sp]);

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

      // Count total tasks
      const docTasks = selectedDocs.filter(d => d.required).length;
      const sysTasks = selectedSystems.filter(s => s.requested).length;
      const eqTasks = selectedAssets.filter(e => e.requested).length;
      const trainTasks = selectedTraining.filter(t => t.mandatory).length;
      const totalTasks = docTasks + sysTasks + eqTasks + trainTasks;

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

        // Document tasks
        for (const doc of selectedDocs.filter(d => d.required)) {
          await svc.createOnboardingTask({
            Title: `Collect: ${doc.name}`,
            OnboardingId: onboarding.Id,
            Category: 'Documentation' as any,
            Status: doc.received ? OnboardingTaskStatus.Completed : OnboardingTaskStatus.Pending,
            Priority: 'High',
            SortOrder: sortOrder++,
          });
        }

        // System access tasks
        for (const sys of selectedSystems.filter(s => s.requested)) {
          await svc.createOnboardingTask({
            Title: `Set up ${sys.name} (${sys.role})`,
            OnboardingId: onboarding.Id,
            Category: 'System Access' as any,
            Status: OnboardingTaskStatus.Pending,
            Priority: 'High',
            SortOrder: sortOrder++,
          });
        }

        // Equipment tasks
        for (const eq of selectedAssets.filter(e => e.requested)) {
          await svc.createOnboardingTask({
            Title: `Provision ${eq.name}${eq.quantity > 1 ? ` x${eq.quantity}` : ''}`,
            OnboardingId: onboarding.Id,
            Category: 'Equipment' as any,
            Status: OnboardingTaskStatus.Pending,
            Priority: 'Medium',
            SortOrder: sortOrder++,
          });
        }

        // Training tasks
        for (const tr of selectedTraining.filter(t => t.mandatory)) {
          await svc.createOnboardingTask({
            Title: tr.name,
            OnboardingId: onboarding.Id,
            Category: 'Training' as any,
            Status: tr.scheduled ? OnboardingTaskStatus.InProgress : OnboardingTaskStatus.Pending,
            Priority: 'Medium',
            SortOrder: sortOrder++,
          });
        }

        // Recalculate in case some docs were marked received
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

  const renderStep7 = (): JSX.Element => {
    const reqDocs = selectedDocs.filter(d => d.required);
    const recDocs = selectedDocs.filter(d => d.received);
    const systems = selectedSystems.filter(s => s.requested);
    const equip = selectedAssets.filter(e => e.requested);
    const mandatoryTraining = selectedTraining.filter(t => t.mandatory);

    const summaryCard: React.CSSProperties = { background: '#f9f8ff', borderRadius: 8, padding: 16, marginBottom: 12 };
    const summaryLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 8 };
    const summaryValue: React.CSSProperties = { fontSize: 13, color: '#323130', marginBottom: 4 };

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
          <div style={summaryLabel}>Documents ({reqDocs.length} required, {recDocs.length} received)</div>
          {reqDocs.map(d => (
            <div key={d.id} style={summaryValue}>
              <Icon iconName={d.received ? 'CheckboxComposite' : 'Checkbox'} style={{ marginRight: 8, fontSize: 12, color: d.received ? '#059669' : '#8a8886' }} />
              {d.name}
            </div>
          ))}
        </div>

        <div style={summaryCard}>
          <div style={summaryLabel}>System Access ({systems.length} systems)</div>
          {systems.map(s => <div key={s.id} style={summaryValue}>{s.name} — {s.role}</div>)}
        </div>

        <div style={summaryCard}>
          <div style={summaryLabel}>Equipment ({equip.length} items)</div>
          {equip.map(e => <div key={e.id} style={summaryValue}>{e.name}{e.quantity > 1 ? ` x${e.quantity}` : ''}</div>)}
        </div>

        <div style={summaryCard}>
          <div style={summaryLabel}>Training ({mandatoryTraining.length} mandatory)</div>
          {mandatoryTraining.map(t => (
            <div key={t.id} style={summaryValue}>
              <Icon iconName={t.scheduled ? 'Calendar' : 'Clock'} style={{ marginRight: 8, fontSize: 12, color: t.scheduled ? '#059669' : '#d97706' }} />
              {t.name} {t.scheduled ? '(Scheduled)' : '(Not Scheduled)'}
            </div>
          ))}
        </div>

        {error && <div style={{ padding: 12, background: '#fde7e9', borderRadius: 8, color: '#d13438', fontSize: 13, marginTop: 12 }}>{error}</div>}
      </div>
    );
  };

  const renderSuccessScreen = (): JSX.Element => {
    const totalTasks = selectedDocs.filter(d => d.required).length +
      selectedSystems.filter(s => s.requested).length +
      selectedAssets.filter(e => e.requested).length +
      selectedTraining.filter(t => t.mandatory).length;

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
              <div style={{ fontSize: 20, fontWeight: 700, color: '#005BAA' }}>{selectedDocs.filter(d => d.required).length}</div>
              <div style={{ fontSize: 11, color: '#8a8886' }}>Documents</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #e9e5f5' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#005BAA' }}>{selectedSystems.filter(s => s.requested).length}</div>
              <div style={{ fontSize: 11, color: '#8a8886' }}>Systems</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #e9e5f5' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#005BAA' }}>{selectedAssets.filter(e => e.requested).length}</div>
              <div style={{ fontSize: 11, color: '#8a8886' }}>Equipment</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #e9e5f5' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#005BAA' }}>{selectedTraining.filter(t => t.mandatory).length}</div>
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
          {submitted ? 'Employee onboarding has been created' : `Step ${currentStep + 1} of 8 — ${STEPS[currentStep].label}`}
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
          {currentStep < 7 ? (
            <button className={styles.btnPrimary} onClick={handleNext} disabled={!canProceed()}>Next</button>
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
  );
};
