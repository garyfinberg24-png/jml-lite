import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/site-users';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { OnboardingService } from '../services/OnboardingService';
import { IOnboarding, IOnboardingTask, OnboardingTaskStatus, OnboardingStatus, OnboardingTaskCategory } from '../models/IOnboarding';

interface IProps {
  sp: SPFI;
}

// DWx Customer Blue theme
const PRIMARY_COLOR = '#005BAA';
const PRIMARY_DARK = '#004A8F';
const SUCCESS_COLOR = '#10b981';
const WARNING_COLOR = '#f59e0b';
const DANGER_COLOR = '#dc2626';

// Category colors for task badges
const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  'Documentation': { bg: '#dbeafe', color: '#1d4ed8' },
  'System Access': { bg: '#f3e8ff', color: '#7c3aed' },
  'Equipment': { bg: '#dcfce7', color: '#166534' },
  'Training': { bg: '#fef3c7', color: '#b45309' },
  'Orientation': { bg: '#ffe4e6', color: '#be123c' },
  'Compliance': { bg: '#e0e7ff', color: '#3730a3' },
  'Other': { bg: '#f1f5f9', color: '#475569' },
};

type ViewMode = 'board' | 'list' | 'calendar';
type TaskColumn = 'todo' | 'inprogress' | 'review' | 'done';

// Sample data for Sipho Dlamini
const SAMPLE_ONBOARDING: IOnboarding = {
  Id: 1,
  Title: 'Sipho Dlamini Onboarding',
  CandidateId: 1,
  CandidateName: 'Sipho Dlamini',
  JobTitle: 'Software Developer',
  Department: 'Engineering',
  StartDate: new Date('2026-02-03'),
  DueDate: new Date('2026-02-17'),
  Status: OnboardingStatus.InProgress,
  CompletionPercentage: 42,
  TotalTasks: 12,
  CompletedTasks: 5,
  Created: new Date('2026-01-27'),
  Modified: new Date(),
};

const SAMPLE_TASKS: IOnboardingTask[] = [
  // Completed tasks
  { Id: 1, Title: 'Sign Employment Contract', Category: OnboardingTaskCategory.Documentation, Status: OnboardingTaskStatus.Completed, DueDate: new Date('2026-02-03'), CompletedDate: new Date('2026-02-03'), Priority: 'High', OnboardingId: 1, SortOrder: 1 },
  { Id: 2, Title: 'Collect ID Badge', Category: OnboardingTaskCategory.Equipment, Status: OnboardingTaskStatus.Completed, DueDate: new Date('2026-02-03'), CompletedDate: new Date('2026-02-03'), Priority: 'High', OnboardingId: 1, SortOrder: 2 },
  { Id: 3, Title: 'Complete IT Security Training', Category: OnboardingTaskCategory.Training, Status: OnboardingTaskStatus.Completed, DueDate: new Date('2026-02-04'), CompletedDate: new Date('2026-02-04'), Priority: 'High', OnboardingId: 1, SortOrder: 3 },
  { Id: 4, Title: 'Setup Laptop', Category: OnboardingTaskCategory.Equipment, Status: OnboardingTaskStatus.Completed, DueDate: new Date('2026-02-04'), CompletedDate: new Date('2026-02-04'), Priority: 'High', OnboardingId: 1, SortOrder: 4 },
  { Id: 5, Title: 'Configure Email', Category: OnboardingTaskCategory.SystemAccess, Status: OnboardingTaskStatus.Completed, DueDate: new Date('2026-02-04'), CompletedDate: new Date('2026-02-04'), Priority: 'Medium', OnboardingId: 1, SortOrder: 5 },
  // In Progress
  { Id: 6, Title: 'Complete Code Review Guidelines Training', Category: OnboardingTaskCategory.Training, Status: OnboardingTaskStatus.InProgress, DueDate: new Date('2026-02-07'), Priority: 'Medium', OnboardingId: 1, SortOrder: 6 },
  { Id: 7, Title: 'Setup Development Environment', Category: OnboardingTaskCategory.Equipment, Status: OnboardingTaskStatus.InProgress, DueDate: new Date('2026-02-05'), Priority: 'High', OnboardingId: 1, SortOrder: 7 },
  // Awaiting Approval (Blocked)
  { Id: 8, Title: 'Request GitHub Access', Category: OnboardingTaskCategory.SystemAccess, Status: OnboardingTaskStatus.Blocked, DueDate: new Date('2026-02-06'), Priority: 'High', OnboardingId: 1, SortOrder: 8 },
  // Pending (To Do)
  { Id: 9, Title: 'Product Overview Session', Category: OnboardingTaskCategory.Training, Status: OnboardingTaskStatus.Pending, DueDate: new Date('2026-02-10'), Priority: 'Medium', OnboardingId: 1, SortOrder: 9 },
  { Id: 10, Title: 'Schedule 1:1 with Manager', Category: OnboardingTaskCategory.Orientation, Status: OnboardingTaskStatus.Pending, DueDate: new Date('2026-02-07'), Priority: 'Medium', OnboardingId: 1, SortOrder: 10 },
  { Id: 11, Title: 'Meet Product Team', Category: OnboardingTaskCategory.Orientation, Status: OnboardingTaskStatus.Pending, DueDate: new Date('2026-02-14'), Priority: 'Low', OnboardingId: 1, SortOrder: 11 },
  { Id: 12, Title: 'Read Company Policies', Category: OnboardingTaskCategory.Compliance, Status: OnboardingTaskStatus.Pending, DueDate: new Date('2026-02-12'), Priority: 'Medium', OnboardingId: 1, SortOrder: 12 },
];

