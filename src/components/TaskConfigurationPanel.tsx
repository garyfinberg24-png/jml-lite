// Task Configuration Panel - JML Lite
// Split panel for configuring selected checklist tasks with assignment properties

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Icon } from '@fluentui/react/lib/Icon';
import { PeoplePicker, PrincipalType } from '@pnp/spfx-controls-react/lib/PeoplePicker';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import styles from '../styles/JmlPanelStyles.module.scss';
import '../styles/FieldBorders.module.scss';

// Task configuration interfaces
export interface IConfigurableTask {
  id: string | number;
  taskCode?: string; // Task Library code (e.g., "SYS-001", "DOC-002")
  title: string;
  category: 'Documentation' | 'System Access' | 'Equipment' | 'Training' | 'Orientation' | 'Compliance' | 'General';
  sourceType: 'document' | 'system' | 'asset' | 'training' | 'custom';
  sourceId?: number;

  // Configuration properties
  assigneeId?: number;
  assigneeName?: string;
  assigneeEmail?: string;
  assignmentType: 'specific' | 'role' | 'auto' | 'manager';
  roleAssignment?: string; // e.g., "IT Team", "HR Team", "Manager"

  // Timing
  daysOffset: number; // Days from start date (positive = after, negative = before)
  offsetType: 'before-start' | 'on-start' | 'after-start';
  estimatedHours?: number;

  // Priority
  priority: 'Low' | 'Medium' | 'High' | 'Critical';

  // Approval
  requiresApproval: boolean;
  approverRole?: string;  // e.g., "IT Admin", "HR Manager"
  approverId?: number;
  approverName?: string;

  // Notifications
  sendReminder: boolean;
  reminderDaysBefore?: number;
  notifyOnComplete: boolean;
  notifyAssigneeEmail: boolean;
  notifyTeamsChat: boolean;

  // Additional
  instructions?: string;
  isSelected: boolean;
  isConfigured: boolean;

  // Task Dependencies
  dependsOnTaskIds?: (string | number)[];  // Array of task IDs this task depends on
  blockedUntilComplete?: boolean;           // Whether task is blocked until all dependencies complete
}

// Props
interface ITaskConfigurationPanelProps {
  sp: SPFI;
  context?: WebPartContext;
  isOpen: boolean;
  tasks: IConfigurableTask[];
  startDate?: Date;
  employeeName?: string;
  processType: 'onboarding' | 'mover' | 'offboarding';
  onDismiss: () => void;
  onConfirm: (tasks: IConfigurableTask[]) => void;
}

// Category badge colors
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Documentation: { bg: '#e6f4ea', text: '#137333', border: '#34a853' },
  'System Access': { bg: '#e8f0fe', text: '#1967d2', border: '#4285f4' },
  Equipment: { bg: '#fef7e0', text: '#b06000', border: '#fbbc04' },
  Training: { bg: '#fce8e6', text: '#c5221f', border: '#ea4335' },
  Orientation: { bg: '#f3e8fd', text: '#7627bb', border: '#a142f4' },
  Compliance: { bg: '#e8eaed', text: '#5f6368', border: '#9aa0a6' },
  General: { bg: '#f1f3f4', text: '#5f6368', border: '#dadce0' },
};

// Priority options
const PRIORITY_OPTIONS: IDropdownOption[] = [
  { key: 'Low', text: 'Low', data: { icon: 'CircleRing', color: '#8a8886' } },
  { key: 'Medium', text: 'Medium', data: { icon: 'CircleHalfFull', color: '#0078d4' } },
  { key: 'High', text: 'High', data: { icon: 'CircleFill', color: '#d97706' } },
  { key: 'Critical', text: 'Critical', data: { icon: 'Warning', color: '#d13438' } },
];

// Assignment type options
const ASSIGNMENT_OPTIONS: IDropdownOption[] = [
  { key: 'specific', text: 'Specific Person' },
  { key: 'role', text: 'Role/Team' },
  { key: 'manager', text: 'Hiring Manager' },
  { key: 'auto', text: 'Auto-assign (Round Robin)' },
];

