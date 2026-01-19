import { TodoistApi } from '@doist/todoist-api-typescript';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';

interface DraftPost {
  id: string;
  topic: string;
  content: string;
  format: string;
  createdAt: string;
}

interface ApprovedPost {
  taskId: string;
  topic: string;
  content: string;
}

const DRAFT_LABEL = 'linkedin-draft';
const APPROVED_LABEL = 'linkedin-approved';
const POSTED_LABEL = 'linkedin-posted';
const SCHEDULED_LABEL = 'linkedin-scheduled';

type ApiResponse<T> = T[] | { results: T[] };

function extractResults<T>(response: ApiResponse<T>): T[] {
  if (Array.isArray(response)) {
    return response;
  }
  return response.results;
}

export class TodoistService {
  private api: TodoistApi;
  private projectId: string | null = null;

  constructor() {
    this.api = new TodoistApi(env.todoist.apiToken);
  }

  async initialize(): Promise<void> {
    await this.ensureProjectExists();
    await this.ensureLabelsExist();
  }

  private async ensureProjectExists(): Promise<void> {
    const projectName = env.todoist.projectName;
    logger.info(`Looking for project: ${projectName}`);

    try {
      const response = await this.api.getProjects();
      const projects = extractResults(response as ApiResponse<{ id: string; name: string }>);
      const existingProject = projects.find((p) => p.name === projectName);

      if (existingProject) {
        this.projectId = existingProject.id;
        logger.info(`Found existing project: ${projectName} (${this.projectId})`);
        return;
      }

      const newProject = await this.api.addProject({
        name: projectName,
        color: 'blue',
        isFavorite: true,
      });

      this.projectId = newProject.id;
      logger.info(`Created new project: ${projectName} (${this.projectId})`);
    } catch (error) {
      logger.error('Failed to ensure project exists', error);
      throw error;
    }
  }

  private async ensureLabelsExist(): Promise<void> {
    const requiredLabels = [DRAFT_LABEL, APPROVED_LABEL, POSTED_LABEL, SCHEDULED_LABEL];

    try {
      const response = await this.api.getLabels();
      const labels = extractResults(response as ApiResponse<{ name: string }>);
      const existingLabels = labels.map((l) => l.name);

      for (const label of requiredLabels) {
        if (!existingLabels.includes(label)) {
          await this.api.addLabel({ name: label });
          logger.info(`Created label: ${label}`);
        }
      }
    } catch (error) {
      logger.error('Failed to ensure labels exist', error);
      throw error;
    }
  }

  async createDraft(topic: string, content: string, format: string, suggestedDate?: string): Promise<DraftPost> {
    if (!this.projectId) {
      await this.initialize();
    }

    logger.info(`Creating draft: ${topic}`);

    try {
      let description = `**Format:** ${format}`;
      if (suggestedDate) {
        description += `\n**Suggested Time:** ${suggestedDate}`;
      }
      description += `\n\n---\n\n${content}`;

      const task = await this.api.addTask({
        content: `📝 ${topic}`,
        description,
        projectId: this.projectId!,
        labels: [DRAFT_LABEL],
        priority: 2,
      });

      const draft: DraftPost = {
        id: task.id,
        topic,
        content,
        format,
        createdAt: task.createdAt,
      };

      logger.info(`Draft created: ${task.id}`);
      return draft;
    } catch (error) {
      logger.error('Failed to create draft', error);
      throw error;
    }
  }

  async getDraftCount(): Promise<number> {
    if (!this.projectId) {
      await this.initialize();
    }

    try {
      const response = await this.api.getTasks({
        projectId: this.projectId!,
        label: DRAFT_LABEL,
      });

      const tasks = extractResults(
        response as ApiResponse<{ id: string }>
      );
      return tasks.length;
    } catch (error) {
      logger.error('Failed to get draft count', error);
      throw error;
    }
  }

  async getScheduledPosts(): Promise<{ taskId: string; dueString?: string }[]> {
    if (!this.projectId) {
      await this.initialize();
    }

    logger.info('Fetching scheduled posts...');

    try {
      const response = await this.api.getTasks({
        projectId: this.projectId!,
        label: SCHEDULED_LABEL,
      });

      const tasks = extractResults(
        response as ApiResponse<{ id: string; due?: { string: string; date: string } }>
      );

      return tasks.map((t) => ({
        taskId: t.id,
        dueString: t.due?.date || t.due?.string,
      }));
    } catch (error) {
      logger.error('Failed to get scheduled posts', error);
      throw error;
    }
  }

  async scheduleTask(taskId: string, dueString: string): Promise<void> {
    logger.info(`Scheduling task ${taskId} for ${dueString}`);

    try {
      const task = await this.api.getTask(taskId);
      const currentLabels = task.labels.filter((l) => l !== APPROVED_LABEL);
      if (!currentLabels.includes(SCHEDULED_LABEL)) {
        currentLabels.push(SCHEDULED_LABEL);
      }

      await this.api.updateTask(taskId, {
        dueString,
        labels: currentLabels,
      });

      logger.info(`Task ${taskId} scheduled`);
    } catch (error) {
      logger.error(`Failed to schedule task: ${taskId}`, error);
      throw error;
    }
  }

  async getApprovedPosts(): Promise<ApprovedPost[]> {
    if (!this.projectId) {
      await this.initialize();
    }

    logger.info('Fetching approved posts...');

    try {
      const response = await this.api.getTasks({
        projectId: this.projectId!,
        label: APPROVED_LABEL,
      });

      interface TaskData {
        id: string;
        content: string;
        description: string;
      }

      const tasks = extractResults(response as ApiResponse<TaskData>);

      const approvedPosts: ApprovedPost[] = tasks.map((task) => {
        const content = this.extractContentFromDescription(task.description);
        const topic = task.content.replace(/^📝\s*/, '');

        return {
          taskId: task.id,
          topic,
          content,
        };
      });

      logger.info(`Found ${approvedPosts.length} approved posts`);
      return approvedPosts;
    } catch (error) {
      logger.error('Failed to get approved posts', error);
      throw error;
    }
  }

  private extractContentFromDescription(description: string): string {
    const parts = description.split('---');
    if (parts.length > 1) {
      return parts.slice(1).join('---').trim();
    }
    return description;
  }

  async markAsPosted(taskId: string): Promise<void> {
    logger.info(`Marking task as posted: ${taskId}`);

    try {
      const task = await this.api.getTask(taskId);
      const currentLabels = task.labels.filter((l) => l !== APPROVED_LABEL);
      currentLabels.push(POSTED_LABEL);

      await this.api.updateTask(taskId, {
        labels: currentLabels,
      });

      await this.api.closeTask(taskId);
      logger.info(`Task ${taskId} marked as posted and completed`);
    } catch (error) {
      logger.error(`Failed to mark task as posted: ${taskId}`, error);
      throw error;
    }
  }

  async getDraftsNeedingGeneration(): Promise<number> {
    const currentDrafts = await this.getDraftCount();
    const minQueue = env.config.minQueueSize;
    const needed = Math.max(0, minQueue - currentDrafts);

    logger.info(`Current drafts: ${currentDrafts}, Min queue: ${minQueue}, Need to generate: ${needed}`);
    return needed;
  }
}

export const todoistService = new TodoistService();
