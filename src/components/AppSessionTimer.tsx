import React from 'react';
import { Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppSessionTime } from '@/hooks/useAppSessionTime';

interface AppSessionTimerProps {
  selectedDate: string;
  isToday: boolean;
}

export const AppSessionTimer: React.FC<AppSessionTimerProps> = ({ selectedDate, isToday }) => {
  const { todaySeconds, getTimeForDate, formatDuration } = useAppSessionTime();

  const seconds = isToday ? todaySeconds : getTimeForDate(selectedDate);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4" />
          Time Spent Logging
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-1">
          <p className="text-3xl font-bold text-primary">{formatDuration(seconds)}</p>
          <p className="text-sm text-muted-foreground">
            {isToday ? 'spent in this app today' : `spent on ${selectedDate}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
