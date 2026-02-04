import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { Icon } from '@fluentui/react/lib/Icon';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import styles from '../styles/JmlPanelStyles.module.scss';
import '../styles/FieldBorders.module.scss';

interface IProps { sp: SPFI; }

// Offboarding Task Template interface
interface IOffboardingTaskTemplate {
  Id?: number;
  Title: string;
  Description?: string;
  Category: string;
  AssignToRole: string; // Employee, HR Manager, IT Manager, Line Manager
  DaysBeforeLastDay?: number; // Days before last working day task should be completed
  DaysAfterLastDay?: number;  // Days after last working day task should be completed
  IsMandatory: boolean;
  SortOrder: number;
  IsActive: boolean;
}

type ConfigTab = 'templates' | 'categories' | 'exitReasons';

const LEAVER_COLOR = '#d13438';

const CATEGORY_OPTIONS: IDropdownOption[] = [
  { key: 'Asset Return', text: 'Asset Return' },
  { key: 'System Access', text: 'System Access' },
  { key: 'Documentation', text: 'Documentation' },
  { key: 'Exit Interview', text: 'Exit Interview' },
  { key: 'Knowledge Transfer', text: 'Knowledge Transfer' },
  { key: 'Final Pay', text: 'Final Pay' },
  { key: 'Compliance', text: 'Compliance' },
  { key: 'Other', text: 'Other' },
];

const ASSIGN_ROLE_OPTIONS: IDropdownOption[] = [
  { key: 'Employee', text: 'Employee' },
  { key: 'HR Manager', text: 'HR Manager' },
  { key: 'IT Manager', text: 'IT Manager' },
  { key: 'Line Manager', text: 'Line Manager' },
  { key: 'Finance', text: 'Finance' },
];

const EXIT_REASONS: string[] = [
  'Resignation',
  'Termination',
  'Redundancy',
  'Retirement',
  'Contract End',
  'Transfer Out',
  'Other',
];

// List name for offboarding templates
const OFFBOARDING_TEMPLATES_LIST = 'JML_OffboardingTemplates';

