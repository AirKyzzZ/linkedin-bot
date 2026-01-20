import { contentGenerator } from '../services/content-generator.js';
import { todoistService } from '../services/todoist.js';
import { logger } from '../utils/logger.js';

async function main(): Promise<void> {
  logger.info('=== LinkedIn Draft Generation ===');

  try {
    await todoistService.initialize();

    const draftsNeeded = await todoistService.getDraftsNeedingGeneration();

    if (draftsNeeded === 0) {
      logger.info('Queue is full. No drafts needed.');
      return;
    }

    logger.info(`Generating ${draftsNeeded} new drafts...`);

    const posts = await contentGenerator.generateMultiplePosts(draftsNeeded);

    for (const post of posts) {
      let imagePrompt;
      try {
        imagePrompt = await contentGenerator.generateImagePrompt(post.content, post.topic);
        logger.info(`Image prompt generated for: ${post.topic}`);
      } catch (error) {
        logger.warn(`Failed to generate image prompt for: ${post.topic}`, error);
      }

      await todoistService.createDraft(
        post.topic,
        post.content,
        post.format,
        post.suggestedDate,
        imagePrompt
      );
      logger.info(`Draft created: ${post.topic}`);

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const finalCount = await todoistService.getDraftCount();
    logger.info(`=== Complete: ${finalCount} drafts in queue ===`);
  } catch (error) {
    logger.error('Draft generation failed', error);
    process.exit(1);
  }
}

main();
