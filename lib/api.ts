import type { 
  Subject, 
  WeeklyPlan, 
  MoodEntry, 
  BurnoutAssessment,
  StudyPlan,
  AdjustedPlan 
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Error handling helper
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Generate study plan
import { planStorage } from './storage';

export async function generatePlan(
  subjects: Subject[],
  availableHours: number,
  fixedCommitments: { [key: string]: number[][] },
  startDate: string
): Promise<WeeklyPlan> {
  const response = await fetch(`${API_URL}/api/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjects,
      available_hours_per_day: availableHours,
      fixed_commitments: fixedCommitments,
      start_date: startDate,
    }),
  });

  const plan = await handleResponse<WeeklyPlan>(response);
  
  // Save to localStorage
  planStorage.set(plan);
  
  return plan;
}

// Check burnout
export async function checkBurnout(
  moodHistory: MoodEntry[]
): Promise<BurnoutAssessment> {
  const response = await fetch(`${API_URL}/api/check-burnout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood_history: moodHistory }),
  });

  return handleResponse<BurnoutAssessment>(response);
}

// Adjust plan
export async function adjustPlan(
  currentPlan: StudyPlan,
  burnoutLevel: string,
  upcomingExams: { subject: string; days_until: number }[]
): Promise<AdjustedPlan> {
  const response = await fetch(`${API_URL}/api/adjust-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_plan: currentPlan,
      burnout_level: burnoutLevel,
      upcoming_exams: upcomingExams,
    }),
  });

  return handleResponse<AdjustedPlan>(response);
}
// Adjust plan for burnout
export async function adjustPlanForBurnout(
  currentPlan: StudyPlan,
  burnoutLevel: string,
  upcomingExams: { subject: string; days_until: number }[]
): Promise<AdjustedPlan> {
  const response = await fetch(`${API_URL}/api/adjust-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_plan: currentPlan,
      burnout_level: burnoutLevel,
      upcoming_exams: upcomingExams,
    }),
  });

  return handleResponse<AdjustedPlan>(response);
}