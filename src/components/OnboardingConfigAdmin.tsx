import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { Icon } from '@fluentui/react/lib/Icon';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { OnboardingConfigService } from '../services/OnboardingConfigService';
import {
  IDocumentType, IAssetType, ISystemAccessType, ITrainingCourse, IPolicyPack, IDepartment,
  DocumentCategory, AssetCategory, SystemAccessCategory, TrainingCategory, TrainingDeliveryMethod
} from '../models/IOnboardingConfig';
import styles from '../styles/JmlPanelStyles.module.scss';
import '../styles/FieldBorders.module.scss';

interface IProps { sp: SPFI; }

type ConfigTab = 'documents' | 'assets' | 'systems' | 'training' | 'policyPacks' | 'departments';

const DOCUMENT_CATEGORY_OPTIONS: IDropdownOption[] = Object.values(DocumentCategory).map(c => ({ key: c, text: c }));
const ASSET_CATEGORY_OPTIONS: IDropdownOption[] = Object.values(AssetCategory).map(c => ({ key: c, text: c }));
const SYSTEM_CATEGORY_OPTIONS: IDropdownOption[] = Object.values(SystemAccessCategory).map(c => ({ key: c, text: c }));
const TRAINING_CATEGORY_OPTIONS: IDropdownOption[] = Object.values(TrainingCategory).map(c => ({ key: c, text: c }));
const DELIVERY_METHOD_OPTIONS: IDropdownOption[] = Object.values(TrainingDeliveryMethod).map(c => ({ key: c, text: c }));

