// Task Reminders Admin Component — Run overdue task checks and view reminder stats
// Part of JML Lite Admin Center

import * as React from 'react';
import { useState, useEffect } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { TaskReminderService, ITaskWithReminder, IReminderResult } from '../services/TaskReminderService';
import { WebPartContext } from '@microsoft/sp-webpart-base';

interface IProps {
  sp: SPFI;
  context?: WebPartContext;
}

interface ITaskStats {
  overdue: number;
  dueToday: number;
  dueSoon: number;
  total: number;
}

export const TaskRemindersAdmin: React.FC<IProps> = ({ sp, context }) => {
  const [reminderService] = useState(() => new TaskReminderService(sp, context));
  const [loading, setLoading] = useState(true);
  const [runningOverdue, setRunningOverdue] = useState(false);
  const [runningDueToday, setRunningDueToday] = useState(false);
  const [stats, setStats] = useState<ITaskStats | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<ITaskWithReminder[]>([]);
  const [dueTodayTasks, setDueTodayTasks] = useState<ITaskWithReminder[]>([]);
  const [lastResults, setLastResults] = useState<IReminderResult[] | null>(null);
  const [message, setMessage] = useState<{ type: MessageBarType; text: string } | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async (): Promise<void> => {
    setLoading(true);
    try {
      const [taskStats, overdueList, dueTodayList] = await Promise.all([
        reminderService.getTaskStats(),
        reminderService.getOverdueTasks(),
        reminderService.getTasksDueToday(),
      ]);
      setStats(taskStats);
      setOverdueTasks(overdueList);
      setDueTodayTasks(dueTodayList);
    } catch (error) {
      console.error('[TaskRemindersAdmin] Error loading stats:', error);
      setMessage({ type: MessageBarType.error, text: 'Failed to load task statistics' });
    } finally {
      setLoading(false);
    }
  };

  const handleRunOverdueReminders = async (): Promise<void> => {
    setRunningOverdue(true);
    setMessage(null);
    setLastResults(null);

    try {
      const results = await reminderService.sendOverdueReminders();
      setLastResults(results);

      const successCount = results.filter(r => r.sent).length;
      const failCount = results.filter(r => !r.sent).length;

      if (results.length === 0) {
        setMessage({ type: MessageBarType.info, text: 'No overdue tasks found to send reminders for.' });
      } else if (failCount === 0) {
        setMessage({ type: MessageBarType.success, text: `Successfully sent ${successCount} overdue task reminders to Teams.` });
      } else {
        setMessage({ type: MessageBarType.warning, text: `Sent ${successCount} reminders. ${failCount} failed.` });
      }

      // Refresh stats
      await loadStats();
    } catch (error) {
      console.error('[TaskRemindersAdmin] Error sending overdue reminders:', error);
      setMessage({ type: MessageBarType.error, text: 'Failed to send overdue reminders. Check console for details.' });
    } finally {
      setRunningOverdue(false);
    }
  };

  const handleRunDueTodayReminders = async (): Promise<void> => {
    setRunningDueToday(true);
    setMessage(null);
    setLastResults(null);

    try {
      const results = await reminderService.sendDueTodayReminders();
      setLastResults(results);

      const successCount = results.filter(r => r.sent).length;
      const failCount = results.filter(r => !r.sent).length;

      if (results.length === 0) {
        setMessage({ type: MessageBarType.info, text: 'No tasks due today to send reminders for.' });
      } else if (failCount === 0) {
        setMessage({ type: MessageBarType.success, text: `Successfully sent ${successCount} "due today" reminders to Teams.` });
      } else {
        setMessage({ type: MessageBarType.warning, text: `Sent ${successCount} reminders. ${failCount} failed.` });
      }

      // Refresh stats
      await loadStats();
    } catch (error) {
      console.error('[TaskRemindersAdmin] Error sending due today reminders:', error);
      setMessage({ type: MessageBarType.error, text: 'Failed to send due today reminders. Check console for details.' });
    } finally {
      setRunningDueToday(false);
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'Onboarding': return '#005BAA';
      case 'Mover': return '#ea580c';
      case 'Offboarding': return '#d13438';
      default: return '#6264a7';
    }
  };

  const formatDaysOverdue = (dueDate: Date): string => {
    const now = new Date();
    const due = new Date(dueDate);
    const days = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day overdue';
    if (days > 0) return `${days} days overdue`;
    if (days === -1) return 'Due tomorrow';
    return `Due in ${Math.abs(days)} days`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
        <Spinner size={SpinnerSize.large} label="Loading task statistics..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #d83b01 0%, #a52828 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon iconName="Clock" style={{ fontSize: '24px', color: '#ffffff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0', color: '#1a1a1a' }}>
              Task Reminders
            </h3>
            <p style={{ color: '#605e5c', fontSize: '13px', margin: 0 }}>
              Monitor overdue tasks and send reminder notifications to Teams channels
            </p>
          </div>
          <DefaultButton
            text="Refresh"
            iconProps={{ iconName: 'Refresh' }}
            onClick={loadStats}
            disabled={loading}
          />
        </div>

        {message && (
          <MessageBar
            messageBarType={message.type}
            onDismiss={() => setMessage(null)}
            dismissButtonAriaLabel="Close"
            styles={{ root: { marginBottom: '16px' } }}
          >
            {message.text}
          </MessageBar>
        )}

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div style={{
            padding: '20px',
            background: '#fef2f2',
            borderRadius: '8px',
            textAlign: 'center',
            borderLeft: '4px solid #d13438',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#d13438' }}>{stats?.overdue || 0}</div>
            <div style={{ fontSize: '13px', color: '#991b1b', fontWeight: 500 }}>Overdue</div>
          </div>
          <div style={{
            padding: '20px',
            background: '#fff7ed',
            borderRadius: '8px',
            textAlign: 'center',
            borderLeft: '4px solid #ea580c',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#ea580c' }}>{stats?.dueToday || 0}</div>
            <div style={{ fontSize: '13px', color: '#9a3412', fontWeight: 500 }}>Due Today</div>
          </div>
          <div style={{
            padding: '20px',
            background: '#fffbeb',
            borderRadius: '8px',
            textAlign: 'center',
            borderLeft: '4px solid #d97706',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#d97706' }}>{stats?.dueSoon || 0}</div>
            <div style={{ fontSize: '13px', color: '#92400e', fontWeight: 500 }}>Due Within 3 Days</div>
          </div>
          <div style={{
            padding: '20px',
            background: '#f0f7ff',
            borderRadius: '8px',
            textAlign: 'center',
            borderLeft: '4px solid #005BAA',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#005BAA' }}>{stats?.total || 0}</div>
            <div style={{ fontSize: '13px', color: '#1e40af', fontWeight: 500 }}>Total Active</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a' }}>
          Send Reminder Notifications
        </h4>
        <div style={{ display: 'flex', gap: '16px' }}>
          <PrimaryButton
            text={runningOverdue ? 'Sending...' : `Send Overdue Reminders (${stats?.overdue || 0})`}
            iconProps={{ iconName: 'Clock' }}
            onClick={handleRunOverdueReminders}
            disabled={runningOverdue || runningDueToday || (stats?.overdue || 0) === 0}
            styles={{
              root: {
                background: 'linear-gradient(135deg, #d13438 0%, #a52828 100%)',
                border: 'none',
              },
              rootHovered: {
                background: '#a52828',
              },
            }}
          />
          <DefaultButton
            text={runningDueToday ? 'Sending...' : `Send Due Today Reminders (${stats?.dueToday || 0})`}
            iconProps={{ iconName: 'Calendar' }}
            onClick={handleRunDueTodayReminders}
            disabled={runningOverdue || runningDueToday || (stats?.dueToday || 0) === 0}
          />
        </div>
        <p style={{ fontSize: '12px', color: '#605e5c', marginTop: '12px', marginBottom: 0 }}>
          Reminders are sent to configured Teams webhook channels. Configure webhooks in the Notifications settings.
        </p>
      </div>

      {/* Last Results */}
      {lastResults && lastResults.length > 0 && (
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a' }}>
            Last Reminder Run Results
          </h4>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {lastResults.map((result, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  background: result.sent ? '#dcfce7' : '#fef2f2',
                  borderRadius: '6px',
                  marginBottom: '8px',
                }}
              >
                <Icon
                  iconName={result.sent ? 'CheckMark' : 'Error'}
                  style={{ color: result.sent ? '#10b981' : '#ef4444' }}
                />
                <span style={{ flex: 1, fontSize: '13px' }}>{result.taskTitle}</span>
                {!result.sent && result.error && (
                  <span style={{ fontSize: '12px', color: '#dc2626' }}>{result.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Tasks List */}
      {overdueTasks.length > 0 && (
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon iconName="Warning" style={{ color: '#d13438' }} />
            Overdue Tasks ({overdueTasks.length})
          </h4>
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {overdueTasks.map((task, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: '#f9f9f9',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  borderLeft: `3px solid ${getCategoryColor(task.category)}`,
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: `${getCategoryColor(task.category)}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon
                    iconName={task.category === 'Onboarding' ? 'AddFriend' : task.category === 'Mover' ? 'Sync' : 'UserRemove'}
                    style={{ fontSize: '14px', color: getCategoryColor(task.category) }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '13px', color: '#1a1a1a' }}>{task.taskTitle}</div>
                  <div style={{ fontSize: '12px', color: '#605e5c' }}>
                    {task.employeeName} • {task.category}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#d13438', fontWeight: 500 }}>
                    {formatDaysOverdue(task.dueDate)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8a8886' }}>
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Due Today Tasks List */}
      {dueTodayTasks.length > 0 && (
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon iconName="Calendar" style={{ color: '#ea580c' }} />
            Due Today ({dueTodayTasks.length})
          </h4>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {dueTodayTasks.map((task, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: '#f9f9f9',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  borderLeft: `3px solid ${getCategoryColor(task.category)}`,
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: `${getCategoryColor(task.category)}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon
                    iconName={task.category === 'Onboarding' ? 'AddFriend' : task.category === 'Mover' ? 'Sync' : 'UserRemove'}
                    style={{ fontSize: '14px', color: getCategoryColor(task.category) }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '13px', color: '#1a1a1a' }}>{task.taskTitle}</div>
                  <div style={{ fontSize: '12px', color: '#605e5c' }}>
                    {task.employeeName} • {task.category}
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  background: '#fff7ed',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#ea580c',
                }}>
                  Due Today
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {overdueTasks.length === 0 && dueTodayTasks.length === 0 && (
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <Icon iconName="CheckMark" style={{ fontSize: '48px', color: '#10b981', marginBottom: '16px' }} />
          <h4 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0', color: '#1a1a1a' }}>
            All caught up!
          </h4>
          <p style={{ color: '#605e5c', fontSize: '14px', margin: 0 }}>
            No overdue or due-today tasks. Great job keeping on track!
          </p>
        </div>
      )}

      {/* Info Box */}
      <div style={{ background: '#f3f2f1', borderRadius: '8px', padding: '16px' }}>
        <div style={{ fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon iconName="Info" style={{ color: '#0078d4' }} />
          About Task Reminders
        </div>
        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: '#323130', lineHeight: '1.6' }}>
          <li>Reminders are sent via <strong>Teams webhooks</strong> to configured channels</li>
          <li>Ensure webhooks are configured in the <strong>Notifications</strong> settings</li>
          <li>Overdue reminders are sent for tasks past their due date</li>
          <li>Due today reminders help assignees stay on track</li>
          <li>Consider running reminders daily as part of your workflow</li>
        </ul>
      </div>
    </div>
  );
};

export default TaskRemindersAdmin;