export const OffboardingConfigAdmin: React.FC<IProps> = ({ sp }) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('templates');
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<IOffboardingTaskTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Panel states
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'create' | 'edit'>('create');
  const [editItem, setEditItem] = useState<IOffboardingTaskTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IOffboardingTaskTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Import states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await sp.web.lists.getByTitle(OFFBOARDING_TEMPLATES_LIST).items
        .select('Id', 'Title', 'Description', 'Category', 'AssignToRole', 'DaysBeforeLastDay', 'DaysAfterLastDay', 'IsMandatory', 'SortOrder', 'IsActive')
        .orderBy('SortOrder', true)();
      setTemplates(items as IOffboardingTaskTemplate[]);
    } catch (err: any) {
      if (err.message?.includes('does not exist')) {
        setError(`The list "${OFFBOARDING_TEMPLATES_LIST}" doesn't exist. Please run the deployment script.`);
        setTemplates([]);
      } else {
        console.error('[OffboardingConfigAdmin] Error loading templates:', err);
        setError('Failed to load templates. Please try again.');
      }
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const tabs: { key: ConfigTab; label: string; icon: string; count: number }[] = [
    { key: 'templates', label: 'Task Templates', icon: 'TaskList', count: templates.length },
    { key: 'categories', label: 'Categories', icon: 'Tag', count: CATEGORY_OPTIONS.length },
    { key: 'exitReasons', label: 'Exit Reasons', icon: 'Leave', count: EXIT_REASONS.length },
  ];

  const openCreate = (): void => {
    setEditItem({
      Title: '',
      Description: '',
      Category: 'Asset Return',
      AssignToRole: 'HR Manager',
      DaysBeforeLastDay: 5,
      IsMandatory: false,
      SortOrder: templates.length * 10,
      IsActive: true,
    });
    setPanelMode('create');
    setPanelOpen(true);
  };

  const openEdit = (item: IOffboardingTaskTemplate): void => {
    setEditItem({ ...item });
    setPanelMode('edit');
    setPanelOpen(true);
  };

  const confirmDelete = (item: IOffboardingTaskTemplate): void => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!editItem?.Title) return;
    setSaving(true);
    try {
      const data = {
        Title: editItem.Title,
        Description: editItem.Description || '',
        Category: editItem.Category,
        AssignToRole: editItem.AssignToRole,
        DaysBeforeLastDay: editItem.DaysBeforeLastDay || 0,
        DaysAfterLastDay: editItem.DaysAfterLastDay || 0,
        IsMandatory: editItem.IsMandatory,
        SortOrder: editItem.SortOrder,
        IsActive: editItem.IsActive,
      };

      if (panelMode === 'create') {
        await sp.web.lists.getByTitle(OFFBOARDING_TEMPLATES_LIST).items.add(data);
      } else if (editItem.Id) {
        await sp.web.lists.getByTitle(OFFBOARDING_TEMPLATES_LIST).items.getById(editItem.Id).update(data);
      }
      setPanelOpen(false);
      loadTemplates();
    } catch (err) {
      console.error('[OffboardingConfigAdmin] Error saving:', err);
    }
    setSaving(false);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget?.Id) return;
    setDeleting(true);
    try {
      await sp.web.lists.getByTitle(OFFBOARDING_TEMPLATES_LIST).items.getById(deleteTarget.Id).delete();
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadTemplates();
    } catch (err) {
      console.error('[OffboardingConfigAdmin] Error deleting:', err);
    }
    setDeleting(false);
  };

  const toggleActive = async (item: IOffboardingTaskTemplate): Promise<void> => {
    if (!item.Id) return;
    try {
      await sp.web.lists.getByTitle(OFFBOARDING_TEMPLATES_LIST).items.getById(item.Id).update({ IsActive: !item.IsActive });
      loadTemplates();
    } catch (err) {
      console.error('[OffboardingConfigAdmin] Error toggling active:', err);
    }
  };

  const handleImport = async (): Promise<void> => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const lines = importText.split('\n').filter(line => line.trim());
      let sortOrder = templates.length * 10;

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 1) {
          const title = parts[0]?.trim();
          const category = parts[1]?.trim() || 'Other';
          const assignTo = parts[2]?.trim() || 'HR Manager';

          if (title) {
            await sp.web.lists.getByTitle(OFFBOARDING_TEMPLATES_LIST).items.add({
              Title: title,
              Description: '',
              Category: CATEGORY_OPTIONS.some(c => c.key === category) ? category : 'Other',
              AssignToRole: ASSIGN_ROLE_OPTIONS.some(r => r.key === assignTo) ? assignTo : 'HR Manager',
              DaysBeforeLastDay: 5,
              IsMandatory: false,
              SortOrder: sortOrder,
              IsActive: true,
            });
            sortOrder += 10;
          }
        }
      }

      setImportDialogOpen(false);
      setImportText('');
      loadTemplates();
    } catch (err) {
      console.error('[OffboardingConfigAdmin] Error importing:', err);
    }
    setImporting(false);
  };

  const updateEditItem = (field: string, value: any): void => {
    setEditItem(prev => prev ? { ...prev, [field]: value } : null);
  };

  const renderTable = (): React.ReactElement => {
    if (templates.length === 0) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: '#8a8886' }}>
          <Icon iconName="TaskList" style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
          <div style={{ marginBottom: 8 }}>No task templates configured.</div>
          <div style={{ fontSize: 12 }}>Click "Add Template" or "Import from Spreadsheet" to create task templates.</div>
        </div>
      );
    }

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${LEAVER_COLOR}`, textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Task Title</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Category</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Assigned To</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Timing</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130', width: 80 }}>Active</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130', width: 100 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((item) => (
            <tr key={item.Id} style={{ borderBottom: '1px solid #edebe9' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fbeaea')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <td style={{ padding: '10px 16px' }}>
                <div style={{ fontWeight: 500 }}>{item.Title}</div>
                {item.Description && (
                  <div style={{ fontSize: 11, color: '#605e5c', marginTop: 2 }}>
                    {item.Description.substring(0, 60)}{item.Description.length > 60 ? '...' : ''}
                  </div>
                )}
                {item.IsMandatory && (
                  <span style={{ fontSize: 10, color: LEAVER_COLOR, fontWeight: 600 }}>MANDATORY</span>
                )}
              </td>
              <td style={{ padding: '10px 16px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#fbeaea', color: LEAVER_COLOR }}>
                  {item.Category}
                </span>
              </td>
              <td style={{ padding: '10px 16px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#f3f2f1' }}>
                  {item.AssignToRole}
                </span>
              </td>
              <td style={{ padding: '10px 16px', fontSize: 12, color: '#605e5c' }}>
                {item.DaysBeforeLastDay ? `${item.DaysBeforeLastDay}d before` : ''}
                {item.DaysAfterLastDay ? `${item.DaysAfterLastDay}d after` : ''}
                {!item.DaysBeforeLastDay && !item.DaysAfterLastDay && 'On last day'}
              </td>
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

  const renderCategoriesTab = (): React.ReactElement => (
    <div style={{ padding: 24 }}>
      <p style={{ color: '#605e5c', marginBottom: 16 }}>
        Task categories help organize offboarding tasks. These are the default categories:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {CATEGORY_OPTIONS.map(cat => (
          <div key={cat.key} style={{ padding: '12px 16px', background: '#fbeaea', borderRadius: 8, border: '1px solid #f5d2d3' }}>
            <div style={{ fontWeight: 500, color: LEAVER_COLOR }}>{cat.text}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderExitReasonsTab = (): React.ReactElement => (
    <div style={{ padding: 24 }}>
      <p style={{ color: '#605e5c', marginBottom: 16 }}>
        Exit reasons used when initiating an offboarding process:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {EXIT_REASONS.map(reason => (
          <div key={reason} style={{ padding: '12px 16px', background: '#fbeaea', borderRadius: 8, border: '1px solid #f5d2d3' }}>
            <div style={{ fontWeight: 500, color: LEAVER_COLOR }}>{reason}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const onRenderPanelHeader = (): JSX.Element => (
    <div className={styles.panelHeader} style={{ background: `linear-gradient(135deg, ${LEAVER_COLOR} 0%, #a4262c 100%)` }}>
      <div className={styles.panelIcon} style={{ background: 'rgba(255,255,255,0.2)' }}>
        <Icon iconName="TaskList" style={{ fontSize: 20, color: '#fff' }} />
      </div>
      <div>
        <div className={styles.panelTitle}>{panelMode === 'create' ? 'Add Task Template' : 'Edit Task Template'}</div>
        <div className={styles.panelSubtitle}>Offboarding Configuration</div>
      </div>
    </div>
  );

  const onRenderPanelFooter = (): JSX.Element => (
    <div className={styles.panelFooter}>
      <button className={styles.btnSecondary} onClick={() => setPanelOpen(false)}>Cancel</button>
      <button
        className={styles.btnPrimary}
        onClick={handleSave}
        disabled={saving || !editItem?.Title}
        style={{ background: LEAVER_COLOR, borderColor: LEAVER_COLOR }}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#605e5c' }}>Loading offboarding configuration...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Offboarding Configuration</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setImportDialogOpen(true)}
            style={{
              padding: '8px 16px', borderRadius: 4, border: `1px solid ${LEAVER_COLOR}`, background: 'transparent',
              color: LEAVER_COLOR, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon iconName="ExcelDocument" style={{ fontSize: 14 }} /> Import
          </button>
          <button
            onClick={openCreate}
            style={{
              padding: '8px 20px', borderRadius: 4, border: 'none', background: LEAVER_COLOR, color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon iconName="Add" style={{ fontSize: 14 }} /> Add Template
          </button>
        </div>
      </div>

      {error && (
        <MessageBar messageBarType={MessageBarType.warning} isMultiline={false} onDismiss={() => setError(null)} style={{ marginBottom: 16 }}>
          {error}
        </MessageBar>
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #edebe9' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
            color: activeTab === tab.key ? LEAVER_COLOR : '#605e5c',
            borderBottom: activeTab === tab.key ? `2px solid ${LEAVER_COLOR}` : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon iconName={tab.icon} style={{ fontSize: 14 }} />
            {tab.label}
            <span style={{
              padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600,
              background: activeTab === tab.key ? LEAVER_COLOR : '#edebe9',
              color: activeTab === tab.key ? '#fff' : '#605e5c',
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {activeTab === 'templates' && renderTable()}
        {activeTab === 'categories' && renderCategoriesTab()}
        {activeTab === 'exitReasons' && renderExitReasonsTab()}
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
          {editItem && (
            <>
              <TextField label="Task Title" required value={editItem.Title || ''} onChange={(_, v) => updateEditItem('Title', v)} />
              <TextField label="Description" multiline rows={3} value={editItem.Description || ''} onChange={(_, v) => updateEditItem('Description', v)} />
              <Dropdown label="Category" selectedKey={editItem.Category} options={CATEGORY_OPTIONS} onChange={(_, o) => o && updateEditItem('Category', o.key)} />
              <Dropdown label="Assign To Role" selectedKey={editItem.AssignToRole} options={ASSIGN_ROLE_OPTIONS} onChange={(_, o) => o && updateEditItem('AssignToRole', o.key)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SpinButton
                  label="Days Before Last Day"
                  value={String(editItem.DaysBeforeLastDay || 0)}
                  min={0} max={30}
                  onChange={(_, v) => updateEditItem('DaysBeforeLastDay', parseInt(v || '0'))}
                />
                <SpinButton
                  label="Days After Last Day"
                  value={String(editItem.DaysAfterLastDay || 0)}
                  min={0} max={30}
                  onChange={(_, v) => updateEditItem('DaysAfterLastDay', parseInt(v || '0'))}
                />
              </div>
              <Toggle label="Mandatory Task" checked={editItem.IsMandatory} onChange={(_, c) => updateEditItem('IsMandatory', c)} />
              <SpinButton label="Sort Order" value={String(editItem.SortOrder || 0)} min={0} max={999} onChange={(_, v) => updateEditItem('SortOrder', parseInt(v || '0'))} />
              <Toggle label="Active" checked={editItem.IsActive} onChange={(_, c) => updateEditItem('IsActive', c)} />
            </>
          )}
        </div>
      </Panel>

      {/* Delete Dialog */}
      <Dialog
        hidden={!deleteDialogOpen}
        onDismiss={() => setDeleteDialogOpen(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Delete Template',
          subText: `Are you sure you want to delete "${deleteTarget?.Title}"? This action cannot be undone.`,
        }}
      >
        <DialogFooter>
          <DefaultButton onClick={() => setDeleteDialogOpen(false)} text="Cancel" />
          <PrimaryButton onClick={handleDelete} text={deleting ? 'Deleting...' : 'Delete'} disabled={deleting}
            styles={{ root: { background: '#d13438', border: 'none' }, rootHovered: { background: '#a4262c' } }} />
        </DialogFooter>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        hidden={!importDialogOpen}
        onDismiss={() => setImportDialogOpen(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Import Task Templates',
          subText: 'Paste data from a spreadsheet. Format: Task Title (Tab) Category (Tab) Assign To Role. One task per line.',
        }}
        minWidth={500}
      >
        <TextField
          multiline
          rows={10}
          value={importText}
          onChange={(_, v) => setImportText(v || '')}
          placeholder="Task Title&#9;Category&#9;Assign To Role&#10;Return laptop and equipment&#9;Asset Return&#9;Employee&#10;Revoke system access&#9;System Access&#9;IT Manager"
          styles={{ root: { marginBottom: 16 } }}
        />
        <DialogFooter>
          <DefaultButton onClick={() => setImportDialogOpen(false)} text="Cancel" />
          <PrimaryButton
            onClick={handleImport}
            text={importing ? 'Importing...' : 'Import'}
            disabled={importing || !importText.trim()}
            styles={{ root: { background: LEAVER_COLOR, border: 'none' }, rootHovered: { background: '#a4262c' } }}
          />
        </DialogFooter>
      </Dialog>
    </div>
  );
};
