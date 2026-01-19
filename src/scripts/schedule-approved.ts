import { todoistService } from '../services/todoist.js';
import { logger } from '../utils/logger.js';

async function main(): Promise<void> {
  logger.info('=== LinkedIn Post Scheduler ===');

  try {
    await todoistService.initialize();

    // 1. Get posts that need scheduling (Label: linkedin-approved)
    const approvedPosts = await todoistService.getApprovedPosts();

    if (approvedPosts.length === 0) {
      logger.info('No approved posts to schedule');
      return;
    }

    logger.info(`Found ${approvedPosts.length} posts to schedule`);

    // 2. Get currently scheduled posts to find the end of the queue
    const scheduledPosts = await todoistService.getScheduledPosts();
    
    let lastScheduledDate = new Date(); // Default to today
    
    if (scheduledPosts.length > 0) {
      const dates = scheduledPosts
        .map(p => {
            if (!p.dueString) return null;
            // Handle "YYYY-MM-DD" or ISO strings
            const parts = p.dueString.split('T');
            const datePart = parts[0];
            if (!datePart) return null;
            return new Date(datePart);
        })
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
        .map(d => d.getTime());

      if (dates.length > 0) {
        lastScheduledDate = new Date(Math.max(...dates));
        logger.info(`Queue ends on: ${lastScheduledDate.toISOString().split('T')[0]}`);
      }
    }

    // 3. Schedule each approved post
    for (const post of approvedPosts) {
      const nextSlot = getNextSlot(lastScheduledDate);
      const dateStr = nextSlot.toISOString().split('T')[0];
      const dueString = `${dateStr} at 08:00`;

      logger.info(`Scheduling "${post.topic}" for ${dueString}`);
      
      await todoistService.scheduleTask(post.taskId, dueString);
      
      // Update reference for next iteration
      lastScheduledDate = nextSlot;
    }

    logger.info('=== Scheduling complete ===');

  } catch (error) {
    logger.error('Scheduling failed', error);
    process.exit(1);
  }
}

/**
 * Calculates the next Monday, Wednesday, or Friday after the given date.
 */
function getNextSlot(afterDate: Date): Date {
  const d = new Date(afterDate);
  
  // Advance by 1 day initially to find the *next* slot
  d.setDate(d.getDate() + 1);

  // 1 = Mon, 3 = Wed, 5 = Fri
  while (![1, 3, 5].includes(d.getDay())) {
    d.setDate(d.getDate() + 1);
  }

  return d;
}

main();