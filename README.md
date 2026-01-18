# LinkedIn Bot

Automated LinkedIn posting system with AI-generated content, Todoist approval workflow, and Playwright browser automation.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  GitHub Action  │────▶│  Groq (Llama)   │────▶│    Todoist      │
│  (Daily)        │     │  (Generate)     │     │  (Draft Queue)  │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                    User reviews
                                                    & approves
                                                         │
┌─────────────────┐     ┌─────────────────┐     ┌────────▼────────┐
│    LinkedIn     │◀────│   Playwright    │◀────│  GitHub Action  │
│   (Post Live)   │     │   (Automate)    │     │  (2-3x weekly)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## How It Works

1. **Daily Draft Generation**: GitHub Action runs daily, uses Llama 3.1 70B (via Groq) to generate LinkedIn posts
2. **Todoist Queue**: Drafts appear as tasks in a "LinkedIn Drafts" project
3. **Human Approval**: Review drafts in Todoist, add the `linkedin-approved` label to posts you want to publish
4. **Automated Posting**: Mon/Wed/Fri, Playwright automates posting approved content to LinkedIn

## Setup

### Prerequisites

- Node.js 20+
- pnpm
- Groq API key (free at https://console.groq.com)
- Todoist API token
- LinkedIn account

### Installation

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
GROQ_API_KEY=gsk_...
TODOIST_API_TOKEN=your_todoist_api_token
LINKEDIN_EMAIL=your_email@example.com
LINKEDIN_PASSWORD=your_password
```

### GitHub Secrets

Add these secrets to your repository:

- `GROQ_API_KEY`
- `TODOIST_API_TOKEN`
- `LINKEDIN_EMAIL`
- `LINKEDIN_PASSWORD`

## Usage

### Generate Drafts (Local)

```bash
pnpm generate
```

### Post Approved Content (Local)

```bash
# Dry run (preview only)
pnpm post:dry-run

# Actually post
pnpm post
```

### GitHub Actions

Workflows run automatically:

- `generate-drafts.yml`: Daily at 8:00 AM UTC
- `post-approved.yml`: Mon/Wed/Fri at 7:30 AM UTC

## Todoist Workflow

1. Drafts are created with the `linkedin-draft` label
2. Review the draft content in the task description
3. Add the `linkedin-approved` label to approve
4. The bot posts and marks the task complete with `linkedin-posted` label

## Content Strategy

The AI generates posts based on:

- **SSI/Web3 Identity** (1x/week)
- **Building in Public** (1x/week)
- **Young Founder Reality** (1x/week)
- **Tech Career** (1x/2 weeks)
- **Project Showcase** (1x/2 weeks)

Posts follow LinkedIn algorithm best practices:
- Strong hooks in first 2 lines
- Short paragraphs (1-2 lines)
- 800-1500 characters
- French language
- No external links (put in comments)

## Project Structure

```
src/
├── config/
│   ├── profile.ts      # Professional context for AI
│   └── prompts.ts      # System prompts for content
├── services/
│   ├── content-generator.ts   # Groq/Llama integration
│   ├── todoist.ts             # Draft queue management
│   └── linkedin.ts            # Playwright automation
├── scripts/
│   ├── generate-drafts.ts     # Entry point: create drafts
│   └── post-approved.ts       # Entry point: publish content
└── utils/
    ├── env.ts           # Environment config
    ├── logger.ts        # Logging utility
    └── random-delay.ts  # Human-like delays
```

## Security

- LinkedIn credentials stored in GitHub Secrets
- Session cookies cached to reduce logins
- Human-like delays to avoid detection
- Never push `.env` or `.playwright-state/`

## Why Groq?

Groq offers a **free tier** with Llama 3.1 70B - a powerful open-source model that works great for content generation. No credit card required.
