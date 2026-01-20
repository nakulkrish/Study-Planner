import asyncio
from agents.adjustment import adjust_plan_for_burnout
from agents.planning import StudyPlan, DailyTask

async def test_adjustment():
    # Create sample plan
    current_plan = StudyPlan(
        date="2026-01-21",
        tasks=[
            DailyTask(
                subject="Operating Systems",
                topic="Process Scheduling",
                duration_hours=2.0,
                task_type="Learn",
                priority="High",
                notes=""
            ),
            DailyTask(
                subject="Database Management",
                topic="SQL Basics",
                duration_hours=1.5,
                task_type="Learn",
                priority="Medium",
                notes=""
            ),
            DailyTask(
                subject="Computer Networks",
                topic="TCP/IP",
                duration_hours=1.5,
                task_type="Learn",
                priority="Low",
                notes=""
            ),
        ],
        total_hours=5.0,
        rest_recommended=False
    )
    
    # Simulate burnout
    upcoming_exams = [
        {"subject": "Operating Systems", "days_until": 5},
        {"subject": "Database Management", "days_until": 8},
    ]
    
    print("🔧 Testing Adjustment Agent with HIGH burnout level...\n")
    
    adjusted = await adjust_plan_for_burnout(
        current_plan=current_plan,
        burnout_level="High",
        upcoming_exams=upcoming_exams
    )
    
    print(f"\n✅ Adjustment Complete!")
    print(f"Original: {adjusted.original_hours}h → New: {adjusted.new_hours}h")
    print(f"Removed tasks: {adjusted.removed_tasks}")
    print(f"Rest days added: {adjusted.rest_days_added}")
    print(f"\nRationale: {adjusted.rationale}")
    print(f"\nModified tasks:")
    for task in adjusted.modified_tasks:
        print(f"  - {task.subject}: {task.duration_hours}h ({task.priority})")

if __name__ == "__main__":
    asyncio.run(test_adjustment())