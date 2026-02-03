import * as React from 'react';
import { useState, useEffect } from 'react';
import { SPFI } from '@pnp/sp';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { Icon } from '@fluentui/react/lib/Icon';
import { OffboardingService } from '../services/OffboardingService';
import {
  IOffboarding, IOffboardingTask, IAssetReturn,
  OffboardingStatus, OffboardingTaskStatus, AssetReturnStatus
} from '../models/IOffboarding';
import styles from '../styles/JmlPanelStyles.module.scss';
// Note: fieldStyles available for form styling

interface IProps {
  sp: SPFI;
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  item?: IOffboarding | null;
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

const ASSET_STATUS_OPTIONS: IDropdownOption[] = [
  { key: 'Pending Return', text: 'Pending Return' },
  { key: 'Returned', text: 'Returned' },
  { key: 'Damaged', text: 'Damaged' },
  { key: 'Lost', text: 'Lost' },
  { key: 'Written Off', text: 'Written Off' },
];

const CONDITION_OPTIONS: IDropdownOption[] = [
  { key: 'Excellent', text: 'Excellent' },
  { key: 'Good', text: 'Good' },
  { key: 'Fair', text: 'Fair' },
  { key: 'Poor', text: 'Poor' },
  { key: 'Non-Functional', text: 'Non-Functional' },
];

const TASK_STATUS_COLORS: Record<string, string> = {
  'Pending': '#d97706', 'In Progress': '#2563eb', 'Completed': '#059669',
  'Blocked': '#dc2626', 'Not Applicable': '#8a8886',
};

const ASSET_STATUS_COLORS: Record<string, string> = {
  'Pending Return': '#d97706', 'Returned': '#059669', 'Damaged': '#dc2626',
  'Lost': '#a4262c', 'Written Off': '#8a8886',
};

export const OffboardingForm: React.FC<IProps> = ({ sp, isOpen, mode, item, onDismiss, onSaved }) => {
  const [formData, setFormData] = useState<Partial<IOffboarding>>({});
  const [tasks, setTasks] = useState<IOffboardingTask[]>([]);
  const [assetReturns, setAssetReturns] = useState<IAssetReturn[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);

  useEffect(() => {
    if (isOpen) {
      setCurrentMode(mode);
      if (item) {
        setFormData({ ...item });
        if (item.Id) {
          const svc = new OffboardingService(sp);
          svc.getOffboardingTasks(item.Id).then(setTasks).catch(() => setTasks([]));
          svc.getAssetReturns(item.Id).then(setAssetReturns).catch(() => setAssetReturns([]));
        }
      } else {
        setFormData({ Status: OffboardingStatus.NotStarted, CompletionPercentage: 0, TotalTasks: 0, CompletedTasks: 0 });
        setTasks([]);
        setAssetReturns([]);
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

  const handleToggleChange = (field: string) => (_: any, checked?: boolean): void => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  const toggleTaskStatus = async (task: IOffboardingTask): Promise<void> => {
    if (!task.Id || !item?.Id) return;
    const newStatus = task.Status === OffboardingTaskStatus.Completed ? OffboardingTaskStatus.Pending : OffboardingTaskStatus.Completed;
    const svc = new OffboardingService(sp);
    const updates: Partial<IOffboardingTask> = { Status: newStatus };
    if (newStatus === OffboardingTaskStatus.Completed) {
      updates.CompletedDate = new Date();
    } else {
      updates.CompletedDate = undefined;
    }
    await svc.updateOffboardingTask(task.Id, updates);
    await svc.recalculateProgress(item.Id);
    const updatedTasks = await svc.getOffboardingTasks(item.Id);
    setTasks(updatedTasks);
    const updatedOffboarding = await svc.getOffboardingById(item.Id);
    if (updatedOffboarding) setFormData({ ...updatedOffboarding });
  };

  const updateAssetReturn = async (asset: IAssetReturn, field: string, value: any): Promise<void> => {
    if (!asset.Id) return;
    const svc = new OffboardingService(sp);
    const updates: Partial<IAssetReturn> = { [field]: value };
    if (field === 'Status' && value === AssetReturnStatus.Returned) {
      updates.ReturnedDate = new Date();
    }
    await svc.updateAssetReturn(asset.Id, updates);
    if (item?.Id) {
      const updatedAssets = await svc.getAssetReturns(item.Id);
      setAssetReturns(updatedAssets);
    }
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const svc = new OffboardingService(sp);
      const payload: any = {
        EmployeeName: formData.EmployeeName,
        EmployeeEmail: formData.EmployeeEmail,
        JobTitle: formData.JobTitle,
        Department: formData.Department,
        LastWorkingDate: formData.LastWorkingDate,
        TerminationType: formData.TerminationType,
        Status: formData.Status,
        ExitInterviewDate: formData.ExitInterviewDate,
        ExitInterviewCompleted: formData.ExitInterviewCompleted,
        ExitInterviewNotes: formData.ExitInterviewNotes,
        FinalPaymentProcessed: formData.FinalPaymentProcessed,
        ReferenceEligible: formData.ReferenceEligible,
        RehireEligible: formData.RehireEligible,
        Notes: formData.Notes,
      };
      if (item?.Id) {
        await svc.updateOffboarding(item.Id, payload);
      } else {
        await svc.createOffboarding(payload);
      }
      onSaved();
    } catch (error) {
      console.error('[OffboardingForm] Error saving:', error);
    }
    setSaving(false);
  };

  const renderViewField = (label: string, value: string | undefined): React.ReactElement => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#323130' }}>{value || '\u2014'}</div>
    </div>
  );

  const renderBooleanField = (label: string, value: boolean | undefined): React.ReactElement => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#605e5c', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon iconName={value ? 'CheckMark' : 'Cancel'} style={{ color: value ? '#059669' : '#dc2626', fontSize: 14 }} />
        <span style={{ fontSize: 14, color: '#323130' }}>{value ? 'Yes' : 'No'}</span>
      </div>
    </div>
  );

  const formatDate = (date?: Date): string => date ? date.toLocaleDateString() : '\u2014';

  const isView = currentMode === 'view';

  const onRenderHeader = (): JSX.Element => (
    <div className={styles.panelHeaderOffboarding}>
      <div className={styles.panelTitleArea}>
        <div className={styles.panelIcon}>
          <Icon iconName="UserRemove" style={{ fontSize: 22, color: '#ffffff' }} />
        </div>
        <div>
          <div className={styles.panelTitle}>
            {!item ? 'New Offboarding' : currentMode === 'edit' ? 'Edit Offboarding' : 'Offboarding Details'}
          </div>
          <div className={styles.panelSubtitle}>
            {formData.EmployeeName ? `${formData.EmployeeName} — ${formData.TerminationType || 'Departure'}` : 'Employee Offboarding'}
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
      {isView ? (
        <>
          <button className={styles.btnSecondary} onClick={onDismiss}>Close</button>
          <button className={styles.btnPrimaryOffboarding} onClick={() => setCurrentMode('edit')}>Edit</button>
        </>
      ) : (
        <>
          <button className={styles.btnSecondary} onClick={onDismiss} disabled={saving}>Cancel</button>
          <button className={styles.btnPrimaryOffboarding} onClick={handleSave} disabled={saving}>
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
        <div className={styles.formSectionTitleOffboarding}>Employee Details</div>
        {isView ? (
          <div className={styles.formGrid}>
            {renderViewField('Employee Name', formData.EmployeeName)}
            {renderViewField('Email', formData.EmployeeEmail)}
            {renderViewField('Job Title', formData.JobTitle)}
            {renderViewField('Department', formData.Department)}
          </div>
        ) : (
          <div className={styles.formGrid}>
            <TextField label="Employee Name" value={formData.EmployeeName || ''} onChange={handleTextChange('EmployeeName')} disabled={!!item?.Id} />
            <TextField label="Email" value={formData.EmployeeEmail || ''} onChange={handleTextChange('EmployeeEmail')} disabled={!!item?.Id} />
            <TextField label="Job Title" value={formData.JobTitle || ''} onChange={handleTextChange('JobTitle')} />
            <TextField label="Department" value={formData.Department || ''} onChange={handleTextChange('Department')} />
          </div>
        )}

        {/* Termination Details */}
        <div className={styles.formSectionTitleOffboarding} style={{ marginTop: 24 }}>Termination Details</div>
        {isView ? (
          <div className={styles.formGrid}>
            {renderViewField('Termination Type', formData.TerminationType)}
            {renderViewField('Last Working Date', formatDate(formData.LastWorkingDate as Date | undefined))}
          </div>
        ) : (
          <div className={styles.formGrid}>
            <Dropdown
              label="Termination Type"
              selectedKey={formData.TerminationType}
              options={[
                { key: 'Resignation', text: 'Resignation' },
                { key: 'Termination', text: 'Termination' },
                { key: 'Redundancy', text: 'Redundancy' },
                { key: 'Retirement', text: 'Retirement' },
                { key: 'Contract End', text: 'Contract End' },
                { key: 'Other', text: 'Other' },
              ]}
              onChange={handleDropdownChange('TerminationType')}
            />
            <DatePicker label="Last Working Date" value={formData.LastWorkingDate ? new Date(formData.LastWorkingDate) : undefined} onSelectDate={handleDateChange('LastWorkingDate')} />
          </div>
        )}

        {/* Status & Progress */}
        <div className={styles.formSectionTitleOffboarding} style={{ marginTop: 24 }}>Status & Progress</div>
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
                  background: (formData.CompletionPercentage || 0) === 100 ? '#059669' : '#d13438',
                }} />
              </div>
              <div style={{ fontSize: 13, color: '#323130' }}>{formData.CompletedTasks || 0}/{formData.TotalTasks || 0} tasks ({formData.CompletionPercentage || 0}%)</div>
            </div>
          </div>
        ) : (
          <div className={styles.formGrid}>
            <Dropdown label="Status" selectedKey={formData.Status} options={STATUS_OPTIONS} onChange={handleDropdownChange('Status')} />
          </div>
        )}

        {/* Asset Returns */}
        {item?.Id && assetReturns.length > 0 && (
          <>
            <div className={styles.formSectionTitleOffboarding} style={{ marginTop: 24 }}>
              Asset Returns ({assetReturns.filter(a => a.Status === AssetReturnStatus.Returned).length}/{assetReturns.length})
            </div>
            {assetReturns.map(asset => (
              <div key={asset.Id} style={{
                padding: 12, marginBottom: 8, background: '#fafafa', borderRadius: 6,
                border: `1px solid ${asset.Status === AssetReturnStatus.Returned ? '#059669' : '#edebe9'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#323130' }}>{asset.AssetName}</div>
                    <div style={{ fontSize: 12, color: '#605e5c' }}>
                      {asset.AssetTag && `Tag: ${asset.AssetTag}`} {asset.Quantity > 1 && `\u2022 Qty: ${asset.Quantity}`}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: `${ASSET_STATUS_COLORS[asset.Status] || '#605e5c'}15`,
                    color: ASSET_STATUS_COLORS[asset.Status] || '#605e5c',
                  }}>{asset.Status}</span>
                </div>
                {!isView && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <Dropdown
                      label="Status"
                      selectedKey={asset.Status}
                      options={ASSET_STATUS_OPTIONS}
                      onChange={(_, opt) => opt && updateAssetReturn(asset, 'Status', opt.key)}
                      styles={{ root: { width: 140 } }}
                    />
                    <Dropdown
                      label="Condition"
                      selectedKey={asset.Condition}
                      options={CONDITION_OPTIONS}
                      onChange={(_, opt) => opt && updateAssetReturn(asset, 'Condition', opt.key)}
                      styles={{ root: { width: 120 } }}
                      disabled={asset.Status !== AssetReturnStatus.Returned && asset.Status !== AssetReturnStatus.Damaged}
                    />
                    {asset.RequiresDataWipe && (
                      <Toggle
                        label="Data Wiped"
                        checked={asset.DataWipeCompleted}
                        onChange={(_, checked) => updateAssetReturn(asset, 'DataWipeCompleted', checked)}
                        styles={{ root: { marginBottom: 0 } }}
                      />
                    )}
                  </div>
                )}
                {isView && asset.Status === AssetReturnStatus.Returned && (
                  <div style={{ fontSize: 12, color: '#605e5c', marginTop: 4 }}>
                    Returned: {formatDate(asset.ReturnedDate)} \u2022 Condition: {asset.Condition || 'N/A'}
                    {asset.RequiresDataWipe && ` \u2022 Data Wiped: ${asset.DataWipeCompleted ? 'Yes' : 'No'}`}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Task Checklist */}
        {item?.Id && tasks.length > 0 && (
          <>
            <div className={styles.formSectionTitleOffboarding} style={{ marginTop: 24 }}>
              Tasks ({tasks.filter(t => t.Status === OffboardingTaskStatus.Completed).length}/{tasks.length})
            </div>
            {tasks.map(task => (
              <div key={task.Id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #edebe9' }}>
                <input
                  type="checkbox"
                  checked={task.Status === OffboardingTaskStatus.Completed}
                  onChange={() => toggleTaskStatus(task)}
                  disabled={isView}
                  style={{ width: 18, height: 18, accentColor: '#d13438', cursor: isView ? 'default' : 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    textDecoration: task.Status === OffboardingTaskStatus.Completed ? 'line-through' : 'none',
                    color: task.Status === OffboardingTaskStatus.Completed ? '#8a8886' : '#323130',
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

        {/* Exit Interview */}
        <div className={styles.formSectionTitleOffboarding} style={{ marginTop: 24 }}>Exit Interview</div>
        {isView ? (
          <div className={styles.formGrid}>
            {renderViewField('Scheduled Date', formatDate(formData.ExitInterviewDate as Date | undefined))}
            {renderBooleanField('Interview Completed', formData.ExitInterviewCompleted)}
            {formData.ExitInterviewNotes && renderViewField('Interview Notes', formData.ExitInterviewNotes)}
          </div>
        ) : (
          <>
            <div className={styles.formGrid}>
              <DatePicker label="Scheduled Date" value={formData.ExitInterviewDate ? new Date(formData.ExitInterviewDate) : undefined} onSelectDate={handleDateChange('ExitInterviewDate')} />
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                <Toggle label="Interview Completed" checked={formData.ExitInterviewCompleted || false} onChange={handleToggleChange('ExitInterviewCompleted')} />
              </div>
            </div>
            <TextField label="Interview Notes" multiline rows={3} value={formData.ExitInterviewNotes || ''} onChange={handleTextChange('ExitInterviewNotes')} />
          </>
        )}

        {/* Final Status */}
        <div className={styles.formSectionTitleOffboarding} style={{ marginTop: 24 }}>Final Status</div>
        {isView ? (
          <div className={styles.formGrid}>
            {renderBooleanField('Final Payment Processed', formData.FinalPaymentProcessed)}
            {renderBooleanField('Reference Eligible', formData.ReferenceEligible)}
            {renderBooleanField('Rehire Eligible', formData.RehireEligible)}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Toggle label="Final Payment Processed" checked={formData.FinalPaymentProcessed || false} onChange={handleToggleChange('FinalPaymentProcessed')} />
            <Toggle label="Reference Eligible" checked={formData.ReferenceEligible || false} onChange={handleToggleChange('ReferenceEligible')} />
            <Toggle label="Rehire Eligible" checked={formData.RehireEligible || false} onChange={handleToggleChange('RehireEligible')} />
          </div>
        )}

        {/* Notes */}
        <div className={styles.formSectionTitleOffboarding} style={{ marginTop: 24 }}>Notes</div>
        {isView ? (
          <div style={{ fontSize: 14, color: '#323130', whiteSpace: 'pre-wrap' }}>{formData.Notes || '\u2014'}</div>
        ) : (
          <TextField multiline rows={4} value={formData.Notes || ''} onChange={handleTextChange('Notes')} />
        )}
      </div>
    </Panel>
  );
};
