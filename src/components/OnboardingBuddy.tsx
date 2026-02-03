import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/site-users';
import { Icon } from '@fluentui/react/lib/Icon';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import { OnboardingService } from '../services/OnboardingService';
import { IOnboarding, IOnboardingTask, OnboardingTaskStatus } from '../models/IOnboarding';

interface IProps {
  sp: SPFI;
}

// DWx Customer Blue theme
const PRIMARY_COLOR = '#005BAA';
const PRIMARY_DARK = '#004A8F';

const CATEGORY_ICONS: Record<string, string> = {
  'Documentation': 'DocumentSet',
  'System Access': 'Permissions',
  'Equipment': 'Devices2',
  'Training': 'Education',
  'Orientation': 'People',
  'Compliance': 'Shield',
  'Other': 'TaskManager',
};

export const OnboardingBuddy: React.FC<IProps> = ({ sp }) => {
  const [loading, setLoading] = useState(true);
  const [myOnboarding, setMyOnboarding] = useState<IOnboarding | null>(null);
  const [tasks, setTasks] = useState<IOnboardingTask[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const loadCurrentUser = useCallback(async () => {
    try {
      const user = await sp.web.currentUser();
      setCurrentUserId(user.Id);
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

      // Find onboarding where this user is the employee (CandidateId or AssignedToId)
      const myRecord = allOnboardings.find(o =>
        o.CandidateId === userId || o.AssignedToId === userId
      );

      if (myRecord && myRecord.Id) {
        setMyOnboarding(myRecord);
        const onboardingTasks = await svc.getOnboardingTasks(myRecord.Id);
        setTasks(onboardingTasks);
      } else {
        setMyOnboarding(null);
        setTasks([]);
      }
    } catch (error) {
      console.error('[OnboardingBuddy] Error loading onboarding:', error);
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => {
    loadCurrentUser().then(userId => {
      if (userId) {
        loadMyOnboarding(userId);
      } else {
        setLoading(false);
      }
    });
  }, [loadCurrentUser, loadMyOnboarding]);

  const handleTaskComplete = async (taskId: number): Promise<void> => {
    try {
      const svc = new OnboardingService(sp);
      await svc.updateOnboardingTask(taskId, {
        Status: OnboardingTaskStatus.Completed,
        CompletedDate: new Date(),
        CompletedById: currentUserId || undefined,
      });

      // Update local state
      setTasks(prev => prev.map(t =>
        t.Id === taskId
          ? { ...t, Status: OnboardingTaskStatus.Completed, CompletedDate: new Date() }
          : t
      ));

      // Recalculate progress
      if (myOnboarding?.Id) {
        await svc.recalculateProgress(myOnboarding.Id);
        const updated = await svc.getOnboardingById(myOnboarding.Id);
        if (updated) {
          setMyOnboarding(updated);
        }
      }
    } catch (error) {
      console.error('[OnboardingBuddy] Error completing task:', error);
    }
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    const cat = task.Category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {} as Record<string, IOnboardingTask[]>);

  const getDaysRemaining = (): number => {
    if (!myOnboarding?.DueDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(myOnboarding.DueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f9fafb',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, ${PRIMARY_DARK} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Icon iconName="People" style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <div style={{ color: '#605e5c' }}>Loading your onboarding...</div>
        </div>
      </div>
    );
  }

  if (!myOnboarding) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f9fafb',
      }}>
        <div style={{
          textAlign: 'center', maxWidth: 400, padding: 40,
          background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: '#f3f2f1', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Icon iconName="CheckMark" style={{ fontSize: 40, color: '#059669' }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
            No Active Onboarding
          </h2>
          <p style={{ color: '#605e5c', fontSize: 14 }}>
            You don't have any active onboarding tasks at the moment. If you believe this is an error, please contact HR.
          </p>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.Status === OnboardingTaskStatus.Completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) : 0;
  const daysRemaining = getDaysRemaining();

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      {/* Hero Header */}
      <div style={{
        background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, ${PRIMARY_DARK} 100%)`,
        color: '#fff', padding: '32px 24px', borderRadius: '0 0 24px 24px',
        marginBottom: 24,
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon iconName="Emoji2" style={{ fontSize: 32, color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
                Welcome, {myOnboarding.CandidateName?.split(' ')[0]}!
              </h1>
              <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                {myOnboarding.JobTitle} • {myOnboarding.Department || 'Your Team'}
              </p>
            </div>
          </div>

          {/* Progress Card */}
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>Your Onboarding Progress</span>
              <span style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(progressPercent * 100)}%</span>
            </div>
            <ProgressIndicator
              percentComplete={progressPercent}
              barHeight={8}
              styles={{
                progressBar: { background: '#fff' },
                progressTrack: { background: 'rgba(255,255,255,0.3)' }
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, opacity: 0.9 }}>
              <span>{completedCount} of {totalCount} tasks completed</span>
              {daysRemaining > 0 && <span>{daysRemaining} days remaining</span>}
              {daysRemaining < 0 && <span style={{ color: '#fecaca' }}>{Math.abs(daysRemaining)} days overdue</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Task Categories */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 40px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 }}>
          Your Onboarding Tasks
        </h2>

        {Object.entries(groupedTasks).map(([category, categoryTasks]) => {
          const categoryCompleted = categoryTasks.filter(t => t.Status === OnboardingTaskStatus.Completed).length;
          const isExpanded = expandedCategory === category;
          const allComplete = categoryCompleted === categoryTasks.length;

          return (
            <div key={category} style={{
              background: '#fff', borderRadius: 12, marginBottom: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
              border: allComplete ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
            }}>
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                style={{
                  width: '100%', padding: 16, border: 'none', background: 'transparent',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: allComplete ? '#dcfce7' : `${PRIMARY_COLOR}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon
                    iconName={allComplete ? 'CheckMark' : CATEGORY_ICONS[category] || 'TaskManager'}
                    style={{ fontSize: 18, color: allComplete ? '#059669' : PRIMARY_COLOR }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{category}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {categoryCompleted} of {categoryTasks.length} complete
                  </div>
                </div>
                <Icon
                  iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                  style={{ fontSize: 14, color: '#8a8886' }}
                />
              </button>

              {/* Tasks List */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid #e5e7eb' }}>
                  {categoryTasks.map(task => {
                    const isCompleted = task.Status === OnboardingTaskStatus.Completed;
                    return (
                      <div key={task.Id} style={{
                        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                        borderBottom: '1px solid #f3f4f6',
                        background: isCompleted ? '#f0fdf4' : 'transparent',
                      }}>
                        <button
                          onClick={() => !isCompleted && task.Id && handleTaskComplete(task.Id)}
                          disabled={isCompleted}
                          style={{
                            width: 24, height: 24, borderRadius: '50%',
                            border: isCompleted ? 'none' : `2px solid ${PRIMARY_COLOR}`,
                            background: isCompleted ? '#059669' : 'transparent',
                            cursor: isCompleted ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isCompleted && <Icon iconName="CheckMark" style={{ fontSize: 12, color: '#fff' }} />}
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: 500, color: isCompleted ? '#6b7280' : '#1a1a1a',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                          }}>
                            {task.Title}
                          </div>
                          {task.Description && (
                            <div style={{ fontSize: 12, color: '#8a8886', marginTop: 2 }}>
                              {task.Description}
                            </div>
                          )}
                          {task.DueDate && !isCompleted && (
                            <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>
                              Due: {task.DueDate.toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        {task.DocumentUrl && (
                          <a
                            href={task.DocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 12px', borderRadius: 6,
                              background: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR,
                              fontSize: 12, fontWeight: 500, textDecoration: 'none',
                            }}
                          >
                            View
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Help Card */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 20, marginTop: 24,
          border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon iconName="Help" style={{ fontSize: 24, color: '#d97706' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Need Help?</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Contact HR or your manager if you have questions about your onboarding tasks.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
