export interface NicheConfig {
  id: string;
  name: string;
  subreddits: string[];
  keywords: string[];
  theme: {
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
    badgeText: string;
    badgeBg: string;
  };
  voicePreset: {
    voiceId: string;
    stability: number;
    similarityBoost: number;
    speedMultiplier: number;
    toneDescription: string;
  };
}

export const NICHE_PORTFOLIO: Record<string, NicheConfig> = {
  ancient_history: {
    id: 'ancient_history',
    name: 'Ancient History & Historical Curiosities',
    subreddits: ['todayilearned', 'AskHistorians', 'HistoryMemes'],
    keywords: ['roman', 'ancient', 'empire', 'archeology', 'medieval'],
    theme: {
      primaryColor: '#E6B800',
      backgroundColor: '#1A1612',
      fontFamily: 'Cinzel, serif',
      badgeText: 'HISTORY UNCOVERED',
      badgeBg: '#3A2E2B',
    },
    voicePreset: {
      voiceId: 'Adam_Docu_Baritone',
      stability: 0.5,
      similarityBoost: 0.8,
      speedMultiplier: 1.0,
      toneDescription: 'Deep, authoritative, and epic documentary baritone',
    },
  },
  tech_and_ai: {
    id: 'tech_and_ai',
    name: 'Tech, AI & Future Innovations',
    subreddits: ['technology', 'ArtificialInteligence', 'futurology'],
    keywords: ['ai', 'quantum', 'robotics', 'silicon', 'chip', 'future'],
    theme: {
      primaryColor: '#00E5FF',
      backgroundColor: '#050B14',
      fontFamily: 'Orbitron, sans-serif',
      badgeText: 'FUTURE TECH',
      badgeBg: '#0C2340',
    },
    voicePreset: {
      voiceId: 'Josh_Upbeat_Tech',
      stability: 0.6,
      similarityBoost: 0.8,
      speedMultiplier: 1.1,
      toneDescription: 'High-energy, fast-paced, and enthusiastic tech commentary',
    },
  },
  business_stories: {
    id: 'business_stories',
    name: 'Business & Financial Stories',
    subreddits: ['business', 'WallStreetBets', 'economics'],
    keywords: ['billionaire', 'startup', 'monopoly', 'brand', 'strategy'],
    theme: {
      primaryColor: '#00FF66',
      backgroundColor: '#0A140E',
      fontFamily: 'Montserrat, sans-serif',
      badgeText: 'BUSINESS SECRETS',
      badgeBg: '#132A1C',
    },
    voicePreset: {
      voiceId: 'Marcus_Corporate_Narrator',
      stability: 0.55,
      similarityBoost: 0.75,
      speedMultiplier: 1.05,
      toneDescription: 'Confident, sharp, and engaging corporate narrator',
    },
  },
  sci_fi_space: {
    id: 'sci_fi_space',
    name: 'Sci-Fi, Space & Astronomy',
    subreddits: ['space', 'Astronomy', 'cosmos'],
    keywords: ['black hole', 'galaxy', 'nasa', 'fermi paradox', 'alien'],
    theme: {
      primaryColor: '#8A2BE2',
      backgroundColor: '#04020A',
      fontFamily: 'Orbitron, sans-serif',
      badgeText: 'COSMIC ANOMALIES',
      badgeBg: '#1D0E36',
    },
    voicePreset: {
      voiceId: 'Orion_Space_Narrator',
      stability: 0.4,
      similarityBoost: 0.85,
      speedMultiplier: 1.0,
      toneDescription: 'Awe-inspiring, mysterious, and deep space narrator',
    },
  },
  human_relations: {
    id: 'human_relations',
    name: 'Human Relations & Psychology Curiosities',
    subreddits: ['psychology', 'socialskills', 'humanity'],
    keywords: ['dark psychology', 'bias', 'mind', 'relationship', 'behavior'],
    theme: {
      primaryColor: '#FF4D4D',
      backgroundColor: '#110E1B',
      fontFamily: 'Montserrat, sans-serif',
      badgeText: 'HUMAN MIND',
      badgeBg: '#371B28',
    },
    voicePreset: {
      voiceId: 'Rachel_Warm_Storyteller',
      stability: 0.45,
      similarityBoost: 0.75,
      speedMultiplier: 1.0,
      toneDescription: 'Intriguing, warm, storytelling, and conversational voice',
    },
  },
  modern_warfare: {
    id: 'modern_warfare',
    name: 'Modern Warfare & Tactical Tech',
    subreddits: ['LessCredibleDefence', 'WarCollege', 'military'],
    keywords: ['stealth', 'fighter jet', 'tactical', 'missile', 'radar'],
    theme: {
      primaryColor: '#FFCC00',
      backgroundColor: '#0D1117',
      fontFamily: 'Roboto Condensed, sans-serif',
      badgeText: 'MODERN WARFARE',
      badgeBg: '#1F2937',
    },
    voicePreset: {
      voiceId: 'Tactical_Baritone_Command',
      stability: 0.35,
      similarityBoost: 0.85,
      speedMultiplier: 1.05,
      toneDescription: 'Intense, precise, and authoritative military analyst',
    },
  },
  survival_feats: {
    id: 'survival_feats',
    name: 'Survival & Extreme Human Feats',
    subreddits: ['survival', 'natureismetal', 'unbelievable'],
    keywords: ['survived', 'disaster', 'miracle', 'rescue', 'ocean'],
    theme: {
      primaryColor: '#FF9900',
      backgroundColor: '#17100A',
      fontFamily: 'Impact, sans-serif',
      badgeText: 'EXTREME SURVIVAL',
      badgeBg: '#36210E',
    },
    voicePreset: {
      voiceId: 'Gritt_Survival_Voice',
      stability: 0.4,
      similarityBoost: 0.8,
      speedMultiplier: 1.05,
      toneDescription: 'Gritty, dramatic, and intense action narrator',
    },
  },
  everyday_science: {
    id: 'everyday_science',
    name: 'Everyday Science & "Did You Know"',
    subreddits: ['science', 'explainlikeimfive', 'interestingasfuck'],
    keywords: ['molecule', 'brain', 'body', 'chemical', 'microscopic'],
    theme: {
      primaryColor: '#00FFD5',
      backgroundColor: '#081414',
      fontFamily: 'Montserrat, sans-serif',
      badgeText: 'DID YOU KNOW?',
      badgeBg: '#0F2C2B',
    },
    voicePreset: {
      voiceId: 'Nova_Science_Voice',
      stability: 0.6,
      similarityBoost: 0.75,
      speedMultiplier: 1.08,
      toneDescription: 'Curious, crisp, and fast-paced scientific host',
    },
  },
};

export function getNicheConfig(nicheId: string): NicheConfig {
  const config = NICHE_PORTFOLIO[nicheId];
  if (!config) {
    throw new Error(`Unknown niche ID: ${nicheId}. Available niches: ${Object.keys(NICHE_PORTFOLIO).join(', ')}`);
  }
  return config;
}
