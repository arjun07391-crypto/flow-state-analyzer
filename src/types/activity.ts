export type ActivityCategory = 
  | 'work'
  | 'coding'
  | 'meetings'
  | 'meals'
  | 'exercise'
  | 'sleep'
  | 'leisure'
  | 'social'
  | 'commute'
  | 'personal_care'
  | 'break'
  | 'other';

export type ActivityIntent = 'start' | 'stop' | 'switch';

export interface Activity {
  id: string;
  description: string;
  category: ActivityCategory;
  startTime: string; // ISO string in IST
  endTime?: string; // ISO string in IST
  duration?: number; // in minutes
  isOngoing: boolean;
}

export interface DayData {
  date: string; // YYYY-MM-DD
  activities: Activity[];
}

export interface ParsedActivity {
  intent: ActivityIntent;
  description: string;
  category: ActivityCategory;
  startTime?: string; // ISO string if user specified a time
}

export interface DailyAnalysis {
  summary: string;
  redFlags: string[];
  greenFlags: string[];
  recommendations: string[];
}

export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  work: 'hsl(var(--chart-1))',
  coding: 'hsl(var(--chart-2))',
  meetings: 'hsl(var(--chart-3))',
  meals: 'hsl(var(--chart-4))',
  exercise: 'hsl(var(--chart-5))',
  sleep: 'hsl(220 70% 50%)',
  leisure: 'hsl(280 70% 60%)',
  social: 'hsl(330 70% 60%)',
  commute: 'hsl(45 70% 50%)',
  personal_care: 'hsl(180 60% 50%)',
  break: 'hsl(150 60% 50%)',
  other: 'hsl(0 0% 60%)',
};

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  work: 'Work',
  coding: 'Coding',
  meetings: 'Meetings',
  meals: 'Meals',
  exercise: 'Exercise',
  sleep: 'Sleep',
  leisure: 'Leisure',
  social: 'Social',
  commute: 'Commute',
  personal_care: 'Personal Care',
  break: 'Break',
  other: 'Other',
};
