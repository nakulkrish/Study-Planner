'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Heart } from 'lucide-react';
import { moodStorage, planStorage, assessmentStorage } from '@/lib/storage';
import { checkBurnout } from '@/lib/api';
import type { Mood, FocusLevel, MoodEntry } from '@/lib/types';

const MOOD_OPTIONS: { value: Mood; score: number; emoji: string; color: string }[] = [
  { value: 'Energized', score: 4, emoji: '😄', color: 'bg-green-500' },
  { value: 'Okay', score: 3, emoji: '🙂', color: 'bg-blue-500' },
  { value: 'Tired', score: 2, emoji: '😐', color: 'bg-yellow-500' },
  { value: 'Burned out', score: 1, emoji: '😫', color: 'bg-red-500' },
];

const FOCUS_OPTIONS: FocusLevel[] = ['High', 'Medium', 'Low'];

export default function CheckinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedMood, setSelectedMood] = useState<Mood>('Okay');
  const [plannedHours, setPlannedHours] = useState(5);
  const [actualHours, setActualHours] = useState(5);
  const [focusLevel, setFocusLevel] = useState<FocusLevel>('Medium');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const moodOption = MOOD_OPTIONS.find(m => m.value === selectedMood)!;

      // Create mood entry
      const entry: MoodEntry = {
        date: today,
        mood: selectedMood,
        mood_score: moodOption.score,
        planned_hours: plannedHours,
        actual_hours: actualHours,
        focus_level: focusLevel,
      };

      // Save to localStorage
      moodStorage.add(entry);

      // Get mood history
      const history = moodStorage.get();

      // Check burnout if we have enough data (at least 3 days)
      if (history.length >= 3) {
        try {
          const assessment = await checkBurnout(history);
          assessmentStorage.set(assessment);

          // Show alert if high risk
          if (assessment.risk_level === 'High' || assessment.risk_level === 'Critical') {
            alert(
              `⚠️ Burnout Alert: ${assessment.risk_level} Risk\n\n` +
              `Recommendations:\n${assessment.recommendations.slice(0, 3).join('\n')}\n\n` +
              `Please take care of yourself!`
            );
          }
        } catch (err) {
          console.error('Burnout check failed:', err);
          // Continue even if burnout check fails
        }
      }

      // Navigate back to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save check-in');
      setLoading(false);
    }
  };

  const selectedMoodOption = MOOD_OPTIONS.find(m => m.value === selectedMood)!;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-2">Daily Check-in</h1>
            <p className="text-gray-600">How are you feeling today?</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <Card className="p-8">
          {/* Mood Selection */}
          <div className="mb-8">
            <Label className="text-lg font-semibold mb-4 block">
              How are you feeling today?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedMood(option.value)}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    selectedMood === option.value
                      ? `${option.color} border-transparent text-white scale-105`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">{option.emoji}</div>
                  <div className={`font-semibold ${
                    selectedMood === option.value ? 'text-white' : 'text-gray-700'
                  }`}>
                    {option.value}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Study Hours */}
          <div className="mb-8">
            <Label className="text-lg font-semibold mb-4 block">
              Study Hours
            </Label>
            
            <div className="space-y-6">
              {/* Planned Hours */}
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Planned to study</Label>
                  <span className="text-2xl font-bold text-blue-600">
                    {plannedHours}h
                  </span>
                </div>
                <Slider
                  value={[plannedHours]}
                  onValueChange={(value) => setPlannedHours(value[0])}
                  min={0}
                  max={12}
                  step={0.5}
                  className="w-full"
                />
              </div>

              {/* Actual Hours */}
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Actually studied</Label>
                  <span className="text-2xl font-bold text-green-600">
                    {actualHours}h
                  </span>
                </div>
                <Slider
                  value={[actualHours]}
                  onValueChange={(value) => setActualHours(value[0])}
                  min={0}
                  max={12}
                  step={0.5}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Focus Level */}
          <div className="mb-8">
            <Label className="text-lg font-semibold mb-4 block">
              How focused were you?
            </Label>
            <div className="grid grid-cols-3 gap-4">
              {FOCUS_OPTIONS.map((level) => (
                <button
                  key={level}
                  onClick={() => setFocusLevel(level)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    focusLevel === level
                      ? 'border-blue-500 bg-blue-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`font-semibold ${
                    focusLevel === level ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {level}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 text-lg"
          >
            {loading ? 'Saving...' : 'Save Check-in'}
          </Button>
        </Card>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Your mood data helps detect burnout patterns and adjust your study plan</p>
        </div>
      </div>
    </div>
  );
}