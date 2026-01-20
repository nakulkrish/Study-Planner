'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, BookOpen, AlertTriangle, LogOut } from 'lucide-react';
import { adjustPlanForBurnout } from '@/lib/api';
import { planStorage, subjectStorage, onboardingStorage, assessmentStorage, moodStorage, completedTasksStorage, clearAllData } from '@/lib/storage';
import type { WeeklyPlan, DailyTask } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [todaysPlan, setTodaysPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [burnoutAssessment, setBurnoutAssessment] = useState<any>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  useEffect(() => {
    // Check if onboarding complete
    if (!onboardingStorage.isComplete()) {
      router.push('/');
      return;
    }

    // Load plan from localStorage
    const savedPlan = planStorage.get();
    if (!savedPlan) {
      router.push('/onboarding');
      return;
    }

    setPlan(savedPlan);

    // Find today's plan
    const today = new Date().toISOString().split('T')[0];
    const todayPlan = savedPlan.days.find((d) => d.date === today) || savedPlan.days[0];
    setTodaysPlan(todayPlan);

    // Load latest burnout assessment
    const assessment = assessmentStorage.get();
    setBurnoutAssessment(assessment);

    // Load completed tasks for today
    setCompletedTasks(completedTasksStorage.get(today));

    setLoading(false);
  }, [router]);

  const handleReset = () => {
    if (confirm('This will delete all your data. Are you sure?')) {
      clearAllData();
      router.push('/');
    }
  };

  const handleAdjustPlan = async () => {
    if (!plan || !todaysPlan || !burnoutAssessment) return;
    
    setAdjusting(true);
    
    try {
      // Calculate upcoming exams
      const today = new Date();
      const upcomingExams = subjectStorage.get().map(subject => ({
        subject: subject.name,
        days_until: Math.ceil(
          (new Date(subject.exam_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
      }));
      
      // Call Adjustment Agent
      const adjusted = await adjustPlanForBurnout(
        todaysPlan,
        burnoutAssessment.risk_level,
        upcomingExams
      );
      
      // Update today's plan with adjusted tasks
      const updatedDays = plan.days.map(day => {
        if (day.date === todaysPlan.date) {
          return {
            ...day,
            tasks: adjusted.modified_tasks,
            total_hours: adjusted.new_hours,
            rest_recommended: adjusted.rest_days_added > 0
          };
        }
        return day;
      });
      
      const updatedPlan = {
        ...plan,
        days: updatedDays
      };
      
      // Save updated plan
      planStorage.set(updatedPlan);
      setPlan(updatedPlan);
      setTodaysPlan(updatedDays.find(d => d.date === todaysPlan.date));

      // Clear the burnout assessment since the plan has been adjusted
      assessmentStorage.clear();
      setBurnoutAssessment(null);
      
      // Show success message
      alert(
        `✅ Plan Adjusted by AI!\n\n` +
        `Original: ${adjusted.original_hours}h → New: ${adjusted.new_hours}h\n\n` +
        `Removed ${adjusted.removed_tasks.length} task(s)\n` +
        `Rest days added: ${adjusted.rest_days_added}\n\n` +
        `Rationale: ${adjusted.rationale}`
      );
      
    } catch (error: any) {
      alert(`Failed to adjust plan: ${error.message}\n\nPlease try again later.`);
    } finally {
      setAdjusting(false);
    }
  };

  const handleTaskToggle = (taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (completedTasks.includes(taskId)) {
      completedTasksStorage.remove(today, taskId);
      setCompletedTasks(prev => prev.filter(id => id !== taskId));
    } else {
      completedTasksStorage.add(today, taskId);
      setCompletedTasks(prev => [...prev, taskId]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your study plan...</p>
        </div>
      </div>
    );
  }

  if (!plan || !todaysPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">No study plan found</p>
          <Button onClick={() => router.push('/onboarding')}>
            Create Plan
          </Button>
        </Card>
      </div>
    );
  }

  const totalHoursThisWeek = plan.days.reduce((sum, day) => sum + day.total_hours, 0);

  // Calculate completed hours from check-ins (sum actual_hours for this week)
  const moodHistory = moodStorage.get();
  const startOfWeek = new Date(plan.days[0].date); // Assuming plan.days[0] is the start
  const endOfWeek = new Date(plan.days[plan.days.length - 1].date);
  const checkinHours = moodHistory
    .filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfWeek && entryDate <= endOfWeek;
    })
    .reduce((sum, entry) => sum + entry.actual_hours, 0);

  // Add task-based progress (estimate hours from completed tasks)
  const taskCompletionHours = plan.days.reduce((sum, day) => {
    const dayCompleted = completedTasksStorage.get(day.date);
    return sum + day.tasks
      .filter(task => dayCompleted.includes(`${task.subject}-${task.topic}`))
      .reduce((taskSum, task) => taskSum + task.duration_hours, 0);
  }, 0);

  const completedHours = checkinHours + taskCompletionHours; // Combine both
  const progressPercent = totalHoursThisWeek > 0 ? Math.min((completedHours / totalHoursThisWeek) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold mb-4">Your Study Dashboard</h1>
            <p className="text-gray-600">Week {plan.week_number}</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/checkin')}>
              Daily Check-in
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <LogOut className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Burnout Alert - Enhanced with Wellness Agent Results */}
        {(burnoutAssessment || plan.burnout_risk !== 'Low') && (
          <Card className={`p-6 mb-6 ${
            burnoutAssessment?.risk_level === 'Critical' ? 'bg-red-50 border-red-300' :
            burnoutAssessment?.risk_level === 'High' ? 'bg-orange-50 border-orange-300' :
            burnoutAssessment?.risk_level === 'Medium' ? 'bg-yellow-50 border-yellow-200' :
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <AlertTriangle className={`w-6 h-6 mr-3 mt-1 ${
                    burnoutAssessment?.risk_level === 'Critical' ? 'text-red-600' :
                    burnoutAssessment?.risk_level === 'High' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`} />
                  <div>
                    <p className={`text-lg font-bold ${
                      burnoutAssessment?.risk_level === 'Critical' ? 'text-red-800' :
                      burnoutAssessment?.risk_level === 'High' ? 'text-orange-800' :
                      'text-yellow-800'
                    }`}>
                      {burnoutAssessment 
                        ? `Burnout Alert: ${burnoutAssessment.risk_level} Risk` 
                        : `Burnout Risk: ${plan.burnout_risk}`}
                    </p>
                    {burnoutAssessment && (
                      <p className={`text-sm mt-1 ${
                        burnoutAssessment.risk_level === 'Critical' ? 'text-red-700' :
                        burnoutAssessment.risk_level === 'High' ? 'text-orange-700' :
                        'text-yellow-700'
                      }`}>
                        Risk Score: {burnoutAssessment.risk_score}/100
                      </p>
                    )}
                  </div>
                </div>
                {burnoutAssessment?.should_adjust_plan && (
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={handleAdjustPlan}
                    disabled={adjusting}
                  >
                    {adjusting ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border border-current border-t-transparent rounded-full" />
                        Adjusting...
                      </>
                    ) : 'Adjust Plan'}
                  </Button>
                )}
              </div>

              {burnoutAssessment && (
                <>
                  {/* Signals Detected */}
                  {burnoutAssessment.signals && burnoutAssessment.signals.length > 0 && (
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${
                        burnoutAssessment.risk_level === 'Critical' ? 'text-red-800' :
                        burnoutAssessment.risk_level === 'High' ? 'text-orange-800' :
                        'text-yellow-800'
                      }`}>
                        Signals Detected:
                      </p>
                      <ul className={`text-sm space-y-1 ${
                        burnoutAssessment.risk_level === 'Critical' ? 'text-red-700' :
                        burnoutAssessment.risk_level === 'High' ? 'text-orange-700' :
                        'text-yellow-700'
                      }`}>
                        {burnoutAssessment.signals.slice(0, 3).map((signal: string, i: number) => (
                          <li key={i}>• {signal}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {burnoutAssessment.recommendations && burnoutAssessment.recommendations.length > 0 && (
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${
                        burnoutAssessment.risk_level === 'Critical' ? 'text-red-800' :
                        burnoutAssessment.risk_level === 'High' ? 'text-orange-800' :
                        'text-yellow-800'
                      }`}>
                        Recommendations:
                      </p>
                      <ul className={`text-sm space-y-1 ${
                        burnoutAssessment.risk_level === 'Critical' ? 'text-red-700' :
                        burnoutAssessment.risk_level === 'High' ? 'text-orange-700' :
                        'text-yellow-700'
                      }`}>
                        {burnoutAssessment.recommendations.slice(0, 4).map((rec: string, i: number) => (
                          <li key={i}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-gray-600 italic">
                    Analysis by Wellness Agent using Llama 3.3 70B
                  </p>
                </>
              )}

              {!burnoutAssessment && (
                <p className="text-sm text-yellow-700">
                  Complete daily check-ins for personalized burnout detection
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hours This Week</p>
                <p className="text-3xl font-bold text-blue-600">
                  {totalHoursThisWeek.toFixed(1)}h
                </p>
              </div>
              <Clock className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Subjects</p>
                <p className="text-3xl font-bold text-green-600">
                  {subjectStorage.get().length}
                </p>
              </div>
              <BookOpen className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Days Planned</p>
                <p className="text-3xl font-bold text-purple-600">
                  {plan.days.length}
                </p>
              </div>
              <Calendar className="w-12 h-12 text-purple-600 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Progress */}
        <Card className="p-6 mb-8">
          <h3 className="font-semibold mb-4">Weekly Progress</h3>
          <Progress value={progressPercent} className="h-3 mb-2" />
          <p className="text-sm text-gray-600">
            {completedHours.toFixed(1)} / {totalHoursThisWeek.toFixed(1)} hours completed
          </p>
        </Card>

        {/* Today's Tasks */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Today's Tasks</h2>
          <p className="text-gray-600 mb-4">{todaysPlan.date}</p>
          
          {todaysPlan.rest_recommended ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600">🌟 Rest day recommended!</p>
              <p className="text-sm text-gray-500 mt-2">Take a break and recharge</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaysPlan.tasks.map((task: DailyTask, index: number) => {
                const taskId = `${task.subject}-${task.topic}`;
                const isCompleted = completedTasks.includes(taskId);
                return (
                  <div
                    key={index}
                    className={`border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors ${
                      isCompleted ? 'opacity-60 bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => handleTaskToggle(taskId)}
                          className="mr-3 w-5 h-5"
                        />
                        <div>
                          <h4 className={`font-semibold text-xl ${isCompleted ? 'line-through' : ''}`}>
                            {task.subject}
                          </h4>
                          <p className={`text-gray-600 ${isCompleted ? 'line-through' : ''}`}>
                            {task.topic}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        task.priority === 'High' ? 'bg-red-100 text-red-700' :
                        task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {task.duration_hours}h
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {task.task_type}
                      </span>
                    </div>
                    {task.notes && (
                      <p className={`text-sm text-gray-500 mt-2 italic ${isCompleted ? 'line-through' : ''}`}>
                        {task.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Total study time today:</strong> {todaysPlan.total_hours} hours
            </p>
          </div>
        </Card>

        {/* Week Overview */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">This Week's Schedule</h2>
          <div className="space-y-3">
            {plan.days.map((day, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">{day.date}</p>
                  <p className="text-sm text-gray-600">
                    {day.tasks.length} tasks
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">{day.total_hours}h</p>
                  {day.rest_recommended && (
                    <p className="text-xs text-gray-500">Rest day</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}