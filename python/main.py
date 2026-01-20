from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our agents
from agents.planning import generate_study_plan, Subject, WeeklyPlan
from agents.wellness import assess_burnout, MoodEntry, BurnoutAssessment
from agents.adjustment import adjust_plan_for_burnout, AdjustedPlan
from agents.planning import StudyPlan

# Create FastAPI app
app = FastAPI(title="Study Planner AI Backend")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://*.vercel.app",   # Vercel deployment
        "https://study-planner-sable-gamma.vercel.app/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# REQUEST MODELS (What frontend will send)
# ============================================

class PlanRequest(BaseModel):
    subjects: List[Subject]
    available_hours_per_day: float
    fixed_commitments: dict
    start_date: str

class BurnoutRequest(BaseModel):
    mood_history: List[MoodEntry]

class AdjustRequest(BaseModel):
    current_plan: StudyPlan
    burnout_level: str
    upcoming_exams: List[dict]

# ============================================
# API ENDPOINTS
# ============================================

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Study Planner AI Backend is running",
        "openrouter_key_set": bool(os.getenv("OPENROUTER_API_KEY"))
    }

@app.post("/api/generate-plan", response_model=WeeklyPlan)
async def create_plan(request: PlanRequest):
    """
    Generate a weekly study plan using Planning Agent
    """
    try:
        plan = await generate_study_plan(
            subjects=request.subjects,
            available_hours_per_day=request.available_hours_per_day,
            fixed_commitments=request.fixed_commitments,
            start_date=request.start_date,
        )
        return plan
    except Exception as e:
        # If AI fails (rate limit, etc), use fallback
        print(f"AI generation failed: {e}")
        print("Using fallback plan...")
        
        from agents.planning import create_fallback_plan
        
        plan = create_fallback_plan(
            subjects=request.subjects,
            available_hours_per_day=request.available_hours_per_day,
            start_date=request.start_date,
        )
        return plan

@app.post("/api/check-burnout", response_model=BurnoutAssessment)
async def check_burnout(request: BurnoutRequest):
    """
    Assess burnout risk using Wellness Agent
    """
    try:
        assessment = await assess_burnout(request.mood_history)
        return assessment
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Burnout check failed: {str(e)}")

@app.post("/api/adjust-plan", response_model=AdjustedPlan)
async def adjust_plan(request: AdjustRequest):
    """
    Adjust study plan based on burnout level using Adjustment Agent
    """
    try:
        adjusted = await adjust_plan_for_burnout(
            current_plan=request.current_plan,
            burnout_level=request.burnout_level,
            upcoming_exams=request.upcoming_exams,
        )
        return adjusted
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plan adjustment failed: {str(e)}")

# ============================================
# RUN SERVER
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)