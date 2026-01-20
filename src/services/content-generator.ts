import Groq from 'groq-sdk';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import {
  SYSTEM_PROMPT,
  TOPIC_GENERATION_PROMPT,
  IMAGE_PROMPT_SYSTEM,
  createPostPrompt,
  createImagePromptRequest,
  POST_FORMATS,
  getFormatInstruction,
  type PostFormat,
} from '../config/prompts.js';
import { profile } from '../config/profile.js';

interface TopicIdea {
  title: string;
  angle: string;
  hook: string;
  theme: string;
  suggestedDay: string;
  suggestedTime: string;
}

interface GeneratedPost {
  content: string;
  topic: string;
  format: PostFormat;
  characterCount: number;
  suggestedDate?: string;
}

export interface ImagePrompt {
  prompt: string;
  style: string;
  mood: string;
  colors: string;
  composition: string;
}

const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

export class ContentGenerator {
  private client: Groq;
  private usedFormats: PostFormat[] = [];
  private currentModel: string = PRIMARY_MODEL;

  constructor() {
    this.client = new Groq({
      apiKey: env.groq.apiKey,
    });
  }

  private getNextFormat(): PostFormat {
    if (this.usedFormats.length >= POST_FORMATS.length) {
      this.usedFormats = [];
    }

    const availableFormats = POST_FORMATS.filter((f) => !this.usedFormats.includes(f));
    const randomIndex = Math.floor(Math.random() * availableFormats.length);
    const selectedFormat = availableFormats[randomIndex];

    if (!selectedFormat) {
      return 'story';
    }

    this.usedFormats.push(selectedFormat);
    return selectedFormat;
  }

  private getRandomTheme(): string {
    const themes = profile.contentThemes;
    const randomIndex = Math.floor(Math.random() * themes.length);
    const theme = themes[randomIndex];
    return theme?.theme ?? 'Building in Public';
  }

  private isRateLimitError(error: unknown): boolean {
    return (
      error instanceof Error &&
      'status' in error &&
      (error as { status: number }).status === 429
    );
  }

  private switchToFallback(): void {
    if (this.currentModel !== FALLBACK_MODEL) {
      logger.warn(`Rate limited on ${this.currentModel}, switching to ${FALLBACK_MODEL}`);
      this.currentModel = FALLBACK_MODEL;
    }
  }

  async generateTopics(count: number = 5): Promise<TopicIdea[]> {
    logger.info(`Generating ${count} topic ideas...`);

    const tryGenerate = async (model: string): Promise<TopicIdea[]> => {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: TOPIC_GENERATION_PROMPT,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in response');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as { topics: TopicIdea[] };
      logger.info(`Generated ${parsed.topics.length} topic ideas`);

      return parsed.topics.slice(0, count);
    };

    try {
      return await tryGenerate(this.currentModel);
    } catch (error) {
      if (this.isRateLimitError(error) && this.currentModel === PRIMARY_MODEL) {
        this.switchToFallback();
        return await tryGenerate(FALLBACK_MODEL);
      }
      logger.error('Failed to generate topics', error);
      throw error;
    }
  }

  async generatePost(topic: string, additionalContext?: string, suggestedDate?: string): Promise<GeneratedPost> {
    const format = this.getNextFormat();
    logger.info(`Generating post for topic: "${topic}" with format: ${format}`);

    const formatInstruction = getFormatInstruction(format);
    const userPrompt = createPostPrompt(topic, additionalContext);

    const tryGenerate = async (model: string): Promise<GeneratedPost> => {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: `${SYSTEM_PROMPT}\n\nFORMAT SPÉCIFIQUE POUR CE POST:\n${formatInstruction}`,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in response');
      }

      const trimmedContent = content.trim();
      const characterCount = trimmedContent.length;

      if (characterCount < 400 || characterCount > 3000) {
        logger.warn(`Post length (${characterCount}) outside optimal range (800-1500)`);
      }

      logger.info(`Generated post: ${characterCount} characters`);

      return {
        content: trimmedContent,
        topic,
        format,
        characterCount,
        suggestedDate,
      };
    };

    try {
      return await tryGenerate(this.currentModel);
    } catch (error) {
      if (this.isRateLimitError(error) && this.currentModel === PRIMARY_MODEL) {
        this.switchToFallback();
        return await tryGenerate(FALLBACK_MODEL);
      }
      logger.error('Failed to generate post', error);
      throw error;
    }
  }

  async generateMultiplePosts(count: number): Promise<GeneratedPost[]> {
    logger.info(`Generating ${count} posts...`);

    const topics = await this.generateTopics(count);
    const posts: GeneratedPost[] = [];

    for (const topic of topics) {
      try {
        const suggestedDate = `${topic.suggestedDay} at ${topic.suggestedTime}`;
        const post = await this.generatePost(
            topic.title, 
            `Angle: ${topic.angle}\nHook suggéré: ${topic.hook}`,
            suggestedDate
        );
        posts.push(post);

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Failed to generate post for topic: ${topic.title}`, error);
      }
    }

    logger.info(`Successfully generated ${posts.length}/${count} posts`);
    return posts;
  }

  async generateSinglePost(theme?: string): Promise<GeneratedPost> {
    const selectedTheme = theme ?? this.getRandomTheme();
    const themeConfig = profile.contentThemes.find((t) => t.theme === selectedTheme);

    if (!themeConfig) {
      throw new Error(`Theme not found: ${selectedTheme}`);
    }

    const randomTopicIndex = Math.floor(Math.random() * themeConfig.topics.length);
    const topic = themeConfig.topics[randomTopicIndex] ?? themeConfig.topics[0];

    if (!topic) {
      throw new Error('No topics available for theme');
    }

    return this.generatePost(`${selectedTheme}: ${topic}`);
  }

  async generateImagePrompt(postContent: string, topic: string): Promise<ImagePrompt> {
    logger.info(`Generating image prompt for topic: "${topic}"`);

    const userPrompt = createImagePromptRequest(postContent, topic);

    const tryGenerate = async (model: string): Promise<ImagePrompt> => {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content: IMAGE_PROMPT_SYSTEM,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in response');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as ImagePrompt;
      logger.info(`Generated image prompt: ${parsed.style} style`);

      return parsed;
    };

    try {
      return await tryGenerate(this.currentModel);
    } catch (error) {
      if (this.isRateLimitError(error) && this.currentModel === PRIMARY_MODEL) {
        this.switchToFallback();
        return await tryGenerate(FALLBACK_MODEL);
      }
      logger.error('Failed to generate image prompt', error);
      throw error;
    }
  }
}

export const contentGenerator = new ContentGenerator();
