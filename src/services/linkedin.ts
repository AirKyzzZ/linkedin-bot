import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { humanLikeDelay, shortDelay, typingDelay } from '../utils/random-delay.js';

const STATE_DIR = join(process.cwd(), '.playwright-state');
const STATE_FILE = join(STATE_DIR, 'linkedin-state.json');

export class LinkedInService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isHeadless: boolean;

  constructor(headless: boolean = true) {
    this.isHeadless = headless;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing LinkedIn service...');

    if (!existsSync(STATE_DIR)) {
      mkdirSync(STATE_DIR, { recursive: true });
    }

    this.browser = await chromium.launch({
      headless: this.isHeadless,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const hasExistingState = existsSync(STATE_FILE);

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
      ...(hasExistingState ? { storageState: STATE_FILE } : {}),
    });

    this.page = await this.context.newPage();

    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    logger.info('LinkedIn service initialized');
  }

  async login(): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    logger.info('Checking login status...');

    await this.page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'networkidle',
    });

    await humanLikeDelay();

    const isLoggedIn = await this.checkLoginStatus();

    if (isLoggedIn) {
      logger.info('Already logged in via saved session');
      return true;
    }

    logger.info('Logging in with credentials...');

    await this.page.goto('https://www.linkedin.com/login', {
      waitUntil: 'networkidle',
    });

    await humanLikeDelay();

    const emailInput = await this.page.locator('input#username');
    await emailInput.click();
    await shortDelay();

    for (const char of env.linkedin.email) {
      await emailInput.type(char, { delay: 0 });
      await typingDelay();
    }

    const passwordInput = await this.page.locator('input#password');
    await passwordInput.click();
    await shortDelay();

    for (const char of env.linkedin.password) {
      await passwordInput.type(char, { delay: 0 });
      await typingDelay();
    }

    await humanLikeDelay();

    await this.page.locator('button[type="submit"]').click();

    await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      logger.warn('Navigation timeout - checking if verification is needed');
    });

    await humanLikeDelay();

    const needsVerification = await this.page.locator('input#input__email_verification_pin').isVisible().catch(() => false);

    if (needsVerification) {
      logger.error('LinkedIn requires email verification - manual intervention needed');
      throw new Error('Email verification required');
    }

    const loginSuccess = await this.checkLoginStatus();

    if (loginSuccess) {
      await this.saveState();
      logger.info('Login successful');
      return true;
    }

    logger.error('Login failed');
    return false;
  }

  private async checkLoginStatus(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const feedIndicator = await this.page.locator('[data-test-id="home-nav-item"]').isVisible({ timeout: 5000 });
      return feedIndicator;
    } catch {
      return false;
    }
  }

  private async saveState(): Promise<void> {
    if (!this.context) return;

    await this.context.storageState({ path: STATE_FILE });
    logger.info('Session state saved');
  }

  async createPost(content: string): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    logger.info('Creating LinkedIn post...');

    await this.page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'networkidle',
    });

    await humanLikeDelay();

    const startPostButton = this.page.locator('button.share-box-feed-entry__trigger');
    await startPostButton.waitFor({ state: 'visible', timeout: 10000 });
    await startPostButton.click();

    await humanLikeDelay();

    const textEditor = this.page.locator('.ql-editor[data-placeholder]');
    await textEditor.waitFor({ state: 'visible', timeout: 10000 });
    await textEditor.click();

    await shortDelay();

    const chunks = content.match(/.{1,50}/g) ?? [content];
    for (const chunk of chunks) {
      await textEditor.type(chunk, { delay: 10 });
      await typingDelay();
    }

    await humanLikeDelay();

    const postButton = this.page.locator('button.share-actions__primary-action');
    await postButton.waitFor({ state: 'visible', timeout: 10000 });

    const isEnabled = await postButton.isEnabled();
    if (!isEnabled) {
      logger.error('Post button is not enabled');
      return false;
    }

    await postButton.click();

    await this.page.waitForTimeout(5000);

    const successIndicator = await this.page.locator('.artdeco-toast-item--visible').isVisible().catch(() => false);

    if (successIndicator) {
      logger.info('Post created successfully');
      await this.saveState();
      return true;
    }

    const feedReloaded = await this.page.locator('.feed-shared-update-v2').first().isVisible().catch(() => false);

    if (feedReloaded) {
      logger.info('Post likely created (feed refreshed)');
      await this.saveState();
      return true;
    }

    logger.warn('Could not confirm post creation');
    return true;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      logger.info('Browser closed');
    }
  }
}

export async function postToLinkedIn(content: string, dryRun: boolean = false): Promise<boolean> {
  if (dryRun) {
    logger.info('DRY RUN - Would post:');
    console.log('\n--- POST CONTENT ---');
    console.log(content);
    console.log('--- END CONTENT ---\n');
    return true;
  }

  if (!env.linkedin.email || !env.linkedin.password) {
    throw new Error('LinkedIn credentials required. Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD in .env');
  }

  const linkedin = new LinkedInService(process.env.CI === 'true');

  try {
    await linkedin.initialize();
    const loggedIn = await linkedin.login();

    if (!loggedIn) {
      throw new Error('Failed to log in to LinkedIn');
    }

    const posted = await linkedin.createPost(content);
    return posted;
  } finally {
    await linkedin.close();
  }
}
