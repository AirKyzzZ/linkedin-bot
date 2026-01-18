import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  groq: {
    apiKey: requireEnv('GROQ_API_KEY'),
  },
  todoist: {
    apiToken: requireEnv('TODOIST_API_TOKEN'),
    projectName: optionalEnv('TODOIST_PROJECT_NAME', 'LinkedIn Drafts'),
  },
  linkedin: {
    email: optionalEnv('LINKEDIN_EMAIL', ''),
    password: optionalEnv('LINKEDIN_PASSWORD', ''),
  },
  config: {
    postFrequency: parseInt(optionalEnv('POST_FREQUENCY', '3'), 10),
    minQueueSize: parseInt(optionalEnv('MIN_QUEUE_SIZE', '3'), 10),
  },
};
