import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { IJmlLiteProps } from './IJmlLiteProps';
import { getSP } from '../../../utils/pnpConfig';
import { injectPortalStyles } from '../../../utils/injectPortalStyles';
import { signalAppReady } from '../../../utils/SharePointOverrides';
import { detectUserRole, JmlRole } from '../../../services/JmlRoleService';
import { JmlAppHeader } from '../../../components/JmlAppHeader';
import { JMLDashboard } from '../../../components/JMLDashboard';
import { JMLSearch } from '../../../components/JMLSearch';
import { JMLAdminCenter } from '../../../components/JMLAdminCenter';
import { JMLHelpCenter } from '../../../components/JMLHelpCenter';
import { OnboardingTracker } from '../../../components/OnboardingTracker';
import { OnboardingBuddy } from '../../../components/OnboardingBuddy';
import { MoverTracker } from '../../../components/MoverTracker';
import { OffboardingTracker } from '../../../components/OffboardingTracker';
import { JMLReporting } from '../../../components/JMLReporting';
import { OnboardingWizardPage } from '../../../components/OnboardingWizardPage';
import { MoverWizardPage } from '../../../components/MoverWizardPage';
import { OffboardingWizardPage } from '../../../components/OffboardingWizardPage';

export type JmlViewType =
  | 'dashboard'
  | 'onboarding'
  | 'myonboarding'
  | 'mover'
  | 'offboarding'
  | 'jmlreporting'
  | 'search'
  | 'admin'
  | 'help'
  | 'onboarding-wizard'
  | 'mover-wizard'
  | 'offboarding-wizard';

const JmlLite: React.FC<IJmlLiteProps> = (props) => {
  const [currentView, setCurrentView] = useState<JmlViewType>('dashboard');
  const [userRole, setUserRole] = useState<JmlRole>(JmlRole.User);
  const sp = useMemo(() => getSP(props.context), [props.context]);

  useEffect(() => {
    injectPortalStyles();
    signalAppReady();
  }, []);

  useEffect(() => {
    if (sp) {
      detectUserRole(sp).then(setUserRole).catch(() => {});
    }
  }, [sp]);

  const renderView = (): React.ReactElement => {
    switch (currentView) {
      case 'dashboard':
        return <JMLDashboard sp={sp} onNavigate={(view) => setCurrentView(view as JmlViewType)} />;
      case 'onboarding':
        return <OnboardingTracker sp={sp} onStartWizard={() => setCurrentView('onboarding-wizard')} />;
      case 'myonboarding':
        return <OnboardingBuddy sp={sp} />;
      case 'mover':
        return <MoverTracker sp={sp} onStartWizard={() => setCurrentView('mover-wizard')} />;
      case 'offboarding':
        return <OffboardingTracker sp={sp} onStartWizard={() => setCurrentView('offboarding-wizard')} />;
      case 'jmlreporting':
        return <JMLReporting sp={sp} />;
      case 'onboarding-wizard':
        return <OnboardingWizardPage sp={sp} onComplete={() => setCurrentView('onboarding')} onCancel={() => setCurrentView('onboarding')} />;
      case 'mover-wizard':
        return <MoverWizardPage sp={sp} onComplete={() => setCurrentView('mover')} onCancel={() => setCurrentView('mover')} />;
      case 'offboarding-wizard':
        return <OffboardingWizardPage sp={sp} onComplete={() => setCurrentView('offboarding')} onCancel={() => setCurrentView('offboarding')} />;
      case 'search':
        return <JMLSearch sp={sp} />;
      case 'admin':
        return <JMLAdminCenter sp={sp} />;
      case 'help':
        return <JMLHelpCenter />;
      default:
        return <JMLDashboard sp={sp} onNavigate={(view) => setCurrentView(view as JmlViewType)} />;
    }
  };

  // Check if we're in a full-page wizard mode (hide header and use full width)
  const isWizardMode = currentView.endsWith('-wizard');

  return (
    <FluentProvider theme={webLightTheme}>
      {!isWizardMode && (
        <JmlAppHeader
          currentView={currentView}
          onNavigate={(view: JmlViewType) => setCurrentView(view)}
          userRole={userRole}
          context={props.context}
        />
      )}
      <div style={{
        maxWidth: isWizardMode ? 'none' : '1400px',
        margin: '0 auto',
        padding: isWizardMode ? '0' : '24px'
      }}>
        {renderView()}
      </div>
    </FluentProvider>
  );
};

export default JmlLite;
