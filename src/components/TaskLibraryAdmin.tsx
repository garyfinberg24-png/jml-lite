// Task Library Admin Component - JML Lite
// Manage predefined tasks with classification system

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { PrimaryButton, DefaultButton, IconButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { DetailsList, DetailsListLayoutMode, SelectionMode, IColumn } from '@fluentui/react/lib/DetailsList';
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { TaskLibraryService } from '../services/TaskLibraryService';
import {
  ITaskLibraryItem,
  ITaskLibraryItemInput,
  TaskClassification,
  TaskProcessType,
  TaskAssignmentType,
  TASK_CLASSIFICATION_INFO,
} from '../models/ITaskLibrary';

interface IProps {
  sp: SPFI;
}

// Classification options for dropdown
const CLASSIFICATION_OPTIONS: IDropdownOption[] = Object.values(TaskClassification).map(c => ({
  key: c,
  text: `${c} - ${TASK_CLASSIFICATION_INFO[c].label}`,
  data: TASK_CLASSIFICATION_INFO[c],
}));

// Process type options
const PROCESS_TYPE_OPTIONS: IDropdownOption[] = [
  { key: TaskProcessType.Onboarding, text: 'Onboarding' },
  { key: TaskProcessType.Mover, text: 'Mover / Transfer' },
  { key: TaskProcessType.Offboarding, text: 'Offboarding' },
  { key: TaskProcessType.All, text: 'All Processes' },
];

// Assignment type options
const ASSIGNMENT_TYPE_OPTIONS: IDropdownOption[] = [
  { key: TaskAssignmentType.Role, text: 'Assign to Role/Team' },
  { key: TaskAssignmentType.Specific, text: 'Assign to Specific Person' },
  { key: TaskAssignmentType.Manager, text: 'Assign to Manager' },
  { key: TaskAssignmentType.Employee, text: 'Self-service (Employee)' },
  { key: TaskAssignmentType.Auto, text: 'Auto-assign (Round Robin)' },
];

// Offset type options
const OFFSET_TYPE_OPTIONS: IDropdownOption[] = [
  { key: 'before-start', text: 'Days before start date' },
  { key: 'on-start', text: 'On start date' },
  { key: 'after-start', text: 'Days after start date' },
];

// Priority options
const PRIORITY_OPTIONS: IDropdownOption[] = [
  { key: 'Low', text: 'Low' },
  { key: 'Medium', text: 'Medium' },
  { key: 'High', text: 'High' },
  { key: 'Critical', text: 'Critical' },
];

// Role options
const ROLE_OPTIONS: IDropdownOption[] = [
  { key: 'IT Team', text: 'IT Team' },
  { key: 'HR Team', text: 'HR Team' },
  { key: 'Facilities', text: 'Facilities' },
  { key: 'Finance', text: 'Finance' },
  { key: 'Security', text: 'Security' },
  { key: 'Training', text: 'Training / L&D' },
  { key: 'Manager', text: 'Line Manager' },
  { key: 'IT Lead', text: 'IT Lead' },
];

export const TaskLibraryAdmin: React.FC<IProps> = ({ sp }) => {
  const [tasks, setTasks] = useState<ITaskLibraryItem[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<ITaskLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ITaskLibraryItem | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: MessageBarType; text: string } | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ITaskLibraryItem | null>(null);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<TaskClassification | 'all'>('all');
  const [processTypeFilter, setProcessTypeFilter] = useState<TaskProcessType | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<boolean | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState<Partial<ITaskLibraryItemInput>>({
    Classification: TaskClassification.DOC,
    Title: '',
    Description: '',
    Instructions: '',
    ProcessTypes: [TaskProcessType.Onboarding],
    DefaultAssignmentType: TaskAssignmentType.Role,
    DefaultAssigneeRole: 'HR Team',
    DefaultOffsetType: 'on-start',
    DefaultDaysOffset: 0,
    DefaultPriority: 'Medium',
    RequiresApproval: false,
    SendEmailNotification: true,
    SendTeamsNotification: false,
    SendReminder: true,
    ReminderDaysBefore: 1,
    NotifyOnComplete: true,
    IsActive: true,
    IsMandatory: false,
  });

  const service = new TaskLibraryService(sp);

  // Load tasks
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const items = await service.getTaskLibraryItems();
      setTasks(items);
      applyFilters(items, searchText, classificationFilter, processTypeFilter, activeFilter);
    } catch (error) {
      console.error('[TaskLibraryAdmin] Error loading tasks:', error);
      setMessage({ type: MessageBarType.error, text: 'Failed to load tasks' });
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Apply filters
  const applyFilters = (
    items: ITaskLibraryItem[],
    search: string,
    classification: TaskClassification | 'all',
    processType: TaskProcessType | 'all',
    active: boolean | 'all'
  ) => {
    let filtered = [...items];

    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(t =>
        t.Title.toLowerCase().includes(lower) ||
        t.TaskCode.toLowerCase().includes(lower) ||
        t.Description?.toLowerCase().includes(lower)
      );
    }

    if (classification !== 'all') {
      filtered = filtered.filter(t => t.Classification === classification);
    }

    if (processType !== 'all') {
      filtered = filtered.filter(t =>
        t.ProcessTypes.includes(processType) || t.ProcessTypes.includes(TaskProcessType.All)
      );
    }

    if (active !== 'all') {
      filtered = filtered.filter(t => t.IsActive === active);
    }

    setFilteredTasks(filtered);
  };

  // Handle filter changes
  useEffect(() => {
    applyFilters(tasks, searchText, classificationFilter, processTypeFilter, activeFilter);
  }, [searchText, classificationFilter, processTypeFilter, activeFilter, tasks]);

  // Open panel for new task
  const handleNewTask = () => {
    setIsEditing(false);
    setSelectedTask(null);
    setFormData({
      Classification: TaskClassification.DOC,
      Title: '',
      Description: '',
      Instructions: '',
      ProcessTypes: [TaskProcessType.Onboarding],
      DefaultAssignmentType: TaskAssignmentType.Role,
      DefaultAssigneeRole: 'HR Team',
      DefaultOffsetType: 'on-start',
      DefaultDaysOffset: 0,
      DefaultPriority: 'Medium',
      RequiresApproval: false,
      SendEmailNotification: true,
      SendTeamsNotification: false,
      SendReminder: true,
      ReminderDaysBefore: 1,
      NotifyOnComplete: true,
      IsActive: true,
      IsMandatory: false,
    });
    setIsPanelOpen(true);
  };

  // Open panel for editing
  const handleEditTask = (task: ITaskLibraryItem) => {
    setIsEditing(true);
    setSelectedTask(task);
    setFormData({
      Classification: task.Classification,
      Title: task.Title,
      Description: task.Description,
      Instructions: task.Instructions,
      ProcessTypes: task.ProcessTypes,
      Departments: task.Departments,
      JobTitles: task.JobTitles,
      DefaultAssignmentType: task.DefaultAssignmentType,
      DefaultAssigneeRole: task.DefaultAssigneeRole,
      DefaultAssigneeId: task.DefaultAssigneeId,
      DefaultAssigneeName: task.DefaultAssigneeName,
      DefaultOffsetType: task.DefaultOffsetType,
      DefaultDaysOffset: task.DefaultDaysOffset,
      EstimatedHours: task.EstimatedHours,
      DefaultPriority: task.DefaultPriority,
      RequiresApproval: task.RequiresApproval,
      DefaultApproverId: task.DefaultApproverId,
      DefaultApproverName: task.DefaultApproverName,
      DefaultApproverRole: task.DefaultApproverRole,
      SendEmailNotification: task.SendEmailNotification,
      SendTeamsNotification: task.SendTeamsNotification,
      SendReminder: task.SendReminder,
      ReminderDaysBefore: task.ReminderDaysBefore,
      NotifyOnComplete: task.NotifyOnComplete,
      DependsOnTaskCodes: task.DependsOnTaskCodes,
      IsActive: task.IsActive,
      IsMandatory: task.IsMandatory,
      Tags: task.Tags,
    });
    setIsPanelOpen(true);
  };

  // Save task
  const handleSave = async () => {
    if (!formData.Title || !formData.Classification) {
      setMessage({ type: MessageBarType.error, text: 'Title and Classification are required' });
      return;
    }

    setIsSaving(true);
    try {
      const input: ITaskLibraryItemInput = {
        Classification: formData.Classification!,
        Title: formData.Title!,
        Description: formData.Description,
        Instructions: formData.Instructions,
        ProcessTypes: formData.ProcessTypes || [TaskProcessType.Onboarding],
        Departments: formData.Departments,
        JobTitles: formData.JobTitles,
        DefaultAssignmentType: formData.DefaultAssignmentType || TaskAssignmentType.Role,
        DefaultAssigneeRole: formData.DefaultAssigneeRole,
        DefaultAssigneeId: formData.DefaultAssigneeId,
        DefaultAssigneeName: formData.DefaultAssigneeName,
        DefaultOffsetType: formData.DefaultOffsetType || 'on-start',
        DefaultDaysOffset: formData.DefaultDaysOffset || 0,
        EstimatedHours: formData.EstimatedHours,
        DefaultPriority: formData.DefaultPriority || 'Medium',
        RequiresApproval: formData.RequiresApproval || false,
        DefaultApproverId: formData.DefaultApproverId,
        DefaultApproverName: formData.DefaultApproverName,
        DefaultApproverRole: formData.DefaultApproverRole,
        SendEmailNotification: formData.SendEmailNotification ?? true,
        SendTeamsNotification: formData.SendTeamsNotification ?? false,
        SendReminder: formData.SendReminder ?? true,
        ReminderDaysBefore: formData.ReminderDaysBefore || 1,
        NotifyOnComplete: formData.NotifyOnComplete ?? true,
        DependsOnTaskCodes: formData.DependsOnTaskCodes,
        IsActive: formData.IsActive ?? true,
        IsMandatory: formData.IsMandatory ?? false,
        Tags: formData.Tags,
      };

      if (isEditing && selectedTask?.Id) {
        await service.updateTaskLibraryItem(selectedTask.Id, input);
        setMessage({ type: MessageBarType.success, text: 'Task updated successfully' });
      } else {
        await service.createTaskLibraryItem(input);
        setMessage({ type: MessageBarType.success, text: 'Task created successfully' });
      }

      setIsPanelOpen(false);
      await loadTasks();
    } catch (error) {
      console.error('[TaskLibraryAdmin] Error saving task:', error);
      setMessage({ type: MessageBarType.error, text: 'Failed to save task' });
    }
    setIsSaving(false);
  };

  // Delete task
  const handleDelete = async () => {
    if (!taskToDelete?.Id) return;

    try {
      await service.deleteTaskLibraryItem(taskToDelete.Id);
      setMessage({ type: MessageBarType.success, text: 'Task deleted successfully' });
      setDeleteDialogVisible(false);
      setTaskToDelete(null);
      await loadTasks();
    } catch (error) {
      console.error('[TaskLibraryAdmin] Error deleting task:', error);
      setMessage({ type: MessageBarType.error, text: 'Failed to delete task' });
    }
  };

  // Toggle active
  const handleToggleActive = async (task: ITaskLibraryItem) => {
    try {
      await service.toggleActive(task.Id!);
      await loadTasks();
    } catch (error) {
      console.error('[TaskLibraryAdmin] Error toggling active:', error);
      setMessage({ type: MessageBarType.error, text: 'Failed to toggle status' });
    }
  };

  // Seed default tasks
  const handleSeedTasks = async () => {
    setLoading(true);
    try {
      const result = await service.seedDefaultTasks();
      setMessage({
        type: MessageBarType.success,
        text: `Seeded ${result.created} new tasks, ${result.skipped} already existed`
      });
      await loadTasks();
    } catch (error) {
      console.error('[TaskLibraryAdmin] Error seeding tasks:', error);
      setMessage({ type: MessageBarType.error, text: 'Failed to seed tasks' });
    }
    setLoading(false);
  };

  // Table columns
  const columns: IColumn[] = [
    {
      key: 'taskCode',
      name: 'Code',
      fieldName: 'TaskCode',
      minWidth: 70,
      maxWidth: 80,
      isResizable: true,
      onRender: (item: ITaskLibraryItem) => {
        const info = TASK_CLASSIFICATION_INFO[item.Classification];
        return (
          <span style={{
            padding: '2px 6px',
            borderRadius: 4,
            background: info.bgColor,
            color: info.color,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'monospace',
          }}>
            {item.TaskCode}
          </span>
        );
      },
    },
    {
      key: 'title',
      name: 'Task Title',
      fieldName: 'Title',
      minWidth: 200,
      maxWidth: 350,
      isResizable: true,
      onRender: (item: ITaskLibraryItem) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{item.Title}</div>
          {item.Description && (
            <div style={{ fontSize: 11, color: '#605e5c', marginTop: 2 }}>
              {item.Description.substring(0, 60)}{item.Description.length > 60 ? '...' : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'classification',
      name: 'Category',
      fieldName: 'Classification',
      minWidth: 100,
      maxWidth: 120,
      isResizable: true,
      onRender: (item: ITaskLibraryItem) => {
        const info = TASK_CLASSIFICATION_INFO[item.Classification];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon iconName={info.icon} style={{ color: info.color, fontSize: 14 }} />
            <span style={{ fontSize: 12 }}>{info.label}</span>
          </div>
        );
      },
    },
    {
      key: 'processTypes',
      name: 'Applies To',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: ITaskLibraryItem) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {item.ProcessTypes.map(pt => (
            <span key={pt} style={{
              padding: '2px 6px',
              borderRadius: 4,
              background: pt === TaskProcessType.Onboarding ? '#e8f0fe' :
                         pt === TaskProcessType.Mover ? '#fef7e0' :
                         pt === TaskProcessType.Offboarding ? '#fce8e6' : '#f1f3f4',
              color: pt === TaskProcessType.Onboarding ? '#1967d2' :
                     pt === TaskProcessType.Mover ? '#b06000' :
                     pt === TaskProcessType.Offboarding ? '#c5221f' : '#5f6368',
              fontSize: 10,
              fontWeight: 500,
            }}>
              {pt}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'assignment',
      name: 'Default Assignment',
      minWidth: 100,
      maxWidth: 140,
      isResizable: true,
      onRender: (item: ITaskLibraryItem) => (
        <span style={{ fontSize: 12, color: '#605e5c' }}>
          {item.DefaultAssignmentType === TaskAssignmentType.Role ? item.DefaultAssigneeRole :
           item.DefaultAssignmentType === TaskAssignmentType.Employee ? 'Self-service' :
           item.DefaultAssignmentType === TaskAssignmentType.Manager ? 'Manager' :
           item.DefaultAssignmentType}
        </span>
      ),
    },
    {
      key: 'timing',
      name: 'Timing',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      onRender: (item: ITaskLibraryItem) => (
        <span style={{ fontSize: 12, color: '#605e5c' }}>
          {item.DefaultOffsetType === 'on-start' ? 'Day 0' :
           item.DefaultOffsetType === 'before-start' ? `D-${item.DefaultDaysOffset}` :
           `D+${item.DefaultDaysOffset}`}
        </span>
      ),
    },
    {
      key: 'flags',
      name: 'Flags',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      onRender: (item: ITaskLibraryItem) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {item.IsMandatory && (
            <Icon iconName="Lock" style={{ color: '#d97706', fontSize: 12 }} title="Mandatory" />
          )}
          {item.RequiresApproval && (
            <Icon iconName="Shield" style={{ color: '#1967d2', fontSize: 12 }} title="Requires Approval" />
          )}
          {item.SendEmailNotification && (
            <Icon iconName="Mail" style={{ color: '#605e5c', fontSize: 12 }} title="Email" />
          )}
          {item.SendTeamsNotification && (
            <Icon iconName="TeamsLogo" style={{ color: '#5c5aa7', fontSize: 12 }} title="Teams" />
          )}
        </div>
      ),
    },
    {
      key: 'status',
      name: 'Status',
      minWidth: 70,
      maxWidth: 80,
      isResizable: true,
      onRender: (item: ITaskLibraryItem) => (
        <span style={{
          padding: '2px 8px',
          borderRadius: 4,
          background: item.IsActive ? '#e6f4ea' : '#f3f2f1',
          color: item.IsActive ? '#137333' : '#8a8886',
          fontSize: 11,
          fontWeight: 500,
        }}>
          {item.IsActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      name: '',
      minWidth: 100,
      maxWidth: 100,
      onRender: (item: ITaskLibraryItem) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <IconButton
            iconProps={{ iconName: 'Edit' }}
            title="Edit"
            onClick={() => handleEditTask(item)}
          />
          <IconButton
            iconProps={{ iconName: item.IsActive ? 'Hide' : 'View' }}
            title={item.IsActive ? 'Deactivate' : 'Activate'}
            onClick={() => handleToggleActive(item)}
          />
          <IconButton
            iconProps={{ iconName: 'Delete' }}
            title="Delete"
            onClick={() => {
              setTaskToDelete(item);
              setDeleteDialogVisible(true);
            }}
          />
        </div>
      ),
    },
  ];

  // Command bar items
  const commandItems: ICommandBarItemProps[] = [
    {
      key: 'new',
      text: 'New Task',
      iconProps: { iconName: 'Add' },
      onClick: handleNewTask,
    },
    {
      key: 'seed',
      text: 'Seed Default Tasks',
      iconProps: { iconName: 'Database' },
      onClick: handleSeedTasks,
    },
    {
      key: 'refresh',
      text: 'Refresh',
      iconProps: { iconName: 'Refresh' },
      onClick: loadTasks,
    },
  ];

  // Render form panel
  const renderFormPanel = () => (
    <Panel
      isOpen={isPanelOpen}
      type={PanelType.medium}
      onDismiss={() => setIsPanelOpen(false)}
      headerText={isEditing ? `Edit Task: ${selectedTask?.TaskCode}` : 'New Task'}
      isFooterAtBottom={true}
      onRenderFooterContent={() => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <DefaultButton onClick={() => setIsPanelOpen(false)}>Cancel</DefaultButton>
          <PrimaryButton onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </PrimaryButton>
        </div>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Basic Info */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 12 }}>
            Basic Information
          </div>

          <Dropdown
            label="Classification"
            selectedKey={formData.Classification}
            options={CLASSIFICATION_OPTIONS}
            onChange={(_, opt) => setFormData({ ...formData, Classification: opt?.key as TaskClassification })}
            required
            disabled={isEditing}
            onRenderOption={(opt) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon iconName={opt?.data?.icon} style={{ color: opt?.data?.color, fontSize: 14 }} />
                {opt?.text}
              </div>
            )}
          />

          <TextField
            label="Title"
            value={formData.Title}
            onChange={(_, v) => setFormData({ ...formData, Title: v })}
            required
          />

          <TextField
            label="Description"
            value={formData.Description}
            onChange={(_, v) => setFormData({ ...formData, Description: v })}
            multiline
            rows={2}
          />

          <TextField
            label="Instructions"
            value={formData.Instructions}
            onChange={(_, v) => setFormData({ ...formData, Instructions: v })}
            multiline
            rows={3}
            placeholder="Detailed instructions for the assignee..."
          />
        </div>

        {/* Applicability */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 12 }}>
            Applicability
          </div>

          <Dropdown
            label="Applies to Process Types"
            selectedKeys={formData.ProcessTypes}
            options={PROCESS_TYPE_OPTIONS}
            multiSelect
            onChange={(_, opt) => {
              if (opt) {
                const newTypes = opt.selected
                  ? [...(formData.ProcessTypes || []), opt.key as TaskProcessType]
                  : (formData.ProcessTypes || []).filter(t => t !== opt.key);
                setFormData({ ...formData, ProcessTypes: newTypes });
              }
            }}
          />

          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <Toggle
              label="Mandatory"
              checked={formData.IsMandatory}
              onChange={(_, checked) => setFormData({ ...formData, IsMandatory: checked })}
              inlineLabel
            />
            <Toggle
              label="Active"
              checked={formData.IsActive}
              onChange={(_, checked) => setFormData({ ...formData, IsActive: checked })}
              inlineLabel
            />
          </div>
        </div>

        {/* Assignment */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 12 }}>
            Default Assignment
          </div>

          <Dropdown
            label="Assignment Type"
            selectedKey={formData.DefaultAssignmentType}
            options={ASSIGNMENT_TYPE_OPTIONS}
            onChange={(_, opt) => setFormData({ ...formData, DefaultAssignmentType: opt?.key as TaskAssignmentType })}
          />

          {formData.DefaultAssignmentType === TaskAssignmentType.Role && (
            <Dropdown
              label="Assign to Role"
              selectedKey={formData.DefaultAssigneeRole}
              options={ROLE_OPTIONS}
              onChange={(_, opt) => setFormData({ ...formData, DefaultAssigneeRole: opt?.key as string })}
            />
          )}
        </div>

        {/* Timing */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 12 }}>
            Timing
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Dropdown
              label="Offset Type"
              selectedKey={formData.DefaultOffsetType}
              options={OFFSET_TYPE_OPTIONS}
              onChange={(_, opt) => setFormData({
                ...formData,
                DefaultOffsetType: opt?.key as 'before-start' | 'on-start' | 'after-start',
                DefaultDaysOffset: opt?.key === 'on-start' ? 0 : formData.DefaultDaysOffset || 1
              })}
            />

            {formData.DefaultOffsetType !== 'on-start' && (
              <SpinButton
                label="Days Offset"
                value={String(formData.DefaultDaysOffset || 0)}
                min={0}
                max={90}
                step={1}
                onChange={(_, v) => setFormData({ ...formData, DefaultDaysOffset: parseInt(v || '0', 10) })}
              />
            )}
          </div>

          <SpinButton
            label="Estimated Hours"
            value={String(formData.EstimatedHours || 0)}
            min={0}
            max={100}
            step={0.5}
            onChange={(_, v) => setFormData({ ...formData, EstimatedHours: parseFloat(v || '0') })}
            styles={{ root: { marginTop: 12 } }}
          />
        </div>

        {/* Priority & Approval */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 12 }}>
            Priority & Approval
          </div>

          <Dropdown
            label="Priority"
            selectedKey={formData.DefaultPriority}
            options={PRIORITY_OPTIONS}
            onChange={(_, opt) => setFormData({ ...formData, DefaultPriority: opt?.key as 'Low' | 'Medium' | 'High' | 'Critical' })}
          />

          <Toggle
            label="Requires Approval"
            checked={formData.RequiresApproval}
            onChange={(_, checked) => setFormData({ ...formData, RequiresApproval: checked })}
            inlineLabel
            styles={{ root: { marginTop: 12 } }}
          />

          {formData.RequiresApproval && (
            <Dropdown
              label="Approver Role"
              selectedKey={formData.DefaultApproverRole}
              options={ROLE_OPTIONS}
              onChange={(_, opt) => setFormData({ ...formData, DefaultApproverRole: opt?.key as string })}
            />
          )}
        </div>

        {/* Notifications */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 12 }}>
            Notifications
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Toggle
              label="Send email notification"
              checked={formData.SendEmailNotification}
              onChange={(_, checked) => setFormData({ ...formData, SendEmailNotification: checked })}
              inlineLabel
            />

            <Toggle
              label="Send Teams notification"
              checked={formData.SendTeamsNotification}
              onChange={(_, checked) => setFormData({ ...formData, SendTeamsNotification: checked })}
              inlineLabel
            />

            <Toggle
              label="Notify on completion"
              checked={formData.NotifyOnComplete}
              onChange={(_, checked) => setFormData({ ...formData, NotifyOnComplete: checked })}
              inlineLabel
            />

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              <Toggle
                label="Send reminder"
                checked={formData.SendReminder}
                onChange={(_, checked) => setFormData({ ...formData, SendReminder: checked })}
                inlineLabel
              />
              {formData.SendReminder && (
                <SpinButton
                  value={String(formData.ReminderDaysBefore || 1)}
                  min={1}
                  max={14}
                  step={1}
                  onChange={(_, v) => setFormData({ ...formData, ReminderDaysBefore: parseInt(v || '1', 10) })}
                  styles={{ root: { width: 80 } }}
                />
              )}
              {formData.SendReminder && <span style={{ fontSize: 12, color: '#605e5c', marginBottom: 8 }}>days before</span>}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#323130', marginBottom: 4 }}>Task Library</div>
        <div style={{ fontSize: 13, color: '#605e5c' }}>
          Manage predefined tasks that can be added to onboarding, mover, and offboarding workflows.
        </div>
      </div>

      {/* Message */}
      {message && (
        <MessageBar
          messageBarType={message.type}
          isMultiline={false}
          onDismiss={() => setMessage(null)}
          dismissButtonAriaLabel="Close"
          styles={{ root: { marginBottom: 16 } }}
        >
          {message.text}
        </MessageBar>
      )}

      {/* Command Bar */}
      <CommandBar items={commandItems} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', padding: '16px 0', flexWrap: 'wrap' }}>
        <SearchBox
          placeholder="Search tasks..."
          value={searchText}
          onChange={(_, v) => setSearchText(v || '')}
          styles={{ root: { width: 250 } }}
        />

        <Dropdown
          placeholder="Classification"
          selectedKey={classificationFilter}
          options={[
            { key: 'all', text: 'All Categories' },
            ...CLASSIFICATION_OPTIONS
          ]}
          onChange={(_, opt) => setClassificationFilter(opt?.key as TaskClassification | 'all')}
          styles={{ root: { width: 180 } }}
        />

        <Dropdown
          placeholder="Process Type"
          selectedKey={processTypeFilter}
          options={[
            { key: 'all', text: 'All Processes' },
            ...PROCESS_TYPE_OPTIONS
          ]}
          onChange={(_, opt) => setProcessTypeFilter(opt?.key as TaskProcessType | 'all')}
          styles={{ root: { width: 150 } }}
        />

        <Dropdown
          placeholder="Status"
          selectedKey={activeFilter === 'all' ? 'all' : activeFilter ? 'active' : 'inactive'}
          options={[
            { key: 'all', text: 'All' },
            { key: 'active', text: 'Active' },
            { key: 'inactive', text: 'Inactive' },
          ]}
          onChange={(_, opt) => setActiveFilter(opt?.key === 'all' ? 'all' : opt?.key === 'active')}
          styles={{ root: { width: 120 } }}
        />

        <div style={{ fontSize: 12, color: '#605e5c', marginLeft: 'auto' }}>
          {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner size={SpinnerSize.large} label="Loading tasks..." />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8a8886' }}>
          <Icon iconName="TaskManager" style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
          <div style={{ fontSize: 14 }}>No tasks found</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>
            {tasks.length === 0 ? (
              <span>Click "Seed Default Tasks" to add predefined tasks</span>
            ) : (
              <span>Try adjusting your filters</span>
            )}
          </div>
        </div>
      ) : (
        <DetailsList
          items={filteredTasks}
          columns={columns}
          layoutMode={DetailsListLayoutMode.justified}
          selectionMode={SelectionMode.none}
          isHeaderVisible={true}
        />
      )}

      {/* Form Panel */}
      {renderFormPanel()}

      {/* Delete Confirmation Dialog */}
      <Dialog
        hidden={!deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Delete Task',
          subText: `Are you sure you want to delete "${taskToDelete?.Title}"? This action cannot be undone.`,
        }}
      >
        <DialogFooter>
          <PrimaryButton onClick={handleDelete} text="Delete" />
          <DefaultButton onClick={() => setDeleteDialogVisible(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default TaskLibraryAdmin;
