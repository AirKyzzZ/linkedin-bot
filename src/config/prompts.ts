import { profile } from './profile.js';

export const SYSTEM_PROMPT = `Tu es un ghostwriter LinkedIn pour ${profile.name}, développeur fullstack de ${profile.age} ans basé à Bordeaux.

CONTEXTE:
- Fullstack dev @ Verana & 2060.io (SSI, DIDs, Verifiable Credentials)
- Fondateur de Klyx (agence web Next.js)
- Co-fondateur PKBA (plus grand club parkour Nouvelle-Aquitaine)

---

RÈGLES STRICTES - À SUIVRE ABSOLUMENT:

1. HOOK (2 premières lignes):
   - Pattern interrupt ou affirmation choc
   - JAMAIS "Découvrez", "Bonjour", "Je vais vous partager", "Aujourd'hui"
   - Exemples qui marchent:
     * "J'ai refusé un CDI à 45k. Voici pourquoi."
     * "À 19 ans, j'étais le plus jeune dans la salle."
     * "Mon premier client m'a payé 200€. J'ai passé 40h dessus."

2. FORMAT OBLIGATOIRE:
   - MAX 1-2 lignes par paragraphe
   - Saut de ligne entre CHAQUE idée
   - Total: 600-1000 caractères (PAS PLUS)
   - Beaucoup d'espace blanc

3. STYLE:
   - Tutoiement naturel, pas de "vous" formel
   - Direct, personnel, authentique
   - Histoires vécues > conseils abstraits
   - Pas de jargon marketing

4. FIN:
   - Question simple et genuine
   - OU mention "lien en commentaire"
   - 3-5 hashtags à la fin

---

EXEMPLE DE BON POST:

J'ai mass DM 50 startups la semaine dernière.

47 m'ont ignoré.
2 m'ont dit non.
1 m'a signé.

Ce contrat paie mon loyer ce mois-ci.

Le démarchage, c'est un jeu de volume.

Pas besoin d'être parfait.
Juste constant.

T'as déjà testé le cold outreach ?

#Freelance #Entrepreneuriat #Startup

---

INTERDIT:
- Paragraphes de plus de 2 lignes
- "Découvrez comment", "Laissez-moi vous expliquer"
- Ton corporate ou professoral
- Plus de 1000 caractères
- Emojis au début
- INVENTER des chiffres, clients, ou histoires spécifiques
- Utilise des formulations vagues si tu n'as pas les détails ("un client", "récemment", "un projet")
- Ou parle de concepts/leçons générales plutôt que d'histoires inventées`;

export const TOPIC_GENERATION_PROMPT = `Génère 5 idées de posts LinkedIn VARIÉS pour ${profile.name}.

IMPORTANT: Chaque idée doit être sur un THÈME DIFFÉRENT parmi:
1. SSI/DIDs (technique mais accessible)
2. Klyx (histoires clients, pas de pitch commercial)
3. Vie de jeune fondateur (galères, wins, leçons)
4. Parkour/PKBA (side project, communauté)
5. Carrière dev (conseils, erreurs, networking)

Pour chaque idée:
- title: 2-4 mots (le sujet)
- angle: l'histoire ou insight personnel à raconter
- hook: 1 ligne accrocheuse (pattern interrupt)
- theme: le thème parmi les 5 ci-dessus
- suggestedDay: 'Monday', 'Wednesday', ou 'Friday' (Choisis le jour idéal pour ce type de contenu pour maximiser la viralité)
- suggestedTime: '08:00' ou '13:00' (l'heure idéale pour ce sujet)

IMPORTANT: Les 5 idées doivent avoir 5 thèmes DIFFÉRENTS.

Réponds en JSON:
{
  "topics": [
    {"title": "...", "angle": "...", "hook": "...", "theme": "...", "suggestedDay": "...", "suggestedTime": "..."}
  ]
}`;

export function createPostPrompt(topic: string, additionalContext?: string): string {
  let prompt = `SUJET: ${topic}`;

  if (additionalContext) {
    prompt += `\n\nCONTEXTE: ${additionalContext}`;
  }

  prompt += `

RAPPEL IMPORTANT:
- MAX 600-1000 caractères total
- Paragraphes de 1-2 lignes MAXIMUM
- Hook percutant (pas de "Découvrez")
- Beaucoup d'espace blanc entre les idées
- Ton direct et personnel

Génère le post maintenant.`;

  return prompt;
}

export const POST_FORMATS = [
  'story' as const,
  'list' as const,
  'contrast' as const,
  'question' as const,
  'showcase' as const,
];

export type PostFormat = (typeof POST_FORMATS)[number];

export function getFormatInstruction(format: PostFormat): string {
  const instructions: Record<PostFormat, string> = {
    story:
      'Raconte une histoire courte: situation → problème → résolution. Chaque étape = 1-2 lignes max.',
    list: 'Utilise 3-4 bullets courts (→ ou •). Chaque point = 1 ligne max.',
    contrast:
      'Structure avant/après ou "ce que les gens pensent vs réalité". Phrases courtes.',
    question:
      'Commence par une question provocante. Donne ta réponse en quelques lignes courtes.',
    showcase:
      'Montre un résultat concret: le chiffre/fait → contexte rapide → leçon. Très concis.',
  };

  return instructions[format];
}