export const OnboardingBuddy: React.FC<IProps> = ({ sp }) => {
  const [loading, setLoading] = useState(true);
  const [myOnboarding, setMyOnboarding] = useState<IOnboarding | null>(null);
  const [tasks, setTasks] = useState<IOnboardingTask[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [useSampleData, setUseSampleData] = useState(false);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const user = await sp.web.currentUser();
      setCurrentUserId(user.Id);
      setCurrentUserName(user.Title || 'User');
      return user.Id;
    } catch (error) {
      console.error('[OnboardingBuddy] Error getting current user:', error);
      return null;
    }
  }, [sp]);

  const loadMyOnboarding = useCallback(async (userId: number) => {
    setLoading(true);
    try {
      const svc = new OnboardingService(sp);
      const allOnboardings = await svc.getOnboardings();

      const myRecord = allOnboardings.find(o =>
        o.CandidateId === userId || o.AssignedToId === userId
      );

      if (myRecord && myRecord.Id) {
        setMyOnboarding(myRecord);
        const onboardingTasks = await svc.getOnboardingTasks(myRecord.Id);
        setTasks(onboardingTasks);
        setUseSampleData(false);
      } else {
        // Use sample data for Sipho if no real data found
        setMyOnboarding(SAMPLE_ONBOARDING);
        setTasks(SAMPLE_TASKS);
        setUseSampleData(true);
      }
    } catch (error) {
      console.error('[OnboardingBuddy] Error loading onboarding:', error);
      // Fallback to sample data on error
      setMyOnboarding(SAMPLE_ONBOARDING);
      setTasks(SAMPLE_TASKS);
      setUseSampleData(true);
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => {
    loadCurrentUser().then(userId => {
      if (userId) {
        loadMyOnboarding(userId);
      } else {
        // Use sample data if user can't be loaded
        setMyOnboarding(SAMPLE_ONBOARDING);
        setTasks(SAMPLE_TASKS);
        setUseSampleData(true);
        setLoading(false);
      }
    });
  }, [loadCurrentUser, loadMyOnboarding]);

  const handleTaskStatusChange = async (taskId: number, newStatus: OnboardingTaskStatus): Promise<void> => {
    if (useSampleData) {
      // Update sample data locally
      setTasks(prev => prev.map(t =>
        t.Id === taskId ? {
          ...t,
          Status: newStatus,
          CompletedDate: newStatus === OnboardingTaskStatus.Completed ? new Date() : undefined,
        } : t
      ));
      return;
    }

    try {
      const svc = new OnboardingService(sp);
      const updateData: Partial<IOnboardingTask> = { Status: newStatus };

      if (newStatus === OnboardingTaskStatus.Completed) {
        updateData.CompletedDate = new Date();
        updateData.CompletedById = currentUserId || undefined;
      }

      await svc.updateOnboardingTask(taskId, updateData);

      setTasks(prev => prev.map(t =>
        t.Id === taskId ? { ...t, ...updateData } : t
      ));

      if (myOnboarding?.Id) {
        await svc.recalculateProgress(myOnboarding.Id);
        const updated = await svc.getOnboardingById(myOnboarding.Id);
        if (updated) {
          setMyOnboarding(updated);
        }
      }
    } catch (error) {
      console.error('[OnboardingBuddy] Error updating task:', error);
    }
  };

  // Organize tasks by column
  const tasksByColumn = useMemo(() => {
    const columns: Record<TaskColumn, IOnboardingTask[]> = {
      todo: [],
      inprogress: [],
      review: [],
      done: [],
    };

    tasks.forEach(task => {
      switch (task.Status) {
        case OnboardingTaskStatus.Completed:
          columns.done.push(task);
          break;
        case OnboardingTaskStatus.InProgress:
          columns.inprogress.push(task);
          break;
        case OnboardingTaskStatus.Blocked:
          columns.review.push(task);
          break;
        default:
          columns.todo.push(task);
      }
    });

    return columns;
  }, [tasks]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.Status === OnboardingTaskStatus.Completed).length;
    const inProgress = tasks.filter(t => t.Status === OnboardingTaskStatus.InProgress).length;
    const overdue = tasks.filter(t =>
      t.DueDate && new Date(t.DueDate) < new Date() &&
      t.Status !== OnboardingTaskStatus.Completed &&
      t.Status !== OnboardingTaskStatus.NotApplicable
    ).length;

    return { total, completed, inProgress, overdue };
  }, [tasks]);

  const getDaysRemaining = (): number => {
    if (!myOnboarding?.DueDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(myOnboarding.DueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const formatFullDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const isTaskOverdue = (task: IOnboardingTask): boolean => {
    return !!(task.DueDate && new Date(task.DueDate) < new Date() &&
      task.Status !== OnboardingTaskStatus.Completed &&
      task.Status !== OnboardingTaskStatus.NotApplicable);
  };

  const isTaskDueToday = (task: IOnboardingTask): boolean => {
    if (!task.DueDate) return false;
    const today = new Date();
    const due = new Date(task.DueDate);
    return today.toDateString() === due.toDateString();
  };

  const getCategoryStyle = (category: string): { bg: string; color: string } => {
    return CATEGORY_STYLES[category] || CATEGORY_STYLES['Other'];
  };

  const getUserInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case OnboardingTaskStatus.Completed: return SUCCESS_COLOR;
      case OnboardingTaskStatus.InProgress: return PRIMARY_COLOR;
      case OnboardingTaskStatus.Blocked: return WARNING_COLOR;
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '400px', background: '#f8fafc',
      }}>
        <Spinner size={SpinnerSize.large} label="Loading your onboarding..." />
      </div>
    );
  }

  if (!myOnboarding) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '400px', background: '#f8fafc',
      }}>
        <div style={{
          textAlign: 'center', maxWidth: 400, padding: 40,
          background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Icon iconName="CheckMark" style={{ fontSize: 32, color: SUCCESS_COLOR }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            No Active Onboarding
          </h2>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            You don't have any active onboarding tasks. Contact HR if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const daysRemaining = getDaysRemaining();

  // Task card component for board view
  const renderTaskCard = (task: IOnboardingTask, isCompleted: boolean = false): JSX.Element => {
    const overdue = isTaskOverdue(task);
    const dueToday = isTaskDueToday(task);
    const catStyle = getCategoryStyle(task.Category || 'Other');

    return (
      <div
        key={task.Id}
        style={{
          background: overdue ? '#fef2f2' : '#f8fafc',
          border: `1px solid ${overdue ? '#fecaca' : '#e2e8f0'}`,
          borderRadius: '6px',
          padding: '10px 12px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          opacity: isCompleted ? 0.65 : 1,
        }}
        onClick={() => {
          if (!isCompleted && task.Id) {
            handleTaskStatusChange(task.Id, OnboardingTaskStatus.InProgress);
          }
        }}
      >
        <span style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          padding: '2px 5px',
          borderRadius: '3px',
          marginBottom: '6px',
          display: 'inline-block',
          fontWeight: 500,
          background: catStyle.bg,
          color: catStyle.color,
        }}>
          {task.Category || 'Other'}
        </span>
        <div style={{
          fontWeight: 500,
          color: isCompleted ? '#64748b' : '#1e293b',
          fontSize: '12px',
          lineHeight: 1.4,
          marginBottom: '8px',
        }}>
          {task.Title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '10px',
            color: overdue ? DANGER_COLOR : dueToday ? WARNING_COLOR : '#64748b',
            fontWeight: overdue || dueToday ? 500 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}>
            {isCompleted ? '✓' : dueToday ? '⚡' : '📅'} {task.DueDate ? formatDate(task.DueDate) : 'No date'}
          </span>
          {task.Priority === 'High' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: DANGER_COLOR }} />}
          {task.Priority === 'Medium' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: WARNING_COLOR }} />}
          {task.Priority === 'Low' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: SUCCESS_COLOR }} />}
        </div>
      </div>
    );
  };

  // Column component for board view
  const renderColumn = (
    title: string,
    icon: string,
    columnTasks: IOnboardingTask[],
    headerColor: string,
    iconBg: string,
    columnKey: TaskColumn
  ): JSX.Element => (
    <div style={{
      background: '#fff',
      borderRadius: '10px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid #e2e8f0',
        borderTop: `3px solid ${headerColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '5px',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
        }}>
          {icon}
        </div>
        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px', flex: 1 }}>{title}</span>
        <span style={{
          background: '#f1f5f9',
          padding: '2px 7px',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#64748b',
          fontWeight: 500,
        }}>
          {columnTasks.length}
        </span>
      </div>
      <div style={{
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: '150px',
        maxHeight: '400px',
        overflowY: 'auto',
      }}>
        {columnTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px', opacity: 0.5 }}>📭</div>
            <div style={{ fontSize: '11px' }}>No tasks here</div>
          </div>
        ) : (
          <>
            {columnTasks.slice(0, columnKey === 'done' ? 4 : undefined).map(task =>
              renderTaskCard(task, columnKey === 'done')
            )}
            {columnKey === 'done' && columnTasks.length > 4 && (
              <div style={{
                textAlign: 'center',
                padding: '8px',
                color: PRIMARY_COLOR,
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                + {columnTasks.length - 4} more completed tasks
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // List view component
  const renderListView = (): JSX.Element => {
    const sortedTasks = [...tasks].sort((a, b) => {
      // Sort by status priority (pending/in progress first), then by due date
      const statusOrder = { [OnboardingTaskStatus.InProgress]: 0, [OnboardingTaskStatus.Pending]: 1, [OnboardingTaskStatus.Blocked]: 2, [OnboardingTaskStatus.Completed]: 3 };
      const statusDiff = (statusOrder[a.Status as keyof typeof statusOrder] || 4) - (statusOrder[b.Status as keyof typeof statusOrder] || 4);
      if (statusDiff !== 0) return statusDiff;
      if (a.DueDate && b.DueDate) return new Date(a.DueDate).getTime() - new Date(b.DueDate).getTime();
      return 0;
    });

    return (
      <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Task</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Due Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Priority</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map(task => {
              const overdue = isTaskOverdue(task);
              const catStyle = getCategoryStyle(task.Category || 'Other');
              const isCompleted = task.Status === OnboardingTaskStatus.Completed;

              return (
                <tr key={task.Id} style={{
                  borderBottom: '1px solid #f1f5f9',
                  background: overdue ? '#fef2f2' : 'transparent',
                  opacity: isCompleted ? 0.7 : 1,
                }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: isCompleted ? '#94a3b8' : '#1e293b' }}>
                    {task.Title}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: catStyle.bg,
                      color: catStyle.color,
                      fontWeight: 500,
                    }}>
                      {task.Category}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: `${getStatusColor(task.Status)}15`,
                      color: getStatusColor(task.Status),
                      fontWeight: 500,
                    }}>
                      {task.Status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: overdue ? DANGER_COLOR : '#64748b', fontWeight: overdue ? 500 : 400 }}>
                    {task.DueDate ? formatFullDate(task.DueDate) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: task.Priority === 'High' ? DANGER_COLOR : task.Priority === 'Medium' ? WARNING_COLOR : SUCCESS_COLOR,
                      display: 'inline-block', marginRight: 6,
                    }} />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{task.Priority}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {!isCompleted && task.Id && (
                      <button
                        onClick={() => handleTaskStatusChange(task.Id!, OnboardingTaskStatus.Completed)}
                        style={{
                          padding: '5px 12px',
                          fontSize: '11px',
                          background: SUCCESS_COLOR,
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Complete
                      </button>
                    )}
                    {isCompleted && (
                      <Icon iconName="CheckMark" style={{ color: SUCCESS_COLOR, fontSize: '16px' }} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Calendar view component
  const renderCalendarView = (): JSX.Element => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startDayOfWeek = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();

    // Group tasks by date
    const tasksByDate: Record<string, IOnboardingTask[]> = {};
    tasks.forEach(task => {
      if (task.DueDate) {
        const dateKey = new Date(task.DueDate).toDateString();
        if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
        tasksByDate[dateKey].push(task);
      }
    });

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    // Add empty cells for days before the start of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill in remaining days of the last week
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* Calendar Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
            {monthNames[today.getMonth()]} {today.getFullYear()}
          </h3>
        </div>

        {/* Day names header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e2e8f0' }}>
          {dayNames.map(day => (
            <div key={day} style={{
              padding: '10px',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
            }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: weekIndex < weeks.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
            {week.map((day, dayIndex) => {
              if (day === null) {
                return <div key={dayIndex} style={{ padding: '8px', minHeight: '80px', background: '#fafafa' }} />;
              }

              const cellDate = new Date(today.getFullYear(), today.getMonth(), day);
              const dateKey = cellDate.toDateString();
              const dayTasks = tasksByDate[dateKey] || [];
              const isToday = today.toDateString() === dateKey;

              return (
                <div key={dayIndex} style={{
                  padding: '8px',
                  minHeight: '80px',
                  borderLeft: dayIndex > 0 ? '1px solid #f1f5f9' : 'none',
                  background: isToday ? '#f0f9ff' : 'transparent',
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? PRIMARY_COLOR : '#64748b',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isToday ? '24px' : 'auto',
                    height: isToday ? '24px' : 'auto',
                    borderRadius: '50%',
                    background: isToday ? PRIMARY_COLOR : 'transparent',
                  }}>
                    <span style={{ color: isToday ? '#fff' : 'inherit' }}>{day}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayTasks.slice(0, 2).map(task => {
                      const catStyle = getCategoryStyle(task.Category || 'Other');
                      const isCompleted = task.Status === OnboardingTaskStatus.Completed;
                      return (
                        <div key={task.Id} style={{
                          fontSize: '10px',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          background: isCompleted ? '#f1f5f9' : catStyle.bg,
                          color: isCompleted ? '#94a3b8' : catStyle.color,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                        }}>
                          {task.Title}
                        </div>
                      );
                    })}
                    {dayTasks.length > 2 && (
                      <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'center' }}>
                        +{dayTasks.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ background: '#f8fafc' }}>
      {/* Page Header Block */}
      <div style={{
        background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, ${PRIMARY_DARK} 100%)`,
        color: '#fff',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
        borderRadius: '8px',
      }}>
        {/* Left: User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 600,
          }}>
            {getUserInitials(myOnboarding.CandidateName || currentUserName)}
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
              Welcome, {(myOnboarding.CandidateName || currentUserName).split(' ')[0]}!
            </h1>
            <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
              {myOnboarding.JobTitle} • {myOnboarding.Department || 'Your Team'}
            </p>
          </div>
        </div>

        {/* Center: Progress */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(255,255,255,0.15)',
          padding: '10px 16px',
          borderRadius: '8px',
        }}>
          <div style={{ position: 'relative', width: '40px', height: '40px' }}>
            <svg viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
              <circle
                cx="20" cy="20" r="16"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="4"
              />
              <circle
                cx="20" cy="20" r="16"
                fill="none"
                stroke="#34d399"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="100"
                strokeDashoffset={100 - progressPercent}
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '10px',
              fontWeight: 700,
            }}>
              {progressPercent}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{stats.completed}/{stats.total}</div>
            <div style={{ fontSize: '11px', opacity: 0.85 }}>tasks completed</div>
          </div>
        </div>

        {/* Right: Date/Time */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          padding: '10px 16px',
          borderRadius: '8px',
          textAlign: 'right',
        }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '2px' }}>
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '20px 24px 24px' }}>
        {/* Board Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              Your Onboarding Tasks
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : 'Due today'}
              {myOnboarding.DueDate && ` until ${formatDate(myOnboarding.DueDate)}`}
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: '4px',
            background: '#fff',
            padding: '3px',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            {(['board', 'list', 'calendar'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  background: viewMode === mode ? PRIMARY_COLOR : 'transparent',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: viewMode === mode ? '#fff' : '#64748b',
                  cursor: 'pointer',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* View Content */}
        {viewMode === 'board' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            alignItems: 'flex-start',
          }}>
            {renderColumn('To Do', '📋', tasksByColumn.todo, '#64748b', '#f1f5f9', 'todo')}
            {renderColumn('In Progress', '🔄', tasksByColumn.inprogress, PRIMARY_COLOR, '#dbeafe', 'inprogress')}
            {renderColumn('Awaiting Approval', '👀', tasksByColumn.review, WARNING_COLOR, '#fef3c7', 'review')}
            {renderColumn('Completed', '✅', tasksByColumn.done, SUCCESS_COLOR, '#dcfce7', 'done')}
          </div>
        )}

        {viewMode === 'list' && renderListView()}

        {viewMode === 'calendar' && renderCalendarView()}

        {/* Stats Footer */}
        <div style={{
          marginTop: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: PRIMARY_COLOR }}>{stats.total}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Total Tasks</div>
          </div>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: SUCCESS_COLOR }}>{stats.completed}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Completed</div>
          </div>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: WARNING_COLOR }}>{stats.inProgress}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>In Progress</div>
          </div>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: stats.overdue > 0 ? DANGER_COLOR : '#64748b' }}>{stats.overdue}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Overdue</div>
          </div>
        </div>
      </div>
    </div>
  );
};
