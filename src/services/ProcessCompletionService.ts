// Process Completion Service — Handles workflow completion notifications
// This service checks JML processes for 100% completion and triggers completion workflows
// It works alongside OnboardingService, MoverService, and OffboardingService

import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { WorkflowOrchestrator } from './WorkflowOrchestrator';
import { OnboardingService } from './OnboardingService';
import { MoverService } from './MoverService';
import { OffboardingService } from './OffboardingService';
import { OnboardingStatus } from '../models/IOnboarding';
import { MoverStatus } from '../models/IMover';
import { OffboardingStatus } from '../models/IOffboarding';

export interface ICompletionCheckResult {
  processId: number;
  processType: 'Onboarding' | 'Mover' | 'Offboarding';
  employeeName: string;
  wasCompleted: boolean;
  notificationSent: boolean;
}

export class ProcessCompletionService {
  private workflowOrchestrator: WorkflowOrchestrator;
  private onboardingService: OnboardingService;
  private moverService: MoverService;
  private offboardingService: OffboardingService;

  constructor(sp: SPFI, context?: WebPartContext) {
    this.workflowOrchestrator = new WorkflowOrchestrator(sp, context, { sendTeamsNotifications: true });
    this.onboardingService = new OnboardingService(sp);
    this.moverService = new MoverService(sp);
    this.offboardingService = new OffboardingService(sp);
  }

  /**
   * Check if an onboarding process just completed (100% tasks done)
   * and trigger completion workflow if so
   */
  public async checkOnboardingCompletion(onboardingId: number): Promise<ICompletionCheckResult> {
    const result: ICompletionCheckResult = {
      processId: onboardingId,
      processType: 'Onboarding',
      employeeName: '',
      wasCompleted: false,
      notificationSent: false,
    };

    try {
      const onboarding = await this.onboardingService.getOnboardingById(onboardingId);
      if (!onboarding) return result;

      result.employeeName = onboarding.CandidateName;

      // Check if this onboarding just reached 100% completion
      if (onboarding.CompletionPercentage === 100 && onboarding.Status === OnboardingStatus.Completed) {
        result.wasCompleted = true;

        // Trigger completion workflow (sends notification)
        try {
          await this.workflowOrchestrator.completeOnboardingWorkflow(onboardingId);
          result.notificationSent = true;
          console.log(`[ProcessCompletionService] Onboarding completed for ${onboarding.CandidateName}`);
        } catch (error) {
          console.error('[ProcessCompletionService] Error sending onboarding completion notification:', error);
        }
      }
    } catch (error) {
      console.error('[ProcessCompletionService] Error checking onboarding completion:', error);
    }

    return result;
  }

  /**
   * Check if a mover process just completed and trigger completion workflow
   */
  public async checkMoverCompletion(moverId: number): Promise<ICompletionCheckResult> {
    const result: ICompletionCheckResult = {
      processId: moverId,
      processType: 'Mover',
      employeeName: '',
      wasCompleted: false,
      notificationSent: false,
    };

    try {
      const mover = await this.moverService.getMoverById(moverId);
      if (!mover) return result;

      result.employeeName = mover.EmployeeName;

      // Check if this mover process just reached 100% completion
      if (mover.CompletionPercentage === 100 && mover.Status === MoverStatus.Completed) {
        result.wasCompleted = true;

        // Trigger completion workflow (sends notification)
        try {
          await this.workflowOrchestrator.completeMoverWorkflow(moverId);
          result.notificationSent = true;
          console.log(`[ProcessCompletionService] Mover completed for ${mover.EmployeeName}`);
        } catch (error) {
          console.error('[ProcessCompletionService] Error sending mover completion notification:', error);
        }
      }
    } catch (error) {
      console.error('[ProcessCompletionService] Error checking mover completion:', error);
    }

    return result;
  }

  /**
   * Check if an offboarding process just completed and trigger completion workflow
   */
  public async checkOffboardingCompletion(offboardingId: number): Promise<ICompletionCheckResult> {
    const result: ICompletionCheckResult = {
      processId: offboardingId,
      processType: 'Offboarding',
      employeeName: '',
      wasCompleted: false,
      notificationSent: false,
    };

    try {
      const offboarding = await this.offboardingService.getOffboardingById(offboardingId);
      if (!offboarding) return result;

      result.employeeName = offboarding.EmployeeName;

      // Check if this offboarding just reached 100% completion
      if (offboarding.CompletionPercentage === 100 && offboarding.Status === OffboardingStatus.Completed) {
        result.wasCompleted = true;

        // Trigger completion workflow (sends notification)
        try {
          await this.workflowOrchestrator.completeOffboardingWorkflow(offboardingId);
          result.notificationSent = true;
          console.log(`[ProcessCompletionService] Offboarding completed for ${offboarding.EmployeeName}`);
        } catch (error) {
          console.error('[ProcessCompletionService] Error sending offboarding completion notification:', error);
        }
      }
    } catch (error) {
      console.error('[ProcessCompletionService] Error checking offboarding completion:', error);
    }

    return result;
  }

  /**
   * Convenience method to recalculate progress and check for completion in one call
   * Use this after task status changes
   */
  public async recalculateAndCheckOnboarding(onboardingId: number): Promise<ICompletionCheckResult> {
    await this.onboardingService.recalculateProgress(onboardingId);
    return this.checkOnboardingCompletion(onboardingId);
  }

  public async recalculateAndCheckMover(moverId: number): Promise<ICompletionCheckResult> {
    await this.moverService.recalculateProgress(moverId);
    return this.checkMoverCompletion(moverId);
  }

  public async recalculateAndCheckOffboarding(offboardingId: number): Promise<ICompletionCheckResult> {
    await this.offboardingService.recalculateProgress(offboardingId);
    return this.checkOffboardingCompletion(offboardingId);
  }
}
