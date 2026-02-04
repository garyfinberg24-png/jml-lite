import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { SPFI } from '@pnp/sp';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { Icon } from '@fluentui/react/lib/Icon';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import { OnboardingService } from '../services/OnboardingService';
import { MoverService } from '../services/MoverService';
import { OffboardingService } from '../services/OffboardingService';
import { IOnboarding, IOnboardingTask, OnboardingStatus, OnboardingTaskStatus } from '../models/IOnboarding';
import { IMover, IMoverTask, MoverStatus, MoverTaskStatus } from '../models/IMover';
import { IOffboarding, IOffboardingTask, OffboardingStatus, OffboardingTaskStatus } from '../models/IOffboarding';
import { OnboardingForm } from './OnboardingForm';
import { MoverForm } from './MoverForm';
import { OffboardingForm } from './OffboardingForm';

interface IProps {
  sp: SPFI;
}

// Theme colors
const JOINER_COLOR = '#005BAA';
const MOVER_COLOR = '#ea580c';
const LEAVER_COLOR = '#d13438';
const SUCCESS_COLOR = '#10b981';
const WARNING_COLOR = '#f59e0b';

type ProcessType = 'all' | 'onboarding' | 'mover' | 'offboarding';
type TaskStatusFilter = 'all' | 'pending' | 'inprogress' | 'completed' | 'overdue' | 'blocked';

interface IUnifiedTask {
  id: number;
  title: string;
  processType: 'onboarding' | 'mover' | 'offboarding';
  processId: number;
  processTitle: string;
  employeeName: string;
  category: string;
  status: string;
  assignedTo?: string;
  dueDate?: Date;
  completedDate?: Date;
  priority: string;
  isOverdue: boolean;
}

interface IProcessSummary {
  id: number;
  title: string;
  processType: 'onboarding' | 'mover' | 'offboarding';
  employeeName: string;
  status: string;
  keyDate: Date;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionPercentage: number;
}

