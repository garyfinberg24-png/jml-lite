// Classification Rules Admin - JML Lite
// Admin UI for configuring default assignment and approval routing per classification

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPFI } from '@pnp/sp';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { SpinButton } from '@fluentui/react/lib/SpinButton';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { PrimaryButton, DefaultButton, IconButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { ClassificationRulesService } from '../services/ClassificationRulesService';
import {
  IClassificationRule,
  IClassificationRuleInput,
} from '../models/IClassificationRules';
import {
  TaskClassification,
  TASK_CLASSIFICATION_INFO,
} from '../models/ITaskLibrary';

interface IProps {
  sp: SPFI;
}

// Classification options for dropdown
const CLASSIFICATION_OPTIONS: IDropdownOption[] = Object.values(TaskClassification).map(c => ({
  key: c,
  text: `${c} - ${TASK_CLASSIFICATION_INFO[c]?.label || c}`,
}));

// Assignment type options
const ASSIGNEE_TYPE_OPTIONS: IDropdownOption[] = [
  { key: 'Role', text: 'Role/Team' },
  { key: 'Specific', text: 'Specific Person' },
  { key: 'Manager', text: 'Hiring Manager' },
  { key: 'Employee', text: 'Employee (Self-Service)' },
];

// Approver type options
const APPROVER_TYPE_OPTIONS: IDropdownOption[] = [
  { key: 'Role', text: 'Role/Team' },
  { key: 'Specific', text: 'Specific Person' },
  { key: 'Manager', text: 'Hiring Manager' },
  { key: 'Skip-Level', text: 'Skip-Level Manager' },
];

// Priority options
const PRIORITY_OPTIONS: IDropdownOption[] = [
  { key: 'Low', text: 'Low' },
  { key: 'Medium', text: 'Medium' },
  { key: 'High', text: 'High' },
  { key: 'Critical', text: 'Critical' },
];

// Offset type options
const OFFSET_TYPE_OPTIONS: IDropdownOption[] = [
  { key: 'before-start', text: 'Before Start Date' },
  { key: 'on-start', text: 'On Start Date' },
  { key: 'after-start', text: 'After Start Date' },
];

// Default form data
const getEmptyFormData = (): IClassificationRuleInput => ({
  Classification: TaskClassification.DOC,
  ProcessTypes: [],
  Departments: [],
  DefaultAssigneeType: 'Role',
  DefaultAssigneeRole: '',
  RequiresApproval: false,
  EscalationEnabled: false,
  AutoApproveEnabled: false,
  SendEmailNotification: true,
  SendTeamsNotification: false,
  NotifyOnAssignment: true,
  NotifyOnCompletion: true,
  NotifyManagerOnCompletion: false,
  DefaultOffsetType: 'on-start',
  DefaultDaysOffset: 0,
  DefaultPriority: 'Medium',
  SlaEnabled: false,
  Description: '',
  IsActive: true,
});

export const ClassificationRulesAdmin: React.FC<IProps> = ({ sp }) => {
  const [rules, setRules] = useState<IClassificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<IClassificationRule | null>(null);
  const [formData, setFormData] = useState<IClassificationRuleInput>(getEmptyFormData());

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<IClassificationRule | null>(null);

  const service = new ClassificationRulesService(sp);

  // Load rules
  const loadRules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await service.getClassificationRules();
      setRules(data);
    } catch (err) {
      console.error('[ClassificationRulesAdmin] Error loading rules:', err);
      setError('Failed to load classification rules');
    }
    setLoading(false);
  }, [sp]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Open panel for new rule
  const handleNewRule = (): void => {
    setEditingRule(null);
    setFormData(getEmptyFormData());
    setIsPanelOpen(true);
  };

  // Open panel for editing
  const handleEditRule = (rule: IClassificationRule): void => {
    setEditingRule(rule);
    setFormData({
      Classification: rule.Classification,
      ProcessTypes: rule.ProcessTypes || [],
      Departments: rule.Departments || [],
      DefaultAssigneeType: rule.DefaultAssigneeType,
      DefaultAssigneeRole: rule.DefaultAssigneeRole,
      DefaultAssigneeId: rule.DefaultAssigneeId,
      DefaultAssigneeName: rule.DefaultAssigneeName,
      DefaultAssigneeEmail: rule.DefaultAssigneeEmail,
      RequiresApproval: rule.RequiresApproval,
      ApproverType: rule.ApproverType,
      ApproverRole: rule.ApproverRole,
      ApproverId: rule.ApproverId,
      ApproverName: rule.ApproverName,
      ApproverEmail: rule.ApproverEmail,
      EscalationEnabled: rule.EscalationEnabled,
      EscalationDays: rule.EscalationDays,
      EscalationApproverType: rule.EscalationApproverType,
      EscalationApproverRole: rule.EscalationApproverRole,
      EscalationApproverId: rule.EscalationApproverId,
      EscalationApproverName: rule.EscalationApproverName,
      AutoApproveEnabled: rule.AutoApproveEnabled,
      AutoApproveMaxCost: rule.AutoApproveMaxCost,
      AutoApproveMaxDays: rule.AutoApproveMaxDays,
      SendEmailNotification: rule.SendEmailNotification,
      SendTeamsNotification: rule.SendTeamsNotification,
      NotifyOnAssignment: rule.NotifyOnAssignment,
      NotifyOnCompletion: rule.NotifyOnCompletion,
      NotifyManagerOnCompletion: rule.NotifyManagerOnCompletion,
      TeamsChannelWebhook: rule.TeamsChannelWebhook,
      DefaultOffsetType: rule.DefaultOffsetType,
      DefaultDaysOffset: rule.DefaultDaysOffset,
      DefaultPriority: rule.DefaultPriority,
      SlaEnabled: rule.SlaEnabled,
      SlaDays: rule.SlaDays,
      SlaWarningDays: rule.SlaWarningDays,
      Description: rule.Description,
      IsActive: rule.IsActive,
      SortOrder: rule.SortOrder,
    });
    setIsPanelOpen(true);
  };

  // Save rule
  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError('');
    try {
      if (editingRule) {
        await service.updateRule(editingRule.Id!, formData);
        setSuccess('Rule updated successfully');
      } else {
        await service.createRule(formData);
        setSuccess('Rule created successfully');
      }
      setIsPanelOpen(false);
      await loadRules();
    } catch (err) {
      console.error('[ClassificationRulesAdmin] Error saving rule:', err);
      setError('Failed to save rule');
    }
    setSaving(false);
  };

  // Delete rule
  const handleDelete = async (): Promise<void> => {
    if (!ruleToDelete) return;
    try {
      await service.deleteRule(ruleToDelete.Id!);
      setSuccess('Rule deleted successfully');
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
      await loadRules();
    } catch (err) {
      console.error('[ClassificationRulesAdmin] Error deleting rule:', err);
      setError('Failed to delete rule');
    }
  };

  // Toggle active status
  const handleToggleActive = async (rule: IClassificationRule): Promise<void> => {
    try {
      await service.toggleRuleActive(rule.Id!, !rule.IsActive);
      await loadRules();
    } catch (err) {
      console.error('[ClassificationRulesAdmin] Error toggling rule:', err);
      setError('Failed to update rule status');
    }
  };

  // Seed default rules
  const handleSeedDefaults = async (): Promise<void> => {
    setSaving(true);
    setError('');
    try {
      const result = await service.seedDefaultRules();
      setSuccess(`Created ${result.created} rules, skipped ${result.skipped} existing`);
      await loadRules();
    } catch (err) {
      console.error('[ClassificationRulesAdmin] Error seeding defaults:', err);
      setError('Failed to seed default rules');
    }
    setSaving(false);
  };

  // Command bar items
  const commandBarItems: ICommandBarItemProps[] = [
    {
      key: 'new',
      text: 'New Rule',
      iconProps: { iconName: 'Add' },
      onClick: handleNewRule,
    },
    {
      key: 'seed',
      text: 'Seed Defaults',
      iconProps: { iconName: 'Database' },
      onClick: () => { void handleSeedDefaults(); },
      disabled: saving,
    },
    {
      key: 'refresh',
      text: 'Refresh',
      iconProps: { iconName: 'Refresh' },
      onClick: () => { void loadRules(); },
    },
  ];

  // Get classification info
  const getClassificationInfo = (classification: TaskClassification) => {
    return TASK_CLASSIFICATION_INFO[classification] || { label: classification, color: '#666', bgColor: '#f5f5f5', icon: 'Tag' };
  };

  // Render rule card
  const renderRuleCard = (rule: IClassificationRule): JSX.Element => {
    const info = getClassificationInfo(rule.Classification);

    return (
      <div
        key={rule.Id}
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
          border: `1px solid ${rule.IsActive ? '#e1dfdd' : '#fde7e9'}`,
          opacity: rule.IsActive ? 1 : 0.7,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: info.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon iconName={info.icon} style={{ fontSize: 20, color: info.color }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: info.bgColor,
                  color: info.color,
                  fontFamily: 'Consolas, monospace',
                }}>
                  {rule.Classification}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#323130' }}>
                  {info.label}
                </span>
                {!rule.IsActive && (
                  <span style={{ fontSize: 11, color: '#d13438', fontWeight: 500 }}>INACTIVE</span>
                )}
              </div>
              {rule.Description && (
                <div style={{ fontSize: 12, color: '#605e5c', marginTop: 2 }}>{rule.Description}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconButton
              iconProps={{ iconName: 'Edit' }}
              title="Edit"
              onClick={() => handleEditRule(rule)}
            />
            <IconButton
              iconProps={{ iconName: rule.IsActive ? 'Hide3' : 'View' }}
              title={rule.IsActive ? 'Deactivate' : 'Activate'}
              onClick={() => handleToggleActive(rule)}
            />
            <IconButton
              iconProps={{ iconName: 'Delete' }}
              title="Delete"
              onClick={() => { setRuleToDelete(rule); setDeleteDialogOpen(true); }}
            />
          </div>
        </div>

        {/* Rule details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {/* Assignment */}
          <div style={{ background: '#f9f8ff', borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#8a8886', textTransform: 'uppercase', marginBottom: 4 }}>
              Assignment
            </div>
            <div style={{ fontSize: 13, color: '#323130', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon iconName="Group" style={{ fontSize: 12, color: '#005BAA' }} />
              {rule.DefaultAssigneeType === 'Role' && rule.DefaultAssigneeRole}
              {rule.DefaultAssigneeType === 'Manager' && 'Hiring Manager'}
              {rule.DefaultAssigneeType === 'Employee' && 'Employee'}
              {rule.DefaultAssigneeType === 'Specific' && rule.DefaultAssigneeName}
            </div>
          </div>

          {/* Approval */}
          <div style={{ background: rule.RequiresApproval ? '#fff4ce' : '#e6ffed', borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#8a8886', textTransform: 'uppercase', marginBottom: 4 }}>
              Approval
            </div>
            <div style={{ fontSize: 13, color: '#323130', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon
                iconName={rule.RequiresApproval ? 'Shield' : 'SkypeCheck'}
                style={{ fontSize: 12, color: rule.RequiresApproval ? '#d97706' : '#059669' }}
              />
              {rule.RequiresApproval ? (
                <>
                  {rule.ApproverType === 'Role' && rule.ApproverRole}
                  {rule.ApproverType === 'Manager' && 'Hiring Manager'}
                  {rule.ApproverType === 'Specific' && rule.ApproverName}
                </>
              ) : (
                'No Approval'
              )}
            </div>
          </div>

          {/* Timing */}
          <div style={{ background: '#f3f2f1', borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#8a8886', textTransform: 'uppercase', marginBottom: 4 }}>
              Timing
            </div>
            <div style={{ fontSize: 13, color: '#323130', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon iconName="Clock" style={{ fontSize: 12, color: '#605e5c' }} />
              {rule.DefaultDaysOffset} days {rule.DefaultOffsetType.replace('-', ' ')}
            </div>
          </div>

          {/* Priority */}
          <div style={{
            background: rule.DefaultPriority === 'Critical' ? '#fde7e9' :
              rule.DefaultPriority === 'High' ? '#fff4ce' :
                '#f3f2f1',
            borderRadius: 6,
            padding: 12,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#8a8886', textTransform: 'uppercase', marginBottom: 4 }}>
              Priority
            </div>
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              color: rule.DefaultPriority === 'Critical' ? '#d13438' :
                rule.DefaultPriority === 'High' ? '#d97706' : '#323130',
            }}>
              {rule.DefaultPriority}
            </div>
          </div>
        </div>

        {/* Notifications & SLA */}
        <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 11, color: '#605e5c' }}>
          {rule.SendEmailNotification && (
            <span><Icon iconName="Mail" style={{ fontSize: 10, marginRight: 4 }} />Email</span>
          )}
          {rule.SendTeamsNotification && (
            <span><Icon iconName="TeamsLogo" style={{ fontSize: 10, marginRight: 4 }} />Teams</span>
          )}
          {rule.EscalationEnabled && (
            <span><Icon iconName="Up" style={{ fontSize: 10, marginRight: 4 }} />Escalation ({rule.EscalationDays}d)</span>
          )}
          {rule.SlaEnabled && (
            <span><Icon iconName="Timer" style={{ fontSize: 10, marginRight: 4 }} />SLA: {rule.SlaDays}d</span>
          )}
          {rule.AutoApproveEnabled && (
            <span><Icon iconName="AutoEnhanceOn" style={{ fontSize: 10, marginRight: 4 }} />Auto-approve &lt;${rule.AutoApproveMaxCost}</span>
          )}
        </div>
      </div>
    );
  };

  // Render form panel
  const renderPanel = (): JSX.Element => {
    const info = getClassificationInfo(formData.Classification);

    return (
      <Panel
        isOpen={isPanelOpen}
        type={PanelType.medium}
        onDismiss={() => setIsPanelOpen(false)}
        headerText={editingRule ? `Edit Rule: ${formData.Classification}` : 'New Classification Rule'}
        isFooterAtBottom={true}
        onRenderFooterContent={() => (
          <div style={{ display: 'flex', gap: 8 }}>
            <PrimaryButton onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </PrimaryButton>
            <DefaultButton onClick={() => setIsPanelOpen(false)}>Cancel</DefaultButton>
          </div>
        )}
      >
        <div style={{ padding: '0 0 80px 0' }}>
          {/* Classification Header */}
          <div style={{
            background: info.bgColor,
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <Icon iconName={info.icon} style={{ fontSize: 24, color: info.color }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: info.color }}>{info.label}</div>
              <div style={{ fontSize: 12, color: '#605e5c' }}>{info.description}</div>
            </div>
          </div>

          {/* Classification Selection */}
          <Dropdown
            label="Classification"
            selectedKey={formData.Classification}
            options={CLASSIFICATION_OPTIONS}
            onChange={(_, opt) => setFormData({ ...formData, Classification: opt?.key as TaskClassification })}
            disabled={!!editingRule}
            required
          />

          <TextField
            label="Description"
            value={formData.Description || ''}
            onChange={(_, v) => setFormData({ ...formData, Description: v })}
            multiline
            rows={2}
            style={{ marginTop: 12 }}
          />

          {/* Assignment Section */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 12 }}>
              Default Assignment
            </div>

            <Dropdown
              label="Assign To"
              selectedKey={formData.DefaultAssigneeType}
              options={ASSIGNEE_TYPE_OPTIONS}
              onChange={(_, opt) => setFormData({ ...formData, DefaultAssigneeType: opt?.key as any })}
              required
            />

            {formData.DefaultAssigneeType === 'Role' && (
              <TextField
                label="Role/Team Name"
                value={formData.DefaultAssigneeRole || ''}
                onChange={(_, v) => setFormData({ ...formData, DefaultAssigneeRole: v })}
                placeholder="e.g., IT Team, HR Team, Finance"
                required
              />
            )}
          </div>

          {/* Approval Section */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 12 }}>
              Approval Configuration
            </div>

            <Toggle
              label="Requires Approval"
              checked={formData.RequiresApproval}
              onChange={(_, checked) => setFormData({ ...formData, RequiresApproval: checked || false })}
              inlineLabel
            />

            {formData.RequiresApproval && (
              <>
                <Dropdown
                  label="Approver Type"
                  selectedKey={formData.ApproverType}
                  options={APPROVER_TYPE_OPTIONS}
                  onChange={(_, opt) => setFormData({ ...formData, ApproverType: opt?.key as any })}
                  style={{ marginTop: 12 }}
                />

                {formData.ApproverType === 'Role' && (
                  <TextField
                    label="Approver Role"
                    value={formData.ApproverRole || ''}
                    onChange={(_, v) => setFormData({ ...formData, ApproverRole: v })}
                    placeholder="e.g., IT Admin, HR Manager"
                  />
                )}

                {/* Escalation */}
                <div style={{ marginTop: 16, padding: 12, background: '#f9f8ff', borderRadius: 8 }}>
                  <Toggle
                    label="Enable Escalation"
                    checked={formData.EscalationEnabled}
                    onChange={(_, checked) => setFormData({ ...formData, EscalationEnabled: checked || false })}
                    inlineLabel
                  />

                  {formData.EscalationEnabled && (
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13 }}>Escalate after</span>
                        <SpinButton
                          value={String(formData.EscalationDays || 2)}
                          min={1}
                          max={14}
                          step={1}
                          onChange={(_, val) => setFormData({ ...formData, EscalationDays: parseInt(val || '2', 10) })}
                          styles={{ root: { width: 70 } }}
                        />
                        <span style={{ fontSize: 13 }}>days</span>
                      </div>

                      <TextField
                        label="Escalation Role"
                        value={formData.EscalationApproverRole || ''}
                        onChange={(_, v) => setFormData({ ...formData, EscalationApproverRole: v })}
                        placeholder="e.g., IT Manager"
                      />
                    </div>
                  )}
                </div>

                {/* Auto-approve */}
                <div style={{ marginTop: 12, padding: 12, background: '#e6ffed', borderRadius: 8 }}>
                  <Toggle
                    label="Enable Auto-Approve"
                    checked={formData.AutoApproveEnabled}
                    onChange={(_, checked) => setFormData({ ...formData, AutoApproveEnabled: checked || false })}
                    inlineLabel
                  />

                  {formData.AutoApproveEnabled && (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13 }}>Auto-approve if cost &lt; $</span>
                      <SpinButton
                        value={String(formData.AutoApproveMaxCost || 500)}
                        min={0}
                        max={10000}
                        step={100}
                        onChange={(_, val) => setFormData({ ...formData, AutoApproveMaxCost: parseInt(val || '500', 10) })}
                        styles={{ root: { width: 100 } }}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Timing & Priority */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 12 }}>
              Timing & Priority
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Dropdown
                label="Default Timing"
                selectedKey={formData.DefaultOffsetType}
                options={OFFSET_TYPE_OPTIONS}
                onChange={(_, opt) => setFormData({ ...formData, DefaultOffsetType: opt?.key as any })}
              />

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <SpinButton
                  label="Days Offset"
                  value={String(formData.DefaultDaysOffset)}
                  min={0}
                  max={30}
                  step={1}
                  onChange={(_, val) => setFormData({ ...formData, DefaultDaysOffset: parseInt(val || '0', 10) })}
                  styles={{ root: { flex: 1 } }}
                />
              </div>

              <Dropdown
                label="Default Priority"
                selectedKey={formData.DefaultPriority}
                options={PRIORITY_OPTIONS}
                onChange={(_, opt) => setFormData({ ...formData, DefaultPriority: opt?.key as any })}
              />
            </div>

            {/* SLA */}
            <div style={{ marginTop: 12, padding: 12, background: '#f3f2f1', borderRadius: 8 }}>
              <Toggle
                label="Enable SLA Tracking"
                checked={formData.SlaEnabled}
                onChange={(_, checked) => setFormData({ ...formData, SlaEnabled: checked || false })}
                inlineLabel
              />

              {formData.SlaEnabled && (
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13 }}>Target:</span>
                    <SpinButton
                      value={String(formData.SlaDays || 3)}
                      min={1}
                      max={30}
                      step={1}
                      onChange={(_, val) => setFormData({ ...formData, SlaDays: parseInt(val || '3', 10) })}
                      styles={{ root: { width: 70 } }}
                    />
                    <span style={{ fontSize: 13 }}>days</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13 }}>Warn at:</span>
                    <SpinButton
                      value={String(formData.SlaWarningDays || 1)}
                      min={0}
                      max={14}
                      step={1}
                      onChange={(_, val) => setFormData({ ...formData, SlaWarningDays: parseInt(val || '1', 10) })}
                      styles={{ root: { width: 70 } }}
                    />
                    <span style={{ fontSize: 13 }}>days remaining</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#005BAA', textTransform: 'uppercase', marginBottom: 12 }}>
              Notifications
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Toggle
                label="Email Notifications"
                checked={formData.SendEmailNotification}
                onChange={(_, checked) => setFormData({ ...formData, SendEmailNotification: checked || false })}
                inlineLabel
              />
              <Toggle
                label="Teams Notifications"
                checked={formData.SendTeamsNotification}
                onChange={(_, checked) => setFormData({ ...formData, SendTeamsNotification: checked || false })}
                inlineLabel
              />
              <Toggle
                label="Notify on Assignment"
                checked={formData.NotifyOnAssignment}
                onChange={(_, checked) => setFormData({ ...formData, NotifyOnAssignment: checked || false })}
                inlineLabel
              />
              <Toggle
                label="Notify on Completion"
                checked={formData.NotifyOnCompletion}
                onChange={(_, checked) => setFormData({ ...formData, NotifyOnCompletion: checked || false })}
                inlineLabel
              />
              <Toggle
                label="Notify Manager on Completion"
                checked={formData.NotifyManagerOnCompletion}
                onChange={(_, checked) => setFormData({ ...formData, NotifyManagerOnCompletion: checked || false })}
                inlineLabel
              />
            </div>
          </div>

          {/* Status */}
          <div style={{ marginTop: 24 }}>
            <Toggle
              label="Rule Active"
              checked={formData.IsActive}
              onChange={(_, checked) => setFormData({ ...formData, IsActive: checked || false })}
              inlineLabel
            />
          </div>
        </div>
      </Panel>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spinner size={SpinnerSize.large} label="Loading classification rules..." />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px 0', color: '#1a1a1a' }}>
          Classification Rules
        </h3>
        <p style={{ color: '#605e5c', fontSize: 14, margin: 0 }}>
          Configure default assignment and approval routing based on task classification. These rules automatically apply when creating tasks in the wizard.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <MessageBar
          messageBarType={MessageBarType.error}
          onDismiss={() => setError('')}
          style={{ marginBottom: 16 }}
        >
          {error}
        </MessageBar>
      )}
      {success && (
        <MessageBar
          messageBarType={MessageBarType.success}
          onDismiss={() => setSuccess('')}
          style={{ marginBottom: 16 }}
        >
          {success}
        </MessageBar>
      )}

      {/* Command bar */}
      <CommandBar items={commandBarItems} style={{ marginBottom: 16 }} />

      {/* Rules list */}
      {rules.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          background: '#f9f8ff',
          borderRadius: 8,
          border: '2px dashed #e1dfdd',
        }}>
          <Icon iconName="Settings" style={{ fontSize: 48, color: '#8a8886', marginBottom: 16 }} />
          <h4 style={{ fontSize: 16, fontWeight: 600, color: '#323130', margin: '0 0 8px 0' }}>
            No Classification Rules Configured
          </h4>
          <p style={{ fontSize: 14, color: '#605e5c', margin: '0 0 16px 0' }}>
            Set up default assignment and approval routing for each task classification.
          </p>
          <PrimaryButton onClick={handleSeedDefaults} disabled={saving}>
            <Icon iconName="Database" style={{ marginRight: 8 }} />
            {saving ? 'Seeding...' : 'Seed Default Rules'}
          </PrimaryButton>
        </div>
      ) : (
        <div>
          {rules.map(rule => renderRuleCard(rule))}
        </div>
      )}

      {/* Panel */}
      {renderPanel()}

      {/* Delete confirmation dialog */}
      <Dialog
        hidden={!deleteDialogOpen}
        onDismiss={() => setDeleteDialogOpen(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Delete Classification Rule',
          subText: `Are you sure you want to delete the rule for "${ruleToDelete?.Classification}"? This cannot be undone.`,
        }}
      >
        <DialogFooter>
          <PrimaryButton onClick={handleDelete} text="Delete" />
          <DefaultButton onClick={() => setDeleteDialogOpen(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default ClassificationRulesAdmin;
