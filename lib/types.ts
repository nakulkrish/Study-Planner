// Type definitions matching Python backend models

export type Priority = "High" | "Medium" | "Low";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type TaskType = "Learn" | "Revise" | "Practice";
export type Mood = "Energized" | "Okay" | "Tired" | "Burned out";
export type FocusLevel = "High" | "Medium" | "Low";
export type BurnoutRisk = "Low" | "Medium" | "High" | "Critical";

export interface Subject {
  name: string;
  priority: Priority;
  difficulty: Difficulty;
  is_weak: boolean;
  exam_date: string; // ISO format: "2026-01-28"
  hours_needed: number;
}

export interface DailyTask {
  subject: string;
  topic: string;
  duration_hours: number;
  task_type: TaskType;
  priority: Priority;
  notes: string;
}

export interface StudyPlan {
  date: string;
  tasks: DailyTask[];
  total_hours: number;
  rest_recommended: boolean;
}

export interface WeeklyPlan {
  week_number: number;
  days: StudyPlan[];
  burnout_risk: BurnoutRisk;
}

export interface MoodEntry {
  date: string;
  mood: Mood;
  mood_score: number; // 1-4
  planned_hours: number;
  actual_hours: number;
  focus_level: FocusLevel;
}

export interface BurnoutAssessment {
  risk_level: BurnoutRisk;
  risk_score: number; // 0-100
  signals: string[];
  recommendations: string[];
  should_adjust_plan: boolean;
}

export interface AdjustedPlan {
  original_hours: number;
  new_hours: number;
  removed_tasks: string[];
  modified_tasks: DailyTask[];
  rest_days_added: number;
  rationale: string;
}

// Form data types
export interface SubjectFormData {
  subjects: Subject[];
  available_hours_per_day: number;
  fixed_commitments: {
    [key: string]: number[][]; // e.g., {"Monday": [[9, 15]]}
  };
}