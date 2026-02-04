// Audit Log Viewer — View system activity trail
// Part of JML Lite Admin Center

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { RmAuditTrailService, IAuditEntry } from '../services/JmlAuditTrailService';

interface IProps {
  sp: SPFI;
}

// Action colors for visual distinction
const ACTION_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  'WorkflowStarted': { bg: '#dbeafe', text: '#1e40af', icon: 'Play' },
  'WorkflowCompleted': { bg: '#dcfce7', text: '#166534', icon: 'CheckMark' },
  'TaskAssigned': { bg: '#fef3c7', text: '#92400e', icon: 'Contact' },
  'TaskCompleted': { bg: '#d1fae5', text: '#065f46', icon: 'CompletedSolid' },
  'NotificationSent': { bg: '#e0e7ff', text: '#3730a3', icon: 'Mail' },
  'NotificationQueued': { bg: '#f3e8ff', text: '#6b21a8', icon: 'MailSchedule' },
  'ApprovalRequested': { bg: '#fff7ed', text: '#9a3412', icon: 'WaitlistConfirm' },
  'ApprovalGranted': { bg: '#dcfce7', text: '#166534', icon: 'Accept' },
  'ApprovalRejected': { bg: '#fee2e2', text: '#991b1b', icon: 'Cancel' },
  'ItemCreated': { bg: '#ecfdf5', text: '#047857', icon: 'Add' },
  'ItemUpdated': { bg: '#fefce8', text: '#a16207', icon: 'Edit' },
  'ItemDeleted': { bg: '#fef2f2', text: '#dc2626', icon: 'Delete' },
};

const ENTITY_TYPE_OPTIONS: IDropdownOption[] = [
  { key: '', text: 'All Entity Types' },
  { key: 'Onboarding', text: 'Onboarding' },
  { key: 'Mover', text: 'Transfer (Mover)' },
  { key: 'Offboarding', text: 'Offboarding' },
  { key: 'Task', text: 'Tasks' },
  { key: 'Notification', text: 'Notifications' },
  { key: 'Approval', text: 'Approvals' },
];

const LIMIT_OPTIONS: IDropdownOption[] = [
  { key: 50, text: 'Last 50 entries' },
  { key: 100, text: 'Last 100 entries' },
  { key: 250, text: 'Last 250 entries' },
  { key: 500, text: 'Last 500 entries' },
];

