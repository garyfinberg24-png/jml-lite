// Approval Queue Dashboard - JML Lite
// Displays pending approvals and allows processing approval requests

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { ApprovalService } from '../services/ApprovalService';
import {
  IApproval,
  IApprovalStats,
  ApprovalStatus,
  ApprovalType,
  ApprovalPriority,
} from '../models/IApproval';

interface IProps {
  sp: SPFI;
  currentUserId?: number;
}

type TabType = 'pending' | 'approved' | 'rejected' | 'all';

export const ApprovalQueue: React.FC<IProps> = ({ sp, currentUserId }) => {
  const [approvals, setApprovals] = useState<IApproval[]>([]);
  const [stats, setStats] = useState<IApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedApproval, setSelectedApproval] = useState<IApproval | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [actionComments, setActionComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filterType, setFilterType] = useState<ApprovalType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<ApprovalPriority | 'all'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const service = new ApprovalService(sp);

      // Build filters based on active tab
      const statusFilter: ApprovalStatus[] = [];
      switch (activeTab) {
        case 'pending':
          statusFilter.push(ApprovalStatus.Pending);
          break;
        case 'approved':
          statusFilter.push(ApprovalStatus.Approved);
          break;
        case 'rejected':
          statusFilter.push(ApprovalStatus.Rejected, ApprovalStatus.Cancelled, ApprovalStatus.Expired);
          break;
        // 'all' - no status filter
      }

      const filters: any = {};
      if (statusFilter.length > 0) {
        filters.status = statusFilter;
      }
      if (filterType !== 'all') {
        filters.type = [filterType];
      }
      if (filterPriority !== 'all') {
        filters.priority = [filterPriority];
      }

      const [approvalsData, statsData] = await Promise.all([
        service.getApprovals(filters),
        service.getApprovalStats(currentUserId),
      ]);

      setApprovals(approvalsData);
      setStats(statsData);
    } catch (error) {
      console.error('[ApprovalQueue] Error loading data:', error);
    }
    setLoading(false);
  }, [sp, activeTab, filterType, filterPriority, currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = (approval: IApproval): void => {
    setSelectedApproval(approval);
    setActionType('approve');
    setActionComments('');
    setActionDialogOpen(true);
  };

  const handleReject = (approval: IApproval): void => {
    setSelectedApproval(approval);
    setActionType('reject');
    setActionComments('');
    setActionDialogOpen(true);
  };

  const processAction = async (): Promise<void> => {
    if (!selectedApproval?.Id || !actionType) return;

    setProcessing(true);
    try {
      const service = new ApprovalService(sp);

      if (actionType === 'approve') {
        await service.approve(selectedApproval.Id, actionComments);
      } else {
        await service.reject(selectedApproval.Id, actionComments);
      }

      setActionDialogOpen(false);
      setSelectedApproval(null);
      setActionType(null);
      setActionComments('');
      await loadData();
    } catch (error) {
      console.error('[ApprovalQueue] Error processing action:', error);
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: ApprovalStatus): React.ReactElement => {
    const styles: Record<ApprovalStatus, { bg: string; color: string; icon: string }> = {
      [ApprovalStatus.Pending]: { bg: '#fff4e5', color: '#ea580c', icon: 'Clock' },
      [ApprovalStatus.Approved]: { bg: '#e6ffed', color: '#047857', icon: 'CheckMark' },
      [ApprovalStatus.Rejected]: { bg: '#fef2f2', color: '#dc2626', icon: 'Cancel' },
      [ApprovalStatus.Cancelled]: { bg: '#f3f4f6', color: '#6b7280', icon: 'Blocked' },
      [ApprovalStatus.Expired]: { bg: '#fef2f2', color: '#9ca3af', icon: 'Warning' },
    };
    const style = styles[status] || styles[ApprovalStatus.Pending];

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        background: style.bg,
        color: style.color,
      }}>
        <Icon iconName={style.icon} style={{ fontSize: 12 }} />
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: ApprovalPriority): React.ReactElement => {
    const styles: Record<ApprovalPriority, { bg: string; color: string }> = {
      [ApprovalPriority.Low]: { bg: '#f3f4f6', color: '#6b7280' },
      [ApprovalPriority.Medium]: { bg: '#dbeafe', color: '#2563eb' },
      [ApprovalPriority.High]: { bg: '#fef3c7', color: '#d97706' },
      [ApprovalPriority.Urgent]: { bg: '#fef2f2', color: '#dc2626' },
    };
    const style = styles[priority] || styles[ApprovalPriority.Medium];

    return (
      <span style={{
        display: 'inline-flex',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        background: style.bg,
        color: style.color,
      }}>
        {priority}
      </span>
    );
  };

  const getTypeBadge = (type: ApprovalType): React.ReactElement => {
    const icons: Record<ApprovalType, string> = {
      [ApprovalType.Onboarding]: 'AddFriend',
      [ApprovalType.Mover]: 'Sync',
      [ApprovalType.Offboarding]: 'UserRemove',
      [ApprovalType.SystemAccess]: 'Permissions',
      [ApprovalType.Equipment]: 'Devices3',
      [ApprovalType.Training]: 'Education',
    };

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        color: '#6b7280',
      }}>
        <Icon iconName={icons[type] || 'Document'} style={{ fontSize: 14 }} />
        {type}
      </span>
    );
  };

  const formatDate = (date?: Date): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isOverdue = (approval: IApproval): boolean => {
    if (!approval.DueDate || approval.Status !== ApprovalStatus.Pending) return false;
    return new Date(approval.DueDate) < new Date();
  };

  const typeOptions: IDropdownOption[] = [
    { key: 'all', text: 'All Types' },
    { key: ApprovalType.Onboarding, text: 'Onboarding' },
    { key: ApprovalType.Mover, text: 'Mover' },
    { key: ApprovalType.Offboarding, text: 'Offboarding' },
    { key: ApprovalType.SystemAccess, text: 'System Access' },
    { key: ApprovalType.Equipment, text: 'Equipment' },
    { key: ApprovalType.Training, text: 'Training' },
  ];

  const priorityOptions: IDropdownOption[] = [
    { key: 'all', text: 'All Priorities' },
    { key: ApprovalPriority.Low, text: 'Low' },
    { key: ApprovalPriority.Medium, text: 'Medium' },
    { key: ApprovalPriority.High, text: 'High' },
    { key: ApprovalPriority.Urgent, text: 'Urgent' },
  ];

  if (loading && approvals.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spinner size={SpinnerSize.large} label="Loading approvals..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#1e293b' }}>
            <Icon iconName="Taskboard" style={{ marginRight: 12, color: '#005BAA' }} />
            Approval Queue
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Review and process pending approval requests
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}>
          <div style={{
            padding: 16,
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ea580c' }}>{stats.pending}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Pending</div>
          </div>
          <div style={{
            padding: 16,
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{stats.overdue}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Overdue</div>
          </div>
          <div style={{
            padding: 16,
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{stats.dueToday}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Due Today</div>
          </div>
          <div style={{
            padding: 16,
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#047857' }}>{stats.approved}</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Approved</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid #e5e7eb',
        marginBottom: 16,
      }}>
        {(['pending', 'approved', 'rejected', 'all'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: activeTab === tab ? '#fff' : 'transparent',
              borderBottom: activeTab === tab ? '2px solid #005BAA' : '2px solid transparent',
              color: activeTab === tab ? '#005BAA' : '#6b7280',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              fontSize: 14,
              textTransform: 'capitalize',
            }}
          >
            {tab}
            {tab === 'pending' && stats && stats.pending > 0 && (
              <span style={{
                marginLeft: 6,
                padding: '2px 6px',
                background: '#fef3c7',
                color: '#d97706',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 600,
              }}>
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Dropdown
          placeholder="Filter by type..."
          selectedKey={filterType}
          options={typeOptions}
          onChange={(_, opt) => setFilterType((opt?.key as ApprovalType | 'all') || 'all')}
          style={{ width: 180 }}
        />
        <Dropdown
          placeholder="Filter by priority..."
          selectedKey={filterPriority}
          options={priorityOptions}
          onChange={(_, opt) => setFilterPriority((opt?.key as ApprovalPriority | 'all') || 'all')}
          style={{ width: 180 }}
        />
      </div>

      {/* Approval List */}
      {approvals.length === 0 ? (
        <div style={{
          padding: 48,
          textAlign: 'center',
          background: '#fff',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
        }}>
          <Icon iconName="CheckList" style={{ fontSize: 48, color: '#d1d5db', marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 500, color: '#6b7280' }}>
            No approvals found
          </div>
          <div style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>
            {activeTab === 'pending' ? 'All caught up! No pending approvals.' : 'No approvals match the current filters.'}
          </div>
        </div>
      ) : (
        <div style={{
          background: '#fff',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Request</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Employee</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Priority</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Due Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map(approval => (
                <tr
                  key={approval.Id}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    background: isOverdue(approval) ? '#fef2f2' : '#fff',
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{approval.Title}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      Requested {formatDate(approval.RequestedDate)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#1e293b' }}>{approval.EmployeeName}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {approval.Department} {approval.JobTitle && `• ${approval.JobTitle}`}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {getTypeBadge(approval.ApprovalType)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {getPriorityBadge(approval.Priority)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: isOverdue(approval) ? '#dc2626' : '#6b7280', fontWeight: isOverdue(approval) ? 600 : 400 }}>
                      {formatDate(approval.DueDate)}
                      {isOverdue(approval) && (
                        <Icon iconName="Warning" style={{ marginLeft: 4, fontSize: 12, color: '#dc2626' }} />
                      )}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {getStatusBadge(approval.Status)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {approval.Status === ApprovalStatus.Pending && (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleApprove(approval)}
                          style={{
                            padding: '6px 12px',
                            background: '#047857',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Icon iconName="CheckMark" style={{ fontSize: 12 }} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(approval)}
                          style={{
                            padding: '6px 12px',
                            background: '#fff',
                            color: '#dc2626',
                            border: '1px solid #dc2626',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Icon iconName="Cancel" style={{ fontSize: 12 }} />
                          Reject
                        </button>
                      </div>
                    )}
                    {approval.Status !== ApprovalStatus.Pending && (
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>
                        {approval.ApprovedByName && `By ${approval.ApprovedByName}`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog
        hidden={!actionDialogOpen}
        onDismiss={() => setActionDialogOpen(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: actionType === 'approve' ? 'Approve Request' : 'Reject Request',
          subText: `${actionType === 'approve' ? 'Approve' : 'Reject'} the ${selectedApproval?.ApprovalType.toLowerCase()} request for ${selectedApproval?.EmployeeName}?`,
        }}
        modalProps={{ isBlocking: true }}
      >
        <TextField
          label={actionType === 'approve' ? 'Comments (optional)' : 'Rejection Reason'}
          multiline
          rows={3}
          value={actionComments}
          onChange={(_, v) => setActionComments(v || '')}
          required={actionType === 'reject'}
          placeholder={actionType === 'approve' ? 'Add any comments...' : 'Please provide a reason for rejection...'}
        />
        <DialogFooter>
          <PrimaryButton
            onClick={processAction}
            disabled={processing || (actionType === 'reject' && !actionComments.trim())}
            text={processing ? 'Processing...' : (actionType === 'approve' ? 'Approve' : 'Reject')}
            style={{
              background: actionType === 'approve' ? '#047857' : '#dc2626',
              border: 'none',
            }}
          />
          <DefaultButton
            onClick={() => setActionDialogOpen(false)}
            text="Cancel"
            disabled={processing}
          />
        </DialogFooter>
      </Dialog>
    </div>
  );
};
