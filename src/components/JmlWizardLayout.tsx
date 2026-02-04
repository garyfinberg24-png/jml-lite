import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import styles from '../styles/JmlWizard.module.scss';

export type JmlWizardTheme = 'joiner' | 'mover' | 'leaver';

export interface IJmlWizardStep {
  key: string;
  label: string;
  icon: string;
}

export interface IJmlWizardTip {
  icon: string;
  title: string;
  content: string;
}

export interface IJmlWizardChecklistItem {
  label: string;
  completed: boolean;
}

export interface IJmlWizardLayoutProps {
  theme: JmlWizardTheme;
  title: string;
  subtitle?: string;
  steps: IJmlWizardStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  loading?: boolean;
  loadingText?: string;
  tips?: IJmlWizardTip[];
  checklist?: IJmlWizardChecklistItem[];
  progressPercent?: number;
  progressText?: string;
  onBack?: () => void;
  onCancel?: () => void;
  onSaveDraft?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  nextDisabled?: boolean;
  submitDisabled?: boolean;
  isLastStep?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  backLabel?: string;
  nextLabel?: string;
  children: React.ReactNode;
  hideRightPanel?: boolean;
  /** Page header configuration */
  pageTitle?: string;
  pageSubtitle?: string;
}

const getThemeClass = (theme: JmlWizardTheme): string => {
  switch (theme) {
    case 'joiner': return styles.themeJoiner;
    case 'mover': return styles.themeMover;
    case 'leaver': return styles.themeLeaver;
    default: return styles.themeJoiner;
  }
};

const getThemeColor = (theme: JmlWizardTheme): string => {
  switch (theme) {
    case 'joiner': return '#005BAA';
    case 'mover': return '#ea580c';
    case 'leaver': return '#d13438';
    default: return '#005BAA';
  }
};

const getThemeTitle = (theme: JmlWizardTheme): string => {
  switch (theme) {
    case 'joiner': return 'New Joiner Onboarding';
    case 'mover': return 'Internal Transfer';
    case 'leaver': return 'Employee Offboarding';
    default: return 'JML Wizard';
  }
};

const getThemeIcon = (theme: JmlWizardTheme): string => {
  switch (theme) {
    case 'joiner': return 'AddFriend';
    case 'mover': return 'Sync';
    case 'leaver': return 'UserRemove';
    default: return 'People';
  }
};

