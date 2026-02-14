import cron from 'node-cron';
import { checkDueDateReminders } from './notificationService.js';
import { processQueue, initialize as initializeEmailService } from './emailService.js';

let dueDateJob: cron.ScheduledTask | null = null;
let emailQueueJob: cron.ScheduledTask | null = null;
let isRunning = false;

/**
 * Initialize the scheduler service
 */
export async function initialize(): Promise<void> {
  if (isRunning) {
    console.log('Scheduler already running');
    return;
  }

  // Initialize email service first
  await initializeEmailService();

  // Schedule due date reminder check (every hour)
  dueDateJob = cron.schedule('0 * * * *', async () => {
    console.log('Running due date reminder check...');
    try {
      await checkDueDateReminders();
      console.log('Due date reminder check completed');
    } catch (error) {
      console.error('Error in due date reminder check:', error);
    }
  });

  // Schedule email queue processing (every 5 minutes)
  emailQueueJob = cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await processQueue();
      if (result.sent > 0 || result.failed > 0) {
        console.log(`Email queue processed: ${result.sent} sent, ${result.failed} failed`);
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    }
  });

  isRunning = true;
  console.log('Scheduler service initialized');

  // Run initial checks after a short delay
  setTimeout(async () => {
    console.log('Running initial checks...');
    try {
      await checkDueDateReminders();
      const result = await processQueue();
      console.log(`Initial email queue processed: ${result.sent} sent, ${result.failed} failed`);
    } catch (error) {
      console.error('Error in initial checks:', error);
    }
  }, 5000);
}

/**
 * Stop the scheduler service
 */
export function shutdown(): void {
  if (dueDateJob) {
    dueDateJob.stop();
    dueDateJob = null;
  }

  if (emailQueueJob) {
    emailQueueJob.stop();
    emailQueueJob = null;
  }

  isRunning = false;
  console.log('Scheduler service stopped');
}

/**
 * Manually trigger due date check (for testing)
 */
export async function triggerDueDateCheck(): Promise<void> {
  await checkDueDateReminders();
}

/**
 * Manually trigger email queue processing (for testing)
 */
export async function triggerEmailProcessing(): Promise<{ sent: number; failed: number }> {
  return await processQueue();
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return isRunning;
}

export default {
  initialize,
  shutdown,
  triggerDueDateCheck,
  triggerEmailProcessing,
  isSchedulerRunning,
};