export const TaskManager: React.FC<IProps> = ({ sp }) => {
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'tasks'>('overview');
  const [processFilter, setProcessFilter] = useState<ProcessType>('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Panel state for viewing employee details
  const [onboardingPanelOpen, setOnboardingPanelOpen] = useState(false);
  const [moverPanelOpen, setMoverPanelOpen] = useState(false);
  const [offboardingPanelOpen, setOffboardingPanelOpen] = useState(false);
  const [selectedOnboarding, setSelectedOnboarding] = useState<IOnboarding | null>(null);
  const [selectedMover, setSelectedMover] = useState<IMover | null>(null);
  const [selectedOffboarding, setSelectedOffboarding] = useState<IOffboarding | null>(null);

  // Data
  const [onboardings, setOnboardings] = useState<IOnboarding[]>([]);
  const [movers, setMovers] = useState<IMover[]>([]);
  const [offboardings, setOffboardings] = useState<IOffboarding[]>([]);
  const [onboardingTasks, setOnboardingTasks] = useState<IOnboardingTask[]>([]);
  const [moverTasks, setMoverTasks] = useState<IMoverTask[]>([]);
  const [offboardingTasks, setOffboardingTasks] = useState<IOffboardingTask[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const onboardingSvc = new OnboardingService(sp);
      const moverSvc = new MoverService(sp);
      const offboardingSvc = new OffboardingService(sp);

      const [obs, mvs, offs] = await Promise.all([
        onboardingSvc.getOnboardings(),
        moverSvc.getMovers(),
        offboardingSvc.getOffboardings(),
      ]);

      setOnboardings(obs);
      setMovers(mvs);
      setOffboardings(offs);

      // Load tasks for active processes
      const activeOnboardingIds = obs.filter(o =>
        o.Status !== OnboardingStatus.Completed && o.Status !== OnboardingStatus.Cancelled
      ).map(o => o.Id!);

      const activeMoverIds = mvs.filter(m =>
        m.Status !== MoverStatus.Completed && m.Status !== MoverStatus.Cancelled
      ).map(m => m.Id!);

      const activeOffboardingIds = offs.filter(o =>
        o.Status !== OffboardingStatus.Completed && o.Status !== OffboardingStatus.Cancelled
      ).map(o => o.Id!);

      // Helper to flatten array (ES5 compatible alternative to .flat())
      const flatten = <T,>(arr: T[][]): T[] => ([] as T[]).concat(...arr);

      // Load onboarding tasks
      let obTasks: IOnboardingTask[] = [];
      if (activeOnboardingIds.length > 0) {
        const results = await Promise.all(activeOnboardingIds.map(id => onboardingSvc.getOnboardingTasks(id)));
        obTasks = flatten(results);
      }
      setOnboardingTasks(obTasks);

      // Load mover tasks
      let mvTasks: IMoverTask[] = [];
      if (activeMoverIds.length > 0) {
        const results = await Promise.all(activeMoverIds.map(id => moverSvc.getMoverTasks(id)));
        mvTasks = flatten(results);
      }
      setMoverTasks(mvTasks);

      // Load offboarding tasks
      let offTasks: IOffboardingTask[] = [];
      if (activeOffboardingIds.length > 0) {
        const results = await Promise.all(activeOffboardingIds.map(id => offboardingSvc.getOffboardingTasks(id)));
        offTasks = flatten(results);
      }
      setOffboardingTasks(offTasks);

    } catch (err) {
      console.error('[TaskManager] Error loading data:', err);
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build process summaries
  const processSummaries = useMemo((): IProcessSummary[] => {
    const summaries: IProcessSummary[] = [];

    onboardings.forEach(o => {
      if (o.Status === OnboardingStatus.Completed || o.Status === OnboardingStatus.Cancelled) return;
      const tasks = onboardingTasks.filter(t => t.OnboardingId === o.Id);
      const completed = tasks.filter(t => t.Status === OnboardingTaskStatus.Completed).length;
      const pending = tasks.filter(t => t.Status === OnboardingTaskStatus.Pending || t.Status === OnboardingTaskStatus.InProgress).length;
      const overdue = tasks.filter(t =>
        t.DueDate && new Date(t.DueDate) < new Date() &&
        t.Status !== OnboardingTaskStatus.Completed && t.Status !== OnboardingTaskStatus.NotApplicable
      ).length;

      summaries.push({
        id: o.Id!,
        title: o.Title || o.CandidateName,
        processType: 'onboarding',
        employeeName: o.CandidateName,
        status: o.Status,
        keyDate: o.StartDate,
        totalTasks: tasks.length,
        completedTasks: completed,
        pendingTasks: pending,
        overdueTasks: overdue,
        completionPercentage: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      });
    });

    movers.forEach(m => {
      if (m.Status === MoverStatus.Completed || m.Status === MoverStatus.Cancelled) return;
      const tasks = moverTasks.filter(t => t.MoverId === m.Id);
      const completed = tasks.filter(t => t.Status === MoverTaskStatus.Completed).length;
      const pending = tasks.filter(t => t.Status === MoverTaskStatus.Pending || t.Status === MoverTaskStatus.InProgress).length;
      const overdue = tasks.filter(t =>
        t.DueDate && new Date(t.DueDate) < new Date() &&
        t.Status !== MoverTaskStatus.Completed && t.Status !== MoverTaskStatus.NotApplicable
      ).length;

      summaries.push({
        id: m.Id!,
        title: m.Title || m.EmployeeName,
        processType: 'mover',
        employeeName: m.EmployeeName,
        status: m.Status,
        keyDate: m.EffectiveDate,
        totalTasks: tasks.length,
        completedTasks: completed,
        pendingTasks: pending,
        overdueTasks: overdue,
        completionPercentage: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      });
    });

    offboardings.forEach(o => {
      if (o.Status === OffboardingStatus.Completed || o.Status === OffboardingStatus.Cancelled) return;
      const tasks = offboardingTasks.filter(t => t.OffboardingId === o.Id);
      const completed = tasks.filter(t => t.Status === OffboardingTaskStatus.Completed).length;
      const pending = tasks.filter(t => t.Status === OffboardingTaskStatus.Pending || t.Status === OffboardingTaskStatus.InProgress).length;
      const overdue = tasks.filter(t =>
        t.DueDate && new Date(t.DueDate) < new Date() &&
        t.Status !== OffboardingTaskStatus.Completed && t.Status !== OffboardingTaskStatus.NotApplicable
      ).length;

      summaries.push({
        id: o.Id!,
        title: o.Title || o.EmployeeName,
        processType: 'offboarding',
        employeeName: o.EmployeeName,
        status: o.Status,
        keyDate: o.LastWorkingDate,
        totalTasks: tasks.length,
        completedTasks: completed,
        pendingTasks: pending,
        overdueTasks: overdue,
        completionPercentage: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      });
    });

    // Sort by overdue first, then by key date
    return summaries.sort((a, b) => {
      if (a.overdueTasks > 0 && b.overdueTasks === 0) return -1;
      if (a.overdueTasks === 0 && b.overdueTasks > 0) return 1;
      return new Date(a.keyDate).getTime() - new Date(b.keyDate).getTime();
    });
  }, [onboardings, movers, offboardings, onboardingTasks, moverTasks, offboardingTasks]);

  // Build unified task list
  const unifiedTasks = useMemo((): IUnifiedTask[] => {
    const tasks: IUnifiedTask[] = [];

    onboardingTasks.forEach(t => {
      const process = onboardings.find(o => o.Id === t.OnboardingId);
      if (!process) return;

      const isOverdue = t.DueDate && new Date(t.DueDate) < new Date() &&
        t.Status !== OnboardingTaskStatus.Completed && t.Status !== OnboardingTaskStatus.NotApplicable;

      tasks.push({
        id: t.Id!,
        title: t.Title,
        processType: 'onboarding',
        processId: t.OnboardingId,
        processTitle: process.Title || process.CandidateName,
        employeeName: process.CandidateName,
        category: t.Category,
        status: t.Status,
        dueDate: t.DueDate,
        completedDate: t.CompletedDate,
        priority: t.Priority,
        isOverdue: !!isOverdue,
      });
    });

    moverTasks.forEach(t => {
      const process = movers.find(m => m.Id === t.MoverId);
      if (!process) return;

      const isOverdue = t.DueDate && new Date(t.DueDate) < new Date() &&
        t.Status !== MoverTaskStatus.Completed && t.Status !== MoverTaskStatus.NotApplicable;

      tasks.push({
        id: t.Id!,
        title: t.Title,
        processType: 'mover',
        processId: t.MoverId,
        processTitle: process.Title || process.EmployeeName,
        employeeName: process.EmployeeName,
        category: t.Category,
        status: t.Status,
        dueDate: t.DueDate,
        completedDate: t.CompletedDate,
        priority: t.Priority || 'Medium',
        isOverdue: !!isOverdue,
      });
    });

    offboardingTasks.forEach(t => {
      const process = offboardings.find(o => o.Id === t.OffboardingId);
      if (!process) return;

      const isOverdue = t.DueDate && new Date(t.DueDate) < new Date() &&
        t.Status !== OffboardingTaskStatus.Completed && t.Status !== OffboardingTaskStatus.NotApplicable;

      tasks.push({
        id: t.Id!,
        title: t.Title,
        processType: 'offboarding',
        processId: t.OffboardingId,
        processTitle: process.Title || process.EmployeeName,
        employeeName: process.EmployeeName,
        category: t.Category,
        status: t.Status,
        dueDate: t.DueDate,
        completedDate: t.CompletedDate,
        priority: t.Priority || 'Medium',
        isOverdue: !!isOverdue,
      });
    });

    return tasks;
  }, [onboardings, movers, offboardings, onboardingTasks, moverTasks, offboardingTasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return unifiedTasks.filter(task => {
      // Process type filter
      if (processFilter !== 'all' && task.processType !== processFilter) return false;

      // Status filter
      if (statusFilter === 'pending' && task.status !== 'Pending') return false;
      if (statusFilter === 'inprogress' && task.status !== 'In Progress') return false;
      if (statusFilter === 'completed' && task.status !== 'Completed') return false;
      if (statusFilter === 'overdue' && !task.isOverdue) return false;
      if (statusFilter === 'blocked' && task.status !== 'Blocked') return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return task.title.toLowerCase().includes(query) ||
               task.employeeName.toLowerCase().includes(query) ||
               task.category.toLowerCase().includes(query);
      }

      return true;
    });
  }, [unifiedTasks, processFilter, statusFilter, searchQuery]);

  // Filter summaries
  const filteredSummaries = useMemo(() => {
    return processSummaries.filter(s => {
      if (processFilter !== 'all' && s.processType !== processFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return s.employeeName.toLowerCase().includes(query) ||
               s.title.toLowerCase().includes(query);
      }
      return true;
    });
  }, [processSummaries, processFilter, searchQuery]);

  // Split summaries by process type for 3-column layout
  const onboardingSummaries = useMemo(() =>
    filteredSummaries.filter(s => s.processType === 'onboarding'),
  [filteredSummaries]);

  const moverSummaries = useMemo(() =>
    filteredSummaries.filter(s => s.processType === 'mover'),
  [filteredSummaries]);

  const offboardingSummaries = useMemo(() =>
    filteredSummaries.filter(s => s.processType === 'offboarding'),
  [filteredSummaries]);

  // Group tasks by employee for accordion view
  const tasksByUser = useMemo(() => {
    const grouped: Record<string, IUnifiedTask[]> = {};
    filteredTasks.forEach(task => {
      if (!grouped[task.employeeName]) {
        grouped[task.employeeName] = [];
      }
      grouped[task.employeeName].push(task);
    });
    // Sort by employee name
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredTasks]);

  // Accordion toggle functions
  const toggleUserAccordion = (userName: string): void => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userName)) {
        next.delete(userName);
      } else {
        next.add(userName);
      }
      return next;
    });
  };

  const expandAllUsers = (): void => {
    setExpandedUsers(new Set(tasksByUser.map(([name]) => name)));
  };

  const collapseAllUsers = (): void => {
    setExpandedUsers(new Set());
  };

  // Aggregate stats
  const stats = useMemo(() => {
    const totalOnboardings = onboardings.filter(o =>
      o.Status !== OnboardingStatus.Completed && o.Status !== OnboardingStatus.Cancelled
    ).length;
    const totalMovers = movers.filter(m =>
      m.Status !== MoverStatus.Completed && m.Status !== MoverStatus.Cancelled
    ).length;
    const totalOffboardings = offboardings.filter(o =>
      o.Status !== OffboardingStatus.Completed && o.Status !== OffboardingStatus.Cancelled
    ).length;

    const totalTasks = unifiedTasks.length;
    const pendingTasks = unifiedTasks.filter(t => t.status === 'Pending').length;
    const inProgressTasks = unifiedTasks.filter(t => t.status === 'In Progress').length;
    const completedTasks = unifiedTasks.filter(t => t.status === 'Completed').length;
    const overdueTasks = unifiedTasks.filter(t => t.isOverdue).length;
    const blockedTasks = unifiedTasks.filter(t => t.status === 'Blocked').length;

    return {
      totalOnboardings,
      totalMovers,
      totalOffboardings,
      totalProcesses: totalOnboardings + totalMovers + totalOffboardings,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      blockedTasks,
    };
  }, [onboardings, movers, offboardings, unifiedTasks]);

  const getProcessColor = (type: 'onboarding' | 'mover' | 'offboarding'): string => {
    switch (type) {
      case 'onboarding': return JOINER_COLOR;
      case 'mover': return MOVER_COLOR;
      case 'offboarding': return LEAVER_COLOR;
    }
  };

  const getProcessLabel = (type: 'onboarding' | 'mover' | 'offboarding'): string => {
    switch (type) {
      case 'onboarding': return 'Onboarding';
      case 'mover': return 'Transfer';
      case 'offboarding': return 'Offboarding';
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const processFilterOptions: IDropdownOption[] = [
    { key: 'all', text: 'All Processes' },
    { key: 'onboarding', text: 'Onboarding' },
    { key: 'mover', text: 'Transfers' },
    { key: 'offboarding', text: 'Offboarding' },
  ];

  const statusFilterOptions: IDropdownOption[] = [
    { key: 'all', text: 'All Statuses' },
    { key: 'pending', text: 'Pending' },
    { key: 'inprogress', text: 'In Progress' },
    { key: 'completed', text: 'Completed' },
    { key: 'overdue', text: 'Overdue' },
    { key: 'blocked', text: 'Blocked' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spinner size={SpinnerSize.large} label="Loading task data..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px 0' }}>
          Task Manager
        </h2>
        <p style={{ color: '#605e5c', fontSize: '14px', margin: 0 }}>
          Monitor and manage tasks across all JML processes
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Active Processes</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: JOINER_COLOR }}>{stats.totalProcesses}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Tasks</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#323130' }}>{stats.totalTasks}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Pending</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: WARNING_COLOR }}>{stats.pendingTasks}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>In Progress</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: JOINER_COLOR }}>{stats.inProgressTasks}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Completed</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: SUCCESS_COLOR }}>{stats.completedTasks}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Overdue</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: LEAVER_COLOR }}>{stats.overdueTasks}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '16px',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <SearchBox
          placeholder="Search by name, task, or category..."
          value={searchQuery}
          onChange={(_, v) => setSearchQuery(v || '')}
          styles={{ root: { width: 300 } }}
        />
        <Dropdown
          selectedKey={processFilter}
          options={processFilterOptions}
          onChange={(_, o) => o && setProcessFilter(o.key as ProcessType)}
          styles={{ root: { width: 160 } }}
        />
        {activeView === 'tasks' && (
          <Dropdown
            selectedKey={statusFilter}
            options={statusFilterOptions}
            onChange={(_, o) => o && setStatusFilter(o.key as TaskStatusFilter)}
            styles={{ root: { width: 140 } }}
          />
        )}
        <div style={{ flex: 1 }} />
        <Pivot
          selectedKey={activeView}
          onLinkClick={(item) => item && setActiveView(item.props.itemKey as 'overview' | 'tasks')}
        >
          <PivotItem headerText="Process Overview" itemKey="overview" itemIcon="ViewAll" />
          <PivotItem headerText="Task List" itemKey="tasks" itemIcon="TaskList" />
        </Pivot>
      </div>

      {/* Content */}
      {activeView === 'overview' ? (
        /* Process Overview - 3 Column Layout */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {/* Onboarding Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              background: JOINER_COLOR,
              borderRadius: '8px 8px 0 0',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <Icon iconName="AddFriend" style={{ color: '#fff', fontSize: 18 }} />
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>Onboarding</span>
              <span style={{
                marginLeft: 'auto',
                background: 'rgba(255,255,255,0.2)',
                padding: '2px 8px',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
              }}>
                {onboardingSummaries.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {onboardingSummaries.length === 0 ? (
                <div style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '24px',
                  textAlign: 'center',
                  color: '#8a8886',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                  <Icon iconName="AddFriend" style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }} />
                  <div style={{ fontSize: '13px' }}>No active onboardings</div>
                </div>
              ) : (
                onboardingSummaries.map(summary => (
                  <div
                    key={`onboarding-${summary.id}`}
                    onClick={() => {
                      const ob = onboardings.find(o => o.Id === summary.id);
                      if (ob) { setSelectedOnboarding(ob); setOnboardingPanelOpen(true); }
                    }}
                    style={{
                      background: '#fff',
                      borderRadius: '8px',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      borderLeft: `4px solid ${JOINER_COLOR}`,
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,91,170,0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
                      {summary.employeeName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
                      Starts {formatDate(summary.keyDate)}
                    </div>
                    <ProgressIndicator
                      percentComplete={summary.completionPercentage / 100}
                      barHeight={6}
                      styles={{
                        root: { marginBottom: '8px' },
                        progressBar: { background: JOINER_COLOR },
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {summary.completedTasks}/{summary.totalTasks} tasks
                      </span>
                      {summary.overdueTasks > 0 && (
                        <span style={{
                          fontSize: '11px',
                          color: LEAVER_COLOR,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}>
                          <Icon iconName="Warning" style={{ fontSize: 12 }} />
                          {summary.overdueTasks}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Transfers Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              background: MOVER_COLOR,
              borderRadius: '8px 8px 0 0',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <Icon iconName="Sync" style={{ color: '#fff', fontSize: 18 }} />
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>Transfers</span>
              <span style={{
                marginLeft: 'auto',
                background: 'rgba(255,255,255,0.2)',
                padding: '2px 8px',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
              }}>
                {moverSummaries.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {moverSummaries.length === 0 ? (
                <div style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '24px',
                  textAlign: 'center',
                  color: '#8a8886',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                  <Icon iconName="Sync" style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }} />
                  <div style={{ fontSize: '13px' }}>No active transfers</div>
                </div>
              ) : (
                moverSummaries.map(summary => (
                  <div
                    key={`mover-${summary.id}`}
                    onClick={() => {
                      const mv = movers.find(m => m.Id === summary.id);
                      if (mv) { setSelectedMover(mv); setMoverPanelOpen(true); }
                    }}
                    style={{
                      background: '#fff',
                      borderRadius: '8px',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      borderLeft: `4px solid ${MOVER_COLOR}`,
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(234,88,12,0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
                      {summary.employeeName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
                      Effective {formatDate(summary.keyDate)}
                    </div>
                    <ProgressIndicator
                      percentComplete={summary.completionPercentage / 100}
                      barHeight={6}
                      styles={{
                        root: { marginBottom: '8px' },
                        progressBar: { background: MOVER_COLOR },
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {summary.completedTasks}/{summary.totalTasks} tasks
                      </span>
                      {summary.overdueTasks > 0 && (
                        <span style={{
                          fontSize: '11px',
                          color: LEAVER_COLOR,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}>
                          <Icon iconName="Warning" style={{ fontSize: 12 }} />
                          {summary.overdueTasks}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Offboarding Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              background: LEAVER_COLOR,
              borderRadius: '8px 8px 0 0',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <Icon iconName="UserRemove" style={{ color: '#fff', fontSize: 18 }} />
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>Offboarding</span>
              <span style={{
                marginLeft: 'auto',
                background: 'rgba(255,255,255,0.2)',
                padding: '2px 8px',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
              }}>
                {offboardingSummaries.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {offboardingSummaries.length === 0 ? (
                <div style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '24px',
                  textAlign: 'center',
                  color: '#8a8886',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                  <Icon iconName="UserRemove" style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }} />
                  <div style={{ fontSize: '13px' }}>No active offboardings</div>
                </div>
              ) : (
                offboardingSummaries.map(summary => (
                  <div
                    key={`offboarding-${summary.id}`}
                    onClick={() => {
                      const off = offboardings.find(o => o.Id === summary.id);
                      if (off) { setSelectedOffboarding(off); setOffboardingPanelOpen(true); }
                    }}
                    style={{
                      background: '#fff',
                      borderRadius: '8px',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      borderLeft: `4px solid ${LEAVER_COLOR}`,
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(209,52,56,0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
                      {summary.employeeName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
                      Last day {formatDate(summary.keyDate)}
                    </div>
                    <ProgressIndicator
                      percentComplete={summary.completionPercentage / 100}
                      barHeight={6}
                      styles={{
                        root: { marginBottom: '8px' },
                        progressBar: { background: LEAVER_COLOR },
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {summary.completedTasks}/{summary.totalTasks} tasks
                      </span>
                      {summary.overdueTasks > 0 && (
                        <span style={{
                          fontSize: '11px',
                          color: LEAVER_COLOR,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}>
                          <Icon iconName="Warning" style={{ fontSize: 12 }} />
                          {summary.overdueTasks}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Task List - Accordion by User */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Expand/Collapse All Controls */}
          {tasksByUser.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginBottom: '8px',
            }}>
              <button
                onClick={expandAllUsers}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: '#f3f2f1',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Icon iconName="ExploreContent" style={{ fontSize: 12 }} />
                Expand All
              </button>
              <button
                onClick={collapseAllUsers}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: '#f3f2f1',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Icon iconName="CollapseContent" style={{ fontSize: 12 }} />
                Collapse All
              </button>
            </div>
          )}

          {tasksByUser.length === 0 ? (
            <div style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              color: '#8a8886',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <Icon iconName="TaskList" style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
              <div>No tasks match your filters</div>
            </div>
          ) : (
            tasksByUser.map(([userName, userTasks]) => {
              const isExpanded = expandedUsers.has(userName);
              const completedCount = userTasks.filter(t => t.status === 'Completed').length;
              const overdueCount = userTasks.filter(t => t.isOverdue).length;
              const processTypes = Array.from(new Set(userTasks.map(t => t.processType)));

              return (
                <div
                  key={userName}
                  style={{
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleUserAccordion(userName)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: 'none',
                      background: isExpanded ? '#f9f9f9' : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'left',
                    }}
                  >
                    <Icon
                      iconName={isExpanded ? 'ChevronDown' : 'ChevronRight'}
                      style={{ fontSize: 12, color: '#666' }}
                    />
                    {/* User Avatar */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${JOINER_COLOR} 0%, ${JOINER_COLOR}cc 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
                        {userName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        {processTypes.map(pt => (
                          <span
                            key={pt}
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              background: `${getProcessColor(pt)}15`,
                              color: getProcessColor(pt),
                              fontWeight: 500,
                            }}
                          >
                            {getProcessLabel(pt)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '13px', color: '#666' }}>
                        <strong>{completedCount}</strong>/{userTasks.length} complete
                      </span>
                      {overdueCount > 0 && (
                        <span style={{
                          fontSize: '12px',
                          color: LEAVER_COLOR,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Icon iconName="Warning" style={{ fontSize: 12 }} />
                          {overdueCount} overdue
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Accordion Content - Task Table */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #edebe9' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#fafafa' }}>
                            <th style={{ padding: '10px 16px', fontWeight: 600, color: '#605e5c', textAlign: 'left', fontSize: 12 }}>Task</th>
                            <th style={{ padding: '10px 16px', fontWeight: 600, color: '#605e5c', textAlign: 'left', fontSize: 12 }}>Process</th>
                            <th style={{ padding: '10px 16px', fontWeight: 600, color: '#605e5c', textAlign: 'left', fontSize: 12 }}>Category</th>
                            <th style={{ padding: '10px 16px', fontWeight: 600, color: '#605e5c', textAlign: 'left', fontSize: 12 }}>Status</th>
                            <th style={{ padding: '10px 16px', fontWeight: 600, color: '#605e5c', textAlign: 'left', fontSize: 12 }}>Due Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userTasks.map(task => (
                            <tr
                              key={`${task.processType}-${task.id}`}
                              style={{
                                borderBottom: '1px solid #f3f2f1',
                                background: task.isOverdue ? '#fef2f2' : 'transparent',
                              }}
                            >
                              <td style={{ padding: '10px 16px' }}>
                                <div style={{ fontWeight: 500 }}>{task.title}</div>
                                {task.isOverdue && (
                                  <span style={{ fontSize: 10, color: LEAVER_COLOR, fontWeight: 600 }}>OVERDUE</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  background: `${getProcessColor(task.processType)}15`,
                                  color: getProcessColor(task.processType),
                                  fontWeight: 500,
                                }}>
                                  {getProcessLabel(task.processType)}
                                </span>
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#f3f2f1' }}>
                                  {task.category}
                                </span>
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  background: task.status === 'Completed' ? '#d1fae5' :
                                             task.status === 'In Progress' ? '#dbeafe' :
                                             task.status === 'Blocked' ? '#fee2e2' : '#fef3c7',
                                  color: task.status === 'Completed' ? SUCCESS_COLOR :
                                         task.status === 'In Progress' ? JOINER_COLOR :
                                         task.status === 'Blocked' ? LEAVER_COLOR : WARNING_COLOR,
                                }}>
                                  {task.status}
                                </span>
                              </td>
                              <td style={{ padding: '10px 16px', color: task.isOverdue ? LEAVER_COLOR : '#666' }}>
                                {task.dueDate ? formatDate(task.dueDate) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Employee Detail Panels */}
      <OnboardingForm
        sp={sp}
        isOpen={onboardingPanelOpen}
        mode="view"
        item={selectedOnboarding}
        onDismiss={() => { setOnboardingPanelOpen(false); setSelectedOnboarding(null); }}
        onSaved={() => { setOnboardingPanelOpen(false); setSelectedOnboarding(null); loadData(); }}
      />
      <MoverForm
        sp={sp}
        isOpen={moverPanelOpen}
        mode="view"
        item={selectedMover}
        onDismiss={() => { setMoverPanelOpen(false); setSelectedMover(null); }}
        onSaved={() => { setMoverPanelOpen(false); setSelectedMover(null); loadData(); }}
      />
      <OffboardingForm
        sp={sp}
        isOpen={offboardingPanelOpen}
        mode="view"
        item={selectedOffboarding}
        onDismiss={() => { setOffboardingPanelOpen(false); setSelectedOffboarding(null); }}
        onSaved={() => { setOffboardingPanelOpen(false); setSelectedOffboarding(null); loadData(); }}
      />
    </div>
  );
};

export default TaskManager;
