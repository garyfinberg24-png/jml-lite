import * as React from 'react';
import { useState } from 'react';

type HelpTab = 'home' | 'articles' | 'faq' | 'shortcuts' | 'support';

export const JMLHelpCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HelpTab>('home');

  const tabs: { key: HelpTab; label: string }[] = [
    { key: 'home', label: 'Home' },
    { key: 'articles', label: 'Articles' },
    { key: 'faq', label: 'FAQs' },
    { key: 'shortcuts', label: 'Shortcuts' },
    { key: 'support', label: 'Support' },
  ];

  const faqs = [
    { q: 'How do I start an onboarding process?', a: 'Navigate to Onboarding and click "Start Onboarding". Follow the 8-step wizard to set up a new employee.' },
    { q: 'How do I process an internal transfer?', a: 'Go to Transfers and click "Start Transfer". The 6-step wizard guides you through updating system access and assets.' },
    { q: 'How do I offboard an employee?', a: 'Navigate to Offboarding and click "Start Offboarding". Complete the 7-step wizard including asset return and exit interview.' },
    { q: 'What is My Onboarding?', a: 'My Onboarding is a self-service portal for new hires to track their onboarding progress and complete tasks.' },
    { q: 'What roles are available?', a: 'User (My Onboarding, Search, Help), Manager (full JML access), and Admin (settings and configuration).' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 24px 0' }}>Help Center</h2>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #edebe9' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: '13px', fontWeight: activeTab === tab.key ? 600 : 400,
            color: activeTab === tab.key ? '#005BAA' : '#605e5c',
            borderBottom: activeTab === tab.key ? '2px solid #005BAA' : '2px solid transparent',
          }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ background: '#ffffff', borderRadius: '8px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a1a', marginBottom: '8px' }}>{faq.q}</div>
              <div style={{ fontSize: '13px', color: '#605e5c', lineHeight: '1.5' }}>{faq.a}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'home' && (
        <div style={{
          background: 'linear-gradient(135deg, #005BAA 0%, #004A8F 100%)',
          borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#ffffff',
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 12px 0' }}>Welcome to JML Lite Help</h3>
          <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
            Find answers to common questions, browse articles, and get support for employee lifecycle management.
          </p>
        </div>
      )}

      {(activeTab === 'articles' || activeTab === 'shortcuts' || activeTab === 'support') && (
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <p style={{ color: '#605e5c', fontSize: '14px' }}>
            {activeTab === 'articles' ? 'Help articles will appear here.' :
             activeTab === 'shortcuts' ? 'Keyboard shortcuts will appear here.' :
             'Submit a support request to the HR team.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default JMLHelpCenter;
