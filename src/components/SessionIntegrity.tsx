import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Activity } from '@/types/activity';
import { DistractionEvent } from '@/hooks/useAppUsageMonitor';
import { Shield } from 'lucide-react';

interface SessionIntegrityProps {
  activities: Activity[];
  distractionHistory: DistractionEvent[];
}

export const SessionIntegrity: React.FC<SessionIntegrityProps> = ({
  activities,
  distractionHistory,
}) => {
  const { totalLogged, actualWork, distractionTime, integrityPercent } = useMemo(() => {
    const productiveCategories = ['work', 'coding', 'meetings'];
    
    const logged = activities
      .filter(a => a.duration && productiveCategories.includes(a.category))
      .reduce((sum, a) => sum + (a.duration || 0), 0);

    const distraction = distractionHistory
      .filter(d => d.userResponded && !d.isWorkRelated && d.durationSeconds)
      .reduce((sum, d) => sum + Math.round((d.durationSeconds || 0) / 60), 0);

    const actual = Math.max(0, logged - distraction);
    const percent = logged > 0 ? Math.round((actual / logged) * 100) : 100;

    return {
      totalLogged: logged,
      actualWork: actual,
      distractionTime: distraction,
      integrityPercent: percent,
    };
  }, [activities, distractionHistory]);

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (totalLogged === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          Session Integrity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold">{integrityPercent}%</p>
            <p className="text-xs text-muted-foreground">actual work done</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Logged: {formatHours(totalLogged)}</p>
            <p>Actual: {formatHours(actualWork)}</p>
          </div>
        </div>

        <Progress value={integrityPercent} className="h-2" />

        {distractionTime > 0 && (
          <p className="text-sm text-muted-foreground">
            You logged <span className="font-medium text-foreground">{formatHours(totalLogged)}</span> but actual work was <span className="font-medium text-foreground">{formatHours(actualWork)}</span> ({integrityPercent}%) due to <span className="font-medium text-foreground">{formatHours(distractionTime)}</span> of distractions.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
