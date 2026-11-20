import type { GoalId, Lang, RoleId } from './catalog.ts';

export type Profile = {
  id: string;
  name: string;
  role: RoleId;
  company?: string;
  experience: number; // жыл
  stack: string[];
  interests: string[];
  about: string;
  goal: GoalId;
  lookingFor?: RoleId[]; // кіммен танысқысы келеді (міндетті емес)
  slots: string[]; // 1:1 кездесуге бос уақыт
  telegram?: string;
  lang: Lang;
  synthetic?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProfileInput = Omit<Profile, 'id' | 'synthetic' | 'createdAt' | 'updatedAt'>;

export type ReasonKind = 'goal' | 'role' | 'stack' | 'interests' | 'semantic' | 'experience' | 'complement';

export type Reason = { kind: ReasonKind; weight: number; items?: string[] };

export type Recommendation = {
  profile: Profile;
  score: number; // 0..100
  reasons: Reason[];
  explanation: string;
  icebreaker: string;
};

export type Booth = {
  id: string;
  name: string;
  tagline: Record<Lang, string>;
  interests: string[];
  stack: string[];
  goals: GoalId[];
  location: string;
};

export type BoothRec = { booth: Booth; why: string };

export type RecResponse = {
  items: Recommendation[];
  booths: BoothRec[];
  tookMs: number;
  semantic: 'gemini' | 'tfidf';
};

export type Verdict = 'met' | 'skip';

export type Feedback = { userId: string; targetId: string; verdict: Verdict; at: string };

export type Meeting = {
  id: string;
  a: string;
  b: string;
  slot: string;
  table: number;
  at: string;
};

export type MeetingView = Meeting & { other: Profile };
