import * as React from 'react';
import { useState } from 'react';
import { SPFI } from '@pnp/sp';
import { OnboardingConfigAdmin } from './OnboardingConfigAdmin';

interface IProps { sp: SPFI; }

type AdminSection = 'config' | 'general' | 'notifications' | 'audit' | 'system';

export const JMLAdminCenter: React.FC<IProps> = ({ sp }) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('config');

  const sections: { key: AdminSection; label: string }[] = [
    { key: 'config', label: 'Onboarding Configuration' },
    { key: 'general', label: 'General Settings' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'audit', label: 'Audit Log' },
    { key: 'system', label: 'System Info' },
  ];

  const renderContent = (): React.ReactElement => {
    switch (activeSection) {
      case 'config':
        return <OnboardingConfigAdmin sp={sp} />;
      default:
        return (
          <div style={{ background: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a' }}>
              {sections.find(s => s.key === activeSection)?.label}
            </h3>
            <p style={{ color: '#605e5c', fontSize: '14px' }}>
              Admin settings for {activeSection}. Connect to SharePoint to manage configuration.
            </p>
          </div>
        );
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 24px 0' }}>Admin Center</h2>
      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ width: '240px', flexShrink: 0 }}>
          {sections.map(section => (
            <button key={section.key} onClick={() => setActiveSection(section.key)} style={{
              display: 'block', width: '100%', padding: '10px 16px', border: 'none',
              background: activeSection === section.key ? '#f9f8ff' : 'transparent',
              color: activeSection === section.key ? '#005BAA' : '#323130',
              fontWeight: activeSection === section.key ? 600 : 400,
              fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', marginBottom: '4px',
              borderLeft: activeSection === section.key ? '3px solid #005BAA' : '3px solid transparent',
              fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
            }}>{section.label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default JMLAdminCenter;
