from dotenv import load_dotenv
load_dotenv()

from pydantic_ai import Agent
from pydantic import BaseModel
from typing import List, Literal

# ============================================
# DATA MODELS
# ============================================

class MoodEntry(BaseModel):
    """A single day's mood check-in data"""
    date: str
    mood: Literal["Energized", "Okay", "Tired", "Burned out"]
    mood_score: int
    planned_hours: float
    actual_hours: float
    focus_level: Literal["High", "Medium", "Low"] = "Medium"

class BurnoutAssessment(BaseModel):
    """Burnout risk assessment result"""
    risk_level: Literal["Low", "Medium", "High", "Critical"]
    risk_score: float
    signals: List[str]
    recommendations: List[str]
    should_adjust_plan: bool

# ============================================
# WELLNESS SYSTEM PROMPT (Shared across agents)
# ============================================

WELLNESS_SYSTEM_PROMPT = """You are a wellness advisor. Analyze mood data to detect burnout.

BURNOUT SIGNALS:
1. Mood: 3+ days "Tired" or worse = HIGH RISK
2. Overload: Actual > Planned for 3+ days = Overworking
3. Low focus + High hours = Ineffective studying
4. Skipped sessions = Demotivation

RISK LEVELS:
- Low (0-25): Good balance
- Medium (26-50): Early warning
- High (51-75): Clear burnout
- Critical (76-100): Severe burnout

RECOMMENDATIONS:
Low: Keep it up
Medium: Reduce 20%, add breaks
High: Reduce 40%, add rest day
Critical: 2 rest days, 50% load

Return ONLY JSON:
{
  "risk_level": "High",
  "risk_score": 72,
  "signals": ["Days 3-5 show Tired mood", "Overworked on 3 days"],
  "recommendations": ["Reduce load by 40%", "Add rest day"],
  "should_adjust_plan": true
}"""

# ============================================
# FUNCTION TO ASSESS BURNOUT
# ============================================

async def assess_burnout(mood_history: List[MoodEntry]) -> BurnoutAssessment:
    """Detect burnout risk from mood and study pattern data."""
    
    # Build concise context
    context = f"Analyze {len(mood_history)} days of mood data:\n\n"
    
    for i, entry in enumerate(mood_history, 1):
        completion = (entry.actual_hours / entry.planned_hours * 100) if entry.planned_hours > 0 else 0
        context += f"Day {i}: {entry.mood} ({entry.mood_score}/4) | Planned: {entry.planned_hours}h, Actual: {entry.actual_hours}h ({completion:.0f}%) | Focus: {entry.focus_level}\n"

    context += "\nDetect burnout signals and provide risk assessment. Return JSON only, no markdown."

    # Try multiple free models
    FREE_MODELS = [
        'openrouter:meta-llama/llama-3.3-70b-instruct:free',
        'openrouter:qwen/qwen-2.5-7b-instruct:free',
        'openrouter:microsoft/phi-3-mini-128k-instruct:free',
    ]
    
    import json
    
    for model_name in FREE_MODELS:
        try:
            print(f"\n🔍 Checking burnout with: {model_name}")
            
            # Create fresh agent for this model
            wellness_agent = Agent(
                model_name,
                system_prompt=WELLNESS_SYSTEM_PROMPT
            )
            
            result = await wellness_agent.run(context)
            response_text = str(result.output)
            
            print(f"✅ Got wellness response from {model_name}")
            print(f"Response preview: {response_text[:150]}...")
            
            # Clean markdown
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            # Parse JSON
            assessment_dict = json.loads(response_text)
            
            # Validate
            if "risk_level" not in assessment_dict:
                raise ValueError("Missing risk_level in response")
            
            print(f"✅ Burnout assessment complete: {assessment_dict['risk_level']} risk ({assessment_dict.get('risk_score', 0)}/100)")
            return BurnoutAssessment(**assessment_dict)
            
        except Exception as e:
            print(f"❌ {model_name} failed: {str(e)[:100]}")
            continue
    
    # All models failed - use rule-based fallback
    print("\n⚠️ All AI models failed. Using rule-based burnout detection.")
    return detect_burnout_with_rules(mood_history)


def detect_burnout_with_rules(mood_history: List[MoodEntry]) -> BurnoutAssessment:
    """Fallback: Detect burnout using algorithmic rules (no AI)."""
    
    signals = []
    risk_score = 0
    
    # Analyze mood trends
    recent_moods = [e.mood_score for e in mood_history[-3:]]
    if all(score <= 2 for score in recent_moods):
        signals.append("Last 3 days show consistent 'Tired' or 'Burned out' mood")
        risk_score += 30
    
    avg_mood = sum(e.mood_score for e in mood_history) / len(mood_history)
    if avg_mood < 2.5:
        signals.append(f"Average mood is low ({avg_mood:.1f}/4)")
        risk_score += 15
    
    # Check for overwork
    overwork_days = sum(1 for e in mood_history if e.actual_hours > e.planned_hours)
    if overwork_days >= 3:
        signals.append(f"Exceeded planned hours on {overwork_days} days - overworking pattern detected")
        risk_score += 25
    
    # Check focus decline
    low_focus_days = sum(1 for e in mood_history if e.focus_level == "Low")
    if low_focus_days >= 3:
        signals.append(f"Low focus reported for {low_focus_days} days - concentration declining")
        risk_score += 20
    
    # Check for skipped/reduced sessions
    skipped = sum(1 for e in mood_history if e.actual_hours < e.planned_hours * 0.7)
    if skipped >= 2:
        signals.append(f"Significantly reduced or skipped study on {skipped} days - possible demotivation")
        risk_score += 15
    
    # Determine risk level and recommendations
    if risk_score >= 75:
        risk_level = "Critical"
        recs = [
            "Take 2 full rest days immediately",
            "Resume with 50% reduced study load",
            "Consider talking to a counselor or mentor",
            "Focus only on essential exam preparation"
        ]
    elif risk_score >= 50:
        risk_level = "High"
        recs = [
            "Reduce daily study load by 40%",
            "Add a full rest day this week",
            "Focus only on high-priority subjects",
            "Ensure 8 hours of sleep daily"
        ]
    elif risk_score >= 25:
        risk_level = "Medium"
        recs = [
            "Consider reducing daily load by 20%",
            "Add more breaks between study sessions",
            "Try the Pomodoro technique (25 min work, 5 min break)",
            "Monitor your stress levels closely"
        ]
    else:
        risk_level = "Low"
        recs = [
            "Keep up the good work!",
            "Your current pace appears sustainable",
            "Continue monitoring your wellbeing"
        ]
    
    return BurnoutAssessment(
        risk_level=risk_level,
        risk_score=min(risk_score, 100.0),
        signals=signals if signals else ["No significant burnout signals detected"],
        recommendations=recs,
        should_adjust_plan=(risk_score >= 50)
    )