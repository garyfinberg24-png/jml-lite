import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { OnboardingService } from '../services/OnboardingService';
import { MoverService } from '../services/MoverService';
import { OffboardingService } from '../services/OffboardingService';
import { IOnboarding, OnboardingStatus } from '../models/IOnboarding';
import { IMover, MoverStatus } from '../models/IMover';
import { IOffboarding, OffboardingStatus } from '../models/IOffboarding';

interface IProps { sp: SPFI; }

// JML colors
const JOINER_COLOR = '#005BAA';   // Purple
const MOVER_COLOR = '#ea580c';    // Orange
const LEAVER_COLOR = '#d13438';   // Red

interface IJMLMetrics {
  // Totals
  totalJoiners: number;
  totalMovers: number;
  totalLeavers: number;
  // By status
  joinersInProgress: number;
  joinersCompleted: number;
  moversInProgress: number;
  moversCompleted: number;
  leaversInProgress: number;
  leaversCompleted: number;
  // By department
  joinersByDepartment: { department: string; count: number }[];
  moversByDepartment: { department: string; count: number }[];
  leaversByDepartment: { department: string; count: number }[];
  // By month
  joinersByMonth: { month: string; count: number }[];
  moversByMonth: { month: string; count: number }[];
  leaversByMonth: { month: string; count: number }[];
  // Average completion time
  avgJoinerCompletionDays: number;
  avgMoverCompletionDays: number;
  avgLeaverCompletionDays: number;
  // Turnover
  turnoverRate: number;
  netHeadcount: number;
}

const PERIOD_OPTIONS: IDropdownOption[] = [
  { key: 'thisMonth', text: 'This Month' },
  { key: 'lastMonth', text: 'Last Month' },
  { key: 'thisQuarter', text: 'This Quarter' },
  { key: 'lastQuarter', text: 'Last Quarter' },
  { key: 'thisYear', text: 'This Year' },
  { key: 'lastYear', text: 'Last Year' },
  { key: 'custom', text: 'Custom Range' },
];

