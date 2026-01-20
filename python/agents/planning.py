from dotenv import load_dotenv
load_dotenv()

from pydantic_ai import Agent
from pydantic import BaseModel
from typing import List, Literal
from datetime import datetime
import os

# ============================================
# DATA MODELS
# ============================================

class Subject(BaseModel):
    """A subject the user needs to study"""
    name: str
    priority: Literal["High", "Medium", "Low"]
    difficulty: Literal["Easy", "Medium", "Hard"]
    is_weak: bool = False
    exam_date: str
    hours_needed: float

class DailyTask(BaseModel):
    """A single study task for a day"""
    subject: str
    topic: str
    duration_hours: float
    task_type: Literal["Learn", "Revise", "Practice"]
    priority: Literal["High", "Medium", "Low"]
    notes: str = ""

class StudyPlan(BaseModel):
    """A single day's study plan"""
    date: str
    tasks: List[DailyTask]
    total_hours: float
    rest_recommended: bool = False

class WeeklyPlan(BaseModel):
    """A full week's study plan"""
    week_number: int
    days: List[StudyPlan]
    burnout_risk: Literal["Low", "Medium", "High"] = "Low"

# ============================================
# PLANNING AGENT (Pydantic AI v1.44 - NO result_type)
# ============================================

PLANNING_SYSTEM_PROMPT = """You are an expert study planner for students preparing for exams.

Your role:
1. Create realistic, achievable study schedules
2. Apply spaced repetition: Day 1 (learn) → Day 3 (quick revise) → Day 7 (final revise)
3. Balance workload to prevent burnout
4. Never exceed the user's daily study time limit
5. Schedule harder topics earlier in the week when energy is high
6. Prioritize high-priority subjects closer to exam dates

Rules you MUST follow:
- High priority + Hard difficulty = schedule MORE time and EARLIER
- Weak areas = break into smaller chunks (max 1.5 hours per session)
- Never schedule more than 3 different subjects in one day
- Include 15-minute breaks after every 2-hour block
- If 5+ consecutive days of study, recommend a rest day
- Never create tasks shorter than 30 minutes (inefficient)
- Never create tasks longer than 3 hours (unsustainable)

Spaced Repetition Logic:
- When you assign a "Learn" task on Day 1
- Add a "Revise" task for the same topic on Day 3
- Add a "Practice" task for the same topic on Day 7
- This only applies to Hard or Medium difficulty topics

IMPORTANT: You MUST respond with valid JSON matching the WeeklyPlan structure.

WeeklyPlan structure:
{
  "week_number": 1,
  "days": [
    {
      "date": "2026-01-21",
      "tasks": [
        {
          "subject": "Operating Systems",
          "topic": "Process Scheduling",
          "duration_hours": 1.5,
          "task_type": "Learn",
          "priority": "High",
          "notes": ""
        }
      ],
      "total_hours": 1.5,
      "rest_recommended": false
    }
  ],
  "burnout_risk": "Low"
}

Return ONLY valid JSON, no markdown, no code blocks.""",


# ============================================
# FUNCTION TO CALL THE AGENT
# ============================================

async def generate_study_plan(
    subjects: List[Subject],
    available_hours_per_day: float,
    fixed_commitments: dict,
    start_date: str,
) -> WeeklyPlan:
    """Generate a 7-day study plan using the Planning Agent."""
    
    # Build context
    context = f"""
USER INPUT:
- Subjects to study: {[s.name for s in subjects]}
- Maximum study hours per day: {available_hours_per_day}
- Plan start date: {start_date}
- Fixed commitments (busy hours): {fixed_commitments}

SUBJECT DETAILS:
"""
    
    for subj in subjects:
        days_until_exam = (
            datetime.fromisoformat(subj.exam_date) - 
            datetime.fromisoformat(start_date)
        ).days
        
        context += f"""
{subj.name}:
  - Priority: {subj.priority}
  - Difficulty: {subj.difficulty}
  - Is a weak area: {subj.is_weak}
  - Exam in {days_until_exam} days
  - Total hours needed: {subj.hours_needed}
"""

    context += f"""
TASK:
Create a detailed 7-day study plan starting from {start_date}.

For each day:
1. Allocate tasks within the {available_hours_per_day} hour limit
2. Avoid fixed commitment time blocks
3. Apply spaced repetition for harder topics
4. Prioritize subjects with closer exam dates
5. Balance subjects across the week
6. Mark if a rest day is recommended

Return ONLY valid JSON in WeeklyPlan format. No markdown, no explanations.
"""

    # List of free models to try (in order of preference)
    FREE_MODELS = [
        'openrouter:deepseek/deepseek-chat:free',
        'openrouter:meta-llama/llama-3.3-70b-instruct:free',
        'openrouter:google/gemini-2.0-flash-thinking-exp:free',
        'openrouter:qwen/qwen-2.5-7b-instruct:free',
        'openrouter:microsoft/phi-3-mini-128k-instruct:free',
    ]
    
    import json
    
    # Try each model
    for model_name in FREE_MODELS:
        try:
            print(f"\n🤖 Trying model: {model_name}")
            
            # Create agent with this model
            temp_agent = Agent(
                model_name,
                system_prompt=PLANNING_SYSTEM_PROMPT
            )
            
            result = await temp_agent.run(context)
            response_text = str(result.output)
            
            print(f"✅ Got response from {model_name}")
            print(f"Response preview: {response_text[:200]}...")
            
            # Clean markdown code blocks
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            # Parse JSON
            plan_dict = json.loads(response_text)
            
            # Validate required fields
            if "week_number" not in plan_dict or "days" not in plan_dict:
                raise ValueError("Missing required fields in response")
            
            print(f"✅ Successfully generated plan with {model_name}!")
            return WeeklyPlan(**plan_dict)
            
        except Exception as e:
            print(f"❌ {model_name} failed: {str(e)[:100]}")
            continue  # Try next model
    
    # All models failed - use fallback
    print("\n⚠️ All AI models failed. Using intelligent fallback plan.")
    return create_fallback_plan(subjects, available_hours_per_day, start_date)


