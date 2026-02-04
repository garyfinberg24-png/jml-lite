import * as React from 'react';
import { useState, useEffect } from 'react';
import { SPFI } from '@pnp/sp';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Icon } from '@fluentui/react/lib/Icon';
import { MoverService } from '../services/MoverService';
import { ProcessCompletionService } from '../services/ProcessCompletionService';
import {
  IMover, IMoverTask, IMoverSystemAccess,
  MoverStatus, MoverTaskStatus, MoverType
} from '../models/IMover';
import styles from '../styles/JmlPanelStyles.module.scss';
import fieldStyles from '../styles/FieldBorders.module.scss';

interface IProps {
  sp: SPFI;
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  item: IMover | null;
  onDismiss: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS: IDropdownOption[] = [
  { key: MoverStatus.NotStarted, text: 'Not Started' },
  { key: MoverStatus.InProgress, text: 'In Progress' },
  { key: MoverStatus.Completed, text: 'Completed' },
  { key: MoverStatus.OnHold, text: 'On Hold' },
  { key: MoverStatus.Cancelled, text: 'Cancelled' },
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

const TASK_STATUS_OPTIONS: IDropdownOption[] = [
  { key: MoverTaskStatus.Pending, text: 'Pending' },
  { key: MoverTaskStatus.InProgress, text: 'In Progress' },
  { key: MoverTaskStatus.Completed, text: 'Completed' },
  { key: MoverTaskStatus.Blocked, text: 'Blocked' },
  { key: MoverTaskStatus.NotApplicable, text: 'Not Applicable' },
];

const TASK_STATUS_COLORS: Record<string, string> = {
  'Pending': '#d97706',
  'In Progress': '#2563eb',
  'Completed': '#059669',
  'Blocked': '#dc2626',
  'Not Applicable': '#8a8886',
};

export const MoverForm: React.FC<IProps> = ({ sp, isOpen, mode, item, onDismiss, onSaved }) => {
  const [formData, setFormData] = useState<Partial<IMover>>({});
  const [tasks, setTasks] = useState<IMoverTask[]>([]);
  const [systemAccess, setSystemAccess] = useState<IMoverSystemAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);

  useEffect(() => {
    if (isOpen && item) {
      setFormData({ ...item });
      setCurrentMode(mode);
      loadRelatedData();
    } else if (isOpen && !item) {
      setFormData({});
      setTasks([]);
      setSystemAccess([]);
      setCurrentMode(mode);
    }
  }, [isOpen, item, mode]);

  const loadRelatedData = async (): Promise<void> => {
    if (!item?.Id) return;
    setLoading(true);
    try {
      const svc = new MoverService(sp);
      const [taskData, saData] = await Promise.all([
        svc.getMoverTasks(item.Id),
        svc.getMoverSystemAccess(item.Id),
      ]);
      setTasks(taskData);
      setSystemAccess(saData);
    } catch (err) {
      console.error('[MoverForm] Error loading related data:', err);
    }
    setLoading(false);
  };

  const handleSave = async (): Promise<void> => {
    if (!item?.Id) return;
    setSaving(true);
    try {
      const svc = new MoverService(sp);
      await svc.updateMover(item.Id, formData);
      onSaved();
    } catch (err) {
      console.error('[MoverForm] Save error:', err);
    }
    setSaving(false);
  };

  const handleTaskStatusChange = async (taskId: number, newStatus: MoverTaskStatus): Promise<void> => {
    try {
      const svc = new MoverService(sp);
      const updates: Partial<IMoverTask> = { Status: newStatus };
      if (newStatus === MoverTaskStatus.Completed) {
        updates.CompletedDate = new Date();
      }
      await svc.updateMoverTask(taskId, updates);

      setTasks(prev => prev.map(t =>
        t.Id === taskId ? { ...t, Status: newStatus, CompletedDate: newStatus === MoverTaskStatus.Completed ? new Date() : t.CompletedDate } : t
      ));

      if (item?.Id) {
        // Use ProcessCompletionService to recalculate and check for completion
        const completionSvc = new ProcessCompletionService(sp);
        await completionSvc.recalculateAndCheckMover(item.Id);

        const updated = await svc.getMoverById(item.Id);
        if (updated) {
          setFormData(prev => ({
            ...prev,
            CompletionPercentage: updated.CompletionPercentage,
            CompletedTasks: updated.CompletedTasks,
            TotalTasks: updated.TotalTasks,
            Status: updated.Status,
          }));
        }
      }
    } catch (err) {
      console.error('[MoverForm] Task status update error:', err);
    }
  };

  const handleSystemAccessStatusChange = async (saId: number, newStatus: MoverTaskStatus): Promise<void> => {
    try {
      const svc = new MoverService(sp);
      const updates: Partial<IMoverSystemAccess> = { Status: newStatus };
      if (newStatus === MoverTaskStatus.Completed) {
        updates.ProcessedDate = new Date();
      }
      await svc.updateMoverSystemAccess(saId, updates);

      setSystemAccess(prev => prev.map(sa =>
        sa.Id === saId ? { ...sa, Status: newStatus, ProcessedDate: newStatus === MoverTaskStatus.Completed ? new Date() : sa.ProcessedDate } : sa
      ));
    } catch (err) {
      console.error('[MoverForm] System access status update error:', err);
    }
  };

  const isViewMode = currentMode === 'view';

  const renderViewField = (label: string, value: string | number | undefined): React.ReactElement => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#323130' }}>{value ?? '—'}</div>
    </div>
  );

