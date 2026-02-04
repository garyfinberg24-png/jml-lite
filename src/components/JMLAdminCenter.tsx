import * as React from 'react';
import { useState } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react/lib/Icon';
import { OnboardingConfigAdmin } from './OnboardingConfigAdmin';
import { MoverConfigAdmin } from './MoverConfigAdmin';
import { OffboardingConfigAdmin } from './OffboardingConfigAdmin';
import { TaskLibraryAdmin } from './TaskLibraryAdmin';
import { ClassificationRulesAdmin } from './ClassificationRulesAdmin';
import { ImportData } from './ImportData';
import { NotificationSettings } from './NotificationSettings';

interface IProps { sp: SPFI; }

type AdminSection = 'task-library' | 'classification-rules' | 'onboarding-config' | 'mover-config' | 'offboarding-config' | 'import-data' | 'general' | 'notifications' | 'audit' | 'system';

// Theme colors
const JOINER_COLOR = '#005BAA';
const MOVER_COLOR = '#ea580c';
const LEAVER_COLOR = '#d13438';

export const JMLAdminCenter: React.FC<IProps> = ({ sp }) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('onboarding-config');

  const sections: { key: AdminSection; label: string; icon: string; color?: string; description?: string }[] = [
    { key: 'task-library', label: 'Task Library', icon: 'TaskManager', color: '#6264a7', description: 'Predefined tasks with classification codes' },
    { key: 'classification-rules', label: 'Classification Rules', icon: 'Flow', color: '#0078d4', description: 'Assignment & approval routing per classification' },
    { key: 'onboarding-config', label: 'Onboarding Configuration', icon: 'AddFriend', color: JOINER_COLOR, description: 'Documents, assets, systems, training' },
    { key: 'mover-config', label: 'Transfer Configuration', icon: 'Sync', color: MOVER_COLOR, description: 'Task templates for internal moves' },
    { key: 'offboarding-config', label: 'Offboarding Configuration', icon: 'UserRemove', color: LEAVER_COLOR, description: 'Exit checklists and templates' },
    { key: 'import-data', label: 'Import Data', icon: 'CloudUpload', color: '#217346', description: 'Bulk import from XLSX/CSV files' },
    { key: 'general', label: 'General Settings', icon: 'Settings', description: 'App-wide settings' },
    { key: 'notifications', label: 'Notifications', icon: 'Ringer', description: 'Email and Teams alerts' },
    { key: 'audit', label: 'Audit Log', icon: 'History', description: 'System activity trail' },
    { key: 'system', label: 'System Info', icon: 'Info', description: 'Version and diagnostics' },
  ];

  const renderContent = (): React.ReactElement => {
    switch (activeSection) {
      case 'task-library':
        return <TaskLibraryAdmin sp={sp} />;
      case 'classification-rules':
        return <ClassificationRulesAdmin sp={sp} />;
      case 'onboarding-config':
        return <OnboardingConfigAdmin sp={sp} />;
      case 'mover-config':
        return <MoverConfigAdmin sp={sp} />;
      case 'offboarding-config':
        return <OffboardingConfigAdmin sp={sp} />;
      case 'import-data':
        return <ImportData sp={sp} />;
      case 'general':
        return (
          <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a' }}>
              General Settings
            </h3>
            <p style={{ color: '#605e5c', fontSize: '14px', marginBottom: '24px' }}>
              Configure app-wide settings and preferences.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Default Onboarding Duration</div>
                <div style={{ fontSize: '13px', color: '#605e5c' }}>14 days (configurable per template)</div>
              </div>
              <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Automatic Task Assignment</div>
                <div style={{ fontSize: '13px', color: '#605e5c' }}>Enabled - Tasks auto-assign based on role</div>
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return <NotificationSettings sp={sp} />;
      case 'audit':
        return (
          <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a' }}>
              Audit Log
            </h3>
            <p style={{ color: '#605e5c', fontSize: '14px', marginBottom: '24px' }}>
              View system activity and changes.
            </p>
            <div style={{ padding: '40px', textAlign: 'center', color: '#8a8886' }}>
              <Icon iconName="History" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
              <div>Audit log viewer coming soon</div>
            </div>
          </div>
        );
      case 'system':
        return (
          <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a' }}>
              System Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                <span style={{ color: '#605e5c' }}>Application</span>
                <span style={{ fontWeight: 500 }}>JML Lite</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                <span style={{ color: '#605e5c' }}>Version</span>
                <span style={{ fontWeight: 500 }}>1.0.0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                <span style={{ color: '#605e5c' }}>Framework</span>
                <span style={{ fontWeight: 500 }}>SPFx 1.20.0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9f9f9', borderRadius: '6px' }}>
                <span style={{ color: '#605e5c' }}>List Prefix</span>
                <span style={{ fontWeight: 500 }}>JML_</span>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a' }}>
              {sections.find(s => s.key === activeSection)?.label}
            </h3>
            <p style={{ color: '#605e5c', fontSize: '14px' }}>
              Configuration options coming soon.
            </p>
          </div>
        );
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px 0' }}>Admin Center</h2>
      <p style={{ color: '#605e5c', fontSize: '14px', margin: '0 0 24px 0' }}>
        Configure JML Lite settings, templates, and system options
      </p>
      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Left Navigation */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {sections.map(section => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  background: activeSection === section.key ? '#f9f8ff' : 'transparent',
                  color: activeSection === section.key ? (section.color || '#005BAA') : '#323130',
                  fontWeight: activeSection === section.key ? 600 : 400,
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  borderLeft: activeSection === section.key ? `3px solid ${section.color || '#005BAA'}` : '3px solid transparent',
                  fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon
                  iconName={section.icon}
                  style={{
                    fontSize: '18px',
                    color: activeSection === section.key ? (section.color || '#005BAA') : '#605e5c',
                    marginTop: '2px',
                  }}
                />
                <div>
                  <div>{section.label}</div>
                  {section.description && (
                    <div style={{
                      fontSize: '11px',
                      color: '#8a8886',
                      fontWeight: 400,
                      marginTop: '2px',
                    }}>
                      {section.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default JMLAdminCenter;
