import * as React from 'react';
import { useState, useEffect } from 'react';
import { SPFI } from '@pnp/sp';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Icon } from '@fluentui/react/lib/Icon';
import { OnboardingService } from '../services/OnboardingService';
import { IOnboarding, IOnboardingTask, OnboardingStatus, OnboardingTaskStatus } from '../models/IOnboarding';
import styles from '../styles/JmlPanelStyles.module.scss';
import '../styles/FieldBorders.module.scss';

interface IProps {
  sp: SPFI;
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  item?: IOnboarding | null;
  onDismiss: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS: IDropdownOption[] = [
  { key: 'Not Started', text: 'Not Started' },
  { key: 'In Progress', text: 'In Progress' },
  { key: 'Completed', text: 'Completed' },
  { key: 'On Hold', text: 'On Hold' },
  { key: 'Cancelled', text: 'Cancelled' },
];

const TASK_STATUS_COLORS: Record<string, string> = {
  'Pending': '#d97706', 'In Progress': '#2563eb', 'Completed': '#059669',
  'Blocked': '#dc2626', 'Not Applicable': '#8a8886',
};

export const OnboardingForm: React.FC<IProps> = ({ sp, isOpen, mode, item, onDismiss, onSaved }) => {
  const [formData, setFormData] = useState<Partial<IOnboarding>>({});
  const [tasks, setTasks] = useState<IOnboardingTask[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);

  useEffect(() => {
    if (isOpen) {
      setCurrentMode(mode);
      if (item) {
        setFormData({ ...item });
        if (item.Id) {
          const svc = new OnboardingService(sp);
          svc.getOnboardingTasks(item.Id).then(setTasks).catch(() => setTasks([]));
        }
      } else {
        setFormData({ Status: OnboardingStatus.NotStarted, CompletionPercentage: 0, TotalTasks: 0, CompletedTasks: 0 });
        setTasks([]);
      }
    }
  }, [isOpen, item, mode, sp]);

  const handleTextChange = (field: string) => (_: any, val?: string): void => {
    setFormData(prev => ({ ...prev, [field]: val || '' }));
  };

  const handleDateChange = (field: string) => (date: Date | null | undefined): void => {
    setFormData(prev => ({ ...prev, [field]: date || undefined }));
  };

  const handleDropdownChange = (field: string) => (_: any, option?: IDropdownOption): void => {
    if (option) setFormData(prev => ({ ...prev, [field]: option.key as string }));
  };

  const toggleTaskStatus = async (task: IOnboardingTask): Promise<void> => {
    if (!task.Id || !item?.Id) return;
    const newStatus = task.Status === OnboardingTaskStatus.Completed ? OnboardingTaskStatus.Pending : OnboardingTaskStatus.Completed;
    const svc = new OnboardingService(sp);
    const updates: Partial<IOnboardingTask> = { Status: newStatus };
    if (newStatus === OnboardingTaskStatus.Completed) {
      updates.CompletedDate = new Date();
    } else {
      updates.CompletedDate = undefined;
    }
    await svc.updateOnboardingTask(task.Id, updates);
    await svc.recalculateProgress(item.Id);
    const updatedTasks = await svc.getOnboardingTasks(item.Id);
    setTasks(updatedTasks);
    const updatedOnboarding = await svc.getOnboardingById(item.Id);
    if (updatedOnboarding) setFormData({ ...updatedOnboarding });
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const svc = new OnboardingService(sp);
      const payload: any = {
        CandidateName: formData.CandidateName,
        JobTitle: formData.JobTitle,
        Department: formData.Department,
        StartDate: formData.StartDate,
        Status: formData.Status,
        DueDate: formData.DueDate,
        Notes: formData.Notes,
      };
      if (item?.Id) {
        await svc.updateOnboarding(item.Id, payload);
      } else {
        await svc.createOnboarding(payload);
      }
      onSaved();
    } catch (error) {
      console.error('[OnboardingForm] Error saving:', error);
    }
    setSaving(false);
  };

