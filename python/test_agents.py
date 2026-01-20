from dotenv import load_dotenv
import os

# Load environment variables BEFORE importing agents
load_dotenv()

# Verify API key is loaded
if not os.getenv("OPENROUTER_API_KEY"):
    raise ValueError("OPENROUTER_API_KEY not found in .env file!")

print(f"✅ API Key loaded: {os.getenv('OPENROUTER_API_KEY')[:20]}...")

import asyncio
from agents.planning import generate_study_plan, Subject
from agents.wellness import assess_burnout, MoodEntry
from agents.adjustment import adjust_plan_for_burnout
from datetime import datetime, timedelta

async def test_planning_agent():
    """Test the Planning Agent"""
    print("\n=== TESTING PLANNING AGENT ===\n")
    
    # Sample subjects
    subjects = [
        Subject(
            name="Operating Systems",
            priority="High",
            difficulty="Hard",
            is_weak=True,
            exam_date="2026-01-28",
            hours_needed=12.0
        ),
        Subject(
            name="Database Management",
            priority="High",
            difficulty="Medium",
            is_weak=False,
            exam_date="2026-01-30",
            hours_needed=10.0
        ),
        Subject(
            name="Computer Networks",
            priority="Medium",
            difficulty="Medium",
            is_weak=False,
            exam_date="2026-02-05",
            hours_needed=8.0
        ),
    ]
    
    # User constraints
    available_hours = 5.0
    commitments = {
        "Monday": [[9, 15]],
        "Wednesday": [[10, 14]],
    }
    start_date = "2026-01-21"
    
    # Generate plan
    print("Generating study plan...")
    plan = await generate_study_plan(
        subjects=subjects,
        available_hours_per_day=available_hours,
        fixed_commitments=commitments,
        start_date=start_date
    )
    
    print(f"\n✅ Generated {len(plan.days)}-day plan!")
    print(f"Burnout risk: {plan.burnout_risk}")
    
    for day in plan.days[:2]:  # Show first 2 days
        print(f"\n📅 {day.date} ({day.total_hours} hours):")
        for task in day.tasks:
            print(f"  - {task.subject}: {task.topic} ({task.duration_hours}h) [{task.task_type}]")
    
    return plan

async def test_wellness_agent():
    """Test the Wellness Agent"""
    print("\n\n=== TESTING WELLNESS AGENT ===\n")
    
    # Simulate 5 days of mood data showing burnout
    mood_data = [
        MoodEntry(
            date="2026-01-16",
            mood="Energized",
            mood_score=4,
            planned_hours=5.0,
            actual_hours=5.0,
            focus_level="High"
        ),
        MoodEntry(
            date="2026-01-17",
            mood="Okay",
            mood_score=3,
            planned_hours=5.0,
            actual_hours=6.0,
            focus_level="Medium"
        ),
        MoodEntry(
            date="2026-01-18",
            mood="Tired",
            mood_score=2,
            planned_hours=5.0,
            actual_hours=5.5,
            focus_level="Low"
        ),
        MoodEntry(
            date="2026-01-19",
            mood="Tired",
            mood_score=2,
            planned_hours=5.0,
            actual_hours=4.0,
            focus_level="Low"
        ),
        MoodEntry(
            date="2026-01-20",
            mood="Burned out",
            mood_score=1,
            planned_hours=5.0,
            actual_hours=2.0,
            focus_level="Low"
        ),
    ]
    
    print("Assessing burnout from 5 days of data...")
    assessment = await assess_burnout(mood_data)
    
    print(f"\n🔥 Risk Level: {assessment.risk_level}")
    print(f"📊 Risk Score: {assessment.risk_score}/100")
    print(f"\nSignals detected:")
    for signal in assessment.signals:
        print(f"  - {signal}")
    
    print(f"\nRecommendations:")
    for rec in assessment.recommendations:
        print(f"  - {rec}")
    
    print(f"\nShould adjust plan: {assessment.should_adjust_plan}")
    
    return assessment

async def main():
    """Run all tests"""
    plan = await test_planning_agent()
    assessment = await test_wellness_agent()
    
    print("\n\n✅ All agents tested successfully!")
    print("\nNext step: Integrate with Next.js frontend")

if __name__ == "__main__":
    asyncio.run(main())