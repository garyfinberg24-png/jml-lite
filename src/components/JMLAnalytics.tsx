import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { OnboardingService } from '../services/OnboardingService';
import { MoverService } from '../services/MoverService';
import { OffboardingService } from '../services/OffboardingService';
import { IOnboarding } from '../models/IOnboarding';
import { IMover, MoverType } from '../models/IMover';
import { IOffboarding, TerminationType } from '../models/IOffboarding';

interface IProps { sp: SPFI; }

// JML colors
const JOINER_COLOR = '#005BAA';   // Blue
const MOVER_COLOR = '#ea580c';    // Orange
const LEAVER_COLOR = '#d13438';   // Red
const SUCCESS_COLOR = '#059669';  // Green
const WARNING_COLOR = '#d97706';  // Amber
const NEUTRAL_COLOR = '#6b7280';  // Gray

interface IAnalyticsData {
  joiners: IOnboarding[];
  movers: IMover[];
  leavers: IOffboarding[];
}

interface ITrendPoint {
  period: string;
  joiners: number;
  movers: number;
  leavers: number;
  net: number;
}

interface IForecastPoint {
  period: string;
  predicted: number;
  lower: number;
  upper: number;
}

const COMPARISON_OPTIONS: IDropdownOption[] = [
  { key: 'yoy', text: 'Year over Year' },
  { key: 'qoq', text: 'Quarter over Quarter' },
  { key: 'mom', text: 'Month over Month' },
];

