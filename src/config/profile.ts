export const profile = {
  name: 'Maxime Mansiet',
  age: 19,
  location: 'Bordeaux, France',
  languages: ['French (native)', 'English (bilingual)'],

  roles: [
    {
      company: 'Verana',
      title: 'Fullstack Developer',
      focus: 'Verifiable Trust Network, DIDs, Verifiable Credentials, Trust Registries',
    },
    {
      company: '2060.io',
      title: 'Fullstack Developer',
      focus: 'Self-Sovereign Identity, DIDComm, Hologram ecosystem',
    },
    {
      company: 'Klyx',
      title: 'Founder',
      focus: 'Web agency specializing in Next.js, modern stack',
    },
    {
      company: 'PKBA',
      title: 'Co-founder',
      focus: 'Largest parkour club in Nouvelle-Aquitaine',
    },
    {
      company: 'VertiFlow',
      title: 'Founder',
      focus: 'Parkour clothing/gear brand',
    },
  ],

  techStack: {
    frontend: ['Next.js 14+', 'React', 'TypeScript', 'Tailwind CSS', 'shadcn/ui'],
    backend: ['Node.js', 'tRPC', 'PostgreSQL', 'Prisma'],
    devops: ['Docker', 'Kubernetes', 'GitHub Actions', 'Vercel'],
    specialty: ['SSI', 'DIDs', 'Verifiable Credentials', 'DIDComm', 'Trust Registries'],
  },

  community: ['GDG Bordeaux', 'Tech events', 'SSI conferences'],

  contentThemes: [
    {
      theme: 'SSI/Web3 Identity',
      frequency: '1x/week',
      topics: [
        'DIDs explained simply',
        'Verana work insights',
        'Trust registries',
        'Why identity matters',
        'Verifiable Credentials use cases',
      ],
    },
    {
      theme: 'Building in Public',
      frequency: '1x/week',
      topics: [
        'Klyx client stories',
        'VertiFlow progress',
        'PKBA growth',
        'Side project updates',
        'Technical challenges solved',
      ],
    },
    {
      theme: 'Young Founder Reality',
      frequency: '1x/week',
      topics: [
        'Lessons at 19',
        'Mistakes and learnings',
        'Small wins',
        'Discipline vs motivation',
        'Balancing multiple projects',
      ],
    },
    {
      theme: 'Tech Career',
      frequency: '1x/2 weeks',
      topics: [
        'Junior dev tips',
        'Learning in public',
        'Networking at events',
        'Career decisions',
      ],
    },
    {
      theme: 'Project Showcase',
      frequency: '1x/2 weeks',
      topics: [
        'Weekend builds',
        'Tools created',
        'Open source contributions',
        'Creative projects (like Deezer Legends)',
      ],
    },
  ],

  uniquePositioning: [
    '19 years old building production SSI infrastructure',
    'Multi-project founder perspective (Klyx + VertiFlow + PKBA)',
    'Technical depth combined with business sense',
    'Rare SSI expertise, explainable to non-technical audience',
    'Builder mentality: direct, no BS, show your work',
  ],

  voiceCharacteristics: [
    'Direct and confident (not arrogant)',
    'Technical but accessible',
    'Personal stories over abstract advice',
    'French but natural (avoid overly formal "vous")',
    'Slightly provocative ("La concurrence dort")',
  ],
};

export type Profile = typeof profile;