// Role options for team assignment
const ROLE_OPTIONS: IDropdownOption[] = [
  { key: 'IT Team', text: 'IT Team' },
  { key: 'HR Team', text: 'HR Team' },
  { key: 'Facilities', text: 'Facilities' },
  { key: 'Finance', text: 'Finance' },
  { key: 'Security', text: 'Security' },
  { key: 'Training', text: 'Training/L&D' },
  { key: 'Department Head', text: 'Department Head' },
];

// Offset type options
const OFFSET_OPTIONS: IDropdownOption[] = [
  { key: 'before-start', text: 'Days before start date' },
  { key: 'on-start', text: 'On start date' },
  { key: 'after-start', text: 'Days after start date' },
];

export const TaskConfigurationPanel: React.FC<ITaskConfigurationPanelProps> = ({
  sp,
  context,
  isOpen,
  tasks: initialTasks,
  startDate,
  employeeName,
  processType,
  onDismiss,
  onConfirm,
}) => {
  const [tasks, setTasks] = useState<IConfigurableTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | number | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string | number>>(new Set());

  // Initialize tasks when panel opens
  useEffect(() => {
    if (isOpen && initialTasks.length > 0) {
      // Mark all tasks as selected by default (they came from checklist selection)
      const configured = initialTasks.map(t => ({
        ...t,
        isSelected: true,
        isConfigured: false,
        assignmentType: t.assignmentType || 'role',
        priority: t.priority || 'Medium',
        daysOffset: t.daysOffset || 0,
        offsetType: t.offsetType || 'on-start',
        requiresApproval: t.requiresApproval || false,
        sendReminder: t.sendReminder ?? true,
        reminderDaysBefore: t.reminderDaysBefore || 1,
        notifyOnComplete: t.notifyOnComplete ?? true,
        notifyAssigneeEmail: t.notifyAssigneeEmail ?? true,
        notifyTeamsChat: t.notifyTeamsChat ?? false,
      }));
      setTasks(configured);
      setSelectedTaskId(configured[0]?.id || null);
      setBulkSelectedIds(new Set());
      setBulkMode(false);
    }
  }, [isOpen, initialTasks]);

  // Get filtered tasks
  const filteredTasks = tasks.filter(t => {
    if (!t.isSelected) return false;
    if (searchFilter && !t.title.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

  // Get selected task for detail panel
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Get unique categories for filter
  const categories = Array.from(new Set(tasks.filter(t => t.isSelected).map(t => t.category)));

  // Update a single task
  const updateTask = useCallback((taskId: string | number, updates: Partial<IConfigurableTask>) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, ...updates, isConfigured: true }
        : t
    ));
  }, []);

  // Bulk update selected tasks
  const bulkUpdateTasks = useCallback((updates: Partial<IConfigurableTask>) => {
    setTasks(prev => prev.map(t =>
      bulkSelectedIds.has(t.id)
        ? { ...t, ...updates, isConfigured: true }
        : t
    ));
  }, [bulkSelectedIds]);

  // Toggle bulk selection
  const toggleBulkSelect = (taskId: string | number) => {
    setBulkSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Select all filtered tasks
  const selectAllFiltered = () => {
    setBulkSelectedIds(new Set(filteredTasks.map(t => t.id)));
  };

  // Clear bulk selection
  const clearBulkSelection = () => {
    setBulkSelectedIds(new Set());
  };

  // Get theme color based on process type
  const getThemeColor = (): string => {
    switch (processType) {
      case 'onboarding': return '#005BAA';
      case 'mover': return '#ea580c';
      case 'offboarding': return '#d13438';
      default: return '#005BAA';
    }
  };

  const themeColor = getThemeColor();

  // Calculate due date based on offset
  const calculateDueDate = (task: IConfigurableTask): Date | null => {
    if (!startDate) return null;
    const date = new Date(startDate);
    switch (task.offsetType) {
      case 'before-start':
        date.setDate(date.getDate() - Math.abs(task.daysOffset));
        break;
      case 'on-start':
        // No change
        break;
      case 'after-start':
        date.setDate(date.getDate() + Math.abs(task.daysOffset));
        break;
    }
    return date;
  };

  // Handle confirm
  const handleConfirm = () => {
    const configuredTasks = tasks.filter(t => t.isSelected);
    onConfirm(configuredTasks);
  };

  // Count configured vs total
  const configuredCount = tasks.filter(t => t.isSelected && t.isConfigured).length;
  const totalSelected = tasks.filter(t => t.isSelected).length;

  // Render task list item
  const renderTaskItem = (task: IConfigurableTask) => {
    const isSelected = task.id === selectedTaskId;
    const categoryStyle = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.General;

    return (
      <div
        key={task.id}
        onClick={() => !bulkMode && setSelectedTaskId(task.id)}
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #edebe9',
          cursor: 'pointer',
          background: isSelected && !bulkMode ? '#f3f2f1' : 'transparent',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#faf9f8'; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
      >
        {bulkMode && (
          <Checkbox
            checked={bulkSelectedIds.has(task.id)}
            onChange={() => toggleBulkSelect(task.id)}
            styles={{ root: { marginTop: 2 } }}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {task.taskCode && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#5c5c5c',
                background: '#f0f0f0',
                padding: '2px 6px',
                borderRadius: 3,
                fontFamily: 'Consolas, monospace',
                flexShrink: 0,
              }}>
                {task.taskCode}
              </span>
            )}
            <span style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#323130',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {task.title}
            </span>
            {task.isConfigured && (
              <Icon iconName="CheckMark" style={{ fontSize: 12, color: '#107c10' }} />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              background: categoryStyle.bg,
              color: categoryStyle.text,
              border: `1px solid ${categoryStyle.border}`,
              fontWeight: 500,
            }}>
              {task.category}
            </span>

            {task.assignmentType === 'role' && task.roleAssignment && (
              <span style={{ fontSize: 11, color: '#605e5c' }}>
                <Icon iconName="Group" style={{ fontSize: 10, marginRight: 4 }} />
                {task.roleAssignment}
              </span>
            )}

            {task.priority === 'High' || task.priority === 'Critical' ? (
              <span style={{ fontSize: 11, color: task.priority === 'Critical' ? '#d13438' : '#d97706' }}>
                <Icon iconName={task.priority === 'Critical' ? 'Warning' : 'Important'} style={{ fontSize: 10, marginRight: 2 }} />
                {task.priority}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  // Render task detail panel
  const renderTaskDetail = () => {
    if (!selectedTask) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: '#8a8886' }}>
          <Icon iconName="TaskManager" style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
          <div style={{ fontSize: 14 }}>Select a task to configure its properties</div>
        </div>
      );
    }

    const dueDate = calculateDueDate(selectedTask);
    const categoryStyle = CATEGORY_COLORS[selectedTask.category] || CATEGORY_COLORS.General;

    return (
      <div style={{ padding: 20 }}>
        {/* Task Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: categoryStyle.bg,
              border: `1px solid ${categoryStyle.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon
                iconName={
                  selectedTask.category === 'Documentation' ? 'DocumentSet' :
                  selectedTask.category === 'System Access' ? 'Permissions' :
                  selectedTask.category === 'Equipment' ? 'Devices3' :
                  selectedTask.category === 'Training' ? 'Education' :
                  selectedTask.category === 'Orientation' ? 'People' :
                  selectedTask.category === 'Compliance' ? 'Shield' : 'TaskSolid'
                }
                style={{ fontSize: 16, color: categoryStyle.text }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#323130', marginBottom: 4 }}>
                {selectedTask.title}
              </div>
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: categoryStyle.bg,
                color: categoryStyle.text,
                border: `1px solid ${categoryStyle.border}`,
                fontWeight: 500,
              }}>
                {selectedTask.category}
              </span>
            </div>
          </div>
        </div>

        {/* Assignment Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: themeColor,
            textTransform: 'uppercase',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Icon iconName="Contact" style={{ fontSize: 14 }} />
            Assignment
          </div>

          <Dropdown
            label="Assignment Type"
            selectedKey={selectedTask.assignmentType}
            options={ASSIGNMENT_OPTIONS}
            onChange={(_, opt) => updateTask(selectedTask.id, { assignmentType: opt?.key as any })}
            styles={{ root: { marginBottom: 12 } }}
          />

          {selectedTask.assignmentType === 'specific' && context && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 5 }}>Assignee</label>
              <PeoplePicker
                context={context as any}
                personSelectionLimit={1}
                showtooltip={true}
                required={false}
                principalTypes={[PrincipalType.User]}
                resolveDelay={300}
                placeholder="Search for a person..."
                defaultSelectedUsers={selectedTask.assigneeName ? [selectedTask.assigneeName] : []}
                onChange={(items) => {
                  if (items && items.length > 0) {
                    updateTask(selectedTask.id, {
                      assigneeId: items[0].id ? parseInt(items[0].id, 10) : undefined,
                      assigneeName: items[0].text,
                      assigneeEmail: items[0].secondaryText,
                    });
                  } else {
                    updateTask(selectedTask.id, {
                      assigneeId: undefined,
                      assigneeName: undefined,
                      assigneeEmail: undefined,
                    });
                  }
                }}
              />
            </div>
          )}

          {selectedTask.assignmentType === 'role' && (
            <Dropdown
              label="Assign to Team/Role"
              selectedKey={selectedTask.roleAssignment}
              options={ROLE_OPTIONS}
              onChange={(_, opt) => updateTask(selectedTask.id, { roleAssignment: opt?.key as string })}
              styles={{ root: { marginBottom: 12 } }}
            />
          )}
        </div>

        {/* Timing Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: themeColor,
            textTransform: 'uppercase',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Icon iconName="Clock" style={{ fontSize: 14 }} />
            Timing & Duration
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Dropdown
              label="Due Date Timing"
              selectedKey={selectedTask.offsetType}
              options={OFFSET_OPTIONS}
              onChange={(_, opt) => updateTask(selectedTask.id, {
                offsetType: opt?.key as any,
                daysOffset: opt?.key === 'on-start' ? 0 : selectedTask.daysOffset || 1,
              })}
            />

            {selectedTask.offsetType !== 'on-start' && (
              <SpinButton
                label="Days"
                value={String(selectedTask.daysOffset || 0)}
                min={0}
                max={90}
                step={1}
                onChange={(_, val) => updateTask(selectedTask.id, { daysOffset: parseInt(val || '0', 10) })}
              />
            )}
          </div>

          {dueDate && startDate && (
            <div style={{
              padding: 12,
              background: '#f3f2f1',
              borderRadius: 6,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Icon iconName="Calendar" style={{ color: themeColor }} />
              <span>
                Due: <strong>{dueDate.toLocaleDateString()}</strong>
                {selectedTask.offsetType === 'before-start' && (
                  <span style={{ color: '#605e5c' }}> ({selectedTask.daysOffset} days before {employeeName || 'employee'} starts)</span>
                )}
                {selectedTask.offsetType === 'on-start' && (
                  <span style={{ color: '#605e5c' }}> (Start date)</span>
                )}
                {selectedTask.offsetType === 'after-start' && (
                  <span style={{ color: '#605e5c' }}> ({selectedTask.daysOffset} days after start)</span>
                )}
              </span>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <SpinButton
              label="Estimated Hours"
              value={String(selectedTask.estimatedHours || 0)}
              min={0}
              max={100}
              step={0.5}
              onChange={(_, val) => updateTask(selectedTask.id, { estimatedHours: parseFloat(val || '0') })}
            />
          </div>
        </div>

        {/* Priority & Approval Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: themeColor,
            textTransform: 'uppercase',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Icon iconName="Flag" style={{ fontSize: 14 }} />
            Priority & Approval
          </div>

          <Dropdown
            label="Priority"
            selectedKey={selectedTask.priority}
            options={PRIORITY_OPTIONS}
            onChange={(_, opt) => updateTask(selectedTask.id, { priority: opt?.key as any })}
            onRenderOption={(opt) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon iconName={opt?.data?.icon} style={{ color: opt?.data?.color, fontSize: 12 }} />
                {opt?.text}
              </div>
            )}
            styles={{ root: { marginBottom: 12 } }}
          />

          <Toggle
            label="Requires Approval"
            checked={selectedTask.requiresApproval}
            onChange={(_, checked) => updateTask(selectedTask.id, { requiresApproval: !!checked })}
            inlineLabel
            styles={{ root: { marginBottom: 12 } }}
          />

          {selectedTask.requiresApproval && context && (
            <div>
              <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 5 }}>Approver</label>
              <PeoplePicker
                context={context as any}
                personSelectionLimit={1}
                showtooltip={true}
                required={false}
                principalTypes={[PrincipalType.User]}
                resolveDelay={300}
                placeholder="Search for an approver..."
                defaultSelectedUsers={selectedTask.approverName ? [selectedTask.approverName] : []}
                onChange={(items) => {
                  if (items && items.length > 0) {
                    updateTask(selectedTask.id, {
                      approverId: items[0].id ? parseInt(items[0].id, 10) : undefined,
                      approverName: items[0].text,
                    });
                  } else {
                    updateTask(selectedTask.id, {
                      approverId: undefined,
                      approverName: undefined,
                    });
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Notifications Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: themeColor,
            textTransform: 'uppercase',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Icon iconName="Ringer" style={{ fontSize: 14 }} />
            Notifications
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Toggle
              label="Send email to assignee"
              checked={selectedTask.notifyAssigneeEmail}
              onChange={(_, checked) => updateTask(selectedTask.id, { notifyAssigneeEmail: !!checked })}
              inlineLabel
            />

            <Toggle
              label="Send Teams chat notification"
              checked={selectedTask.notifyTeamsChat}
              onChange={(_, checked) => updateTask(selectedTask.id, { notifyTeamsChat: !!checked })}
              inlineLabel
            />

            <Toggle
              label="Notify on completion"
              checked={selectedTask.notifyOnComplete}
              onChange={(_, checked) => updateTask(selectedTask.id, { notifyOnComplete: !!checked })}
              inlineLabel
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle
                label="Send reminder"
                checked={selectedTask.sendReminder}
                onChange={(_, checked) => updateTask(selectedTask.id, { sendReminder: !!checked })}
                inlineLabel
              />
              {selectedTask.sendReminder && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <SpinButton
                    value={String(selectedTask.reminderDaysBefore || 1)}
                    min={1}
                    max={14}
                    step={1}
                    onChange={(_, val) => updateTask(selectedTask.id, { reminderDaysBefore: parseInt(val || '1', 10) })}
                    styles={{ root: { width: 70 } }}
                  />
                  <span style={{ fontSize: 12, color: '#605e5c' }}>days before</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions Section */}
        <div>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: themeColor,
            textTransform: 'uppercase',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Icon iconName="TextDocument" style={{ fontSize: 14 }} />
            Instructions
          </div>

          <TextField
            multiline
            rows={3}
            placeholder="Add instructions or notes for the assignee..."
            value={selectedTask.instructions || ''}
            onChange={(_, val) => updateTask(selectedTask.id, { instructions: val })}
          />
        </div>
      </div>
    );
  };

  // Render bulk actions panel
  const renderBulkActions = () => {
    if (!bulkMode || bulkSelectedIds.size === 0) return null;

    return (
      <div style={{
        padding: 16,
        background: '#f3f2f1',
        borderBottom: '1px solid #edebe9',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#323130' }}>
          Bulk Edit ({bulkSelectedIds.size} tasks selected)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Dropdown
            label="Set Priority"
            placeholder="Select..."
            options={PRIORITY_OPTIONS}
            onChange={(_, opt) => bulkUpdateTasks({ priority: opt?.key as any })}
          />

          <Dropdown
            label="Assign to Team"
            placeholder="Select..."
            options={ROLE_OPTIONS}
            onChange={(_, opt) => bulkUpdateTasks({
              assignmentType: 'role',
              roleAssignment: opt?.key as string
            })}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => bulkUpdateTasks({ notifyAssigneeEmail: true, notifyTeamsChat: true })}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid #8a8886',
              background: '#fff',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <Icon iconName="Mail" style={{ marginRight: 6 }} />
            Enable All Notifications
          </button>

          <button
            onClick={() => bulkUpdateTasks({ requiresApproval: true })}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid #8a8886',
              background: '#fff',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <Icon iconName="CheckboxComposite" style={{ marginRight: 6 }} />
            Require Approval
          </button>
        </div>
      </div>
    );
  };

  // Custom header
  const onRenderHeader = (): JSX.Element => {
    const headerClass = processType === 'mover'
      ? styles.panelHeaderMover
      : processType === 'offboarding'
        ? styles.panelHeaderOffboarding
        : styles.panelHeader;

    return (
      <div className={headerClass}>
        <div className={styles.panelIcon}>
          <Icon iconName="TaskManager" style={{ fontSize: 20, color: '#fff' }} />
        </div>
        <div>
          <div className={styles.panelTitle}>Configure Tasks</div>
          <div className={styles.panelSubtitle}>
            {configuredCount} of {totalSelected} tasks configured
            {employeeName && <span> • {employeeName}</span>}
          </div>
        </div>
      </div>
    );
  };

  // Custom footer
  const onRenderFooter = (): JSX.Element => {
    const btnClass = processType === 'mover'
      ? styles.btnPrimaryMover
      : processType === 'offboarding'
        ? styles.btnPrimaryOffboarding
        : styles.btnPrimary;

    return (
      <div className={styles.panelFooter} style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#605e5c' }}>
          <Icon iconName="CheckMark" style={{ color: '#107c10' }} />
          {configuredCount} configured
          {configuredCount < totalSelected && (
            <span style={{ color: '#d97706' }}>
              ({totalSelected - configuredCount} using defaults)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={styles.btnSecondary} onClick={onDismiss}>Cancel</button>
          <button className={btnClass} onClick={handleConfirm}>
            Confirm Tasks
          </button>
        </div>
      </div>
    );
  };

  return (
    <Panel
      isOpen={isOpen}
      type={PanelType.extraLarge}
      onDismiss={onDismiss}
      hasCloseButton={false}
      isBlocking={true}
      onRenderHeader={onRenderHeader}
      onRenderFooterContent={onRenderFooter}
      isFooterAtBottom={true}
      className={styles.rmPanel}
      styles={{
        content: { padding: 0 },
        scrollableContent: { overflow: 'hidden' },
      }}
    >
      {/* Split Panel Layout */}
      <div style={{ display: 'flex', height: 'calc(100vh - 160px)' }}>
        {/* Left Panel - Task List */}
        <div style={{
          width: 360,
          borderRight: '1px solid #edebe9',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
        }}>
          {/* List Header */}
          <div style={{
            padding: 16,
            borderBottom: '1px solid #edebe9',
            background: '#faf9f8',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#323130' }}>
                Selected Tasks ({totalSelected})
              </div>
              <button
                onClick={() => setBulkMode(!bulkMode)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: bulkMode ? `1px solid ${themeColor}` : '1px solid #8a8886',
                  background: bulkMode ? themeColor : '#fff',
                  color: bulkMode ? '#fff' : '#323130',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <Icon iconName="CheckboxCompositeReversed" style={{ marginRight: 4 }} />
                Bulk Edit
              </button>
            </div>

            <SearchBox
              placeholder="Filter tasks..."
              value={searchFilter}
              onChange={(_, val) => setSearchFilter(val || '')}
              styles={{ root: { marginBottom: 12 } }}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setCategoryFilter('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 12,
                  border: categoryFilter === 'all' ? `1px solid ${themeColor}` : '1px solid #e1dfdd',
                  background: categoryFilter === 'all' ? themeColor : '#fff',
                  color: categoryFilter === 'all' ? '#fff' : '#605e5c',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              {categories.map(cat => {
                const style = CATEGORY_COLORS[cat] || CATEGORY_COLORS.General;
                const isActive = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 12,
                      border: isActive ? `1px solid ${style.border}` : '1px solid #e1dfdd',
                      background: isActive ? style.bg : '#fff',
                      color: isActive ? style.text : '#605e5c',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {bulkMode && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button
                  onClick={selectAllFiltered}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: '1px solid #8a8886',
                    background: '#fff',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Select All ({filteredTasks.length})
                </button>
                <button
                  onClick={clearBulkSelection}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: '1px solid #8a8886',
                    background: '#fff',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {renderBulkActions()}

          {/* Task List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredTasks.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#8a8886' }}>
                <Icon iconName="FilterSolid" style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontSize: 13 }}>No tasks match your filter</div>
              </div>
            ) : (
              filteredTasks.map(task => renderTaskItem(task))
            )}
          </div>
        </div>

        {/* Right Panel - Task Configuration */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
          {renderTaskDetail()}
        </div>
      </div>
    </Panel>
  );
};

export default TaskConfigurationPanel;
