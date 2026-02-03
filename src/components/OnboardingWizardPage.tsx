import * as React from 'react';
import { useState, useEffect } from 'react';
import { SPFI } from '@pnp/sp';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown } from '@fluentui/react/lib/Dropdown';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
// Toggle removed - using checkboxes in accordion pattern
import { Icon } from '@fluentui/react/lib/Icon';
import { JmlWizardLayout, JmlWizardSuccess, IJmlWizardStep, IJmlWizardTip, IJmlWizardChecklistItem, ISummaryPanel } from './JmlWizardLayout';
import { OnboardingService } from '../services/OnboardingService';
import { OnboardingConfigService } from '../services/OnboardingConfigService';
import { IOnboardingWizardData, OnboardingStatus, OnboardingTaskStatus } from '../models/IOnboarding';
import { IDocumentType, IAssetType, ISystemAccessType, ITrainingCourse, IPolicyPack, IDepartment } from '../models/IOnboardingConfig';
import styles from '../styles/JmlWizard.module.scss';

interface IProps {
  sp: SPFI;
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
  { key: 'policypack', label: 'Policy Pack', icon: 'Package' },
  { key: 'documents', label: 'Documents', icon: 'DocumentSet' },
  { key: 'systems', label: 'System Access', icon: 'Permissions' },
  { key: 'equipment', label: 'Equipment', icon: 'Devices3' },
  { key: 'training', label: 'Training', icon: 'Education' },
  { key: 'review', label: 'Review & Submit', icon: 'CheckList' },
];

export const OnboardingWizardPage: React.FC<IProps> = ({ sp, onComplete, onCancel }) => {
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

  const [selectedDocs, setSelectedDocs] = useState<ISelectedDoc[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<ISelectedSystem[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<ISelectedAsset[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<ISelectedTraining[]>([]);

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

        await svc.recalculateProgress(onboarding.Id);
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
      case 2:
        return [
          { icon: 'Package', title: 'Policy Packs', content: 'Policy packs pre-configure documents, systems, equipment, and training based on role or department.' },
          { icon: 'Lightbulb', title: 'Tip', content: 'You can customize individual selections in the following steps after applying a pack.' },
        ];
      case 3:
        return [
          { icon: 'DocumentSet', title: 'Required Documents', content: 'Mark documents as required to create tasks for collecting them.' },
          { icon: 'CheckboxComposite', title: 'Already Received?', content: 'Toggle "Received" for any documents already collected during hiring.' },
        ];
      case 4:
        return [
          { icon: 'Permissions', title: 'System Access', content: 'Select which systems the new employee needs access to.' },
          { icon: 'Settings', title: 'Roles', content: 'You can customize the access role for each system.' },
        ];
      case 5:
        return [
          { icon: 'Devices3', title: 'Equipment', content: 'Select hardware and equipment to be provisioned for the employee.' },
          { icon: 'Add', title: 'Add More', content: 'Use the dropdown at the bottom to add additional equipment items.' },
        ];
      case 6:
        return [
          { icon: 'Education', title: 'Training', content: 'Mandatory training courses will create tasks that must be completed.' },
          { icon: 'Calendar', title: 'Scheduling', content: 'Mark courses as "Scheduled" if training dates have already been set.' },
        ];
      case 7:
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
  ];

  // Step content renderers
  const renderStepContent = (): JSX.Element => {
    switch (currentStep) {
      case 0: return renderCandidateStep();
      case 1: return renderDetailsStep();
      case 2: return renderPolicyPackStep();
      case 3: return renderDocumentsStep();
      case 4: return renderSystemsStep();
      case 5: return renderEquipmentStep();
      case 6: return renderTrainingStep();
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
        primaryAction={{ label: 'View Onboarding Tracker', onClick: onComplete }}
        secondaryAction={{ label: 'Start Another', onClick: () => { setSubmitted(false); setCurrentStep(0); } }}
      />
    );
  }

  const progressPercent = Math.round((currentStep / (STEPS.length - 1)) * 100);

  return (
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
      backToTrackerLabel="Back to Onboarding"
      onBackToTracker={onCancel}
    >
      {renderStepContent()}
    </JmlWizardLayout>
  );
};