export const JmlWizardLayout: React.FC<IJmlWizardLayoutProps> = ({
  theme,
  title,
  subtitle,
  steps,
  currentStep,
  onStepClick,
  loading,
  loadingText,
  tips,
  checklist,
  progressPercent,
  progressText,
  onBack,
  onCancel,
  onSaveDraft,
  onNext,
  onSubmit,
  nextDisabled,
  submitDisabled,
  isLastStep,
  isSubmitting,
  submitLabel = 'Submit',
  backLabel = 'Back',
  nextLabel = 'Next',
  children,
  hideRightPanel,
  pageTitle,
  pageSubtitle,
}) => {
  const themeClass = getThemeClass(theme);
  const themeColor = getThemeColor(theme);

  const handleStepClick = (index: number): void => {
    // Only allow clicking on completed steps or the current step
    if (onStepClick && index <= currentStep) {
      onStepClick(index);
    }
  };

  return (
    <div className={`${styles.pageContainer} ${themeClass}`}>
      {/* ═══════════════════════════════════════════════════════════════════════════
          PAGE HEADER - Gradient Bar with App Branding
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <div className={styles.pageHeaderLogo}>
            <Icon iconName={getThemeIcon(theme)} style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div className={styles.pageHeaderTitleGroup}>
            <h1 className={styles.pageHeaderTitle}>{pageTitle || getThemeTitle(theme)}</h1>
            <div className={styles.pageHeaderSubtitle}>{pageSubtitle || 'DWx Recruitment Manager'}</div>
          </div>
        </div>
        <div className={styles.pageHeaderRight}>
          {/* Exit Wizard button removed - users can use Cancel button in footer or Back to Tracker link */}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          PAGE BODY - Contains the 3-Column Wizard Layout
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className={styles.pageBody}>
        <div className={styles.wizardLayout}>
          {/* ═══════════════════════════════════════════════════════════════════════════
              LEFT SIDEBAR - Accordion Steps
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3 className={styles.sidebarTitle}>{title}</h3>
          {subtitle && <div className={styles.sidebarSubtitle}>{subtitle}</div>}
        </div>

        <div className={styles.stepsList}>
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            const isPending = index > currentStep;

            return (
              <div
                key={step.key}
                className={`
                  ${styles.stepItem}
                  ${isActive ? styles.stepItemActive : ''}
                  ${isCompleted ? styles.stepItemCompleted : ''}
                `}
                onClick={() => handleStepClick(index)}
                style={{ cursor: index <= currentStep ? 'pointer' : 'default' }}
              >
                <div
                  className={`
                    ${styles.stepNumber}
                    ${isCompleted ? styles.stepNumberCompleted : ''}
                    ${isActive ? styles.stepNumberActive : ''}
                    ${isPending ? styles.stepNumberPending : ''}
                  `}
                  style={isActive ? { backgroundColor: themeColor } : undefined}
                >
                  {isCompleted ? (
                    <Icon iconName="CheckMark" style={{ fontSize: 12 }} />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`
                    ${styles.stepLabel}
                    ${isActive ? styles.stepLabelActive : ''}
                  `}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          CENTER AREA - Form Content
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className={styles.centerArea}>
        {/* Form Header */}
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>{steps[currentStep]?.label || title}</h2>
          <p className={styles.formSubtitle}>
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Form Content */}
        <div className={styles.formContent}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <Spinner size={SpinnerSize.large} label={loadingText || 'Loading...'} />
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer with Progress and Navigation */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {progressPercent !== undefined && (
              <>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {progressText && (
                  <span className={styles.progressText}>{progressText}</span>
                )}
              </>
            )}
          </div>

          <div className={styles.footerRight}>
            {onCancel && (
              <button className={styles.btnGhost} onClick={onCancel}>
                Cancel
              </button>
            )}

            {onSaveDraft && (
              <button className={styles.btnSecondary} onClick={onSaveDraft}>
                <Icon iconName="Save" style={{ fontSize: 14 }} />
                Save Draft
              </button>
            )}

            {onBack && currentStep > 0 && (
              <button className={styles.btnSecondary} onClick={onBack}>
                <Icon iconName="ChevronLeft" style={{ fontSize: 14 }} />
                {backLabel}
              </button>
            )}

            {isLastStep ? (
              <button
                className={styles.btnPrimary}
                onClick={onSubmit}
                disabled={submitDisabled || isSubmitting}
              >
                {isSubmitting ? 'Processing...' : submitLabel}
                {!isSubmitting && <Icon iconName="CheckMark" style={{ fontSize: 14 }} />}
              </button>
            ) : (
              <button
                className={styles.btnPrimary}
                onClick={onNext}
                disabled={nextDisabled}
              >
                {nextLabel}
                <Icon iconName="ChevronRight" style={{ fontSize: 14 }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          RIGHT PANEL - Context Tips & Checklist
          ═══════════════════════════════════════════════════════════════════════════ */}
      {!hideRightPanel && (
        <div className={styles.rightPanel}>
          <div className={styles.rightPanelHeader}>
            <h4 className={styles.rightPanelTitle}>
              <Icon iconName="Lightbulb" style={{ marginRight: 8 }} />
              Tips & Info
            </h4>
          </div>

          <div className={styles.rightPanelContent}>
            {/* Tips */}
            {tips && tips.length > 0 && tips.map((tip, index) => (
              <div key={index} className={styles.tipCard}>
                <div className={styles.tipCardHeader}>
                  <Icon iconName={tip.icon} className={styles.tipCardIcon} />
                  <span className={styles.tipCardTitle}>{tip.title}</span>
                </div>
                <div className={styles.tipCardBody}>{tip.content}</div>
              </div>
            ))}

            {/* Checklist */}
            {checklist && checklist.length > 0 && (
              <div className={styles.checklist}>
                <div className={styles.checklistTitle}>Completion Checklist</div>
                {checklist.map((item, index) => (
                  <div key={index} className={styles.checklistItem}>
                    <div
                      className={`
                        ${styles.checklistIcon}
                        ${item.completed ? styles.checklistIconComplete : styles.checklistIconPending}
                      `}
                    >
                      {item.completed ? (
                        <Icon iconName="CheckMark" style={{ fontSize: 10 }} />
                      ) : (
                        <Icon iconName="Circle" style={{ fontSize: 6 }} />
                      )}
                    </div>
                    <span
                      className={`
                        ${styles.checklistLabel}
                        ${item.completed ? styles.checklistLabelComplete : ''}
                      `}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {(!tips || tips.length === 0) && (!checklist || checklist.length === 0) && (
              <div style={{ textAlign: 'center', color: '#8a8886', fontSize: 13, padding: 20 }}>
                Tips will appear here as you progress through the wizard.
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   SUCCESS SCREEN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface ISummaryPanelItem {
  label: string;
  completed?: boolean;
}

export interface ISummaryPanel {
  title: string;
  icon: string;
  items: ISummaryPanelItem[];
}

export interface IWizardAction {
  /** Icon name from Fluent UI (e.g., 'AddFriend', 'ChromeClose') */
  icon: string;
  /** Tooltip text shown on hover */
  tooltip: string;
  /** Click handler */
  onClick: () => void;
}

export interface IJmlWizardSuccessProps {
  theme: JmlWizardTheme;
  icon: string;
  title: string;
  subtitle: string;
  /** 3-column summary panels (preferred) */
  summaryPanels?: ISummaryPanel[];
  /** Legacy: single summary title */
  summaryTitle?: string;
  /** Legacy: single summary content */
  summaryContent?: React.ReactNode;
  /** Stats row (4 items max recommended) */
  stats?: { value: number | string; label: string }[];
  /** Primary action - icon button (e.g., add another) */
  primaryAction?: IWizardAction;
  /** Secondary action - icon button (e.g., close) */
  secondaryAction?: IWizardAction;
}

export const JmlWizardSuccess: React.FC<IJmlWizardSuccessProps> = ({
  theme,
  icon,
  title,
  subtitle,
  summaryPanels,
  summaryTitle,
  summaryContent,
  stats,
  primaryAction,
  secondaryAction,
}) => {
  const themeColor = getThemeColor(theme);
  const themeClass = getThemeClass(theme);

  return (
    <div className={`${styles.successScreen} ${themeClass}`}>
      {/* Header with icon and title */}
      <div className={styles.successHeader}>
        <div
          className={styles.successIcon}
          style={{
            background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}cc 100%)`,
          }}
        >
          <Icon iconName={icon} style={{ fontSize: 36, color: '#fff' }} />
        </div>
        <div className={styles.successHeaderText}>
          <h2 className={styles.successTitle}>{title}</h2>
          <p className={styles.successSubtitle}>{subtitle}</p>
        </div>
      </div>

      {/* Stats Row */}
      {stats && stats.length > 0 && (
        <div className={styles.successStats}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.successStatCard}>
              <div
                className={styles.successStatValue}
                style={{ color: themeColor }}
              >
                {stat.value}
              </div>
              <div className={styles.successStatLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 3-Panel Summary Grid */}
      {summaryPanels && summaryPanels.length > 0 && (
        <div className={styles.successPanelsGrid}>
          {summaryPanels.map((panel, panelIndex) => (
            <div key={panelIndex} className={styles.successPanel}>
              <div className={styles.successPanelHeader}>
                <div className={styles.successPanelIcon}>
                  <Icon iconName={panel.icon} style={{ fontSize: 16 }} />
                </div>
                <h4 className={styles.successPanelTitle}>{panel.title}</h4>
                <span className={styles.successPanelCount}>{panel.items.length}</span>
              </div>
              <div className={styles.successPanelList}>
                {panel.items.length > 0 ? (
                  panel.items.map((item, itemIndex) => (
                    <div key={itemIndex} className={styles.successPanelItem}>
                      <div
                        className={`${styles.successPanelItemIcon} ${
                          item.completed !== false
                            ? styles.successPanelItemIconSuccess
                            : styles.successPanelItemIconPending
                        }`}
                      >
                        <Icon
                          iconName={item.completed !== false ? 'CheckMark' : 'Clock'}
                          style={{ fontSize: 10 }}
                        />
                      </div>
                      <span>{item.label}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.successPanelEmptyState}>No items</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legacy single summary (backward compat) */}
      {!summaryPanels && summaryContent && (
        <div className={styles.successSummary}>
          {summaryTitle && (
            <div style={{ fontWeight: 600, marginBottom: 12 }}>{summaryTitle}</div>
          )}
          {summaryContent}
        </div>
      )}

      {/* Action buttons - Icon buttons with tooltips */}
      <div className={styles.successActions}>
        {primaryAction && (
          <button
            className={styles.btnIconPrimary}
            onClick={primaryAction.onClick}
            title={primaryAction.tooltip}
            aria-label={primaryAction.tooltip}
            style={{
              background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}cc 100%)`,
            }}
          >
            <Icon iconName={primaryAction.icon} style={{ fontSize: 20, color: '#fff' }} />
          </button>
        )}
        {secondaryAction && (
          <button
            className={styles.btnIconSecondary}
            onClick={secondaryAction.onClick}
            title={secondaryAction.tooltip}
            aria-label={secondaryAction.tooltip}
          >
            <Icon iconName={secondaryAction.icon} style={{ fontSize: 20 }} />
          </button>
        )}
      </div>
    </div>
  );
};
