from dotenv import load_dotenv
load_dotenv()

from pydantic_ai import Agent
from pydantic import BaseModel
from typing import List
import sys
import os

# Import from planning.py
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from agents.planning import StudyPlan, DailyTask

# ============================================
# DATA MODELS
# ============================================

class AdjustedPlan(BaseModel):
    """Modified study plan after burnout detection"""
    original_hours: float
    new_hours: float
    removed_tasks: List[str]
    modified_tasks: List[DailyTask]
    rest_days_added: int
    rationale: str

# ============================================
# ADJUSTMENT SYSTEM PROMPT
# ============================================

ADJUSTMENT_SYSTEM_PROMPT = """You are a study plan optimizer focused on sustainable learning.

Adjust study plans based on burnout level:

MEDIUM RISK (20% reduction):
- Remove lowest priority tasks first
- Shorten task durations by 15-20%
- Add 30-min breaks between sessions
- Keep high-priority exam prep

HIGH RISK (40% reduction):
- Cut low and medium priority tasks
- Add 1 full rest day
- Shorten all remaining tasks
- Keep only critical exam prep

CRITICAL RISK (50%+ reduction):
- 2 consecutive rest days
- Keep only imminent exams (within 3 days)
- All tasks reduced to 50% duration
- Recommend seeking support

TASK REMOVAL PRIORITY:
1. Low priority + Easy difficulty
2. Low priority + Medium difficulty
3. Medium priority + Easy difficulty
4. Medium priority + Medium difficulty
5. KEEP: High priority or Hard difficulty

Return ONLY JSON:
{
  "original_hours": 5.0,
  "new_hours": 3.0,
  "removed_tasks": ["Computer Networks - Routing"],
  "modified_tasks": [
    {
      "subject": "Operating Systems",
      "topic": "Process Scheduling",
      "duration_hours": 1.0,
      "task_type": "Learn",
      "priority": "High",
      "notes": "Reduced from 2h due to burnout"
    }
  ],
  "rest_days_added": 1,
  "rationale": "Removed low-priority tasks and reduced durations by 40% due to High burnout risk. Added 1 rest day."
}"""

# ============================================
# FUNCTION TO CALL THE AGENT
# ============================================

async def adjust_plan_for_burnout(
    current_plan: StudyPlan,
    burnout_level: str,
    upcoming_exams: List[dict],
) -> AdjustedPlan:
    """Modify a study plan based on burnout assessment."""
    
    # Build context
    context = f"""CURRENT STUDY PLAN ({current_plan.date}):
Total hours: {current_plan.total_hours}

Tasks scheduled:
"""
    
    for i, task in enumerate(current_plan.tasks, 1):
        context += f"{i}. {task.subject} - {task.topic}\n"
        context += f"   Type: {task.task_type} | Duration: {task.duration_hours}h | Priority: {task.priority}\n"

    context += f"\nBURNOUT LEVEL: {burnout_level}\n\n"
    
    context += "UPCOMING EXAMS:\n"
    for exam in upcoming_exams:
        context += f"- {exam['subject']}: {exam['days_until']} days away\n"

    context += f"""
TASK: Adjust for {burnout_level} risk. Return JSON only.
"""

    # Try multiple free models
    FREE_MODELS = [
        'openrouter:meta-llama/llama-3.3-70b-instruct:free',
        'openrouter:qwen/qwen-2.5-7b-instruct:free',
        'openrouter:microsoft/phi-3-mini-128k-instruct:free',
    ]
    
    import json
    
    for model_name in FREE_MODELS:
        try:
            print(f"\n🔧 Adjusting plan with: {model_name}")
            
            # Create fresh agent for this model
            adjustment_agent = Agent(
                model_name,
                system_prompt=ADJUSTMENT_SYSTEM_PROMPT,
                model_settings={'max_tokens': 20000}  # Limit to 20k tokens to match free tier
            )
            
            result = await adjustment_agent.run(context)
            response_text = str(result.output)
            
            print(f"✅ Got adjustment response from {model_name}")
            print(f"Response preview: {response_text[:150]}...")
            
            # Clean markdown
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            # Parse JSON
            plan_dict = json.loads(response_text)
            
            # Validate
            if "original_hours" not in plan_dict:
                raise ValueError("Missing required fields in response")
            
            print(f"✅ Plan adjusted: {plan_dict['original_hours']}h → {plan_dict['new_hours']}h")
            return AdjustedPlan(**plan_dict)
            
        except Exception as e:
            print(f"❌ {model_name} failed: {str(e)[:100]}")
            continue
    
    # All models failed - use rule-based adjustment
    print("\n⚠️ All AI models failed. Using rule-based plan adjustment.")
    return adjust_plan_with_rules(current_plan, burnout_level, upcoming_exams)


