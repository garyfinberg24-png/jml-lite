// Task Configuration Overlay - JML Lite
// Full-page overlay that replaces the wizard content with task configuration
// Matches wizard dimensions exactly for seamless integration (Option B)

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Icon } from '@fluentui/react/lib/Icon';
import { PeoplePicker, PrincipalType } from '@pnp/spfx-controls-react/lib/PeoplePicker';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import styles from '../styles/JmlWizard.module.scss';

// Re-export from TaskConfigurationPanel for compatibility
export interface IConfigurableTask {
  id: string | number;
  taskCode?: string;
  title: string;
  category: 'Documentation' | 'System Access' | 'Equipment' | 'Training' | 'Orientation' | 'Compliance' | 'General';
  sourceType: 'document' | 'system' | 'asset' | 'training' | 'custom';
  sourceId?: number;
  assigneeId?: number;
  assigneeName?: string;
  assigneeEmail?: string;
  assignmentType: 'specific' | 'role' | 'auto' | 'manager';
  roleAssignment?: string;
  daysOffset: number;
  offsetType: 'before-start' | 'on-start' | 'after-start';
  estimatedHours?: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  requiresApproval: boolean;
  approverRole?: string;
  approverId?: number;
  approverName?: string;
  sendReminder: boolean;
  reminderDaysBefore?: number;
  notifyOnComplete: boolean;
  notifyAssigneeEmail: boolean;
  notifyTeamsChat: boolean;
  instructions?: string;
  isSelected: boolean;
  isConfigured: boolean;
  // Task Dependencies
  dependsOnTaskIds?: (string | number)[];  // Array of task IDs this task depends on
  blockedUntilComplete?: boolean;           // Whether task is blocked until all dependencies complete
}

interface ITaskConfigurationOverlayProps {
  sp: SPFI;
  context?: WebPartContext;
  isOpen: boolean;
  tasks: IConfigurableTask[];
  startDate?: Date;
  employeeName?: string;
  processType: 'onboarding' | 'mover' | 'offboarding';
  onBack: () => void;
  onConfirm: (tasks: IConfigurableTask[]) => void;
}

// Category configuration
const CATEGORY_CONFIG: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  Documentation: { icon: 'DocumentSet', bg: '#e6f4ea', text: '#137333', border: '#34a853' },
  'System Access': { icon: 'Permissions', bg: '#e8f0fe', text: '#1967d2', border: '#4285f4' },
  Equipment: { icon: 'Devices3', bg: '#fef7e0', text: '#b06000', border: '#fbbc04' },
  Training: { icon: 'Education', bg: '#fce8e6', text: '#c5221f', border: '#ea4335' },
  Orientation: { icon: 'People', bg: '#f3e8fd', text: '#7627bb', border: '#a142f4' },
  Compliance: { icon: 'Shield', bg: '#e8eaed', text: '#5f6368', border: '#9aa0a6' },
  General: { icon: 'TaskSolid', bg: '#f1f3f4', text: '#5f6368', border: '#dadce0' },
};

// Task code prefixes by category
const CATEGORY_CODE_PREFIX: Record<string, string> = {
  Documentation: 'DOC',
  'System Access': 'SYS',
  Equipment: 'HRD',
  Training: 'TRN',
  Orientation: 'ORI',
  Compliance: 'CMP',
  General: 'GEN',
};

// Options
const PRIORITY_OPTIONS: IDropdownOption[] = [
  { key: 'Low', text: 'Low' },
  { key: 'Medium', text: 'Medium' },
  { key: 'High', text: 'High' },
  { key: 'Critical', text: 'Critical' },
];

const ASSIGNMENT_OPTIONS: IDropdownOption[] = [
  { key: 'specific', text: 'Specific Person' },
  { key: 'role', text: 'Role/Team' },
  { key: 'manager', text: 'Hiring Manager' },
  { key: 'auto', text: 'Auto-assign' },
];

