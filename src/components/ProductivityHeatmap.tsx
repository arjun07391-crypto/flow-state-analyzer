import React, { useMemo } from 'react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DayData } from '@/types/activity';
import { DistractionEvent } from '@/hooks/useAppUsageMonitor';

interface ProductivityHeatmapProps {
  allData: DayData[];
  distractionHistory: DistractionEvent[];
  selectedDate: string;
  mode: 'daily' | 'weekly';
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am to 11pm
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const ProductivityHeatmap: React.FC<ProductivityHeatmapProps> = ({
  allData,
  distractionHistory,
  selectedDate,
  mode,
}) => {
  const productiveCategories = ['work', 'coding', 'meetings'];

  // Daily heatmap: one row, each cell = 1 hour
  const dailyData = useMemo(() => {
    if (mode !== 'daily') return [];

    const dayData = allData.find(d => d.date === selectedDate);
    if (!dayData) return HOURS.map(h => ({ hour: h, productivity: 0, distraction: 0, label: 'No data' }));

    return HOURS.map(hour => {
      let productiveMinutes = 0;
      let distractionMinutes = 0;

      dayData.activities.forEach(a => {
        if (!a.duration) return;
        const start = new Date(a.startTime);
        const end = a.endTime ? new Date(a.endTime) : new Date();
        
        // Use selectedDate for hour boundaries, not activity start
        const [sy, sm, sd] = selectedDate.split('-').map(Number);
        const hourStart = new Date(sy, sm - 1, sd, hour, 0, 0, 0);
        const hourEnd = new Date(sy, sm - 1, sd, hour + 1, 0, 0, 0);

        const overlapStart = Math.max(start.getTime(), hourStart.getTime());
        const overlapEnd = Math.min(end.getTime(), hourEnd.getTime());

        if (overlapEnd > overlapStart) {
          const overlapMins = (overlapEnd - overlapStart) / (1000 * 60);
          if (productiveCategories.includes(a.category)) {
            productiveMinutes += overlapMins;
          }
        }
      });

      // Check distractions in this hour
      distractionHistory.forEach(d => {
        if (!d.startedAt || !d.durationSeconds || d.isWorkRelated) return;
        const dDate = format(new Date(d.startedAt), 'yyyy-MM-dd');
        if (dDate !== selectedDate) return;
        
        const dStart = new Date(d.startedAt);
        if (dStart.getHours() === hour) {
          distractionMinutes += Math.round(d.durationSeconds / 60);
        }
      });

      const net = productiveMinutes - distractionMinutes;
      let label = 'No data';
      if (productiveMinutes > 0 || distractionMinutes > 0) {
        if (net > 30) label = 'High productivity';
        else if (net > 10) label = 'Moderate';
        else if (distractionMinutes > productiveMinutes) label = 'High distraction';
        else label = 'Low activity';
      }

      return { hour, productivity: productiveMinutes, distraction: distractionMinutes, label };
    });
  }, [allData, distractionHistory, selectedDate, mode]);

  // Weekly heatmap: 7 rows × 18 columns
  const weeklyData = useMemo(() => {
    if (mode !== 'weekly') return [];

    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return days.map((dayDate, dayIndex) => {
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      const dayData = allData.find(d => d.date === dateStr);
      
      const hours = HOURS.map(hour => {
        let productiveMinutes = 0;
        let distractionMinutes = 0;

        if (dayData) {
          dayData.activities.forEach(a => {
            if (!a.duration) return;
            const start = new Date(a.startTime);
            const end = a.endTime ? new Date(a.endTime) : new Date();
            
            const hourStart = new Date(dayDate);
            hourStart.setHours(hour, 0, 0, 0);
            const hourEnd = new Date(dayDate);
            hourEnd.setHours(hour + 1, 0, 0, 0);

            const overlapStart = Math.max(start.getTime(), hourStart.getTime());
            const overlapEnd = Math.min(end.getTime(), hourEnd.getTime());

            if (overlapEnd > overlapStart) {
              const overlapMins = (overlapEnd - overlapStart) / (1000 * 60);
              if (productiveCategories.includes(a.category)) {
                productiveMinutes += overlapMins;
              }
            }
          });
        }

        distractionHistory.forEach(d => {
          if (!d.startedAt || !d.durationSeconds || d.isWorkRelated) return;
          const dDate = format(new Date(d.startedAt), 'yyyy-MM-dd');
          if (dDate !== dateStr) return;
          const dStart = new Date(d.startedAt);
          if (dStart.getHours() === hour) {
            distractionMinutes += Math.round(d.durationSeconds / 60);
          }
        });

        const net = productiveMinutes - distractionMinutes;
        return { hour, productivity: productiveMinutes, distraction: distractionMinutes, net };
      });

      return { day: DAYS[dayIndex], date: dateStr, hours };
    });
  }, [allData, distractionHistory, selectedDate, mode]);

  const getCellColor = (productivity: number, distraction: number) => {
    const net = productivity - distraction;
    if (productivity === 0 && distraction === 0) return 'bg-muted/30';
    if (net > 30) return 'bg-chart-1/80'; // High productivity - blue
    if (net > 10) return 'bg-chart-1/40'; // Moderate - light blue
    if (distraction > productivity) return 'bg-chart-5/60'; // High distraction - purple
    return 'bg-chart-3/40'; // Low activity - amber
  };

  const getCellLabel = (productivity: number, distraction: number) => {
    const net = productivity - distraction;
    if (productivity === 0 && distraction === 0) return 'No activity';
    if (net > 30) return 'High productivity';
    if (net > 10) return 'Moderate productivity';
    if (distraction > productivity) return 'High distraction';
    return 'Low activity';
  };

  if (mode === 'daily') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Time-of-Day Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {dailyData.map(cell => (
              <Tooltip key={cell.hour}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1 min-w-[1.5rem] sm:min-w-[2rem]">
                    <div
                      className={`w-5 h-5 sm:w-7 sm:h-7 rounded-sm ${getCellColor(cell.productivity, cell.distraction)} transition-colors`}
                    />
                    <span className="text-[8px] sm:text-[10px] text-muted-foreground">{cell.hour}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{cell.hour}:00–{cell.hour + 1}:00</p>
                  <p className="text-xs">{cell.label}</p>
                  {cell.productivity > 0 && <p className="text-xs">Work: {Math.round(cell.productivity)}m</p>}
                  {cell.distraction > 0 && <p className="text-xs">Distraction: {Math.round(cell.distraction)}m</p>}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-chart-1/80" /> High work</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-chart-1/40" /> Moderate</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-chart-5/60" /> Distracted</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted/30" /> None</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Weekly heatmap
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Weekly Productivity Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            {/* Hour labels */}
            <div className="flex gap-[2px] mb-1 ml-10">
              {HOURS.map(h => (
                <div key={h} className="w-5 sm:w-6 text-center text-[8px] sm:text-[9px] text-muted-foreground">{h}</div>
              ))}
            </div>
            {/* Grid */}
            {weeklyData.map(row => (
              <div key={row.day} className="flex gap-[2px] items-center mb-[2px]">
                <span className="w-9 text-xs text-muted-foreground text-right pr-1">{row.day}</span>
                {row.hours.map(cell => (
                  <Tooltip key={cell.hour}>
                    <TooltipTrigger asChild>
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-sm ${getCellColor(cell.productivity, cell.distraction)} transition-colors cursor-default`} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{row.day} {cell.hour}:00–{cell.hour + 1}:00</p>
                      <p className="text-xs">{getCellLabel(cell.productivity, cell.distraction)}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-chart-1/80" /> High work</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-chart-1/40" /> Moderate</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-chart-5/60" /> Distracted</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted/30" /> None</div>
        </div>
      </CardContent>
    </Card>
  );
};