def adjust_plan_with_rules(
    current_plan: StudyPlan,
    burnout_level: str,
    upcoming_exams: List[dict],
) -> AdjustedPlan:
    """Fallback: Adjust plan using algorithmic rules (no AI)."""
    
    original_hours = current_plan.total_hours
    
    # Determine reduction percentage
    if burnout_level == "Critical":
        reduction = 0.50
        rest_days = 2
    elif burnout_level == "High":
        reduction = 0.40
        rest_days = 1
    elif burnout_level == "Medium":
        reduction = 0.20
        rest_days = 0
    else:
        reduction = 0.0
        rest_days = 0
    
    target_hours = original_hours * (1 - reduction)
    
    # Get urgent exams (within 3 days)
    urgent_subjects = {exam['subject'] for exam in upcoming_exams if exam['days_until'] <= 3}
    
    # Sort tasks by priority (keep high priority, remove low priority)
    priority_scores = {"High": 3, "Medium": 2, "Low": 1}
    difficulty_scores = {"Hard": 3, "Medium": 2, "Easy": 1}
    
    scored_tasks = []
    for task in current_plan.tasks:
        # Calculate keep score (higher = keep)
        score = 0
        score += priority_scores[task.priority] * 10
        score += difficulty_scores.get(task.priority, 2) * 5
        if task.subject in urgent_subjects:
            score += 50  # Urgent exams get high priority
        
        scored_tasks.append((score, task))
    
    # Sort by score descending (highest score first)
    scored_tasks.sort(key=lambda x: x[0], reverse=True)
    
    # Build new plan
    modified_tasks = []
    removed_tasks = []
    hours_allocated = 0
    
    for score, task in scored_tasks:
        if hours_allocated >= target_hours:
            # Reached target hours - remove remaining tasks
            removed_tasks.append(f"{task.subject} - {task.topic}")
            continue
        
        # Calculate new duration
        if burnout_level == "Critical":
            new_duration = task.duration_hours * 0.5
        elif burnout_level == "High":
            new_duration = task.duration_hours * 0.6
        elif burnout_level == "Medium":
            new_duration = task.duration_hours * 0.8
        else:
            new_duration = task.duration_hours
        
        # Don't make tasks too short
        new_duration = max(0.5, new_duration)
        
        # Check if we can fit this task
        if hours_allocated + new_duration <= target_hours * 1.1:  # 10% buffer
            modified_tasks.append(DailyTask(
                subject=task.subject,
                topic=task.topic,
                duration_hours=round(new_duration, 1),
                task_type=task.task_type,
                priority=task.priority,
                notes=f"Reduced from {task.duration_hours}h due to {burnout_level} burnout risk"
            ))
            hours_allocated += new_duration
        else:
            removed_tasks.append(f"{task.subject} - {task.topic}")
    
    new_hours = round(hours_allocated, 1)
    
    # Generate rationale
    rationale = f"Adjusted plan due to {burnout_level} burnout risk. "
    rationale += f"Reduced workload from {original_hours}h to {new_hours}h ({reduction*100:.0f}% reduction). "
    
    if removed_tasks:
        rationale += f"Removed {len(removed_tasks)} low-priority tasks. "
    
    if rest_days > 0:
        rationale += f"Added {rest_days} rest day(s) for recovery. "
    
    if urgent_subjects:
        rationale += f"Prioritized urgent exams: {', '.join(urgent_subjects)}. "
    
    rationale += "Focus on sustainable learning pace."
    
    return AdjustedPlan(
        original_hours=original_hours,
        new_hours=new_hours,
        removed_tasks=removed_tasks,
        modified_tasks=modified_tasks,
        rest_days_added=rest_days,
        rationale=rationale
    )