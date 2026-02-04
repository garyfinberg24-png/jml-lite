import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { OnboardingService } from '../services/OnboardingService';
import { MoverService } from '../services/MoverService';
import { OffboardingService } from '../services/OffboardingService';
import { OnboardingStatus } from '../models/IOnboarding';
import { MoverStatus } from '../models/IMover';
import { OffboardingStatus } from '../models/IOffboarding';

interface IProps {
  sp: SPFI;
  onNavigate: (view: string) => void;
}

// JML theme colors
const JOINER_COLOR = '#005BAA';
const JOINER_LIGHT = '#e6f0f8';
const MOVER_COLOR = '#ea580c';
const MOVER_LIGHT = '#fef3ed';
const LEAVER_COLOR = '#d13438';
const LEAVER_LIGHT = '#fbeaea';
const SUCCESS_COLOR = '#107c10';

interface IDashboardMetrics {
  activeOnboardings: number;
  pendingTransfers: number;
  activeOffboardings: number;
  thisMonthJoiners: number;
  overdueTasks: number;
  completedThisWeek: number;
  totalActive: number;
}

interface IActivityItem {
  type: 'joiner' | 'mover' | 'leaver';
  name: string;
  status: string;
  date: Date;
}

export const JMLDashboard: React.FC<IProps> = ({ sp, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<IDashboardMetrics>({
    activeOnboardings: 0,
    pendingTransfers: 0,
    activeOffboardings: 0,
    thisMonthJoiners: 0,
    overdueTasks: 0,
    completedThisWeek: 0,
    totalActive: 0,
  });
  const [recentActivity, setRecentActivity] = useState<IActivityItem[]>([]);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const onboardingSvc = new OnboardingService(sp);
      const moverSvc = new MoverService(sp);
      const offboardingSvc = new OffboardingService(sp);

      const [onboardings, movers, offboardings] = await Promise.all([
        onboardingSvc.getOnboardings(),
        moverSvc.getMovers(),
        offboardingSvc.getOffboardings(),
      ]);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const activeOnboardings = onboardings.filter(o =>
        o.Status === OnboardingStatus.InProgress || o.Status === OnboardingStatus.NotStarted
      ).length;

      const pendingTransfers = movers.filter(m =>
        m.Status === MoverStatus.NotStarted || m.Status === MoverStatus.InProgress
      ).length;

      const activeOffboardings = offboardings.filter(o =>
        o.Status === OffboardingStatus.InProgress || o.Status === OffboardingStatus.NotStarted
      ).length;

      const thisMonthJoiners = onboardings.filter(o =>
        o.StartDate && o.StartDate >= thisMonthStart
      ).length;

      const completedThisWeek =
        onboardings.filter(o => o.Status === OnboardingStatus.Completed && o.Modified && o.Modified >= weekAgo).length +
        movers.filter(m => m.Status === MoverStatus.Completed && m.Modified && m.Modified >= weekAgo).length +
        offboardings.filter(o => o.Status === OffboardingStatus.Completed && o.Modified && o.Modified >= weekAgo).length;

      setMetrics({
        activeOnboardings,
        pendingTransfers,
        activeOffboardings,
        thisMonthJoiners,
        overdueTasks: 0,
        completedThisWeek,
        totalActive: activeOnboardings + pendingTransfers + activeOffboardings,
      });

      // Build recent activity
      const activity: IActivityItem[] = [];

      onboardings.slice(0, 5).forEach(o => {
        activity.push({
          type: 'joiner',
          name: o.CandidateName || 'Unknown',
          status: o.Status || 'Unknown',
          date: o.Created || new Date(),
        });
      });

      movers.slice(0, 3).forEach(m => {
        activity.push({
          type: 'mover',
          name: m.EmployeeName || 'Unknown',
          status: m.Status || 'Unknown',
          date: m.Created || new Date(),
        });
      });

      offboardings.slice(0, 3).forEach(o => {
        activity.push({
          type: 'leaver',
          name: o.EmployeeName || 'Unknown',
          status: o.Status || 'Unknown',
          date: o.Created || new Date(),
        });
      });

      activity.sort((a, b) => b.date.getTime() - a.date.getTime());
      setRecentActivity(activity.slice(0, 6));

    } catch (err) {
      console.error('[JMLDashboard] Error loading data:', err);
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const formatRelativeDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getActivityIcon = (type: 'joiner' | 'mover' | 'leaver'): string => {
    switch (type) {
      case 'joiner': return 'AddFriend';
      case 'mover': return 'Sync';
      case 'leaver': return 'UserRemove';
    }
  };

  const getActivityColors = (type: 'joiner' | 'mover' | 'leaver'): { bg: string; color: string } => {
    switch (type) {
      case 'joiner': return { bg: JOINER_LIGHT, color: JOINER_COLOR };
      case 'mover': return { bg: MOVER_LIGHT, color: MOVER_COLOR };
      case 'leaver': return { bg: LEAVER_LIGHT, color: LEAVER_COLOR };
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spinner size={SpinnerSize.large} label="Loading dashboard..." />
      </div>
    );
  }

  // Hero card styles with hover effect
  const getHeroCardStyle = (cardType: string, themeColor: string): React.CSSProperties => ({
    background: 'white',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: hoveredCard === cardType
      ? '0 12px 40px rgba(0,0,0,0.12)'
      : '0 4px 20px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transform: hoveredCard === cardType ? 'translateY(-4px)' : 'none',
    borderTop: `4px solid ${themeColor}`,
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Intro Section */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        border: '1px solid #e2e8f0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: JOINER_COLOR,
            color: 'white',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '16px',
          }}>
            <Icon iconName="People" styles={{ root: { fontSize: '14px' } }} />
            Employee Lifecycle Management
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: '12px',
            marginTop: 0,
          }}>
            Welcome to JML Lite
          </h2>

          {/* Description */}
          <p style={{
            fontSize: '15px',
            lineHeight: 1.7,
            color: '#4a5568',
            marginBottom: '20px',
            marginTop: 0,
          }}>
            JML (Joiner, Mover, Leaver) is your complete employee lifecycle management solution.
            Streamline onboarding for new hires, manage internal transfers seamlessly, and ensure
            compliant offboarding processes. Track tasks, documents, and approvals all in one place.
          </p>

          {/* Feature Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'white',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#4a5568',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <Icon iconName="CheckMark" styles={{ root: { color: JOINER_COLOR } }} />
              Automated Task Management
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'white',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#4a5568',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <Icon iconName="DocumentSet" styles={{ root: { color: MOVER_COLOR } }} />
              Document Tracking
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'white',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#4a5568',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <Icon iconName="Calendar" styles={{ root: { color: LEAVER_COLOR } }} />
              Timeline Management
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'white',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#4a5568',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <Icon iconName="Shield" styles={{ root: { color: SUCCESS_COLOR } }} />
              Compliance Ready
            </span>
          </div>
        </div>
      </div>

      {/* Hero Action Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        marginBottom: '32px',
      }}>
        {/* Onboarding Card */}
        <div
          style={getHeroCardStyle('joiner', JOINER_COLOR)}
          onMouseEnter={() => setHoveredCard('joiner')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => onNavigate('onboarding')}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            background: JOINER_LIGHT,
          }}>
            <Icon iconName="AddFriend" styles={{ root: { fontSize: '28px', color: JOINER_COLOR } }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#1a1a1a', marginTop: 0 }}>
            Onboarding
          </h3>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, marginBottom: '16px', marginTop: 0, minHeight: '42px' }}>
            Welcome new employees with a structured onboarding experience
          </p>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: JOINER_COLOR,
              color: 'white',
              transition: 'all 0.2s',
            }}
            onClick={(e) => { e.stopPropagation(); onNavigate('onboarding-wizard'); }}
          >
            <Icon iconName="Add" styles={{ root: { fontSize: '16px' } }} />
            Start Onboarding
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            paddingTop: '16px',
            marginTop: '16px',
            borderTop: '1px solid #f0f0f0',
          }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: JOINER_COLOR }}>
              {metrics.activeOnboardings}
            </span>
            <span style={{ fontSize: '13px', color: '#888' }}>Active onboardings</span>
          </div>
        </div>

        {/* Transfers Card */}
        <div
          style={getHeroCardStyle('mover', MOVER_COLOR)}
          onMouseEnter={() => setHoveredCard('mover')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => onNavigate('mover')}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            background: MOVER_LIGHT,
          }}>
            <Icon iconName="Sync" styles={{ root: { fontSize: '28px', color: MOVER_COLOR } }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#1a1a1a', marginTop: 0 }}>
            Transfers
          </h3>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, marginBottom: '16px', marginTop: 0, minHeight: '42px' }}>
            Manage internal moves, promotions, and department changes
          </p>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: MOVER_COLOR,
              color: 'white',
              transition: 'all 0.2s',
            }}
            onClick={(e) => { e.stopPropagation(); onNavigate('mover-wizard'); }}
          >
            <Icon iconName="Add" styles={{ root: { fontSize: '16px' } }} />
            Start Transfer
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            paddingTop: '16px',
            marginTop: '16px',
            borderTop: '1px solid #f0f0f0',
          }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: MOVER_COLOR }}>
              {metrics.pendingTransfers}
            </span>
            <span style={{ fontSize: '13px', color: '#888' }}>Pending transfers</span>
          </div>
        </div>

        {/* Offboarding Card */}
        <div
          style={getHeroCardStyle('leaver', LEAVER_COLOR)}
          onMouseEnter={() => setHoveredCard('leaver')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => onNavigate('offboarding')}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            background: LEAVER_LIGHT,
          }}>
            <Icon iconName="UserRemove" styles={{ root: { fontSize: '28px', color: LEAVER_COLOR } }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#1a1a1a', marginTop: 0 }}>
            Offboarding
          </h3>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, marginBottom: '16px', marginTop: 0, minHeight: '42px' }}>
            Ensure smooth departures with complete exit processes
          </p>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: LEAVER_COLOR,
              color: 'white',
              transition: 'all 0.2s',
            }}
            onClick={(e) => { e.stopPropagation(); onNavigate('offboarding-wizard'); }}
          >
            <Icon iconName="Add" styles={{ root: { fontSize: '16px' } }} />
            Start Offboarding
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            paddingTop: '16px',
            marginTop: '16px',
            borderTop: '1px solid #f0f0f0',
          }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: LEAVER_COLOR }}>
              {metrics.activeOffboardings}
            </span>
            <span style={{ fontSize: '13px', color: '#888' }}>Active offboardings</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>This Month's Joiners</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: JOINER_COLOR }}>{metrics.thisMonthJoiners}</div>
          <div style={{ fontSize: '12px', color: SUCCESS_COLOR, marginTop: '4px' }}>New employees</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Completed This Week</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: SUCCESS_COLOR }}>{metrics.completedThisWeek}</div>
          <div style={{ fontSize: '12px', color: SUCCESS_COLOR, marginTop: '4px' }}>On track</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Total Active Processes</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: JOINER_COLOR }}>{metrics.totalActive}</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Across all workflows</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Overdue Tasks</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: metrics.overdueTasks > 0 ? LEAVER_COLOR : SUCCESS_COLOR }}>
            {metrics.overdueTasks}
          </div>
          <div style={{ fontSize: '12px', color: metrics.overdueTasks > 0 ? LEAVER_COLOR : SUCCESS_COLOR, marginTop: '4px' }}>
            {metrics.overdueTasks > 0 ? 'Requires attention' : 'All on track'}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Recent Activity */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1a1a1a', marginTop: 0 }}>
            Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>No recent activity</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentActivity.map((activity, index) => {
                const colors = getActivityColors(activity.type);
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#f9f9f9',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: colors.bg,
                    }}>
                      <Icon
                        iconName={getActivityIcon(activity.type)}
                        styles={{ root: { fontSize: '18px', color: colors.color } }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '14px', color: '#1a1a1a' }}>{activity.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} - {activity.status}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>
                      {formatRelativeDate(activity.date)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1a1a1a', marginTop: 0 }}>
            Quick Links
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onNavigate('jmlreporting'); }}
              style={{
                color: JOINER_COLOR,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                background: JOINER_LIGHT,
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              <Icon iconName="ReportDocument" styles={{ root: { fontSize: '18px' } }} />
              View Reports
            </a>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onNavigate('search'); }}
              style={{
                color: '#4a5568',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                background: '#f5f5f5',
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              <Icon iconName="Search" styles={{ root: { fontSize: '18px' } }} />
              Search Employees
            </a>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onNavigate('myonboarding'); }}
              style={{
                color: '#4a5568',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                background: '#f5f5f5',
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              <Icon iconName="Contact" styles={{ root: { fontSize: '18px' } }} />
              My Onboarding
            </a>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onNavigate('approvals'); }}
              style={{
                color: '#4a5568',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                background: '#f5f5f5',
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              <Icon iconName="CheckList" styles={{ root: { fontSize: '18px' } }} />
              Approvals
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JMLDashboard;
