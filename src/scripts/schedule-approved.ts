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
      // Extract suggested day/time if present
      // Format in description: "**Suggested Time:** Monday at 08:00"
      const suggestionMatch = post.content.match(/\*\*Suggested Time:\*\* (\w+) at (\d{2}:\d{2})/);
      let preferredDay: number | null = null;
      let preferredTime = '08:00';

      if (suggestionMatch) {
          const dayStr = suggestionMatch[1];
          preferredTime = suggestionMatch[2] ?? '08:00';
          if (dayStr === 'Monday') preferredDay = 1;
          if (dayStr === 'Wednesday') preferredDay = 3;
          if (dayStr === 'Friday') preferredDay = 5;
      }

      const nextSlot = getNextSlot(lastScheduledDate, preferredDay);
      
      // Construct the due string
      // getNextSlot returns a Date object at 00:00 or current time
      // We need to format it as YYYY-MM-DD
      const dateStr = nextSlot.toISOString().split('T')[0];
      const dueString = `${dateStr} at ${preferredTime}`;

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
 * Calculates the next available slot after the given date.
 * If preferredDay is provided (1=Mon, 3=Wed, 5=Fri), it looks for the next occurrence of that day.
 * Otherwise, it finds the next Mon/Wed/Fri.
 */
function getNextSlot(afterDate: Date, preferredDay: number | null = null): Date {
  const d = new Date(afterDate);
  
  // Advance by 1 day initially to find the *next* slot
  d.setDate(d.getDate() + 1);

  if (preferredDay !== null) {
      // Find specific day
      while (d.getDay() !== preferredDay) {
          d.setDate(d.getDate() + 1);
      }
  } else {
      // Find any Mon(1), Wed(3), or Fri(5)
      while (![1, 3, 5].includes(d.getDay())) {
        d.setDate(d.getDate() + 1);
      }
  }

  return d;
}

main();