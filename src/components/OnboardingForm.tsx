import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { SPFI } from '@pnp/sp';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { OnboardingService } from '../services/OnboardingService';
import { DocumentService, IEmployeeDocument, DOCUMENT_CATEGORIES, DocumentCategory } from '../services/DocumentService';
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
  const [documents, setDocuments] = useState<IEmployeeDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('ID Documents');
  const [docLibraryExists, setDocLibraryExists] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentMode(mode);
      setDocuments([]);
      if (item) {
        setFormData({ ...item });
        if (item.Id) {
          const svc = new OnboardingService(sp);
          svc.getOnboardingTasks(item.Id).then(setTasks).catch(() => setTasks([]));
          // Load documents
          loadDocuments(item.CandidateName);
        }
      } else {
        setFormData({ Status: OnboardingStatus.NotStarted, CompletionPercentage: 0, TotalTasks: 0, CompletedTasks: 0 });
        setTasks([]);
      }
    }
  }, [isOpen, item, mode, sp]);

  const loadDocuments = async (employeeName: string): Promise<void> => {
    setLoadingDocs(true);
    try {
      const docSvc = new DocumentService(sp);
      const exists = await docSvc.libraryExists();
      setDocLibraryExists(exists);
      if (exists && employeeName) {
        const docs = await docSvc.getEmployeeDocuments(employeeName);
        setDocuments(docs);
      }
    } catch (error) {
      console.error('[OnboardingForm] Error loading documents:', error);
    }
    setLoadingDocs(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files;
    if (!files?.length || !formData.CandidateName) return;

    setUploading(true);
    try {
      const docSvc = new DocumentService(sp);
      for (let i = 0; i < files.length; i++) {
        await docSvc.uploadDocument(formData.CandidateName, selectedCategory, files[i]);
      }
      await loadDocuments(formData.CandidateName);
    } catch (error) {
      console.error('[OnboardingForm] Error uploading:', error);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteDocument = async (doc: IEmployeeDocument): Promise<void> => {
    if (!confirm(`Delete "${doc.Name}"?`)) return;
    try {
      const docSvc = new DocumentService(sp);
      await docSvc.deleteDocument(doc.ServerRelativeUrl);
      await loadDocuments(formData.CandidateName || '');
    } catch (error) {
      console.error('[OnboardingForm] Error deleting document:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'PDF';
      case 'doc': case 'docx': return 'WordDocument';
      case 'xls': case 'xlsx': return 'ExcelDocument';
      case 'ppt': case 'pptx': return 'PowerPointDocument';
      case 'jpg': case 'jpeg': case 'png': case 'gif': return 'FileImage';
      default: return 'Document';
    }
  };

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

        {/* Documents Section */}
        {item?.Id && (
          <>
            <div className={styles.formSectionTitle} style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Documents ({documents.length})</span>
              {!isView && docLibraryExists && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                    style={{
                      padding: '4px 8px', borderRadius: 4, border: '1px solid #edebe9',
                      fontSize: 12, color: '#323130', background: '#fff',
                    }}
                  >
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: '4px 12px', borderRadius: 4, border: 'none',
                      background: '#005BAA', color: '#fff', fontSize: 12, fontWeight: 500,
                      cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Icon iconName="Upload" style={{ fontSize: 12 }} />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>
            {loadingDocs ? (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <Spinner size={SpinnerSize.small} label="Loading documents..." />
              </div>
            ) : !docLibraryExists ? (
              <div style={{ padding: 16, background: '#fff4ce', borderRadius: 8, fontSize: 13, color: '#605e5c' }}>
                <Icon iconName="Warning" style={{ marginRight: 8, color: '#d97706' }} />
                Document library (JML_EmployeeDocuments) not found. Create it in SharePoint to enable document storage.
              </div>
            ) : documents.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#8a8886', fontSize: 13 }}>
                <Icon iconName="DocumentSet" style={{ fontSize: 32, marginBottom: 8, opacity: 0.5, display: 'block' }} />
                No documents uploaded yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documents.map(doc => (
                  <div key={doc.ServerRelativeUrl} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    background: '#f9f9f9', borderRadius: 6, border: '1px solid #edebe9',
                  }}>
                    <Icon iconName={getFileIcon(doc.Name)} style={{ fontSize: 24, color: '#005BAA' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={doc.ServerRelativeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 13, fontWeight: 500, color: '#323130', textDecoration: 'none',
                          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                        title={doc.Name}
                      >
                        {doc.Name}
                      </a>
                      <div style={{ fontSize: 11, color: '#8a8886', marginTop: 2 }}>
                        {formatFileSize(doc.Length)} • {doc.TimeLastModified.toLocaleDateString()}
                        {doc.DocumentType && <span style={{ marginLeft: 8, padding: '1px 6px', background: '#e9e5f5', borderRadius: 4 }}>{doc.DocumentType}</span>}
                      </div>
                    </div>
                    {!isView && (
                      <button
                        onClick={() => handleDeleteDocument(doc)}
                        title="Delete"
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
                        }}
                      >
                        <Icon iconName="Delete" style={{ fontSize: 14, color: '#d13438' }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
