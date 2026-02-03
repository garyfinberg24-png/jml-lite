import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { OffboardingService } from '../services/OffboardingService';
import { IOffboarding, OffboardingStatus } from '../models/IOffboarding';
import { OffboardingForm } from './OffboardingForm';

interface IProps {
  sp: SPFI;
  onStartWizard?: () => void;
}

type ViewTab = 'all' | 'inProgress' | 'completed' | 'onHold';

const STATUS_COLORS: Record<string, string> = {
  'Not Started': '#605e5c',
  'In Progress': '#2563eb',
  'Completed': '#059669',
  'On Hold': '#d97706',
  'Cancelled': '#dc2626',
};

const TERMINATION_TYPE_COLORS: Record<string, string> = {
  'Resignation': '#005BAA',
  'Termination': '#dc2626',
  'Redundancy': '#d97706',
  'Retirement': '#059669',
  'Contract End': '#2563eb',
  'Other': '#605e5c',
};

export const OffboardingTracker: React.FC<IProps> = ({ sp, onStartWizard }) => {
  const [offboardings, setOffboardings] = useState<IOffboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'create' | 'edit' | 'view'>('view');
  const [selectedItem, setSelectedItem] = useState<IOffboarding | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IOffboarding | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const svc = new OffboardingService(sp);
      const items = await svc.getOffboardings();
      setOffboardings(items);
    } catch (error) {
      console.error('[OffboardingTracker] Error loading:', error);
      setOffboardings([]);
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = offboardings.filter(ob => {
    switch (activeTab) {
      case 'inProgress': return ob.Status === OffboardingStatus.InProgress;
      case 'completed': return ob.Status === OffboardingStatus.Completed;
      case 'onHold': return ob.Status === OffboardingStatus.OnHold;
      default: return true;
    }
  });

  const tabs: { key: ViewTab; label: string }[] = [
    { key: 'all', label: `All (${offboardings.length})` },
    { key: 'inProgress', label: `In Progress (${offboardings.filter(o => o.Status === OffboardingStatus.InProgress).length})` },
    { key: 'completed', label: `Completed (${offboardings.filter(o => o.Status === OffboardingStatus.Completed).length})` },
    { key: 'onHold', label: `On Hold (${offboardings.filter(o => o.Status === OffboardingStatus.OnHold).length})` },
  ];

  const openView = (item: IOffboarding): void => { setSelectedItem(item); setPanelMode('view'); setPanelOpen(true); };
  const openEdit = (item: IOffboarding, e: React.MouseEvent): void => {
    e.stopPropagation();
    setSelectedItem(item); setPanelMode('edit'); setPanelOpen(true);
  };
  const confirmDelete = (item: IOffboarding, e: React.MouseEvent): void => {
    e.stopPropagation();
    setDeleteTarget(item); setDeleteDialogOpen(true);
  };
  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget?.Id) return;
    setDeleting(true);
    try {
      const svc = new OffboardingService(sp);
      await svc.deleteOffboarding(deleteTarget.Id);
    } catch { /* handled */ }
    setDeleting(false);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    loadData();
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return '\u2014';
    return date.toLocaleDateString();
  };

  const getDaysUntilLastDay = (lastWorkingDate: Date | undefined): React.ReactNode => {
    if (!lastWorkingDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDay = new Date(lastWorkingDate);
    lastDay.setHours(0, 0, 0, 0);
    const diffTime = lastDay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span style={{ color: '#605e5c', fontSize: 11 }}>({Math.abs(diffDays)} days ago)</span>;
    } else if (diffDays === 0) {
      return <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 600 }}>(Today!)</span>;
    } else if (diffDays <= 7) {
      return <span style={{ color: '#d97706', fontSize: 11 }}>({diffDays} days left)</span>;
    }
    return <span style={{ color: '#605e5c', fontSize: 11 }}>({diffDays} days)</span>;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#605e5c' }}>Loading offboarding records...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Offboarding</h2>
        <button onClick={onStartWizard} style={{
          padding: '8px 20px', borderRadius: 4, border: 'none', background: '#d13438', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon iconName="Add" style={{ fontSize: 14 }} /> Start Offboarding
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #edebe9' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
            color: activeTab === tab.key ? '#d13438' : '#605e5c',
            borderBottom: activeTab === tab.key ? '2px solid #d13438' : '2px solid transparent',
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #d13438', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Employee</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Position</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Department</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Type</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Last Day</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Progress</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130', width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ob => (
              <tr key={ob.Id} onClick={() => openView(ob)}
                style={{ borderBottom: '1px solid #edebe9', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '10px 16px', fontWeight: 500 }}>{ob.EmployeeName}</td>
                <td style={{ padding: '10px 16px' }}>{ob.JobTitle || '\u2014'}</td>
                <td style={{ padding: '10px 16px' }}>{ob.Department || '\u2014'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                    background: `${TERMINATION_TYPE_COLORS[ob.TerminationType] || '#605e5c'}15`,
                    color: TERMINATION_TYPE_COLORS[ob.TerminationType] || '#605e5c',
                  }}>{ob.TerminationType}</span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span>{formatDate(ob.LastWorkingDate)}</span>
                    {getDaysUntilLastDay(ob.LastWorkingDate)}
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ width: 120 }}>
                    <div style={{ width: '100%', height: 8, background: '#edebe9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${ob.CompletionPercentage}%`, height: '100%',
                        background: ob.CompletionPercentage === 100 ? '#059669' : '#d13438',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#605e5c', marginTop: 2 }}>{ob.CompletedTasks}/{ob.TotalTasks} ({ob.CompletionPercentage}%)</div>
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: `${STATUS_COLORS[ob.Status] || '#605e5c'}15`,
                    color: STATUS_COLORS[ob.Status] || '#605e5c',
                  }}>{ob.Status}</span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={(e) => openEdit(ob, e)} title="Edit" style={{
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4,
                    }}><Icon iconName="Edit" style={{ fontSize: 14, color: '#605e5c' }} /></button>
                    <button onClick={(e) => confirmDelete(ob, e)} title="Delete" style={{
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4,
                    }}><Icon iconName="Delete" style={{ fontSize: 14, color: '#d13438' }} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#8a8886' }}>No offboarding records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <OffboardingForm
        sp={sp}
        isOpen={panelOpen}
        mode={panelMode}
        item={selectedItem}
        onDismiss={() => setPanelOpen(false)}
        onSaved={() => { setPanelOpen(false); loadData(); }}
      />


      <Dialog
        hidden={!deleteDialogOpen}
        onDismiss={() => setDeleteDialogOpen(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Delete Offboarding',
          subText: `Are you sure you want to delete the offboarding for "${deleteTarget?.EmployeeName}"? All associated tasks and asset returns will also be deleted.`,
        }}
      >
        <DialogFooter>
          <DefaultButton onClick={() => setDeleteDialogOpen(false)} text="Cancel" />
          <PrimaryButton onClick={handleDelete} text={deleting ? 'Deleting...' : 'Delete'} disabled={deleting}
            styles={{ root: { background: '#d13438', border: 'none' }, rootHovered: { background: '#a4262c' } }} />
        </DialogFooter>
      </Dialog>
    </div>
  );
};
