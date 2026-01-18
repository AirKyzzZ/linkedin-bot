import { todoistService } from '../services/todoist.js';
import { postToLinkedIn } from '../services/linkedin.js';
import { logger } from '../utils/logger.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function main(): Promise<void> {
  logger.info('=== LinkedIn Post Publisher ===');

  if (DRY_RUN) {
    logger.info('Running in DRY RUN mode');
  }

  try {
    await todoistService.initialize();

    const approvedPosts = await todoistService.getApprovedPosts();

    if (approvedPosts.length === 0) {
      logger.info('No approved posts to publish');
      return;
    }

    const postToPublish = approvedPosts[0];

    if (!postToPublish) {
      logger.info('No posts available');
      return;
    }

    logger.info(`Publishing: ${postToPublish.topic}`);

    const success = await postToLinkedIn(postToPublish.content, DRY_RUN);

    if (success) {
      if (!DRY_RUN) {
        await todoistService.markAsPosted(postToPublish.taskId);
      }
      logger.info('=== Post published successfully ===');
    } else {
      logger.error('Failed to publish post');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Publishing failed', error);
    process.exit(1);
  }
}

main();