export const JMLAnalytics: React.FC<IProps> = ({ sp }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<IAnalyticsData>({ joiners: [], movers: [], leavers: [] });
  const [comparison, setComparison] = useState<string>('yoy');
  const [showForecast, setShowForecast] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const onboardingSvc = new OnboardingService(sp);
      const moverSvc = new MoverService(sp);
      const offboardingSvc = new OffboardingService(sp);

      const [joiners, movers, leavers] = await Promise.all([
        onboardingSvc.getOnboardings(),
        moverSvc.getMovers(),
        offboardingSvc.getOffboardings(),
      ]);

      setData({ joiners, movers, leavers });
    } catch (err) {
      console.error('[JMLAnalytics] Error loading data:', err);
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculate trend data (last 12 months)
  const getTrendData = (): ITrendPoint[] => {
    const months: ITrendPoint[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const period = date.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });

      const joiners = data.joiners.filter(j => {
        const d = j.StartDate || j.Created;
        return d && d >= date && d <= monthEnd;
      }).length;

      const movers = data.movers.filter(m => {
        const d = m.EffectiveDate || m.Created;
        return d && d >= date && d <= monthEnd;
      }).length;

      const leavers = data.leavers.filter(l => {
        const d = l.LastWorkingDate || l.Created;
        return d && d >= date && d <= monthEnd;
      }).length;

      months.push({ period, joiners, movers, leavers, net: joiners - leavers });
    }

    return months;
  };

  // Simple linear forecast (next 3 months)
  const getForecast = (): IForecastPoint[] => {
    const trend = getTrendData();
    const recentJoiners = trend.slice(-6).map(t => t.joiners);
    const avgJoiners = recentJoiners.reduce((a, b) => a + b, 0) / recentJoiners.length;
    const stdDev = Math.sqrt(recentJoiners.reduce((sum, val) => sum + Math.pow(val - avgJoiners, 2), 0) / recentJoiners.length);

    const forecasts: IForecastPoint[] = [];
    const now = new Date();

    for (let i = 1; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const period = date.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
      forecasts.push({
        period,
        predicted: Math.round(avgJoiners),
        lower: Math.round(Math.max(0, avgJoiners - stdDev)),
        upper: Math.round(avgJoiners + stdDev),
      });
    }

    return forecasts;
  };

  // Period comparison calculations
  const getComparison = (): { current: number; previous: number; change: number; label: string } => {
    const now = new Date();
    let currentStart: Date, currentEnd: Date, prevStart: Date, prevEnd: Date, label: string;

    switch (comparison) {
      case 'yoy':
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = now;
        prevStart = new Date(now.getFullYear() - 1, 0, 1);
        prevEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        label = 'vs Same Period Last Year';
        break;
      case 'qoq':
        const currentQ = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), currentQ * 3, 1);
        currentEnd = now;
        prevStart = new Date(now.getFullYear(), (currentQ - 1) * 3, 1);
        prevEnd = new Date(now.getFullYear(), currentQ * 3, 0);
        label = 'vs Last Quarter';
        break;
      case 'mom':
      default:
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = now;
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        label = 'vs Last Month';
    }

    const current = data.joiners.filter(j => {
      const d = j.StartDate || j.Created;
      return d && d >= currentStart && d <= currentEnd;
    }).length;

    const previous = data.joiners.filter(j => {
      const d = j.StartDate || j.Created;
      return d && d >= prevStart && d <= prevEnd;
    }).length;

    const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

    return { current, previous, change, label };
  };

  // Mover type breakdown
  const getMoverTypeBreakdown = (): { type: string; count: number; color: string }[] => {
    const counts: Record<string, number> = {};
    data.movers.forEach(m => {
      const type = m.MoverType || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });

    const colors: Record<string, string> = {
      [MoverType.Promotion]: SUCCESS_COLOR,
      [MoverType.DepartmentTransfer]: JOINER_COLOR,
      [MoverType.LocationChange]: MOVER_COLOR,
      [MoverType.LateralMove]: NEUTRAL_COLOR,
      [MoverType.Demotion]: WARNING_COLOR,
      [MoverType.RoleChange]: '#8b5cf6',
      [MoverType.TeamRestructure]: '#06b6d4',
    };

    return Object.entries(counts)
      .map(([type, count]) => ({ type, count, color: colors[type] || NEUTRAL_COLOR }))
      .sort((a, b) => b.count - a.count);
  };

  // Termination type breakdown
  const getTerminationBreakdown = (): { type: string; count: number; color: string }[] => {
    const counts: Record<string, number> = {};
    data.leavers.forEach(l => {
      const type = l.TerminationType || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });

    const colors: Record<string, string> = {
      [TerminationType.Resignation]: MOVER_COLOR,
      [TerminationType.Termination]: LEAVER_COLOR,
      [TerminationType.Retirement]: NEUTRAL_COLOR,
      [TerminationType.Redundancy]: WARNING_COLOR,
      [TerminationType.ContractEnd]: JOINER_COLOR,
    };

    return Object.entries(counts)
      .map(([type, count]) => ({ type, count, color: colors[type] || NEUTRAL_COLOR }))
      .sort((a, b) => b.count - a.count);
  };

  // Task completion efficiency
  const getEfficiencyMetrics = (): { category: string; avgDays: number; target: number; status: 'good' | 'warning' | 'poor' }[] => {
    const calcAvg = (items: any[], dateField: string, completedField: string): number => {
      const completed = items.filter(i => i.Status === 'Completed' && i[completedField] && i[dateField]);
      if (completed.length === 0) return 0;
      const total = completed.reduce((sum, i) => {
        const days = Math.ceil((new Date(i[completedField]).getTime() - new Date(i[dateField]).getTime()) / (1000 * 60 * 60 * 24));
        return sum + Math.abs(days);
      }, 0);
      return Math.round(total / completed.length);
    };

    const joinerAvg = calcAvg(data.joiners, 'StartDate', 'CompletedDate');
    const moverAvg = calcAvg(data.movers, 'EffectiveDate', 'Modified');
    const leaverAvg = calcAvg(data.leavers, 'LastWorkingDate', 'Modified');

    return [
      { category: 'Onboarding', avgDays: joinerAvg, target: 14, status: joinerAvg <= 14 ? 'good' : joinerAvg <= 21 ? 'warning' : 'poor' },
      { category: 'Transfers', avgDays: moverAvg, target: 7, status: moverAvg <= 7 ? 'good' : moverAvg <= 14 ? 'warning' : 'poor' },
      { category: 'Offboarding', avgDays: leaverAvg, target: 14, status: leaverAvg <= 14 ? 'good' : leaverAvg <= 21 ? 'warning' : 'poor' },
    ];
  };

  // Department heatmap data
  const getDepartmentHeatmap = (): { dept: string; joiners: number; movers: number; leavers: number; net: number }[] => {
    const depts: Record<string, { joiners: number; movers: number; leavers: number }> = {};

    data.joiners.forEach(j => {
      const dept = j.Department || 'Unknown';
      if (!depts[dept]) depts[dept] = { joiners: 0, movers: 0, leavers: 0 };
      depts[dept].joiners++;
    });

    data.movers.forEach(m => {
      const dept = m.NewDepartment || 'Unknown';
      if (!depts[dept]) depts[dept] = { joiners: 0, movers: 0, leavers: 0 };
      depts[dept].movers++;
    });

    data.leavers.forEach(l => {
      const dept = l.Department || 'Unknown';
      if (!depts[dept]) depts[dept] = { joiners: 0, movers: 0, leavers: 0 };
      depts[dept].leavers++;
    });

    return Object.entries(depts)
      .map(([dept, counts]) => ({
        dept,
        ...counts,
        net: counts.joiners - counts.leavers,
      }))
      .sort((a, b) => (b.joiners + b.movers + b.leavers) - (a.joiners + a.movers + a.leavers))
      .slice(0, 10);
  };

  const renderTrendChart = (): JSX.Element => {
    const trend = getTrendData();
    const forecast = showForecast ? getForecast() : [];
    const maxVal = Math.max(...trend.map(t => Math.max(t.joiners, t.movers, t.leavers)), 1);

    return (
      <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#323130', margin: 0 }}>
            12-Month Trend Analysis
          </h3>
          <Toggle
            label="Show Forecast"
            checked={showForecast}
            onChange={(_, checked) => setShowForecast(!!checked)}
            styles={{ root: { marginBottom: 0 } }}
          />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: JOINER_COLOR }} />
            <span>Joiners</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: MOVER_COLOR }} />
            <span>Movers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: LEAVER_COLOR }} />
            <span>Leavers</span>
          </div>
          {showForecast && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: '#ddd', border: '2px dashed #999' }} />
              <span>Forecast</span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180 }}>
          {trend.map((t, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 140 }}>
                <div style={{ width: 8, height: `${(t.joiners / maxVal) * 140}px`, background: JOINER_COLOR, borderRadius: '2px 2px 0 0', minHeight: t.joiners > 0 ? 4 : 0 }} title={`Joiners: ${t.joiners}`} />
                <div style={{ width: 8, height: `${(t.movers / maxVal) * 140}px`, background: MOVER_COLOR, borderRadius: '2px 2px 0 0', minHeight: t.movers > 0 ? 4 : 0 }} title={`Movers: ${t.movers}`} />
                <div style={{ width: 8, height: `${(t.leavers / maxVal) * 140}px`, background: LEAVER_COLOR, borderRadius: '2px 2px 0 0', minHeight: t.leavers > 0 ? 4 : 0 }} title={`Leavers: ${t.leavers}`} />
              </div>
              <div style={{ fontSize: 9, color: '#8a8886', transform: 'rotate(-45deg)', whiteSpace: 'nowrap', marginTop: 8 }}>
                {t.period}
              </div>
            </div>
          ))}

          {/* Forecast bars */}
          {showForecast && forecast.map((f, i) => (
            <div key={`f-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: 0.6 }}>
              <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 140 }}>
                <div style={{
                  width: 24,
                  height: `${(f.predicted / maxVal) * 140}px`,
                  background: 'repeating-linear-gradient(45deg, #ddd, #ddd 2px, #fff 2px, #fff 4px)',
                  borderRadius: '2px 2px 0 0',
                  border: '1px dashed #999',
                  minHeight: 4,
                }} title={`Forecast: ${f.predicted} (${f.lower}-${f.upper})`} />
              </div>
              <div style={{ fontSize: 9, color: '#8a8886', transform: 'rotate(-45deg)', whiteSpace: 'nowrap', marginTop: 8 }}>
                {f.period}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderComparisonCard = (): JSX.Element => {
    const comp = getComparison();
    const isPositive = comp.change >= 0;

    return (
      <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#323130', margin: 0 }}>
            Period Comparison
          </h3>
          <Dropdown
            selectedKey={comparison}
            options={COMPARISON_OPTIONS}
            onChange={(_, opt) => opt && setComparison(opt.key as string)}
            styles={{ root: { width: 180 } }}
          />
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ flex: 1, textAlign: 'center', padding: 20, background: '#f9f9f9', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#605e5c', textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Period</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: JOINER_COLOR }}>{comp.current}</div>
            <div style={{ fontSize: 12, color: '#605e5c' }}>New Joiners</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Icon iconName={isPositive ? 'TriangleSolidUp12' : 'TriangleSolidDown12'} style={{ fontSize: 24, color: isPositive ? SUCCESS_COLOR : LEAVER_COLOR }} />
            <div style={{ fontSize: 24, fontWeight: 700, color: isPositive ? SUCCESS_COLOR : LEAVER_COLOR }}>
              {isPositive ? '+' : ''}{comp.change}%
            </div>
            <div style={{ fontSize: 11, color: '#605e5c', textAlign: 'center' }}>{comp.label}</div>
          </div>

          <div style={{ flex: 1, textAlign: 'center', padding: 20, background: '#f9f9f9', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#605e5c', textTransform: 'uppercase', letterSpacing: 0.5 }}>Previous Period</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: NEUTRAL_COLOR }}>{comp.previous}</div>
            <div style={{ fontSize: 12, color: '#605e5c' }}>New Joiners</div>
          </div>
        </div>
      </div>
    );
  };

  const renderDonutChart = (
    data: { type: string; count: number; color: string }[],
    title: string,
    icon: string,
    iconColor: string
  ): JSX.Element => {
    const total = data.reduce((sum, d) => sum + d.count, 0);

    return (
      <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#323130', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon iconName={icon} style={{ color: iconColor }} />
          {title}
        </h3>

        <div style={{ display: 'flex', gap: 24 }}>
          {/* Simple donut representation */}
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              {(() => {
                let offset = 0;
                return data.map((d, i) => {
                  const pct = total > 0 ? (d.count / total) * 100 : 0;
                  const stroke = (
                    <circle
                      key={i}
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke={d.color}
                      strokeWidth="3"
                      strokeDasharray={`${pct} ${100 - pct}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  offset += pct;
                  return stroke;
                });
              })()}
            </svg>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#323130' }}>{total}</div>
              <div style={{ fontSize: 9, color: '#605e5c' }}>Total</div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ flex: 1 }}>
            {data.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                  <span style={{ fontSize: 12 }}>{d.type}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{d.count}</span>
              </div>
            ))}
            {data.length === 0 && (
              <div style={{ fontSize: 12, color: '#8a8886', textAlign: 'center', padding: 20 }}>No data</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEfficiencyGauge = (): JSX.Element => {
    const metrics = getEfficiencyMetrics();

    return (
      <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#323130', margin: '0 0 16px 0' }}>
          Process Efficiency
        </h3>

        <div style={{ display: 'flex', gap: 16 }}>
          {metrics.map((m, i) => {
            const statusColor = m.status === 'good' ? SUCCESS_COLOR : m.status === 'warning' ? WARNING_COLOR : LEAVER_COLOR;
            const pct = m.target > 0 ? Math.min((m.avgDays / (m.target * 2)) * 100, 100) : 0;

            return (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 12px' }}>
                  <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#edebe9" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke={statusColor}
                      strokeWidth="3"
                      strokeDasharray={`${pct} ${100 - pct}`}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: statusColor }}>{m.avgDays}d</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#323130' }}>{m.category}</div>
                <div style={{ fontSize: 11, color: '#605e5c' }}>Target: {m.target} days</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDepartmentHeatmap = (): JSX.Element => {
    const heatmap = getDepartmentHeatmap();
    const maxActivity = Math.max(...heatmap.map(h => h.joiners + h.movers + h.leavers), 1);

    return (
      <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#323130', margin: '0 0 16px 0' }}>
          Department Activity Heatmap
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #edebe9' }}>
              <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Department</th>
              <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: JOINER_COLOR }}>
                <Icon iconName="AddFriend" style={{ marginRight: 4 }} />Joiners
              </th>
              <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: MOVER_COLOR }}>
                <Icon iconName="Sync" style={{ marginRight: 4 }} />Movers
              </th>
              <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, color: LEAVER_COLOR }}>
                <Icon iconName="UserRemove" style={{ marginRight: 4 }} />Leavers
              </th>
              <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>Net</th>
              <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Activity</th>
            </tr>
          </thead>
          <tbody>
            {heatmap.map((h, i) => {
              const activity = h.joiners + h.movers + h.leavers;
              const activityPct = (activity / maxActivity) * 100;

              return (
                <tr key={i} style={{ borderBottom: '1px solid #edebe9' }}>
                  <td style={{ padding: '8px', fontWeight: 500 }}>{h.dept}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ background: `${JOINER_COLOR}20`, color: JOINER_COLOR, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                      {h.joiners}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ background: `${MOVER_COLOR}20`, color: MOVER_COLOR, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                      {h.movers}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ background: `${LEAVER_COLOR}20`, color: LEAVER_COLOR, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                      {h.leavers}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ color: h.net >= 0 ? SUCCESS_COLOR : LEAVER_COLOR, fontWeight: 600 }}>
                      {h.net >= 0 ? '+' : ''}{h.net}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ background: '#edebe9', borderRadius: 4, height: 8, width: '100%', overflow: 'hidden' }}>
                      <div style={{
                        background: `linear-gradient(90deg, ${JOINER_COLOR}, ${MOVER_COLOR}, ${LEAVER_COLOR})`,
                        height: '100%',
                        width: `${activityPct}%`,
                        borderRadius: 4,
                      }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {heatmap.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#8a8886' }}>No department data available</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spinner size={SpinnerSize.large} label="Loading analytics data..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            JML Analytics
          </h2>
          <p style={{ fontSize: 13, color: '#605e5c', margin: '4px 0 0 0' }}>
            Advanced insights and forecasting for employee lifecycle management
          </p>
        </div>
        <button
          onClick={loadData}
          style={{
            padding: '8px 16px', borderRadius: 6, border: '1px solid #005BAA',
            background: '#fff', color: '#005BAA', cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500,
          }}
        >
          <Icon iconName="Refresh" /> Refresh Data
        </button>
      </div>

      {/* Trend Analysis */}
      <div style={{ marginBottom: 24 }}>
        {renderTrendChart()}
      </div>

      {/* Period Comparison */}
      <div style={{ marginBottom: 24 }}>
        {renderComparisonCard()}
      </div>

      {/* Breakdown Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {renderDonutChart(getMoverTypeBreakdown(), 'Transfer Types', 'Sync', MOVER_COLOR)}
        {renderDonutChart(getTerminationBreakdown(), 'Termination Reasons', 'UserRemove', LEAVER_COLOR)}
        {renderEfficiencyGauge()}
      </div>

      {/* Department Heatmap */}
      {renderDepartmentHeatmap()}
    </div>
  );
};

export default JMLAnalytics;