def create_fallback_plan(
    subjects: List[Subject],
    available_hours_per_day: float,
    start_date: str,
) -> WeeklyPlan:
    """Create a high-quality fallback plan if AI fails."""
    from datetime import datetime, timedelta
    
    days = []
    start = datetime.fromisoformat(start_date)
    
    # Sort subjects by priority and exam date
    sorted_subjects = sorted(
        subjects,
        key=lambda s: (
            {'High': 0, 'Medium': 1, 'Low': 2}[s.priority],
            datetime.fromisoformat(s.exam_date)
        )
    )
    
    for day_num in range(7):
        current_date = (start + timedelta(days=day_num)).strftime("%Y-%m-%d")
        
        # Rest day on Sunday (day 6)
        if day_num == 6:
            days.append(StudyPlan(
                date=current_date,
                tasks=[],
                total_hours=0.0,
                rest_recommended=True
            ))
            continue
        
        tasks = []
        hours_used = 0
        
        # Distribute hours across subjects
        for i, subject in enumerate(sorted_subjects):
            if hours_used >= available_hours_per_day:
                break
            
            # Calculate time for this subject
            days_until_exam = (datetime.fromisoformat(subject.exam_date) - start).days
            urgency = max(0.5, 1.0 - (days_until_exam / 30))  # More time if exam is closer
            
            # Difficulty multiplier
            difficulty_mult = {'Easy': 0.8, 'Medium': 1.0, 'Hard': 1.2}[subject.difficulty]
            
            # Calculate time slot
            base_time = (subject.hours_needed / 7) * difficulty_mult * urgency
            time_slot = min(
                base_time,
                available_hours_per_day - hours_used,
                3.0  # Max 3 hours per subject per day
            )
            
            if time_slot < 0.5:
                continue  # Skip if less than 30 min
            
            # Determine task type based on day
            if day_num < 2:
                task_type = "Learn"
                topic_suffix = "Introduction & Core Concepts"
            elif day_num < 4:
                task_type = "Revise"
                topic_suffix = "Review & Practice"
            else:
                task_type = "Practice"
                topic_suffix = "Problem Solving & Mock Tests"
            
            tasks.append(DailyTask(
                subject=subject.name,
                topic=f"{subject.name} - {topic_suffix}",
                duration_hours=round(time_slot, 1),
                task_type=task_type,
                priority=subject.priority,
                notes=f"{'⚠️ Weak area - ' if subject.is_weak else ''}Focus on {subject.difficulty.lower()} difficulty topics"
            ))
            
            hours_used += time_slot
        
        # Determine burnout risk
        burnout_risk = "Medium" if hours_used > available_hours_per_day * 0.9 else "Low"
        
        days.append(StudyPlan(
            date=current_date,
            tasks=tasks,
            total_hours=round(hours_used, 1),
            rest_recommended=False
        ))
    
    # Calculate overall burnout risk
    avg_hours = sum(d.total_hours for d in days) / len([d for d in days if not d.rest_recommended])
    overall_risk = "High" if avg_hours > available_hours_per_day * 0.95 else "Medium" if avg_hours > available_hours_per_day * 0.8 else "Low"
    
    return WeeklyPlan(
        week_number=1,
        days=days,
        burnout_risk=overall_risk
    )   