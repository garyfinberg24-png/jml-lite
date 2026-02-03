import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
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
const JOINER_COLOR = '#005BAA';   // Blue
const MOVER_COLOR = '#ea580c';    // Orange
const LEAVER_COLOR = '#d13438';   // Red
const SUCCESS_COLOR = '#107c10';  // Green

interface IDashboardMetrics {
  activeOnboardings: number;
  pendingTransfers: number;
  activeOffboardings: number;
  thisMonthJoiners: number;
  overdueTasks: number;
  completedThisWeek: number;
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
  });
  const [recentActivity, setRecentActivity] = useState<Array<{
    type: 'joiner' | 'mover' | 'leaver';
    name: string;
    status: string;
    date: Date;
  }>>([]);

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

      // Calculate metrics
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

      // Count completions this week
      const completedThisWeek =
        onboardings.filter(o => o.Status === OnboardingStatus.Completed && o.Modified && o.Modified >= weekAgo).length +
        movers.filter(m => m.Status === MoverStatus.Completed && m.Modified && m.Modified >= weekAgo).length +
        offboardings.filter(o => o.Status === OffboardingStatus.Completed && o.Modified && o.Modified >= weekAgo).length;

      setMetrics({
        activeOnboardings,
        pendingTransfers,
        activeOffboardings,
        thisMonthJoiners,
        overdueTasks: 0, // Would need task-level data
        completedThisWeek,
      });

      // Build recent activity
      const activity: Array<{ type: 'joiner' | 'mover' | 'leaver'; name: string; status: string; date: Date }> = [];

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

      // Sort by date descending
      activity.sort((a, b) => b.date.getTime() - a.date.getTime());
      setRecentActivity(activity.slice(0, 10));

    } catch (err) {
      console.error('[JMLDashboard] Error loading data:', err);
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getActivityIcon = (type: 'joiner' | 'mover' | 'leaver'): string => {
    switch (type) {
      case 'joiner': return 'AddFriend';
      case 'mover': return 'Sync';
      case 'leaver': return 'UserRemove';
      default: return 'Contact';
    }
  };

  const getActivityColor = (type: 'joiner' | 'mover' | 'leaver'): string => {
    switch (type) {
      case 'joiner': return JOINER_COLOR;
      case 'mover': return MOVER_COLOR;
      case 'leaver': return LEAVER_COLOR;
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spinner size={SpinnerSize.large} label="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#1a1a1a' }}>
          JML Dashboard
        </h1>
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: '14px' }}>
          Employee Lifecycle Management Overview
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <PrimaryButton
          iconProps={{ iconName: 'AddFriend' }}
          text="Start Onboarding"
          onClick={() => onNavigate('onboarding-wizard')}
          styles={{
            root: { height: '48px', backgroundColor: JOINER_COLOR, borderColor: JOINER_COLOR },
            rootHovered: { backgroundColor: '#004A8F', borderColor: '#004A8F' },
          }}
        />
        <DefaultButton
          iconProps={{ iconName: 'Sync' }}
          text="Start Transfer"
          onClick={() => onNavigate('mover-wizard')}
          styles={{
            root: { height: '48px', color: MOVER_COLOR, borderColor: MOVER_COLOR },
            rootHovered: { backgroundColor: 'rgba(234, 88, 12, 0.1)' },
          }}
        />
        <DefaultButton
          iconProps={{ iconName: 'UserRemove' }}
          text="Start Offboarding"
          onClick={() => onNavigate('offboarding-wizard')}
          styles={{
            root: { height: '48px', color: LEAVER_COLOR, borderColor: LEAVER_COLOR },
            rootHovered: { backgroundColor: 'rgba(209, 52, 56, 0.1)' },
          }}
        />
      </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
      }}>
        {/* Active Onboardings */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: `4px solid ${JOINER_COLOR}`,
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('onboarding')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Icon iconName="AddFriend" styles={{ root: { fontSize: '24px', color: JOINER_COLOR } }} />
            <span style={{ color: '#666', fontSize: '14px' }}>Active Onboardings</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 600, color: JOINER_COLOR }}>
            {metrics.activeOnboardings}
          </div>
        </div>

        {/* Pending Transfers */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: `4px solid ${MOVER_COLOR}`,
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('mover')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Icon iconName="Sync" styles={{ root: { fontSize: '24px', color: MOVER_COLOR } }} />
            <span style={{ color: '#666', fontSize: '14px' }}>Pending Transfers</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 600, color: MOVER_COLOR }}>
            {metrics.pendingTransfers}
          </div>
        </div>

        {/* Active Offboardings */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: `4px solid ${LEAVER_COLOR}`,
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('offboarding')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Icon iconName="UserRemove" styles={{ root: { fontSize: '24px', color: LEAVER_COLOR } }} />
            <span style={{ color: '#666', fontSize: '14px' }}>Active Offboardings</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 600, color: LEAVER_COLOR }}>
            {metrics.activeOffboardings}
          </div>
        </div>

        {/* This Month's Joiners */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: `4px solid ${SUCCESS_COLOR}`,
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('jmlreporting')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Icon iconName="Calendar" styles={{ root: { fontSize: '24px', color: SUCCESS_COLOR } }} />
            <span style={{ color: '#666', fontSize: '14px' }}>This Month's Joiners</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 600, color: SUCCESS_COLOR }}>
            {metrics.thisMonthJoiners}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Recent Activity */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
            Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px' }}>No recent activity</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '6px',
                  }}
                >
                  <Icon
                    iconName={getActivityIcon(activity.type)}
                    styles={{ root: { fontSize: '20px', color: getActivityColor(activity.type) } }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: '#1a1a1a' }}>{activity.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} • {activity.status}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {formatDate(activity.date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>
            Quick Stats
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#666' }}>Completed This Week</span>
              <span style={{ fontWeight: 600, fontSize: '18px', color: SUCCESS_COLOR }}>
                {metrics.completedThisWeek}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#666' }}>Total Active Processes</span>
              <span style={{ fontWeight: 600, fontSize: '18px', color: JOINER_COLOR }}>
                {metrics.activeOnboardings + metrics.pendingTransfers + metrics.activeOffboardings}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#666' }}>
              Quick Links
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onNavigate('jmlreporting'); }}
                style={{ color: JOINER_COLOR, textDecoration: 'none', fontSize: '14px' }}
              >
                <Icon iconName="ReportDocument" styles={{ root: { marginRight: '8px' } }} />
                View Full Reports
              </a>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onNavigate('search'); }}
                style={{ color: JOINER_COLOR, textDecoration: 'none', fontSize: '14px' }}
              >
                <Icon iconName="Search" styles={{ root: { marginRight: '8px' } }} />
                Search Employees
              </a>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onNavigate('myonboarding'); }}
                style={{ color: JOINER_COLOR, textDecoration: 'none', fontSize: '14px' }}
              >
                <Icon iconName="Contact" styles={{ root: { marginRight: '8px' } }} />
                My Onboarding
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JMLDashboard;