  const formatDate = (date?: Date): string => date ? new Date(date).toLocaleDateString() : '—';

  const onRenderHeader = (): JSX.Element => (
    <div className={styles.panelHeaderMover}>
      <div className={styles.panelTitleArea}>
        <div className={styles.panelIcon}>
          <Icon iconName="Sync" style={{ fontSize: 22, color: '#ffffff' }} />
        </div>
        <div>
          <div className={styles.panelTitle}>
            {!item ? 'New Transfer' : currentMode === 'edit' ? 'Edit Transfer' : 'Transfer Details'}
          </div>
          <div className={styles.panelSubtitle}>
            {formData.EmployeeName ? `${formData.EmployeeName} — ${formData.MoverType || 'Transfer'}` : 'Internal Employee Transfer'}
          </div>
        </div>
      </div>
      <button className={styles.panelCloseBtn} onClick={onDismiss} title="Close">
        &times;
      </button>
    </div>
  );

  const onRenderFooter = (): JSX.Element => (
    <div className={styles.panelFooter}>
      {isViewMode ? (
        <>
          <button className={styles.btnSecondary} onClick={onDismiss}>Close</button>
          <button className={styles.btnPrimaryMover} onClick={() => setCurrentMode('edit')}>Edit</button>
        </>
      ) : (
        <>
          <button className={styles.btnSecondary} onClick={onDismiss} disabled={saving}>Cancel</button>
          <button className={styles.btnPrimaryMover} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      )}
    </div>
  );

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.medium}
      hasCloseButton={false}
      onRenderHeader={onRenderHeader}
      onRenderFooterContent={onRenderFooter}
      isFooterAtBottom={true}
      className={styles.rmPanel}
    >
      <div className={styles.panelBody}>
        {/* Employee Details */}
        <div className={styles.formSectionTitleMover}>Employee Details</div>
        <div className={styles.formGrid}>
          {isViewMode ? (
            <>
              {renderViewField('Employee Name', formData.EmployeeName)}
              {renderViewField('Email', formData.EmployeeEmail)}
            </>
          ) : (
            <>
              <div className={fieldStyles.fieldWithBorder}>
                <TextField label="Employee Name" value={formData.EmployeeName || ''} disabled />
              </div>
              <div className={fieldStyles.fieldWithBorder}>
                <TextField label="Email" value={formData.EmployeeEmail || ''} disabled />
              </div>
            </>
          )}
        </div>

        {/* Transfer Details */}
        <div className={styles.formSectionTitleMover} style={{ marginTop: 24 }}>Transfer Details</div>
        <div className={styles.formGrid}>
          {isViewMode ? (
            <>
              {renderViewField('Transfer Type', formData.MoverType)}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  background: `${TASK_STATUS_COLORS[formData.Status || ''] || '#605e5c'}15`,
                  color: TASK_STATUS_COLORS[formData.Status || ''] || '#605e5c',
                }}>{formData.Status}</span>
              </div>
              {renderViewField('Effective Date', formatDate(formData.EffectiveDate))}
            </>
          ) : (
            <>
              <div className={fieldStyles.fieldWithBorder}>
                <Dropdown
                  label="Transfer Type"
                  selectedKey={formData.MoverType}
                  options={MOVER_TYPE_OPTIONS}
                  onChange={(_, opt) => opt && setFormData(prev => ({ ...prev, MoverType: opt.key as MoverType }))}
                />
              </div>
              <div className={fieldStyles.fieldWithBorder}>
                <Dropdown
                  label="Status"
                  selectedKey={formData.Status}
                  options={STATUS_OPTIONS}
                  onChange={(_, opt) => opt && setFormData(prev => ({ ...prev, Status: opt.key as MoverStatus }))}
                />
              </div>
              <div className={fieldStyles.fieldWithBorder}>
                <DatePicker
                  label="Effective Date"
                  value={formData.EffectiveDate ? new Date(formData.EffectiveDate) : undefined}
                  onSelectDate={(d) => setFormData(prev => ({ ...prev, EffectiveDate: d || undefined }))}
                />
              </div>
            </>
          )}
        </div>

        {/* Position Changes — From / To */}
        <div className={styles.formSectionTitleMover} style={{ marginTop: 24 }}>Position Changes</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* FROM Column */}
          <div style={{ background: '#fef2f2', padding: 16, borderRadius: 8, border: '1px solid #fecaca' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
              <Icon iconName="Leave" style={{ marginRight: 6 }} /> Current
            </h4>
            {isViewMode ? (
              <>
                {renderViewField('Job Title', formData.CurrentJobTitle)}
                {renderViewField('Department', formData.CurrentDepartment)}
                {renderViewField('Location', formData.CurrentLocation)}
                {renderViewField('Manager', formData.CurrentManagerName)}
              </>
            ) : (
              <>
                <TextField
                  label="Job Title"
                  value={formData.CurrentJobTitle || ''}
                  onChange={(_, v) => setFormData(prev => ({ ...prev, CurrentJobTitle: v || '' }))}
                  styles={{ root: { marginBottom: 8 } }}
                />
                <TextField
                  label="Department"
                  value={formData.CurrentDepartment || ''}
                  onChange={(_, v) => setFormData(prev => ({ ...prev, CurrentDepartment: v || '' }))}
                  styles={{ root: { marginBottom: 8 } }}
                />
                <TextField
                  label="Location"
                  value={formData.CurrentLocation || ''}
                  onChange={(_, v) => setFormData(prev => ({ ...prev, CurrentLocation: v || '' }))}
                  styles={{ root: { marginBottom: 8 } }}
                />
                <TextField
                  label="Manager"
                  value={formData.CurrentManagerName || ''}
                  disabled
                />
              </>
            )}
          </div>
          {/* TO Column */}
          <div style={{ background: '#dcfce7', padding: 16, borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#166534', fontWeight: 600 }}>
              <Icon iconName="Forward" style={{ marginRight: 6 }} /> New
            </h4>
            {isViewMode ? (
              <>
                {renderViewField('Job Title', formData.NewJobTitle)}
                {renderViewField('Department', formData.NewDepartment)}
                {renderViewField('Location', formData.NewLocation)}
                {renderViewField('Manager', formData.NewManagerName)}
              </>
            ) : (
              <>
                <TextField
                  label="Job Title"
                  value={formData.NewJobTitle || ''}
                  onChange={(_, v) => setFormData(prev => ({ ...prev, NewJobTitle: v || '' }))}
                  styles={{ root: { marginBottom: 8 } }}
                />
                <TextField
                  label="Department"
                  value={formData.NewDepartment || ''}
                  onChange={(_, v) => setFormData(prev => ({ ...prev, NewDepartment: v || '' }))}
                  styles={{ root: { marginBottom: 8 } }}
                />
                <TextField
                  label="Location"
                  value={formData.NewLocation || ''}
                  onChange={(_, v) => setFormData(prev => ({ ...prev, NewLocation: v || '' }))}
                  styles={{ root: { marginBottom: 8 } }}
                />
                <TextField
                  label="Manager"
                  value={formData.NewManagerName || ''}
                  disabled
                />
              </>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className={styles.formSectionTitleMover} style={{ marginTop: 24 }}>Progress</div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ width: '100%', height: 12, background: '#edebe9', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              width: `${formData.CompletionPercentage || 0}%`,
              height: '100%',
              background: (formData.CompletionPercentage || 0) === 100 ? '#059669' : '#ea580c',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ fontSize: 13, color: '#605e5c' }}>
            {formData.CompletedTasks || 0} of {formData.TotalTasks || 0} tasks completed ({formData.CompletionPercentage || 0}%)
          </div>
        </div>

        {/* System Access Changes */}
        {systemAccess.length > 0 && (
          <>
            <div className={styles.formSectionTitleMover} style={{ marginTop: 24 }}>
              System Access Changes ({systemAccess.filter(sa => sa.Status === MoverTaskStatus.Completed).length}/{systemAccess.length})
            </div>
            {loading ? (
              <div style={{ color: '#605e5c', padding: 12 }}>Loading...</div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {systemAccess.map(sa => (
                  <div key={sa.Id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 12, borderRadius: 6, marginBottom: 8,
                    border: '1px solid #edebe9',
                    background: sa.Status === MoverTaskStatus.Completed ? '#f0fdf4' : '#fafafa',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#1a1a1a' }}>{sa.SystemName}</div>
                      <div style={{ fontSize: 12, color: '#605e5c' }}>
                        <span style={{ padding: '1px 6px', borderRadius: 4, background: '#fff7ed', color: '#ea580c', fontSize: 10, marginRight: 6 }}>{sa.Action}</span>
                        {sa.NewRole && `→ ${sa.NewRole}`}
                      </div>
                    </div>
                    {isViewMode ? (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                        background: `${TASK_STATUS_COLORS[sa.Status] || '#605e5c'}15`,
                        color: TASK_STATUS_COLORS[sa.Status] || '#605e5c',
                      }}>{sa.Status}</span>
                    ) : (
                      <Dropdown
                        selectedKey={sa.Status}
                        options={TASK_STATUS_OPTIONS}
                        onChange={(_, opt) => sa.Id && opt && handleSystemAccessStatusChange(sa.Id, opt.key as MoverTaskStatus)}
                        styles={{ root: { width: 130 } }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Tasks */}
        <div className={styles.formSectionTitleMover} style={{ marginTop: 24 }}>
          Tasks ({tasks.filter(t => t.Status === MoverTaskStatus.Completed).length}/{tasks.length})
        </div>
        {loading ? (
          <div style={{ color: '#605e5c', padding: 12 }}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div style={{ color: '#8a8886', padding: 12, textAlign: 'center' }}>No tasks found</div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {tasks.map(task => (
              <div key={task.Id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 12, borderRadius: 6, marginBottom: 8,
                border: '1px solid #edebe9',
                background: task.Status === MoverTaskStatus.Completed ? '#f0fdf4' : '#fff',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 500,
                    textDecoration: task.Status === MoverTaskStatus.Completed ? 'line-through' : 'none',
                    color: task.Status === MoverTaskStatus.Completed ? '#6b7280' : '#1a1a1a',
                  }}>
                    {task.Title}
                  </div>
                  <div style={{ fontSize: 11, color: '#8a8886', marginTop: 2 }}>
                    <span style={{ padding: '1px 6px', borderRadius: 4, background: '#f3f2f1', marginRight: 6, fontSize: 10 }}>{task.Category}</span>
                    {task.DueDate && `Due: ${new Date(task.DueDate).toLocaleDateString()}`}
                  </div>
                </div>
                {isViewMode ? (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                    background: `${TASK_STATUS_COLORS[task.Status] || '#605e5c'}15`,
                    color: TASK_STATUS_COLORS[task.Status] || '#605e5c',
                  }}>{task.Status}</span>
                ) : (
                  <Dropdown
                    selectedKey={task.Status}
                    options={TASK_STATUS_OPTIONS}
                    onChange={(_, opt) => task.Id && opt && handleTaskStatusChange(task.Id, opt.key as MoverTaskStatus)}
                    styles={{ root: { width: 130 } }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        <div className={styles.formSectionTitleMover} style={{ marginTop: 24 }}>Notes</div>
        {isViewMode ? (
          <div style={{ fontSize: 14, color: '#323130', whiteSpace: 'pre-wrap' }}>{formData.Notes || '—'}</div>
        ) : (
          <TextField
            value={formData.Notes || ''}
            multiline
            rows={4}
            onChange={(_, v) => setFormData(prev => ({ ...prev, Notes: v || '' }))}
          />
        )}
      </div>
    </Panel>
  );
};
