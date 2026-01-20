'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { Subject } from '@/lib/types';
import { subjectStorage, hoursStorage, onboardingStorage } from '@/lib/storage';
import { generatePlan } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [subjects, setSubjects] = useState<Subject[]>([
    {
      name: '',
      priority: 'Medium',
      difficulty: 'Medium',
      is_weak: false,
      exam_date: '',
      hours_needed: 8,
    },
  ]);
  
  const [availableHours, setAvailableHours] = useState(5);

  // Add new subject
  const addSubject = () => {
    setSubjects([
      ...subjects,
      {
        name: '',
        priority: 'Medium',
        difficulty: 'Medium',
        is_weak: false,
        exam_date: '',
        hours_needed: 8,
      },
    ]);
  };

  // Remove subject
  const removeSubject = (index: number) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter((_, i) => i !== index));
    }
  };

  // Update subject field
  const updateSubject = (index: number, field: keyof Subject, value: any) => {
    const updated = [...subjects];
    updated[index] = { ...updated[index], [field]: value };
    setSubjects(updated);
  };

  // Validate and submit
  const handleSubmit = async () => {
    // Validation
    const invalidSubject = subjects.find(
      (s) => !s.name.trim() || !s.exam_date
    );
    
    if (invalidSubject) {
      setError('Please fill in all subject names and exam dates');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Save to localStorage
      subjectStorage.set(subjects);
      hoursStorage.set(availableHours);

      // Generate initial plan
      const today = new Date().toISOString().split('T')[0];
      
      await generatePlan(
        subjects,
        availableHours,
        {}, // No fixed commitments for MVP
        today
      );

      // Mark onboarding as complete
      onboardingStorage.setComplete();

      // Navigate to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Let's Set Up Your Study Plan</h1>
          <p className="text-gray-600">Add your subjects and exam dates</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Available Hours Slider */}
        <Card className="p-6 mb-6">
          <Label className="text-lg font-semibold mb-4 block">
            Daily Study Time Available
          </Label>
          <div className="space-y-4">
            <Slider
              value={[availableHours]}
              onValueChange={(value) => setAvailableHours(value[0])}
              min={1}
              max={12}
              step={0.5}
              className="w-full"
            />
            <div className="text-center">
              <span className="text-3xl font-bold text-blue-600">
                {availableHours}
              </span>
              <span className="text-gray-600 ml-2">hours per day</span>
            </div>
          </div>
        </Card>

        {/* Subjects */}
        <div className="space-y-4 mb-6">
          {subjects.map((subject, index) => (
            <Card key={index} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Subject {index + 1}</h3>
                {subjects.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSubject(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Subject Name */}
                <div>
                  <Label>Subject Name</Label>
                  <Input
                    placeholder="e.g., Operating Systems"
                    value={subject.name}
                    onChange={(e) => updateSubject(index, 'name', e.target.value)}
                  />
                </div>

                {/* Exam Date */}
                <div>
                  <Label>Exam Date</Label>
                  <Input
                    type="date"
                    value={subject.exam_date}
                    onChange={(e) => updateSubject(index, 'exam_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Priority */}
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={subject.priority}
                    onValueChange={(value) => updateSubject(index, 'priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty */}
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={subject.difficulty}
                    onValueChange={(value) => updateSubject(index, 'difficulty', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Hours Needed */}
                <div>
                  <Label>Total Hours Needed</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={subject.hours_needed}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 8 : parseFloat(e.target.value);
                      updateSubject(index, 'hours_needed', isNaN(value) ? 8 : value);
                    }}
                  />
                </div>

                {/* Is Weak Area */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`weak-${index}`}
                    checked={subject.is_weak}
                    onChange={(e) => updateSubject(index, 'is_weak', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor={`weak-${index}`}>This is a weak area for me</Label>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Add Subject Button */}
        <Button
          variant="outline"
          onClick={addSubject}
          className="w-full mb-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Subject
        </Button>

        {/* Generate Plan Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 text-lg"
        >
          {loading ? (
            'Generating Your Plan...'
          ) : (
            <>
              Generate Study Plan
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}