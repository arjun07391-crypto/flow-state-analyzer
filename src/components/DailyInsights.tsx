import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, Lightbulb, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, DailyAnalysis } from '@/types/activity';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DailyInsightsProps {
  activities: Activity[];
  date: string;
}

export const DailyInsights: React.FC<DailyInsightsProps> = ({ activities, date }) => {
  const [analysis, setAnalysis] = useState<DailyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const completedActivities = activities.filter(a => !a.isOngoing && a.duration);

  const analyzeDay = async () => {
    if (completedActivities.length === 0) {
      toast.error('Complete at least one activity to get insights');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-day', {
        body: { 
          activities: completedActivities,
          date 
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze day');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data as DailyAnalysis);
      setHasAnalyzed(true);
    } catch (error) {
      console.error('Error analyzing day:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze day');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset analysis when date or activities change significantly
  useEffect(() => {
    setHasAnalyzed(false);
    setAnalysis(null);
  }, [date]);

  if (!hasAnalyzed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Daily Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              {completedActivities.length === 0
                ? 'Complete some activities to get personalized insights'
                : `Analyze ${completedActivities.length} completed ${completedActivities.length === 1 ? 'activity' : 'activities'} for insights`}
            </p>
            <Button 
              onClick={analyzeDay} 
              disabled={isLoading || completedActivities.length === 0}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Get AI Insights
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Daily Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-foreground leading-relaxed">{analysis.summary}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Red Flags */}
          {analysis.redFlags.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Areas of Concern
              </h4>
              <ul className="space-y-1.5">
                {analysis.redFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-destructive mt-1">•</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Green Flags */}
          {analysis.greenFlags.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Great Job!
              </h4>
              <ul className="space-y-1.5">
                {analysis.greenFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-primary">
              <Lightbulb className="h-4 w-4" />
              Recommendations
            </h4>
            <ul className="space-y-1.5">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">{i + 1}.</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Re-analyze button */}
        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={analyzeDay}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Refresh Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