export const JMLReporting: React.FC<IProps> = ({ sp }) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('thisYear');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [metrics, setMetrics] = useState<IJMLMetrics | null>(null);

  // Raw data
  const [joiners, setJoiners] = useState<IOnboarding[]>([]);
  const [movers, setMovers] = useState<IMover[]>([]);
  const [leavers, setLeavers] = useState<IOffboarding[]>([]);

  const getDateRange = useCallback((): { start: Date; end: Date } => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const quarter = Math.floor(month / 3);

    switch (period) {
      case 'thisMonth':
        return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0) };
      case 'lastMonth':
        return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0) };
      case 'thisQuarter':
        return { start: new Date(year, quarter * 3, 1), end: new Date(year, (quarter + 1) * 3, 0) };
      case 'lastQuarter':
        return { start: new Date(year, (quarter - 1) * 3, 1), end: new Date(year, quarter * 3, 0) };
      case 'thisYear':
        return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
      case 'lastYear':
        return { start: new Date(year - 1, 0, 1), end: new Date(year - 1, 11, 31) };
      case 'custom':
        return {
          start: startDate || new Date(year, 0, 1),
          end: endDate || new Date(year, 11, 31)
        };
      default:
        return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
    }
  }, [period, startDate, endDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const onboardingSvc = new OnboardingService(sp);
      const moverSvc = new MoverService(sp);
      const offboardingSvc = new OffboardingService(sp);

      const [onboardings, transfers, offboardings] = await Promise.all([
        onboardingSvc.getOnboardings(),
        moverSvc.getMovers(),
        offboardingSvc.getOffboardings(),
      ]);

      setJoiners(onboardings);
      setMovers(transfers);
      setLeavers(offboardings);
    } catch (err) {
      console.error('[JMLReporting] Error loading data:', err);
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (joiners.length === 0 && movers.length === 0 && leavers.length === 0) {
      setMetrics(null);
      return;
    }

    const { start, end } = getDateRange();

    // Filter by date range
    const filteredJoiners = joiners.filter(j => {
      const date = j.StartDate || j.Created;
      return date && date >= start && date <= end;
    });

    const filteredMovers = movers.filter(m => {
      const date = m.EffectiveDate || m.Created;
      return date && date >= start && date <= end;
    });

    const filteredLeavers = leavers.filter(l => {
      const date = l.LastWorkingDate || l.Created;
      return date && date >= start && date <= end;
    });

    // Calculate metrics
    const calcMetrics: IJMLMetrics = {
      totalJoiners: filteredJoiners.length,
      totalMovers: filteredMovers.length,
      totalLeavers: filteredLeavers.length,

      joinersInProgress: filteredJoiners.filter(j => j.Status === OnboardingStatus.InProgress).length,
      joinersCompleted: filteredJoiners.filter(j => j.Status === OnboardingStatus.Completed).length,
      moversInProgress: filteredMovers.filter(m => m.Status === MoverStatus.InProgress).length,
      moversCompleted: filteredMovers.filter(m => m.Status === MoverStatus.Completed).length,
      leaversInProgress: filteredLeavers.filter(l => l.Status === OffboardingStatus.InProgress).length,
      leaversCompleted: filteredLeavers.filter(l => l.Status === OffboardingStatus.Completed).length,

      joinersByDepartment: groupByDepartment(filteredJoiners, 'Department'),
      moversByDepartment: groupByDepartment(filteredMovers, 'NewDepartment'),
      leaversByDepartment: groupByDepartment(filteredLeavers, 'Department'),

      joinersByMonth: groupByMonth(filteredJoiners, 'StartDate'),
      moversByMonth: groupByMonth(filteredMovers, 'EffectiveDate'),
      leaversByMonth: groupByMonth(filteredLeavers, 'LastWorkingDate'),

      avgJoinerCompletionDays: calculateAvgCompletionDays(filteredJoiners),
      avgMoverCompletionDays: calculateAvgMoverCompletionDays(filteredMovers),
      avgLeaverCompletionDays: calculateAvgLeaverCompletionDays(filteredLeavers),

      turnoverRate: filteredJoiners.length > 0
        ? Math.round((filteredLeavers.length / filteredJoiners.length) * 100)
        : 0,
      netHeadcount: filteredJoiners.length - filteredLeavers.length,
    };

    setMetrics(calcMetrics);
  }, [joiners, movers, leavers, period, startDate, endDate, getDateRange]);

  const groupByDepartment = (items: any[], field: string): { department: string; count: number }[] => {
    const groups: Record<string, number> = {};
    items.forEach(item => {
      const dept = item[field] || 'Unknown';
      groups[dept] = (groups[dept] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const groupByMonth = (items: any[], dateField: string): { month: string; count: number }[] => {
    const groups: Record<string, number> = {};
    items.forEach(item => {
      const date = item[dateField];
      if (date) {
        const monthNum = date.getMonth() + 1;
        const monthStr = monthNum < 10 ? `0${monthNum}` : String(monthNum);
        const monthKey = `${date.getFullYear()}-${monthStr}`;
        groups[monthKey] = (groups[monthKey] || 0) + 1;
      }
    });
    return Object.entries(groups)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const calculateAvgCompletionDays = (items: IOnboarding[]): number => {
    const completed = items.filter(i => i.Status === OnboardingStatus.Completed && i.CompletedDate && i.StartDate);
    if (completed.length === 0) return 0;
    const totalDays = completed.reduce((sum, i) => {
      const days = Math.ceil((i.CompletedDate!.getTime() - i.StartDate!.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    return Math.round(totalDays / completed.length);
  };

  const calculateAvgMoverCompletionDays = (items: IMover[]): number => {
    const completed = items.filter(i => i.Status === MoverStatus.Completed && i.Modified && i.EffectiveDate);
    if (completed.length === 0) return 0;
    const totalDays = completed.reduce((sum, i) => {
      const days = Math.ceil((i.Modified!.getTime() - i.EffectiveDate!.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.abs(days);
    }, 0);
    return Math.round(totalDays / completed.length);
  };

  const calculateAvgLeaverCompletionDays = (items: IOffboarding[]): number => {
    const completed = items.filter(i => i.Status === OffboardingStatus.Completed && i.Modified && i.LastWorkingDate);
    if (completed.length === 0) return 0;
    const totalDays = completed.reduce((sum, i) => {
      const days = Math.ceil((i.Modified!.getTime() - i.LastWorkingDate!.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.abs(days);
    }, 0);
    return Math.round(totalDays / completed.length);
  };

  const renderMetricCard = (
    title: string,
    value: number | string,
    subtitle: string,
    color: string,
    icon: string
  ): JSX.Element => (
    <div style={{
      background: '#fff', borderRadius: 8, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: `${color}15`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon iconName={icon} style={{ fontSize: 20, color }} />
        </div>
        <div style={{ fontSize: 11, color: '#605e5c', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#605e5c', marginTop: 4 }}>{subtitle}</div>
    </div>
  );

  const renderBarChart = (
    data: { month: string; count: number }[],
    color: string,
    title: string
  ): JSX.Element => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    return (
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#323130', marginBottom: 12 }}>{title}</h4>
        <div style={{ display: 'flex', gap: 4, height: 100, alignItems: 'flex-end' }}>
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 10, color: '#605e5c', marginBottom: 4 }}>{d.count}</div>
              <div style={{
                width: '100%', maxWidth: 40,
                height: `${(d.count / maxCount) * 80}px`,
                background: color, borderRadius: '4px 4px 0 0',
                minHeight: d.count > 0 ? 4 : 0,
              }} />
              <div style={{ fontSize: 9, color: '#8a8886', marginTop: 4 }}>
                {d.month.split('-')[1]}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDepartmentList = (
    data: { department: string; count: number }[],
    color: string
  ): JSX.Element => (
    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
      {data.map((d, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 0', borderBottom: '1px solid #edebe9',
        }}>
          <span style={{ fontSize: 13 }}>{d.department}</span>
          <span style={{
            background: `${color}15`, color, padding: '2px 8px',
            borderRadius: 12, fontSize: 12, fontWeight: 600,
          }}>{d.count}</span>
        </div>
      ))}
      {data.length === 0 && (
        <div style={{ color: '#8a8886', fontSize: 13, textAlign: 'center', padding: 20 }}>
          No data
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spinner size={SpinnerSize.large} label="Loading JML data..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
          JML Reporting
        </h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <Dropdown
            label="Period"
            selectedKey={period}
            options={PERIOD_OPTIONS}
            onChange={(_, opt) => opt && setPeriod(opt.key as string)}
            styles={{ root: { width: 150 } }}
          />
          {period === 'custom' && (
            <>
              <DatePicker
                label="Start Date"
                value={startDate}
                onSelectDate={(d) => setStartDate(d || undefined)}
                styles={{ root: { width: 150 } }}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onSelectDate={(d) => setEndDate(d || undefined)}
                styles={{ root: { width: 150 } }}
              />
            </>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {renderMetricCard('Total Joiners', metrics?.totalJoiners || 0, `${metrics?.joinersCompleted || 0} completed`, JOINER_COLOR, 'AddFriend')}
        {renderMetricCard('Total Transfers', metrics?.totalMovers || 0, `${metrics?.moversCompleted || 0} completed`, MOVER_COLOR, 'Sync')}
        {renderMetricCard('Total Leavers', metrics?.totalLeavers || 0, `${metrics?.leaversCompleted || 0} completed`, LEAVER_COLOR, 'UserRemove')}
        {renderMetricCard('Net Headcount', metrics?.netHeadcount || 0,
          (metrics?.netHeadcount || 0) >= 0 ? 'Growth' : 'Decline',
          (metrics?.netHeadcount || 0) >= 0 ? '#059669' : '#dc2626', 'People')}
      </div>

      {/* Secondary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {renderMetricCard('Turnover Rate', `${metrics?.turnoverRate || 0}%`, 'Leavers / Joiners', '#6b7280', 'Chart')}
        {renderMetricCard('Avg Onboarding', `${metrics?.avgJoinerCompletionDays || 0}d`, 'Days to complete', JOINER_COLOR, 'Clock')}
        {renderMetricCard('Avg Transfer', `${metrics?.avgMoverCompletionDays || 0}d`, 'Days to complete', MOVER_COLOR, 'Clock')}
        {renderMetricCard('Avg Offboarding', `${metrics?.avgLeaverCompletionDays || 0}d`, 'Days to complete', LEAVER_COLOR, 'Clock')}
      </div>

      {/* Trend Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {renderBarChart(metrics?.joinersByMonth || [], JOINER_COLOR, 'Joiners by Month')}
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {renderBarChart(metrics?.moversByMonth || [], MOVER_COLOR, 'Transfers by Month')}
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {renderBarChart(metrics?.leaversByMonth || [], LEAVER_COLOR, 'Leavers by Month')}
        </div>
      </div>

      {/* Department Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: JOINER_COLOR, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon iconName="AddFriend" /> Joiners by Department
          </h4>
          {renderDepartmentList(metrics?.joinersByDepartment || [], JOINER_COLOR)}
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: MOVER_COLOR, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon iconName="Sync" /> Transfers by New Department
          </h4>
          {renderDepartmentList(metrics?.moversByDepartment || [], MOVER_COLOR)}
        </div>
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: LEAVER_COLOR, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon iconName="UserRemove" /> Leavers by Department
          </h4>
          {renderDepartmentList(metrics?.leaversByDepartment || [], LEAVER_COLOR)}
        </div>
      </div>

      {/* Status Summary Table */}
      <div style={{ marginTop: 24, background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#323130', marginBottom: 16 }}>Status Summary</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #edebe9' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Total</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>In Progress</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Completed</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #edebe9' }}>
              <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon iconName="AddFriend" style={{ color: JOINER_COLOR }} /> Joiners (Onboarding)
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{metrics?.totalJoiners || 0}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{metrics?.joinersInProgress || 0}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{metrics?.joinersCompleted || 0}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                {metrics?.totalJoiners ? Math.round(((metrics.joinersCompleted || 0) / metrics.totalJoiners) * 100) : 0}%
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #edebe9' }}>
              <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon iconName="Sync" style={{ color: MOVER_COLOR }} /> Movers (Transfers)
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{metrics?.totalMovers || 0}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{metrics?.moversInProgress || 0}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{metrics?.moversCompleted || 0}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                {metrics?.totalMovers ? Math.round(((metrics.moversCompleted || 0) / metrics.totalMovers) * 100) : 0}%
              </td>
            </tr>
            <tr>
              <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon iconName="UserRemove" style={{ color: LEAVER_COLOR }} /> Leavers (Offboarding)
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{metrics?.totalLeavers || 0}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{metrics?.leaversInProgress || 0}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>{metrics?.leaversCompleted || 0}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                {metrics?.totalLeavers ? Math.round(((metrics.leaversCompleted || 0) / metrics.totalLeavers) * 100) : 0}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