  const renderViewField = (label: string, value: string | undefined): React.ReactElement => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#323130' }}>{value || '\u2014'}</div>
    </div>
  );

  const formatDate = (date?: Date): string => date ? date.toLocaleDateString() : '\u2014';

  const isView = currentMode === 'view';

  const onRenderHeader = (): JSX.Element => (
    <div className={styles.panelHeader}>
      <div className={styles.panelIcon}>
        <Icon iconName="TaskManager" style={{ fontSize: 20, color: '#fff' }} />
      </div>
      <div>
        <div className={styles.panelTitle}>{!item ? 'New Onboarding' : formData.CandidateName || 'Onboarding'}</div>
        <div className={styles.panelSubtitle}>
          {formData.JobTitle ? `${formData.JobTitle} \u2014 ${formData.Department || ''}` : 'Employee Onboarding'}
        </div>
      </div>
    </div>
  );

  const onRenderFooter = (): JSX.Element => (
    <div className={styles.panelFooter}>
      {isView ? (
        <>
          <button className={styles.btnSecondary} onClick={onDismiss}>Close</button>
          <button className={styles.btnPrimary} onClick={() => setCurrentMode('edit')}>Edit</button>
        </>
      ) : (
        <>
          <button className={styles.btnSecondary} onClick={onDismiss}>Cancel</button>
          <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </>
      )}
    </div>
  );

  return (
    <Panel
      isOpen={isOpen}
      type={PanelType.medium}
      onDismiss={onDismiss}
      hasCloseButton={false}
      onRenderHeader={onRenderHeader}
      onRenderFooterContent={onRenderFooter}
      isFooterAtBottom={true}
      className={styles.rmPanel}
    >
      <div className={styles.panelBody}>
        {/* Employee Details */}
        <div className={styles.formSectionTitle}>Employee Details</div>
        {isView ? (
          <div className={styles.formGrid}>
            {renderViewField('Employee Name', formData.CandidateName)}
            {renderViewField('Job Title', formData.JobTitle)}
            {renderViewField('Department', formData.Department)}
            {renderViewField('Start Date', formatDate(formData.StartDate as Date | undefined))}
          </div>
        ) : (
          <div className={styles.formGrid}>
            <TextField label="Employee Name" value={formData.CandidateName || ''} onChange={handleTextChange('CandidateName')} disabled={!!item?.Id} />
            <TextField label="Job Title" value={formData.JobTitle || ''} onChange={handleTextChange('JobTitle')} />
            <TextField label="Department" value={formData.Department || ''} onChange={handleTextChange('Department')} />
            <DatePicker label="Start Date" value={formData.StartDate ? new Date(formData.StartDate) : undefined} onSelectDate={handleDateChange('StartDate')} />
          </div>
        )}

        {/* Status & Progress */}
        <div className={styles.formSectionTitle} style={{ marginTop: 24 }}>Status & Progress</div>
        {isView ? (
          <div className={styles.formGrid}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
              <span style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                background: `${TASK_STATUS_COLORS[formData.Status || ''] || '#605e5c'}15`,
                color: TASK_STATUS_COLORS[formData.Status || ''] || '#605e5c',
              }}>{formData.Status}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', marginBottom: 4 }}>Progress</div>
              <div style={{ width: '100%', height: 10, background: '#edebe9', borderRadius: 5, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{
                  width: `${formData.CompletionPercentage || 0}%`, height: '100%',
                  background: (formData.CompletionPercentage || 0) === 100 ? '#059669' : '#005BAA',
                }} />
              </div>
              <div style={{ fontSize: 13, color: '#323130' }}>{formData.CompletedTasks || 0}/{formData.TotalTasks || 0} tasks ({formData.CompletionPercentage || 0}%)</div>
            </div>
            {renderViewField('Due Date', formatDate(formData.DueDate as Date | undefined))}
            {formData.CompletedDate && renderViewField('Completed Date', formatDate(formData.CompletedDate as Date | undefined))}
          </div>
        ) : (
          <div className={styles.formGrid}>
            <Dropdown label="Status" selectedKey={formData.Status} options={STATUS_OPTIONS} onChange={handleDropdownChange('Status')} />
            <DatePicker label="Due Date" value={formData.DueDate ? new Date(formData.DueDate) : undefined} onSelectDate={handleDateChange('DueDate')} />
          </div>
        )}

        {/* Task Checklist */}
        {item?.Id && tasks.length > 0 && (
          <>
            <div className={styles.formSectionTitle} style={{ marginTop: 24 }}>Task Checklist ({tasks.filter(t => t.Status === 'Completed').length}/{tasks.length})</div>
            {tasks.map(task => (
              <div key={task.Id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #edebe9' }}>
                <input
                  type="checkbox"
                  checked={task.Status === OnboardingTaskStatus.Completed}
                  onChange={() => toggleTaskStatus(task)}
                  disabled={isView}
                  style={{ width: 18, height: 18, accentColor: '#005BAA', cursor: isView ? 'default' : 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    textDecoration: task.Status === OnboardingTaskStatus.Completed ? 'line-through' : 'none',
                    color: task.Status === OnboardingTaskStatus.Completed ? '#8a8886' : '#323130',
                  }}>{task.Title}</div>
                  <div style={{ fontSize: 11, color: '#605e5c', marginTop: 2 }}>
                    <span style={{ padding: '1px 6px', borderRadius: 4, background: '#f3f2f1', marginRight: 8, fontSize: 10 }}>{task.Category}</span>
                    {task.DueDate && `Due: ${new Date(task.DueDate).toLocaleDateString()}`}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                  background: `${TASK_STATUS_COLORS[task.Status] || '#605e5c'}15`,
                  color: TASK_STATUS_COLORS[task.Status] || '#605e5c',
                }}>{task.Status}</span>
              </div>
            ))}
          </>
        )}

        {/* Notes */}
        <div className={styles.formSectionTitle} style={{ marginTop: 24 }}>Notes</div>
        {isView ? (
          <div style={{ fontSize: 14, color: '#323130', whiteSpace: 'pre-wrap' }}>{formData.Notes || '\u2014'}</div>
        ) : (
          <TextField multiline rows={4} value={formData.Notes || ''} onChange={handleTextChange('Notes')} />
        )}
      </div>
    </Panel>
  );
};
