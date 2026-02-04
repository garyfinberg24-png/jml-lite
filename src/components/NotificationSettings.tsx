// Notification Settings Component — Configure Teams webhooks and email notifications
// Part of JML Lite Admin Center

import * as React from 'react';
import { useState, useEffect } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { TextField } from '@fluentui/react/lib/TextField';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { TeamsWebhookService, ITeamsWebhookConfig } from '../services/TeamsWebhookService';

interface IProps {
  sp: SPFI;
}

interface IWebhookField {
  key: keyof Omit<ITeamsWebhookConfig, 'isEnabled'>;
  configKey: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const WEBHOOK_FIELDS: IWebhookField[] = [
  {
    key: 'primaryWebhookUrl',
    configKey: 'TeamsWebhookPrimary',
    label: 'Primary JML Channel',
    description: 'Main channel for all JML notifications (required)',
    icon: 'TeamsLogo',
    color: '#6264a7',
  },
  {
    key: 'hrWebhookUrl',
    configKey: 'TeamsWebhookHR',
    label: 'HR Team Channel',
    description: 'HR-specific notifications (optional)',
    icon: 'People',
    color: '#0078d4',
  },
  {
    key: 'itWebhookUrl',
    configKey: 'TeamsWebhookIT',
    label: 'IT Team Channel',
    description: 'System access and IT notifications (optional)',
    icon: 'Settings',
    color: '#107c10',
  },
  {
    key: 'managerWebhookUrl',
    configKey: 'TeamsWebhookManager',
    label: 'Manager Notifications',
    description: 'Manager-specific updates (optional)',
    icon: 'ContactInfo',
    color: '#ea580c',
  },
];

export const NotificationSettings: React.FC<IProps> = ({ sp }) => {
  const [webhookService] = useState(() => new TeamsWebhookService(sp));
  const [config, setConfig] = useState<ITeamsWebhookConfig>({
    primaryWebhookUrl: null,
    hrWebhookUrl: null,
    itWebhookUrl: null,
    managerWebhookUrl: null,
    isEnabled: false,
  });
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: MessageBarType; text: string } | null>(null);

