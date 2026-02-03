import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { MoverService } from '../services/MoverService';
import { IMover, MoverStatus } from '../models/IMover';
import { MoverForm } from './MoverForm';

interface IProps {
  sp: SPFI;
  onStartWizard?: () => void;
}

type ViewTab = 'all' | 'inProgress' | 'completed' | 'onHold';

// Mover theme: Orange (#ea580c)
const MOVER_COLOR = '#ea580c';

const STATUS_COLORS: Record<string, string> = {
  'Not Started': '#605e5c',
  'In Progress': '#ea580c',
  'Completed': '#059669',
  'On Hold': '#d97706',
  'Cancelled': '#dc2626',
};

export const MoverTracker: React.FC<IProps> = ({ sp, onStartWizard }) => {
  const [movers, setMovers] = useState<IMover[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'create' | 'edit' | 'view'>('view');
  const [selectedItem, setSelectedItem] = useState<IMover | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IMover | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const svc = new MoverService(sp);
      const items = await svc.getMovers();
      setMovers(items);
    } catch (error) {
      console.error('[MoverTracker] Error loading:', error);
      setMovers([]);
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = movers.filter(m => {
    switch (activeTab) {
      case 'inProgress': return m.Status === MoverStatus.InProgress;
      case 'completed': return m.Status === MoverStatus.Completed;
      case 'onHold': return m.Status === MoverStatus.OnHold;
      default: return true;
    }
  });

  const tabs: { key: ViewTab; label: string }[] = [
    { key: 'all', label: `All (${movers.length})` },
    { key: 'inProgress', label: `In Progress (${movers.filter(m => m.Status === MoverStatus.InProgress).length})` },
    { key: 'completed', label: `Completed (${movers.filter(m => m.Status === MoverStatus.Completed).length})` },
    { key: 'onHold', label: `On Hold (${movers.filter(m => m.Status === MoverStatus.OnHold).length})` },
  ];

  const openView = (item: IMover): void => { setSelectedItem(item); setPanelMode('view'); setPanelOpen(true); };
  const openEdit = (item: IMover, e: React.MouseEvent): void => {
    e.stopPropagation();
    setSelectedItem(item); setPanelMode('edit'); setPanelOpen(true);
  };
  const confirmDelete = (item: IMover, e: React.MouseEvent): void => {
    e.stopPropagation();
    setDeleteTarget(item); setDeleteDialogOpen(true);
  };
  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget?.Id) return;
    setDeleting(true);
    try {
      const svc = new MoverService(sp);
      await svc.deleteMover(deleteTarget.Id);
    } catch { /* handled */ }
    setDeleting(false);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    loadData();
  };

  const getDaysUntilEffective = (date: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effective = new Date(date);
    effective.setHours(0, 0, 0, 0);
    return Math.ceil((effective.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#605e5c' }}>Loading transfer records...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Internal Transfers</h2>
        <button onClick={onStartWizard} style={{
          padding: '8px 20px', borderRadius: 4, border: 'none', background: MOVER_COLOR, color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon iconName="Add" style={{ fontSize: 14 }} /> New Transfer
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #edebe9' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
            color: activeTab === tab.key ? MOVER_COLOR : '#605e5c',
            borderBottom: activeTab === tab.key ? `2px solid ${MOVER_COLOR}` : '2px solid transparent',
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${MOVER_COLOR}`, textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Employee</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>From → To</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Type</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Effective Date</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Progress</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#323130', width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const daysUntil = getDaysUntilEffective(m.EffectiveDate);
              return (
                <tr key={m.Id} onClick={() => openView(m)}
                  style={{ borderBottom: '1px solid #edebe9', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fff7ed')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>{m.EmployeeName}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: '#991b1b' }}>{m.CurrentDepartment || m.CurrentJobTitle}</span>
                      <span style={{ margin: '0 4px' }}>→</span>
                      <span style={{ color: '#166534' }}>{m.NewDepartment || m.NewJobTitle}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>{m.MoverType}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div>{m.EffectiveDate?.toLocaleDateString()}</div>
                    {m.Status !== MoverStatus.Completed && m.Status !== MoverStatus.Cancelled && (
                      <div style={{
                        fontSize: 11,
                        color: daysUntil < 0 ? '#dc2626' : daysUntil <= 7 ? '#d97706' : '#605e5c',
                      }}>
                        {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                          daysUntil === 0 ? 'Today' : `${daysUntil} days`}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ width: 120 }}>
                      <div style={{ width: '100%', height: 8, background: '#edebe9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${m.CompletionPercentage}%`, height: '100%',
                          background: m.CompletionPercentage === 100 ? '#059669' : MOVER_COLOR,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#605e5c', marginTop: 2 }}>
                        {m.CompletedTasks}/{m.TotalTasks} ({m.CompletionPercentage}%)
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: `${STATUS_COLORS[m.Status] || '#605e5c'}15`,
                      color: STATUS_COLORS[m.Status] || '#605e5c',
                    }}>{m.Status}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={(e) => openEdit(m, e)} title="Edit" style={{
                        background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4,
                      }}><Icon iconName="Edit" style={{ fontSize: 14, color: '#605e5c' }} /></button>
                      <button onClick={(e) => confirmDelete(m, e)} title="Delete" style={{
                        background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4,
                      }}><Icon iconName="Delete" style={{ fontSize: 14, color: '#d13438' }} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#8a8886' }}>No transfer records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <MoverForm
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
          title: 'Delete Transfer',
          subText: `Are you sure you want to delete the transfer record for "${deleteTarget?.EmployeeName}"? All associated tasks will also be deleted.`,
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
