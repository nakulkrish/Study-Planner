import type { 
  Subject, 
  WeeklyPlan, 
  MoodEntry, 
  BurnoutAssessment 
} from './types';

// Storage keys
const KEYS = {
  SUBJECTS: 'study_planner_subjects',
  WEEKLY_PLAN: 'study_planner_weekly_plan',
  MOOD_HISTORY: 'study_planner_mood_history',
  AVAILABLE_HOURS: 'study_planner_available_hours',
  FIXED_COMMITMENTS: 'study_planner_fixed_commitments',
  LAST_ASSESSMENT: 'study_planner_last_assessment',
  ONBOARDING_COMPLETE: 'study_planner_onboarding_complete',
};

// Generic localStorage helpers
function getItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : null;
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

// Subject storage
export const subjectStorage = {
  get: (): Subject[] => getItem<Subject[]>(KEYS.SUBJECTS) || [],
  set: (subjects: Subject[]) => setItem(KEYS.SUBJECTS, subjects),
  clear: () => removeItem(KEYS.SUBJECTS),
};

// Weekly plan storage
export const planStorage = {
  get: (): WeeklyPlan | null => getItem<WeeklyPlan>(KEYS.WEEKLY_PLAN),
  set: (plan: WeeklyPlan) => setItem(KEYS.WEEKLY_PLAN, plan),
  clear: () => removeItem(KEYS.WEEKLY_PLAN),
};

// Mood history storage
export const moodStorage = {
  get: (): MoodEntry[] => getItem<MoodEntry[]>(KEYS.MOOD_HISTORY) || [],
  set: (entries: MoodEntry[]) => setItem(KEYS.MOOD_HISTORY, entries),
  add: (entry: MoodEntry) => {
    const entries = moodStorage.get();
    entries.push(entry);
    // Keep only last 7 days
    if (entries.length > 7) entries.shift();
    moodStorage.set(entries);
  },
  clear: () => removeItem(KEYS.MOOD_HISTORY),
};

// Available hours storage
export const hoursStorage = {
  get: (): number => getItem<number>(KEYS.AVAILABLE_HOURS) || 5,
  set: (hours: number) => setItem(KEYS.AVAILABLE_HOURS, hours),
};

// Fixed commitments storage
export const commitmentsStorage = {
  get: (): { [key: string]: number[][] } => 
    getItem<{ [key: string]: number[][] }>(KEYS.FIXED_COMMITMENTS) || {},
  set: (commitments: { [key: string]: number[][] }) => 
    setItem(KEYS.FIXED_COMMITMENTS, commitments),
};

// Last burnout assessment
export const assessmentStorage = {
  get: (): BurnoutAssessment | null => 
    getItem<BurnoutAssessment>(KEYS.LAST_ASSESSMENT),
  set: (assessment: BurnoutAssessment) => 
    setItem(KEYS.LAST_ASSESSMENT, assessment),
  clear: () => removeItem(KEYS.LAST_ASSESSMENT),
};

// Onboarding status
export const onboardingStorage = {
  isComplete: (): boolean => 
    getItem<boolean>(KEYS.ONBOARDING_COMPLETE) || false,
  setComplete: () => setItem(KEYS.ONBOARDING_COMPLETE, true),
  reset: () => removeItem(KEYS.ONBOARDING_COMPLETE),
};

// Clear all data
export function clearAllData(): void {
  Object.values(KEYS).forEach(removeItem);
}