  // Load configuration on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async (): Promise<void> => {
    setLoading(true);
    try {
      const loadedConfig = await webhookService.getWebhookConfig();
      setConfig(loadedConfig);

      // Initialize edit values from config
      const values: Record<string, string> = {};
      for (const field of WEBHOOK_FIELDS) {
        values[field.key] = loadedConfig[field.key] || '';
      }
      setEditValues(values);
    } catch (error) {
      setMessage({ type: MessageBarType.error, text: 'Failed to load notification settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (field: IWebhookField): Promise<void> => {
    setSaving(field.key);
    setMessage(null);

    try {
      const value = editValues[field.key]?.trim() || '';

      // Validate URL format if provided
      if (value && !isValidWebhookUrl(value)) {
        setMessage({ type: MessageBarType.error, text: 'Invalid webhook URL. Must be a valid Microsoft Teams webhook URL.' });
        setSaving(null);
        return;
      }

      const success = await webhookService.saveWebhookConfig(field.configKey, value);

      if (success) {
        setMessage({ type: MessageBarType.success, text: `${field.label} webhook saved successfully` });
        // Refresh config
        await loadConfig();
      } else {
        setMessage({ type: MessageBarType.error, text: 'Failed to save webhook configuration' });
      }
    } catch (error) {
      setMessage({ type: MessageBarType.error, text: 'An error occurred while saving' });
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (field: IWebhookField): Promise<void> => {
    const url = editValues[field.key]?.trim();
    if (!url) {
      setMessage({ type: MessageBarType.warning, text: 'Please enter a webhook URL first' });
      return;
    }

    setTesting(field.key);
    setMessage(null);

    try {
      const result = await webhookService.testWebhook(url);

      if (result.success) {
        setMessage({ type: MessageBarType.success, text: `Test message sent successfully to ${field.label}! Check your Teams channel.` });
      } else {
        setMessage({ type: MessageBarType.error, text: `Test failed: ${result.error || 'Unknown error'}` });
      }
    } catch (error) {
      setMessage({ type: MessageBarType.error, text: 'Failed to send test message' });
    } finally {
      setTesting(null);
    }
  };

  const handleToggleEnabled = async (enabled: boolean): Promise<void> => {
    setSaving('enabled');
    try {
      const success = await webhookService.saveWebhookConfig('TeamsWebhookEnabled', enabled ? 'true' : 'false');
      if (success) {
        setConfig(prev => ({ ...prev, isEnabled: enabled }));
        setMessage({ type: MessageBarType.success, text: `Teams notifications ${enabled ? 'enabled' : 'disabled'}` });
      }
    } catch (error) {
      setMessage({ type: MessageBarType.error, text: 'Failed to update setting' });
    } finally {
      setSaving(null);
    }
  };

  const isValidWebhookUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      // Microsoft Teams webhook URLs contain specific patterns
      return (
        parsed.protocol === 'https:' &&
        (parsed.hostname.includes('webhook.office.com') ||
         parsed.hostname.includes('outlook.office.com') ||
         parsed.hostname.includes('webhook.office365.com'))
      );
    } catch {
      return false;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
        <Spinner size={SpinnerSize.large} label="Loading notification settings..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6264a7 0%, #464775 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon iconName="TeamsLogo" style={{ fontSize: '24px', color: '#ffffff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0', color: '#1a1a1a' }}>
              Microsoft Teams Notifications
            </h3>
            <p style={{ color: '#605e5c', fontSize: '13px', margin: 0 }}>
              Send JML notifications to Teams channels using incoming webhooks
            </p>
          </div>
          <Toggle
            label="Enabled"
            checked={config.isEnabled}
            onChange={(_, checked) => handleToggleEnabled(!!checked)}
            disabled={saving === 'enabled'}
            styles={{
              root: { marginBottom: 0 },
              label: { fontWeight: 500 },
            }}
          />
        </div>

        {message && (
          <MessageBar
            messageBarType={message.type}
            onDismiss={() => setMessage(null)}
            dismissButtonAriaLabel="Close"
            styles={{ root: { marginBottom: '16px' } }}
          >
            {message.text}
          </MessageBar>
        )}

        {/* Setup Instructions */}
        <div style={{
          background: '#f3f2f1',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '8px',
        }}>
          <div style={{ fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon iconName="Info" style={{ color: '#0078d4' }} />
            How to set up Teams webhooks
          </div>
          <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: '#323130', lineHeight: '1.6' }}>
            <li>Open your Teams channel and click the <strong>...</strong> menu</li>
            <li>Select <strong>Connectors</strong> (or <strong>Workflows</strong> in new Teams)</li>
            <li>Search for <strong>Incoming Webhook</strong> and click <strong>Configure</strong></li>
            <li>Name it <strong>JML Lite</strong> and optionally add an icon</li>
            <li>Copy the webhook URL and paste it below</li>
          </ol>
        </div>
      </div>

      {/* Webhook Configuration Cards */}
      {WEBHOOK_FIELDS.map((field) => {
        const currentValue = config[field.key];
        const editValue = editValues[field.key] || '';
        const hasChanges = editValue !== (currentValue || '');
        const isConfigured = !!currentValue;

        return (
          <div
            key={field.key}
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${isConfigured ? field.color : '#d2d0ce'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: isConfigured ? `${field.color}15` : '#f3f2f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon
                  iconName={field.icon}
                  style={{
                    fontSize: '20px',
                    color: isConfigured ? field.color : '#8a8886',
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>
                    {field.label}
                  </span>
                  {isConfigured && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: '#dff6dd',
                      color: '#107c10',
                      fontWeight: 500,
                    }}>
                      Configured
                    </span>
                  )}
                  {field.key === 'primaryWebhookUrl' && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: '#fff4ce',
                      color: '#797673',
                      fontWeight: 500,
                    }}>
                      Required
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: '#605e5c', margin: '0 0 12px 0' }}>
                  {field.description}
                </p>

                <TextField
                  placeholder="https://outlook.office.com/webhook/..."
                  value={editValue}
                  onChange={(_, newValue) => setEditValues(prev => ({ ...prev, [field.key]: newValue || '' }))}
                  styles={{
                    root: { marginBottom: '12px' },
                    fieldGroup: { borderRadius: '4px' },
                  }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <PrimaryButton
                    text={saving === field.key ? 'Saving...' : 'Save'}
                    onClick={() => handleSave(field)}
                    disabled={!hasChanges || saving === field.key}
                    styles={{
                      root: { minWidth: '80px' },
                    }}
                  />
                  <DefaultButton
                    text={testing === field.key ? 'Testing...' : 'Test'}
                    onClick={() => handleTest(field)}
                    disabled={!editValue || testing === field.key}
                    iconProps={{ iconName: 'Send' }}
                  />
                  {currentValue && (
                    <DefaultButton
                      text="Clear"
                      onClick={() => {
                        setEditValues(prev => ({ ...prev, [field.key]: '' }));
                      }}
                      iconProps={{ iconName: 'Delete' }}
                      styles={{
                        root: { color: '#a4262c' },
                        rootHovered: { color: '#a4262c', background: '#fef0f1' },
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Notification Types Info */}
      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a' }}>
          Notification Types
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { icon: 'AddFriend', label: 'New Onboarding', color: '#005BAA' },
            { icon: 'Sync', label: 'Employee Transfer', color: '#ea580c' },
            { icon: 'UserRemove', label: 'Offboarding Started', color: '#d13438' },
            { icon: 'TaskManager', label: 'Task Assigned', color: '#107c10' },
            { icon: 'Clock', label: 'Overdue Reminders', color: '#d83b01' },
            { icon: 'Taskboard', label: 'Approval Requests', color: '#7c3aed' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: '#f9f9f9',
                borderRadius: '6px',
              }}
            >
              <Icon iconName={item.icon} style={{ fontSize: '16px', color: item.color }} />
              <span style={{ fontSize: '13px', color: '#323130' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Email Settings via Microsoft Graph */}
      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon iconName="Mail" style={{ fontSize: '24px', color: '#ffffff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: '#1a1a1a' }}>
              Email Notifications (Microsoft Graph API)
            </h4>
            <p style={{ fontSize: '13px', color: '#605e5c', margin: 0 }}>
              Send email notifications to task assignees and stakeholders
            </p>
          </div>
        </div>

        {/* Graph API Info */}
        <div style={{
          background: '#f0f7ff',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          border: '1px solid #c7e0f4',
        }}>
          <div style={{ fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon iconName="Info" style={{ color: '#0078d4' }} />
            Microsoft Graph API Integration
          </div>
          <p style={{ fontSize: '13px', color: '#323130', margin: '0 0 12px 0' }}>
            Email notifications are sent via the Microsoft Graph API. The system uses the current user's permissions to send emails.
          </p>
          <div style={{ fontSize: '12px', color: '#605e5c' }}>
            <strong>Required API Permissions:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li><code style={{ background: '#f3f2f1', padding: '2px 4px', borderRadius: '3px' }}>Mail.Send</code> - Send mail as the signed-in user</li>
              <li><code style={{ background: '#f3f2f1', padding: '2px 4px', borderRadius: '3px' }}>User.Read</code> - Read user profile (for sender info)</li>
            </ul>
          </div>
        </div>

        {/* Email Types */}
        <div style={{ marginBottom: '16px' }}>
          <h5 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 12px 0', color: '#1a1a1a' }}>
            Supported Email Notifications
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {[
              { icon: 'TaskManager', label: 'Task Assignment', desc: 'When tasks are assigned to users', color: '#107c10' },
              { icon: 'CompletedSolid', label: 'Task Completion', desc: 'When assigned tasks are completed', color: '#0078d4' },
              { icon: 'Clock', label: 'Overdue Reminders', desc: 'For tasks past their due date', color: '#d83b01' },
              { icon: 'WaitlistConfirm', label: 'Approval Requests', desc: 'When approval is required', color: '#7c3aed' },
              { icon: 'Accept', label: 'Approval Decisions', desc: 'When approvals are granted/rejected', color: '#10b981' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  background: '#f9f9f9',
                  borderRadius: '6px',
                }}
              >
                <Icon iconName={item.icon} style={{ fontSize: '16px', color: item.color, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#323130' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: '#605e5c' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status & Usage Note */}
        <div style={{
          background: '#fff7ed',
          borderRadius: '8px',
          padding: '12px 16px',
          border: '1px solid #fed7aa',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon iconName="Lightbulb" style={{ color: '#ea580c' }} />
            <span style={{ fontSize: '13px', color: '#9a3412' }}>
              <strong>Automatic:</strong> Email notifications are sent automatically when enabled in the Task Configuration panel during wizard completion.
              Enable "Email" notification in task settings to send emails to assignees.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