const ROLE_OPTIONS: IDropdownOption[] = [
  { key: 'IT Team', text: 'IT Team' },
  { key: 'HR Team', text: 'HR Team' },
  { key: 'Facilities', text: 'Facilities' },
  { key: 'Finance', text: 'Finance' },
  { key: 'Security', text: 'Security' },
  { key: 'Training', text: 'Training/L&D' },
  { key: 'Department Head', text: 'Department Head' },
];

const OFFSET_OPTIONS: IDropdownOption[] = [
  { key: 'before-start', text: 'Days before start date' },
  { key: 'on-start', text: 'On start date' },
  { key: 'after-start', text: 'Days after start date' },
];

export const TaskConfigurationOverlay: React.FC<ITaskConfigurationOverlayProps> = ({
  sp,
  context,
  isOpen,
  tasks: initialTasks,
  startDate,
  employeeName,
  processType,
  onBack,
  onConfirm,
}) => {
  const [tasks, setTasks] = useState<IConfigurableTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | number | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string | number>>(new Set());

  // Theme color based on process type
  const themeColor = processType === 'mover' ? '#ea580c' : processType === 'offboarding' ? '#d13438' : '#005BAA';
  const themeDark = processType === 'mover' ? '#c2410c' : processType === 'offboarding' ? '#a52828' : '#004A8F';

  // Initialize tasks with auto-generated task codes
  useEffect(() => {
    if (isOpen && initialTasks.length > 0) {
      // Group by category to generate sequential codes
      const categoryCounters: Record<string, number> = {};

      const configured = initialTasks.map(t => {
        // Generate task code if not present
        let taskCode = t.taskCode;
        if (!taskCode) {
          const prefix = CATEGORY_CODE_PREFIX[t.category] || 'GEN';
          categoryCounters[t.category] = (categoryCounters[t.category] || 0) + 1;
          const num = String(categoryCounters[t.category]);
          taskCode = `${prefix}-${'000'.slice(0, Math.max(0, 3 - num.length))}${num}`;
        }

        return {
          ...t,
          taskCode,
          isSelected: true,
          isConfigured: t.isConfigured || false,
          assignmentType: t.assignmentType || 'role',
          priority: t.priority || 'Medium',
          daysOffset: t.daysOffset ?? 0,
          offsetType: t.offsetType || 'on-start',
          requiresApproval: t.requiresApproval || false,
          sendReminder: t.sendReminder ?? true,
          reminderDaysBefore: t.reminderDaysBefore || 1,
          notifyOnComplete: t.notifyOnComplete ?? true,
          notifyAssigneeEmail: t.notifyAssigneeEmail ?? true,
          notifyTeamsChat: t.notifyTeamsChat ?? false,
        };
      });

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

  // Get selected task
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Get unique categories
  const categories = Array.from(new Set(tasks.filter(t => t.isSelected).map(t => t.category)));

  // Count by category
  const categoryCounts = tasks.reduce((acc, t) => {
    if (t.isSelected) {
      acc[t.category] = (acc[t.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Update a task
  const updateTask = useCallback((taskId: string | number, updates: Partial<IConfigurableTask>) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, ...updates, isConfigured: true } : t
    ));
  }, []);

  // Bulk update
  const bulkUpdateTasks = useCallback((updates: Partial<IConfigurableTask>) => {
    setTasks(prev => prev.map(t =>
      bulkSelectedIds.has(t.id) ? { ...t, ...updates, isConfigured: true } : t
    ));
  }, [bulkSelectedIds]);

  // Toggle bulk selection
  const toggleBulkSelect = (taskId: string | number) => {
    setBulkSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Select all filtered
  const selectAllFiltered = () => setBulkSelectedIds(new Set(filteredTasks.map(t => t.id)));
  const clearBulkSelection = () => setBulkSelectedIds(new Set());

  // Check if adding a dependency would create a circular reference
  // Uses depth-first search to detect cycles
  const wouldCreateCircularDependency = (
    taskId: string | number,
    potentialDepId: string | number,
    allTasks: IConfigurableTask[]
  ): boolean => {
    // If the potential dependency already depends on this task (directly or transitively), it would be circular
    const visited = new Set<string | number>();
    const stack = [potentialDepId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (currentId === taskId) {
        return true; // Found a cycle - the potential dep leads back to this task
      }
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentTask = allTasks.find(t => t.id === currentId);
      if (currentTask?.dependsOnTaskIds) {
        for (const depId of currentTask.dependsOnTaskIds) {
          if (!visited.has(depId)) {
            stack.push(depId);
          }
        }
      }
    }
    return false;
  };

  // Get all tasks that depend on a given task (for visual indicators)
  const getDependentTasks = (taskId: string | number): IConfigurableTask[] => {
    return tasks.filter(t => t.dependsOnTaskIds?.includes(taskId));
  };

  // Check if a task has dependencies configured
  const hasDependencies = (task: IConfigurableTask): boolean => {
    return !!(task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0);
  };

  // Calculate due date
  const calculateDueDate = (task: IConfigurableTask): Date | null => {
    if (!startDate) return null;
    const date = new Date(startDate);
    if (task.offsetType === 'before-start') {
      date.setDate(date.getDate() - Math.abs(task.daysOffset));
    } else if (task.offsetType === 'after-start') {
      date.setDate(date.getDate() + Math.abs(task.daysOffset));
    }
    return date;
  };

  // Handle confirm
  const handleConfirm = () => {
    const configuredTasks = tasks.filter(t => t.isSelected);
    onConfirm(configuredTasks);
  };

  // Counts
  const configuredCount = tasks.filter(t => t.isSelected && t.isConfigured).length;
  const totalSelected = tasks.filter(t => t.isSelected).length;

  if (!isOpen) return null;

  return (
    <div className={styles.taskConfigOverlay}>
      {/* ═══════════════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR - Task Summary (replaces wizard steps)
          ═══════════════════════════════════════════════════════════════════════════════ */}
      <div className={styles.taskConfigSidebar} style={{ background: `linear-gradient(180deg, ${themeDark} 0%, ${themeColor} 100%)` }}>
        {/* Back Button */}
        <div className={styles.taskConfigSidebarHeader}>
          <button className={styles.taskConfigBackBtn} onClick={onBack}>
            <Icon iconName="ChevronLeft" style={{ fontSize: 12, marginRight: 6 }} />
            Back to Wizard
          </button>
          <h3 className={styles.taskConfigSidebarTitle}>Configure Tasks</h3>
          <p className={styles.taskConfigSidebarSubtitle}>{employeeName} • {processType === 'onboarding' ? 'Onboarding' : processType === 'mover' ? 'Transfer' : 'Offboarding'}</p>
        </div>

        {/* Task Summary */}
        <div className={styles.taskConfigSummary}>
          <div className={styles.taskConfigSummaryTotal}>
            <div className={styles.taskConfigSummaryNumber}>{totalSelected}</div>
            <div className={styles.taskConfigSummaryLabel}>Total Tasks</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className={styles.taskConfigCategories}>
          <div className={styles.taskConfigCategoriesTitle}>By Category</div>
          {Object.entries(categoryCounts).map(([cat, count]) => {
            const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.General;
            return (
              <div key={cat} className={styles.taskConfigCategoryItem}>
                <span>
                  <Icon iconName={config.icon} style={{ fontSize: 12, marginRight: 8 }} />
                  {cat}
                </span>
                <span className={styles.taskConfigCategoryCount}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className={styles.taskConfigProgress}>
          <div className={styles.taskConfigProgressLabel}>Progress</div>
          <div className={styles.taskConfigProgressBar}>
            <div
              className={styles.taskConfigProgressFill}
              style={{ width: `${totalSelected > 0 ? (configuredCount / totalSelected) * 100 : 0}%` }}
            />
          </div>
          <div className={styles.taskConfigProgressText}>{configuredCount} of {totalSelected} configured</div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════
          CENTER AREA - Task List & Configuration
          ═══════════════════════════════════════════════════════════════════════════════ */}
      <div className={styles.taskConfigCenter}>
        {/* Header */}
        <div className={styles.taskConfigHeader}>
          <div className={styles.taskConfigHeaderLeft}>
            <h2 className={styles.taskConfigTitle}>Configure Tasks</h2>
            <p className={styles.taskConfigSubtitle}>Assign owners, set due dates, and customize notifications</p>
          </div>
          <div className={styles.taskConfigHeaderRight}>
            <div className={styles.taskConfigFilterChips}>
              <button
                className={`${styles.taskConfigChip} ${categoryFilter === 'all' ? styles.taskConfigChipActive : ''}`}
                onClick={() => setCategoryFilter('all')}
                style={categoryFilter === 'all' ? { background: themeColor, borderColor: themeColor } : {}}
              >
                All
              </button>
              {categories.map(cat => {
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.General;
                const isActive = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    className={`${styles.taskConfigChip} ${isActive ? styles.taskConfigChipActive : ''}`}
                    onClick={() => setCategoryFilter(cat)}
                    style={isActive ? { background: config.bg, color: config.text, borderColor: config.border } : {}}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Split Content */}
        <div className={styles.taskConfigContent}>
          {/* Task List Panel */}
          <div className={styles.taskConfigListPanel}>
            <div className={styles.taskConfigListHeader}>
              <SearchBox
                placeholder="Filter tasks..."
                value={searchFilter}
                onChange={(_, val) => setSearchFilter(val || '')}
                styles={{ root: { width: '100%' } }}
              />
              <div className={styles.taskConfigListActions}>
                <button
                  className={`${styles.taskConfigBulkBtn} ${bulkMode ? styles.taskConfigBulkBtnActive : ''}`}
                  onClick={() => setBulkMode(!bulkMode)}
                  style={bulkMode ? { background: themeColor, color: 'white', borderColor: themeColor } : {}}
                >
                  <Icon iconName="CheckboxCompositeReversed" style={{ fontSize: 12, marginRight: 4 }} />
                  Bulk Edit
                </button>
              </div>
            </div>

            {bulkMode && bulkSelectedIds.size > 0 && (
              <div className={styles.taskConfigBulkActions}>
                <div className={styles.taskConfigBulkCount}>{bulkSelectedIds.size} selected</div>
                <Dropdown
                  placeholder="Set Priority..."
                  options={PRIORITY_OPTIONS}
                  onChange={(_, opt) => bulkUpdateTasks({ priority: opt?.key as any })}
                  styles={{ root: { width: 120 } }}
                />
                <Dropdown
                  placeholder="Assign Team..."
                  options={ROLE_OPTIONS}
                  onChange={(_, opt) => bulkUpdateTasks({ assignmentType: 'role', roleAssignment: opt?.key as string })}
                  styles={{ root: { width: 120 } }}
                />
              </div>
            )}

            {bulkMode && (
              <div className={styles.taskConfigBulkSelect}>
                <button onClick={selectAllFiltered}>Select All ({filteredTasks.length})</button>
                <button onClick={clearBulkSelection}>Clear</button>
              </div>
            )}

            <div className={styles.taskConfigList}>
              {filteredTasks.length === 0 ? (
                <div className={styles.taskConfigListEmpty}>
                  <Icon iconName="FilterSolid" style={{ fontSize: 32, opacity: 0.5, marginBottom: 12 }} />
                  <div>No tasks match your filter</div>
                </div>
              ) : (
                filteredTasks.map(task => {
                  const isSelected = task.id === selectedTaskId;
                  const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.General;

                  return (
                    <div
                      key={task.id}
                      className={`${styles.taskConfigItem} ${isSelected && !bulkMode ? styles.taskConfigItemSelected : ''}`}
                      onClick={() => !bulkMode && setSelectedTaskId(task.id)}
                      style={isSelected && !bulkMode ? { borderLeftColor: themeColor } : {}}
                    >
                      {bulkMode && (
                        <Checkbox
                          checked={bulkSelectedIds.has(task.id)}
                          onChange={() => toggleBulkSelect(task.id)}
                          styles={{ root: { marginRight: 8 } }}
                        />
                      )}
                      <div className={styles.taskConfigItemContent}>
                        <div className={styles.taskConfigItemTitle}>
                          {task.taskCode && (
                            <span className={styles.taskConfigTaskCode}>{task.taskCode}</span>
                          )}
                          <span className={styles.taskConfigItemName}>{task.title}</span>
                          {task.isConfigured && (
                            <Icon iconName="CheckMark" style={{ fontSize: 12, color: '#10b981' }} />
                          )}
                        </div>
                        <div className={styles.taskConfigItemMeta}>
                          <span
                            className={styles.taskConfigCategoryBadge}
                            style={{ background: config.bg, color: config.text, borderColor: config.border }}
                          >
                            {task.category}
                          </span>
                          {task.roleAssignment && (
                            <span className={styles.taskConfigItemAssignment}>
                              <Icon iconName="Group" style={{ fontSize: 10, marginRight: 4 }} />
                              {task.roleAssignment}
                            </span>
                          )}
                          {task.daysOffset !== 0 && (
                            <span className={styles.taskConfigItemTiming}>
                              {task.offsetType === 'before-start' ? `-${task.daysOffset}` : `+${task.daysOffset}`} days
                            </span>
                          )}
                          {/* Dependency indicators */}
                          {hasDependencies(task) && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                padding: '2px 6px',
                                background: '#fff4e5',
                                color: '#b06000',
                                borderRadius: 4,
                                fontSize: 10,
                              }}
                              title={`Depends on ${task.dependsOnTaskIds!.length} task(s)`}
                            >
                              <Icon iconName="BranchMerge" style={{ fontSize: 10 }} />
                              {task.dependsOnTaskIds!.length}
                            </span>
                          )}
                          {getDependentTasks(task.id).length > 0 && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                padding: '2px 6px',
                                background: '#e6f4ea',
                                color: '#137333',
                                borderRadius: 4,
                                fontSize: 10,
                              }}
                              title={`${getDependentTasks(task.id).length} task(s) depend on this`}
                            >
                              <Icon iconName="DependencyAdd" style={{ fontSize: 10 }} />
                              {getDependentTasks(task.id).length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Task Configuration Panel */}
          <div className={styles.taskConfigDetailPanel}>
            {!selectedTask ? (
              <div className={styles.taskConfigDetailEmpty}>
                <Icon iconName="TaskManager" style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }} />
                <div>Select a task to configure its properties</div>
              </div>
            ) : (
              <div className={styles.taskConfigDetail}>
                {/* Task Header */}
                <div className={styles.taskConfigDetailHeader}>
                  <div
                    className={styles.taskConfigDetailIcon}
                    style={{
                      background: CATEGORY_CONFIG[selectedTask.category]?.bg || '#f1f3f4',
                      borderColor: CATEGORY_CONFIG[selectedTask.category]?.border || '#dadce0'
                    }}
                  >
                    <Icon
                      iconName={CATEGORY_CONFIG[selectedTask.category]?.icon || 'TaskSolid'}
                      style={{ fontSize: 20, color: CATEGORY_CONFIG[selectedTask.category]?.text || '#5f6368' }}
                    />
                  </div>
                  <div className={styles.taskConfigDetailInfo}>
                    <div className={styles.taskConfigDetailTitle}>
                      {selectedTask.taskCode && (
                        <span className={styles.taskConfigTaskCode} style={{ fontSize: 11 }}>{selectedTask.taskCode}</span>
                      )}
                      {selectedTask.title}
                    </div>
                    <span
                      className={styles.taskConfigCategoryBadge}
                      style={{
                        background: CATEGORY_CONFIG[selectedTask.category]?.bg,
                        color: CATEGORY_CONFIG[selectedTask.category]?.text,
                        borderColor: CATEGORY_CONFIG[selectedTask.category]?.border
                      }}
                    >
                      {selectedTask.category}
                    </span>
                  </div>
                </div>

                {/* Assignment Section */}
                <div className={styles.taskConfigSection}>
                  <div className={styles.taskConfigSectionHeader} style={{ color: themeColor }}>
                    <Icon iconName="Contact" style={{ fontSize: 14 }} />
                    Assignment
                  </div>
                  <div className={styles.taskConfigFormRow}>
                    <Dropdown
                      label="Assignment Type"
                      selectedKey={selectedTask.assignmentType}
                      options={ASSIGNMENT_OPTIONS}
                      onChange={(_, opt) => updateTask(selectedTask.id, { assignmentType: opt?.key as any })}
                    />
                    {selectedTask.assignmentType === 'role' && (
                      <Dropdown
                        label="Assign to Team/Role"
                        selectedKey={selectedTask.roleAssignment}
                        options={ROLE_OPTIONS}
                        onChange={(_, opt) => updateTask(selectedTask.id, { roleAssignment: opt?.key as string })}
                      />
                    )}
                  </div>
                  {selectedTask.assignmentType === 'specific' && context && (
                    <div style={{ marginTop: 12 }}>
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
                            updateTask(selectedTask.id, { assigneeId: undefined, assigneeName: undefined, assigneeEmail: undefined });
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Timing Section */}
                <div className={styles.taskConfigSection}>
                  <div className={styles.taskConfigSectionHeader} style={{ color: themeColor }}>
                    <Icon iconName="Clock" style={{ fontSize: 14 }} />
                    Timing & Duration
                  </div>
                  <div className={styles.taskConfigFormRow}>
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
                  {startDate && (
                    <div className={styles.taskConfigDueDate}>
                      <Icon iconName="Calendar" style={{ color: themeColor }} />
                      <span>
                        Due: <strong>{calculateDueDate(selectedTask)?.toLocaleDateString()}</strong>
                        {selectedTask.offsetType === 'before-start' && (
                          <span className={styles.taskConfigDueDateNote}> ({selectedTask.daysOffset} days before {employeeName} starts)</span>
                        )}
                        {selectedTask.offsetType === 'on-start' && (
                          <span className={styles.taskConfigDueDateNote}> (Start date)</span>
                        )}
                        {selectedTask.offsetType === 'after-start' && (
                          <span className={styles.taskConfigDueDateNote}> ({selectedTask.daysOffset} days after start)</span>
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

                {/* Priority & Approval */}
                <div className={styles.taskConfigSection}>
                  <div className={styles.taskConfigSectionHeader} style={{ color: themeColor }}>
                    <Icon iconName="Flag" style={{ fontSize: 14 }} />
                    Priority & Approval
                  </div>
                  <Dropdown
                    label="Priority"
                    selectedKey={selectedTask.priority}
                    options={PRIORITY_OPTIONS}
                    onChange={(_, opt) => updateTask(selectedTask.id, { priority: opt?.key as any })}
                    styles={{ root: { marginBottom: 12 } }}
                  />
                  <Toggle
                    label="Requires Approval"
                    checked={selectedTask.requiresApproval}
                    onChange={(_, checked) => updateTask(selectedTask.id, { requiresApproval: !!checked })}
                    inlineLabel
                  />
                </div>

                {/* Dependencies */}
                <div className={styles.taskConfigSection}>
                  <div className={styles.taskConfigSectionHeader} style={{ color: themeColor }}>
                    <Icon iconName="BranchMerge" style={{ fontSize: 14 }} />
                    Dependencies
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Dropdown
                      label="This task depends on"
                      placeholder="Select prerequisite tasks..."
                      multiSelect
                      selectedKeys={(selectedTask.dependsOnTaskIds || []) as string[]}
                      options={tasks
                        .filter(t => t.id !== selectedTask.id && t.isSelected)
                        .map(t => ({
                          key: t.id,
                          text: `${t.taskCode ? `[${t.taskCode}] ` : ''}${t.title}`,
                          disabled: wouldCreateCircularDependency(selectedTask.id, t.id, tasks),
                        }))}
                      onChange={(_, option) => {
                        if (!option) return;
                        const currentDeps = selectedTask.dependsOnTaskIds || [];
                        let newDeps: (string | number)[];
                        if (option.selected) {
                          // Check for circular dependency before adding
                          if (!wouldCreateCircularDependency(selectedTask.id, option.key as string | number, tasks)) {
                            newDeps = [...currentDeps, option.key as string | number];
                          } else {
                            return; // Don't add - would create circular dependency
                          }
                        } else {
                          newDeps = currentDeps.filter(id => id !== option.key);
                        }
                        updateTask(selectedTask.id, { dependsOnTaskIds: newDeps });
                      }}
                    />
                    {selectedTask.dependsOnTaskIds && selectedTask.dependsOnTaskIds.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 12, color: '#605e5c', marginBottom: 6 }}>Prerequisites:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {selectedTask.dependsOnTaskIds.map(depId => {
                            const depTask = tasks.find(t => t.id === depId);
                            if (!depTask) return null;
                            const config = CATEGORY_CONFIG[depTask.category] || CATEGORY_CONFIG.General;
                            return (
                              <div
                                key={depId}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '4px 8px',
                                  background: config.bg,
                                  borderRadius: 4,
                                  fontSize: 11,
                                  color: config.text,
                                  border: `1px solid ${config.border}`,
                                }}
                              >
                                <Icon iconName="StatusCircleCheckmark" style={{ fontSize: 10 }} />
                                <span>{depTask.taskCode || depTask.title.substring(0, 20)}</span>
                                <button
                                  onClick={() => {
                                    const newDeps = (selectedTask.dependsOnTaskIds || []).filter(id => id !== depId);
                                    updateTask(selectedTask.id, { dependsOnTaskIds: newDeps });
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    marginLeft: 2,
                                    color: config.text,
                                  }}
                                >
                                  <Icon iconName="Cancel" style={{ fontSize: 10 }} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <Toggle
                    label="Block until dependencies complete"
                    checked={selectedTask.blockedUntilComplete ?? true}
                    onChange={(_, checked) => updateTask(selectedTask.id, { blockedUntilComplete: !!checked })}
                    inlineLabel
                    disabled={!selectedTask.dependsOnTaskIds || selectedTask.dependsOnTaskIds.length === 0}
                  />
                  {selectedTask.dependsOnTaskIds && selectedTask.dependsOnTaskIds.length > 0 && selectedTask.blockedUntilComplete && (
                    <div style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      background: '#fff4e5',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#b06000',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <Icon iconName="Warning" style={{ fontSize: 14 }} />
                      <span>This task will be blocked until all {selectedTask.dependsOnTaskIds.length} prerequisite task(s) are completed.</span>
                    </div>
                  )}
                </div>

                {/* Notifications */}
                <div className={styles.taskConfigSection}>
                  <div className={styles.taskConfigSectionHeader} style={{ color: themeColor }}>
                    <Icon iconName="Ringer" style={{ fontSize: 14 }} />
                    Notifications
                  </div>
                  <div className={styles.taskConfigToggles}>
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
                  </div>
                </div>

                {/* Instructions */}
                <div className={styles.taskConfigSection}>
                  <div className={styles.taskConfigSectionHeader} style={{ color: themeColor }}>
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
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.taskConfigFooter}>
          <div className={styles.taskConfigFooterLeft}>
            <Icon iconName="CheckMark" style={{ color: '#10b981', marginRight: 8 }} />
            <span>{configuredCount} configured</span>
            {configuredCount < totalSelected && (
              <span className={styles.taskConfigFooterDefaults}>
                ({totalSelected - configuredCount} using defaults)
              </span>
            )}
          </div>
          <div className={styles.taskConfigFooterRight}>
            <button className={styles.taskConfigBtnSecondary} onClick={onBack}>Cancel</button>
            <button
              className={styles.taskConfigBtnPrimary}
              onClick={handleConfirm}
              style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeDark} 100%)` }}
            >
              Confirm Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskConfigurationOverlay;