export const AuditLogViewer: React.FC<IProps> = ({ sp }) => {
  const [auditService] = useState(() => new RmAuditTrailService(sp));
  const [entries, setEntries] = useState<IAuditEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<IAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState<number>(100);

  const loadAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const filters: { entityType?: string; top?: number } = { top: limit };
      if (entityTypeFilter) {
        filters.entityType = entityTypeFilter;
      }
      const items = await auditService.getAuditLog(filters);
      setEntries(items);
      setFilteredEntries(items);
    } catch (error) {
      console.error('[AuditLogViewer] Error loading audit log:', error);
      setEntries([]);
      setFilteredEntries([]);
    }
    setLoading(false);
  }, [auditService, entityTypeFilter, limit]);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredEntries(entries);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = entries.filter(entry =>
      entry.Action?.toLowerCase().includes(query) ||
      entry.EntityTitle?.toLowerCase().includes(query) ||
      entry.EntityType?.toLowerCase().includes(query) ||
      entry.PerformedByName?.toLowerCase().includes(query) ||
      entry.Details?.toLowerCase().includes(query)
    );
    setFilteredEntries(filtered);
  }, [searchQuery, entries]);

  const getActionStyle = (action: string): { bg: string; text: string; icon: string } => {
    return ACTION_COLORS[action] || { bg: '#f3f4f6', text: '#374151', icon: 'Info' };
  };

  const formatTimestamp = (date?: Date): string => {
    if (!date) return '--';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseDetails = (details?: string): Record<string, any> | null => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  const renderDetailsBadges = (details?: string): React.ReactNode => {
    const parsed = parseDetails(details);
    if (!parsed) return null;

    const badges: React.ReactNode[] = [];
    if (parsed.employee) {
      badges.push(
        <span key="employee" style={{ padding: '2px 8px', background: '#f0f0f0', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>
          {parsed.employee}
        </span>
      );
    }
    if (parsed.processType) {
      badges.push(
        <span key="processType" style={{ padding: '2px 8px', background: '#e0e7ff', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>
          {parsed.processType}
        </span>
      );
    }
    if (parsed.completedBy) {
      badges.push(
        <span key="completedBy" style={{ padding: '2px 8px', background: '#d1fae5', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>
          by {parsed.completedBy}
        </span>
      );
    }
    if (parsed.assignedTo) {
      badges.push(
        <span key="assignedTo" style={{ padding: '2px 8px', background: '#fef3c7', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>
          assigned to {parsed.assignedTo}
        </span>
      );
    }

    return badges.length > 0 ? <div style={{ marginTop: '4px' }}>{badges}</div> : null;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
        <Spinner size={SpinnerSize.large} label="Loading audit log..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon iconName="History" style={{ fontSize: '24px', color: '#ffffff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0', color: '#1a1a1a' }}>
              Audit Log
            </h3>
            <p style={{ color: '#605e5c', fontSize: '13px', margin: 0 }}>
              View system activity trail for JML processes, tasks, and notifications
            </p>
          </div>
          <DefaultButton
            text="Refresh"
            iconProps={{ iconName: 'Refresh' }}
            onClick={loadAuditLog}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <SearchBox
            placeholder="Search audit log..."
            value={searchQuery}
            onChange={(_, value) => setSearchQuery(value || '')}
            styles={{ root: { width: '280px' } }}
          />
          <Dropdown
            placeholder="Filter by entity type"
            options={ENTITY_TYPE_OPTIONS}
            selectedKey={entityTypeFilter}
            onChange={(_, option) => setEntityTypeFilter((option?.key as string) || '')}
            styles={{ root: { width: '180px' } }}
          />
          <Dropdown
            placeholder="Limit"
            options={LIMIT_OPTIONS}
            selectedKey={limit}
            onChange={(_, option) => setLimit((option?.key as number) || 100)}
            styles={{ root: { width: '160px' } }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#005BAA' }}>{filteredEntries.length}</div>
          <div style={{ fontSize: '12px', color: '#605e5c' }}>Total Entries</div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#166534' }}>
            {filteredEntries.filter(e => e.Action?.includes('Completed')).length}
          </div>
          <div style={{ fontSize: '12px', color: '#605e5c' }}>Completions</div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#3730a3' }}>
            {filteredEntries.filter(e => e.Action?.includes('Notification')).length}
          </div>
          <div style={{ fontSize: '12px', color: '#605e5c' }}>Notifications</div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ea580c' }}>
            {filteredEntries.filter(e => e.Action?.includes('Workflow')).length}
          </div>
          <div style={{ fontSize: '12px', color: '#605e5c' }}>Workflows</div>
        </div>
      </div>

      {/* Entries List */}
      <div style={{ background: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {filteredEntries.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#8a8886' }}>
            <Icon iconName="History" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
            <div style={{ fontSize: '16px', fontWeight: 500 }}>No audit entries found</div>
            <div style={{ fontSize: '13px', marginTop: '8px' }}>
              {searchQuery ? 'Try adjusting your search criteria' : 'Activity will appear here as users interact with the system'}
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflow: 'auto' }}>
            {filteredEntries.map((entry, idx) => {
              const style = getActionStyle(entry.Action);
              return (
                <div
                  key={entry.Id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '16px 20px',
                    borderBottom: idx < filteredEntries.length - 1 ? '1px solid #edebe9' : 'none',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: style.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon iconName={style.icon} style={{ fontSize: '16px', color: style.text }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        padding: '2px 8px',
                        background: style.bg,
                        color: style.text,
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}>
                        {entry.Action}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        background: '#f3f4f6',
                        color: '#374151',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}>
                        {entry.EntityType}
                      </span>
                    </div>
                    <div style={{ fontWeight: 500, fontSize: '14px', color: '#1a1a1a', marginBottom: '2px' }}>
                      {entry.EntityTitle || `${entry.EntityType} #${entry.EntityId}`}
                    </div>
                    {renderDetailsBadges(entry.Details)}
                  </div>

                  {/* Meta */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', color: '#605e5c', marginBottom: '2px' }}>
                      {formatTimestamp(entry.Timestamp)}
                    </div>
                    {entry.PerformedByName && (
                      <div style={{ fontSize: '11px', color: '#8a8886', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                        <Icon iconName="Contact" style={{ fontSize: '10px' }} />
                        {entry.PerformedByName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ background: '#f3f2f1', borderRadius: '8px', padding: '16px' }}>
        <div style={{ fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon iconName="Info" style={{ color: '#0078d4' }} />
          About Audit Logging
        </div>
        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: '#323130', lineHeight: '1.6' }}>
          <li>Audit entries are created automatically when workflows start/complete</li>
          <li>Task assignments and completions are logged</li>
          <li>Notification attempts (sent or queued) are tracked</li>
          <li>Approval requests and decisions are recorded</li>
          <li>Audit data is stored in the <strong>RM_AuditTrail</strong> list</li>
        </ul>
      </div>
    </div>
  );
};

export default AuditLogViewer;
