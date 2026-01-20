'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Brain, Calendar, TrendingUp, Shield } from 'lucide-react';
import { onboardingStorage } from '@/lib/storage';

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user has completed onboarding
    if (onboardingStorage.isComplete()) {
      router.push('/dashboard');
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="flex justify-center mb-6">
            <Brain className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Study Planner
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Smart exam preparation with burnout detection. Study smarter, not harder.
          </p>
          <Button 
            onClick={() => router.push('/onboarding')}
            size="lg"
            className="text-lg px-8 py-6"
          >
            Get Started
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Smart Scheduling</h3>
            <p className="text-sm text-gray-600">
              AI-powered study plans with spaced repetition
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Burnout Detection</h3>
            <p className="text-sm text-gray-600">
              Track your wellness and get alerts before burnout
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Adaptive Planning</h3>
            <p className="text-sm text-gray-600">
              Plans adjust based on your progress and mood
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <Brain className="w-12 h-12 text-orange-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Focus Tracking</h3>
            <p className="text-sm text-gray-600">
              Monitor concentration and optimize study sessions
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}