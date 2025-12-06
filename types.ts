export interface StoryParams {
  characterName: string;
  mythology: string;
  traits: string;
  tone: StoryTone;
  duration: StoryDuration;
  customPrompt?: string;
}

export enum StoryTone {
  EPIC = 'Epik ve Kahramanca',
  TRAGIC = 'Trajik ve Hüzünlü',
  MYSTERIOUS = 'Gizemli ve Karanlık',
  HUMOROUS = 'Mizahi ve Eğlenceli',
  PHILOSOPHICAL = 'Felsefi ve Düşündürücü'
}

export enum StoryDuration {
  SHORTS = 'YouTube Shorts (30-60sn)',
  VIDEO = 'YouTube Video (4-10dk)',
  EPIC = 'Uzun Anlatı (12dk+)'
}

export interface GeneratedStory {
  id: string;
  title: string;
  content: string;
  params: StoryParams;
  createdAt: Date;
  images?: string[];
  thumbnail?: string;
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
}