export const OnboardingConfigAdmin: React.FC<IProps> = ({ sp }) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('documents');
  const [loading, setLoading] = useState(true);

  // Data states
  const [documents, setDocuments] = useState<IDocumentType[]>([]);
  const [assets, setAssets] = useState<IAssetType[]>([]);
  const [systems, setSystems] = useState<ISystemAccessType[]>([]);
  const [training, setTraining] = useState<ITrainingCourse[]>([]);
  const [policyPacks, setPolicyPacks] = useState<IPolicyPack[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);

  // Panel states
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'create' | 'edit'>('create');
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const service = new OnboardingConfigService(sp);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, ast, sys, trn, pol, dept] = await Promise.all([
        service.getDocumentTypes(),
        service.getAssetTypes(),
        service.getSystemAccessTypes(),
        service.getTrainingCourses(),
        service.getPolicyPacks(),
        service.getDepartments(),
      ]);
      setDocuments(docs);
      setAssets(ast);
      setSystems(sys);
      setTraining(trn);
      setPolicyPacks(pol);
      setDepartments(dept);
    } catch (error) {
      console.error('[OnboardingConfigAdmin] Error loading:', error);
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => { loadData(); }, [loadData]);

  const tabs: { key: ConfigTab; label: string; icon: string; count: number }[] = [
    { key: 'documents', label: 'Document Types', icon: 'Document', count: documents.length },
    { key: 'assets', label: 'Asset Types', icon: 'DevicesApple', count: assets.length },
    { key: 'systems', label: 'System Access', icon: 'Cloud', count: systems.length },
    { key: 'training', label: 'Training Courses', icon: 'Education', count: training.length },
    { key: 'policyPacks', label: 'Policy Packs', icon: 'Package', count: policyPacks.length },
    { key: 'departments', label: 'Departments', icon: 'Org', count: departments.length },
  ];

  const openCreate = (): void => {
    setEditItem(getDefaultItem(activeTab));
    setPanelMode('create');
    setPanelOpen(true);
  };

  const openEdit = (item: any): void => {
    setEditItem({ ...item });
    setPanelMode('edit');
    setPanelOpen(true);
  };

  const confirmDelete = (item: any): void => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  };

  const getDefaultItem = (tab: ConfigTab): any => {
    switch (tab) {
      case 'documents': return { Title: '', Description: '', Category: DocumentCategory.HR, IsRequired: false, SortOrder: 0, IsActive: true };
      case 'assets': return { Title: '', Description: '', Category: AssetCategory.Hardware, EstimatedCost: 0, IsReturnable: true, DefaultQuantity: 1, RequiresApproval: false, SortOrder: 0, IsActive: true };
      case 'systems': return { Title: '', Description: '', Category: SystemAccessCategory.Core, DefaultRole: '', RequiresApproval: false, SortOrder: 0, IsActive: true };
      case 'training': return { Title: '', Description: '', Category: TrainingCategory.Orientation, DeliveryMethod: TrainingDeliveryMethod.OnlineSelfPaced, DurationHours: 1, IsMandatory: false, SortOrder: 0, IsActive: true };
      case 'policyPacks': return { Title: '', Description: '', Department: '', JobTitle: '', DocumentTypeIds: [], AssetTypeIds: [], SystemAccessTypeIds: [], TrainingCourseIds: [], IsDefault: false, SortOrder: 0, IsActive: true };
      case 'departments': return { Title: '', Code: '', CostCenter: '', IsActive: true };
      default: return {};
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!editItem?.Title) return;
    setSaving(true);
    try {
      switch (activeTab) {
        case 'documents':
          if (panelMode === 'create') await service.createDocumentType(editItem);
          else await service.updateDocumentType(editItem.Id, editItem);
          break;
        case 'assets':
          if (panelMode === 'create') await service.createAssetType(editItem);
          else await service.updateAssetType(editItem.Id, editItem);
          break;
        case 'systems':
          if (panelMode === 'create') await service.createSystemAccessType(editItem);
          else await service.updateSystemAccessType(editItem.Id, editItem);
          break;
        case 'training':
          if (panelMode === 'create') await service.createTrainingCourse(editItem);
          else await service.updateTrainingCourse(editItem.Id, editItem);
          break;
        case 'policyPacks':
          if (panelMode === 'create') await service.createPolicyPack(editItem);
          else await service.updatePolicyPack(editItem.Id, editItem);
          break;
        case 'departments':
          if (panelMode === 'create') await service.createDepartment(editItem);
          else await service.updateDepartment(editItem.Id, editItem);
          break;
      }
      setPanelOpen(false);
      loadData();
    } catch (error) {
      console.error('[OnboardingConfigAdmin] Error saving:', error);
    }
    setSaving(false);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget?.Id) return;
    setDeleting(true);
    try {
      switch (activeTab) {
        case 'documents': await service.deleteDocumentType(deleteTarget.Id); break;
        case 'assets': await service.deleteAssetType(deleteTarget.Id); break;
        case 'systems': await service.deleteSystemAccessType(deleteTarget.Id); break;
        case 'training': await service.deleteTrainingCourse(deleteTarget.Id); break;
        case 'policyPacks': await service.deletePolicyPack(deleteTarget.Id); break;
        case 'departments': await service.deleteDepartment(deleteTarget.Id); break;
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      console.error('[OnboardingConfigAdmin] Error deleting:', error);
    }
    setDeleting(false);
  };

  const toggleActive = async (item: any): Promise<void> => {
    try {
      const updates = { IsActive: !item.IsActive };
      switch (activeTab) {
        case 'documents': await service.updateDocumentType(item.Id, updates); break;
        case 'assets': await service.updateAssetType(item.Id, updates); break;
        case 'systems': await service.updateSystemAccessType(item.Id, updates); break;
        case 'training': await service.updateTrainingCourse(item.Id, updates); break;
        case 'policyPacks': await service.updatePolicyPack(item.Id, updates); break;
        case 'departments': await service.updateDepartment(item.Id, updates); break;
      }
      loadData();
    } catch (error) {
      console.error('[OnboardingConfigAdmin] Error toggling active:', error);
    }
  };

  const updateEditItem = (field: string, value: any): void => {
    setEditItem((prev: any) => ({ ...prev, [field]: value }));
  };

  const getCurrentData = (): any[] => {
    switch (activeTab) {
      case 'documents': return documents;
      case 'assets': return assets;
      case 'systems': return systems;
      case 'training': return training;
      case 'policyPacks': return policyPacks;
      case 'departments': return departments;
      default: return [];
    }
  };

  const renderTable = (): React.ReactElement => {
    const data = getCurrentData();
    if (data.length === 0) {
      return <div style={{ padding: 40, textAlign: 'center', color: '#8a8886' }}>No items configured. Click "Add New" to create one.</div>;
    }

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #005BAA', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Title</th>
            {activeTab !== 'departments' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Category</th>}
            {activeTab === 'departments' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Code</th>}
            {activeTab === 'assets' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Cost</th>}
            {activeTab === 'training' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Duration</th>}
            {activeTab === 'policyPacks' && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Department</th>}
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130', width: 80 }}>Active</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130', width: 100 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item: any) => (
            <tr key={item.Id} style={{ borderBottom: '1px solid #edebe9' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f8ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <td style={{ padding: '10px 16px' }}>
                <div style={{ fontWeight: 500 }}>{item.Title}</div>
                {item.Description && <div style={{ fontSize: 11, color: '#605e5c', marginTop: 2 }}>{item.Description.substring(0, 60)}{item.Description.length > 60 ? '...' : ''}</div>}
              </td>
              {activeTab !== 'departments' && activeTab !== 'policyPacks' && (
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#f3f2f1' }}>{item.Category || '\u2014'}</span>
                </td>
              )}
              {activeTab === 'departments' && <td style={{ padding: '10px 16px' }}>{item.Code || '\u2014'}</td>}
              {activeTab === 'assets' && <td style={{ padding: '10px 16px' }}>{item.EstimatedCost ? `$${item.EstimatedCost.toLocaleString()}` : '\u2014'}</td>}
              {activeTab === 'training' && <td style={{ padding: '10px 16px' }}>{item.DurationHours ? `${item.DurationHours}h` : '\u2014'}</td>}
              {activeTab === 'policyPacks' && <td style={{ padding: '10px 16px' }}>{item.Department || 'All'}</td>}
              <td style={{ padding: '10px 16px' }}>
                <button
                  onClick={() => toggleActive(item)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                  title={item.IsActive ? 'Click to deactivate' : 'Click to activate'}
                >
                  <Icon iconName={item.IsActive ? 'CheckboxComposite' : 'Checkbox'} style={{ fontSize: 18, color: item.IsActive ? '#059669' : '#8a8886' }} />
                </button>
              </td>
              <td style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(item)} title="Edit" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}>
                    <Icon iconName="Edit" style={{ fontSize: 14, color: '#605e5c' }} />
                  </button>
                  <button onClick={() => confirmDelete(item)} title="Delete" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}>
                    <Icon iconName="Delete" style={{ fontSize: 14, color: '#d13438' }} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderPanelContent = (): React.ReactElement | null => {
    if (!editItem) return null;

    switch (activeTab) {
      case 'documents':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} />
            <Dropdown label="Category" selectedKey={editItem.Category} options={DOCUMENT_CATEGORY_OPTIONS} onChange={(_, o) => o && updateEditItem('Category', o.key)} />
            <Toggle label="Required" checked={editItem.IsRequired} onChange={(_, c) => updateEditItem('IsRequired', c)} />
            <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      case 'assets':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} />
            <Dropdown label="Category" selectedKey={editItem.Category} options={ASSET_CATEGORY_OPTIONS} onChange={(_, o) => o && updateEditItem('Category', o.key)} />
            <SpinButton label="Estimated Cost ($)" value={String(editItem.EstimatedCost || 0)} min={0} max={100000} step={50} onChange={(_, v) => updateEditItem('EstimatedCost', parseFloat(v || '0'))} />
            <SpinButton label="Default Quantity" value={String(editItem.DefaultQuantity || 1)} min={1} max={100} onChange={(_, v) => updateEditItem('DefaultQuantity', parseInt(v || '1'))} />
            <SpinButton label="Lead Time (Days)" value={String(editItem.LeadTimeDays || 0)} min={0} max={90} onChange={(_, v) => updateEditItem('LeadTimeDays', parseInt(v || '0'))} />
            <Toggle label="Returnable" checked={editItem.IsReturnable} onChange={(_, c) => updateEditItem('IsReturnable', c)} />
            <Toggle label="Requires Approval" checked={editItem.RequiresApproval} onChange={(_, c) => updateEditItem('RequiresApproval', c)} />
            {editItem.RequiresApproval && (
              <SpinButton label="Approval Threshold ($)" value={String(editItem.ApprovalThreshold || 0)} min={0} max={100000} step={100} onChange={(_, v) => updateEditItem('ApprovalThreshold', parseFloat(v || '0'))} />
            )}
            <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      case 'systems':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} />
            <Dropdown label="Category" selectedKey={editItem.Category} options={SYSTEM_CATEGORY_OPTIONS} onChange={(_, o) => o && updateEditItem('Category', o.key)} />
            <TextField label="Default Role" value={editItem.DefaultRole || ''} onChange={(_, v) => updateEditItem('DefaultRole', v)} />
            <SpinButton label="Monthly License Cost ($)" value={String(editItem.LicenseCostMonthly || 0)} min={0} max={10000} step={5} onChange={(_, v) => updateEditItem('LicenseCostMonthly', parseFloat(v || '0'))} />
            <TextField label="Provisioning Instructions" multiline rows={3} value={editItem.ProvisioningInstructions || ''} onChange={(_, v) => updateEditItem('ProvisioningInstructions', v)} />
            <TextField label="Deprovisioning Instructions" multiline rows={3} value={editItem.DeprovisioningInstructions || ''} onChange={(_, v) => updateEditItem('DeprovisioningInstructions', v)} />
            <Toggle label="Requires Approval" checked={editItem.RequiresApproval} onChange={(_, c) => updateEditItem('RequiresApproval', c)} />
            <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      case 'training':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} />
            <Dropdown label="Category" selectedKey={editItem.Category} options={TRAINING_CATEGORY_OPTIONS} onChange={(_, o) => o && updateEditItem('Category', o.key)} />
            <Dropdown label="Delivery Method" selectedKey={editItem.DeliveryMethod} options={DELIVERY_METHOD_OPTIONS} onChange={(_, o) => o && updateEditItem('DeliveryMethod', o.key)} />
            <SpinButton label="Duration (Hours)" value={String(editItem.DurationHours || 1)} min={0.5} max={100} step={0.5} onChange={(_, v) => updateEditItem('DurationHours', parseFloat(v || '1'))} />
            <TextField label="Provider" value={editItem.Provider || ''} onChange={(_, v) => updateEditItem('Provider', v)} />
            <TextField label="Content URL" value={editItem.ContentUrl || ''} onChange={(_, v) => updateEditItem('ContentUrl', v)} />
            <SpinButton label="Estimated Cost ($)" value={String(editItem.EstimatedCost || 0)} min={0} max={10000} step={25} onChange={(_, v) => updateEditItem('EstimatedCost', parseFloat(v || '0'))} />
            <SpinButton label="Expiration (Months)" value={String(editItem.ExpirationMonths || 0)} min={0} max={60} onChange={(_, v) => updateEditItem('ExpirationMonths', parseInt(v || '0'))} placeholder="0 = No expiration" />
            <Toggle label="Mandatory" checked={editItem.IsMandatory} onChange={(_, c) => updateEditItem('IsMandatory', c)} />
            <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      case 'policyPacks':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} />
            <Dropdown
              label="Department"
              selectedKey={editItem.Department || ''}
              options={[{ key: '', text: 'All Departments' }, ...departments.filter(d => d.IsActive).map(d => ({ key: d.Title, text: d.Title }))]}
              onChange={(_, o) => o && updateEditItem('Department', o.key)}
            />
            <TextField label="Job Title (optional)" value={editItem.JobTitle || ''} onChange={(_, v) => updateEditItem('JobTitle', v)} placeholder="Leave empty for all job titles" />
            <Dropdown
              label="Document Types"
              multiSelect
              selectedKeys={editItem.DocumentTypeIds || []}
              options={documents.filter(d => d.IsActive).map(d => ({ key: d.Id!, text: d.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.DocumentTypeIds || [];
                  if (o.selected) updateEditItem('DocumentTypeIds', [...ids, o.key]);
                  else updateEditItem('DocumentTypeIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <Dropdown
              label="Asset Types"
              multiSelect
              selectedKeys={editItem.AssetTypeIds || []}
              options={assets.filter(a => a.IsActive).map(a => ({ key: a.Id!, text: a.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.AssetTypeIds || [];
                  if (o.selected) updateEditItem('AssetTypeIds', [...ids, o.key]);
                  else updateEditItem('AssetTypeIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <Dropdown
              label="System Access Types"
              multiSelect
              selectedKeys={editItem.SystemAccessTypeIds || []}
              options={systems.filter(s => s.IsActive).map(s => ({ key: s.Id!, text: s.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.SystemAccessTypeIds || [];
                  if (o.selected) updateEditItem('SystemAccessTypeIds', [...ids, o.key]);
                  else updateEditItem('SystemAccessTypeIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <Dropdown
              label="Training Courses"
              multiSelect
              selectedKeys={editItem.TrainingCourseIds || []}
              options={training.filter(t => t.IsActive).map(t => ({ key: t.Id!, text: t.Title }))}
              onChange={(_, o) => {
                if (o) {
                  const ids = editItem.TrainingCourseIds || [];
                  if (o.selected) updateEditItem('TrainingCourseIds', [...ids, o.key]);
                  else updateEditItem('TrainingCourseIds', ids.filter((id: number) => id !== o.key));
                }
              }}
            />
            <Toggle label="Default Pack" checked={editItem.IsDefault} onChange={(_, c) => updateEditItem('IsDefault', c)} />
            <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      case 'departments':
        return (
          <>
            <TextField label="Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
            <TextField label="Code" value={editItem.Code || ''} onChange={(_, v) => updateEditItem('Code', v)} placeholder="e.g., HR, IT, FIN" />
            <TextField label="Cost Center" value={editItem.CostCenter || ''} onChange={(_, v) => updateEditItem('CostCenter', v)} />
            <Dropdown
              label="Default Policy Pack"
              selectedKey={editItem.DefaultPolicyPackId || ''}
              options={[{ key: '', text: 'None' }, ...policyPacks.filter(p => p.IsActive).map(p => ({ key: p.Id!, text: p.Title }))]}
              onChange={(_, o) => o && updateEditItem('DefaultPolicyPackId', o.key || null)}
            />
            <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
          </>
        );

      default:
        return null;
    }
  };

  const getPanelTitle = (): string => {
    const action = panelMode === 'create' ? 'Add' : 'Edit';
    switch (activeTab) {
      case 'documents': return `${action} Document Type`;
      case 'assets': return `${action} Asset Type`;
      case 'systems': return `${action} System Access`;
      case 'training': return `${action} Training Course`;
      case 'policyPacks': return `${action} Policy Pack`;
      case 'departments': return `${action} Department`;
      default: return action;
    }
  };

  const onRenderPanelHeader = (): JSX.Element => (
    <div className={styles.panelHeader}>
      <div className={styles.panelIcon}>
        <Icon iconName={tabs.find(t => t.key === activeTab)?.icon || 'Settings'} style={{ fontSize: 20, color: '#fff' }} />
      </div>
      <div>
        <div className={styles.panelTitle}>{getPanelTitle()}</div>
        <div className={styles.panelSubtitle}>Onboarding Configuration</div>
      </div>
    </div>
  );

  const onRenderPanelFooter = (): JSX.Element => (
    <div className={styles.panelFooter}>
      <button className={styles.btnSecondary} onClick={() => setPanelOpen(false)}>Cancel</button>
      <button className={styles.btnPrimary} onClick={handleSave} disabled={saving || !editItem?.Title}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#605e5c' }}>Loading configuration...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Onboarding Configuration</h2>
        <button onClick={openCreate} style={{
          padding: '8px 20px', borderRadius: 4, border: 'none', background: '#005BAA', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon iconName="Add" style={{ fontSize: 14 }} /> Add New
        </button>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #edebe9', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
            color: activeTab === tab.key ? '#005BAA' : '#605e5c',
            borderBottom: activeTab === tab.key ? '2px solid #005BAA' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon iconName={tab.icon} style={{ fontSize: 14 }} />
            {tab.label}
            <span style={{
              padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600,
              background: activeTab === tab.key ? '#005BAA' : '#edebe9',
              color: activeTab === tab.key ? '#fff' : '#605e5c',
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Data table */}
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {renderTable()}
      </div>

      {/* Edit Panel */}
      <Panel
        isOpen={panelOpen}
        type={PanelType.medium}
        onDismiss={() => setPanelOpen(false)}
        hasCloseButton={false}
        onRenderHeader={onRenderPanelHeader}
        onRenderFooterContent={onRenderPanelFooter}
        isFooterAtBottom={true}
        className={styles.rmPanel}
      >
        <div className={styles.panelBody} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderPanelContent()}
        </div>
      </Panel>

      {/* Delete Dialog */}
      <Dialog
        hidden={!deleteDialogOpen}
        onDismiss={() => setDeleteDialogOpen(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Delete Item',
          subText: `Are you sure you want to delete "${deleteTarget?.Title}"? This action cannot be undone.`,
        }}
      >
        <DialogFooter>
          <DefaultButton onClick={() => setDeleteDialogOpen(false)} text="Cancel" />
          <PrimaryButton onClick={handleDelete} text={deleting ? 'Deleting...' : 'Delete'} disabled={deleting}
            styles={{ root: { background: '#d13438', border: 'none' }, rootHovered: { background: '#a4262c' } }} />
        </DialogFooter>
      </Dialog>
    </div>
  );
};
