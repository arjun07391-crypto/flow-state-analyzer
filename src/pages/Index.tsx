import React, { useState, useEffect } from 'react';
import { Moon, Sun, Download, Upload, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { useActivities } from '@/hooks/useActivities';
import { useAppUsageMonitor } from '@/hooks/useAppUsageMonitor';
import { ActivityInput } from '@/components/ActivityInput';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { TimeCharts } from '@/components/TimeCharts';
import { DailyInsights } from '@/components/DailyInsights';
import { GapDetectionDialog } from '@/components/GapDetectionDialog';
import { ManualActivityInput } from '@/components/ManualActivityInput';
import { DistractionPrompt } from '@/components/DistractionPrompt';
import { AppUsageSettings } from '@/components/AppUsageSettings';
import { AppSessionTimer } from '@/components/AppSessionTimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ParsedActivity, ActivityCategory, Activity } from '@/types/activity';
import { cn } from '@/lib/utils';

const Index = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Use local date components to avoid UTC timezone shift
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [pendingGap, setPendingGap] = useState<{
    startTime: string;
    endTime: string;
    durationMinutes: number;
  } | null>(null);
  const [showGapDialog, setShowGapDialog] = useState(false);

  const {
    activities,
    ongoingActivity,
    addActivity,
    stopOngoingActivity,
    deleteActivity,
    updateActivity,
    exportData,
    importData,
    clearAllData,
    datesWithData,
    today,
  } = useActivities(selectedDate);

  // App usage monitoring for distraction detection
  const {
    pendingDistraction,
    respondToDistraction,
  } = useAppUsageMonitor(ongoingActivity?.description);
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Check for time gaps when adding a new activity
  const checkForGap = (newStartTime: string): { startTime: string; endTime: string; durationMinutes: number } | null => {
    // Find the most recent activity that ended
    const completedActivities = activities.filter(a => !a.isOngoing && a.endTime);
    if (completedActivities.length === 0) return null;

    // Sort by end time descending
    const sorted = [...completedActivities].sort((a, b) => 
      new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime()
    );
    
    const lastActivity = sorted[0];
    const lastEndTime = new Date(lastActivity.endTime!).getTime();
    const newStart = new Date(newStartTime).getTime();
    
    // Check if there's a gap of more than 5 minutes
    const gapMinutes = Math.round((newStart - lastEndTime) / (1000 * 60));
    if (gapMinutes > 5) {
      return {
        startTime: lastActivity.endTime!,
        endTime: newStartTime,
        durationMinutes: gapMinutes,
      };
    }
    return null;
  };

  const handleActivityParsed = (parsed: ParsedActivity) => {
    if (parsed.intent === 'stop') {
      stopOngoingActivity(parsed.startTime);
    } else {
      const startTime = parsed.startTime || new Date().toISOString();
      
      // Check for gap before adding
      const gap = checkForGap(startTime);
      if (gap) {
        setPendingGap(gap);
        setShowGapDialog(true);
      }
      
      // Add the new activity
      addActivity({
        description: parsed.description,
        category: parsed.category,
        startTime,
        isOngoing: parsed.intent === 'start' || parsed.intent === 'switch',
      });
    }
  };

  const handleManualActivity = (activity: {
    description: string;
    category: ActivityCategory;
    startTime: string;
    endTime?: string;
    isOngoing: boolean;
  }) => {
    // Check for gap before adding
    const gap = checkForGap(activity.startTime);
    if (gap) {
      setPendingGap(gap);
      setShowGapDialog(true);
    }

    addActivity({
      description: activity.description,
      category: activity.category,
      startTime: activity.startTime,
      endTime: activity.endTime,
      duration: activity.endTime 
        ? Math.round((new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime()) / (1000 * 60))
        : undefined,
      isOngoing: activity.isOngoing,
    });
    toast.success(`Added: ${activity.description}`);
  };

  const handleFillGap = (description: string, category: ActivityCategory) => {
    if (!pendingGap) return;
    
    addActivity({
      description,
      category,
      startTime: pendingGap.startTime,
      endTime: pendingGap.endTime,
      duration: pendingGap.durationMinutes,
      isOngoing: false,
    });
    
    setPendingGap(null);
    setShowGapDialog(false);
    toast.success(`Gap filled: ${description}`);
  };

  const handleSkipGap = () => {
    setPendingGap(null);
    setShowGapDialog(false);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const success = importData(text);
      if (success) {
        toast.success('Data imported successfully!');
      } else {
        toast.error('Failed to import data. Please check the file format.');
      }
    };
    input.click();
  };

  const handleClearAll = () => {
    clearAllData();
    setShowClearDialog(false);
    toast.success('All data cleared');
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    // Parse date string using local components to avoid UTC timezone shifts
    const [year, month, day] = selectedDate.split('-').map(Number);
    const current = new Date(year, month - 1, day);
    const newDate = direction === 'prev' ? subDays(current, 1) : addDays(current, 1);
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    
    // Get today's date string for comparison
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    
    // Only navigate if not going beyond today
    if (direction === 'next' && newDateStr > todayStr) {
      return;
    }
    
    setSelectedDate(newDateStr);
  };

  const isViewingToday = selectedDate === today;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Time Tracker</h1>
              <p className="text-sm text-muted-foreground">AI-powered personal activity tracking</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={exportData} aria-label="Export data">
                <Download className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleImport} aria-label="Import data">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Clear all data">
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </DialogTrigger>
                <DialogContent aria-describedby="clear-dialog-description">
                  <DialogHeader>
                    <DialogTitle>Clear All Data?</DialogTitle>
                    <DialogDescription id="clear-dialog-description">
                      This will permanently delete all your tracked activities. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowClearDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleClearAll}>
                      Clear All
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDark(!isDark)}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigateDate('prev')} aria-label="Previous day">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-[200px]">
                <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                {isViewingToday ? 'Today' : (() => {
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return format(date, 'EEEE, MMM d');
                })()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={(() => {
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  return new Date(year, month - 1, day);
                })()}
                onSelect={(date) => {
                  if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setSelectedDate(`${year}-${month}-${day}`);
                  }
                }}
                modifiers={{
                  hasData: datesWithData.map(d => {
                    const [year, month, day] = d.split('-').map(Number);
                    return new Date(year, month - 1, day);
                  }),
                }}
                modifiersStyles={{
                  hasData: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                  },
                }}
              />
            </PopoverContent>
          </Popover>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigateDate('next')}
            disabled={isViewingToday}
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>

          {!isViewingToday && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                setSelectedDate(`${year}-${month}-${day}`);
              }}
            >
              Go to Today
            </Button>
          )}
        </div>

        {/* Activity Input - Only show for today */}
        {isViewingToday && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">What are you doing?</CardTitle>
              <ManualActivityInput onAddActivity={handleManualActivity} />
            </CardHeader>
            <CardContent>
              <ActivityInput
                onActivityParsed={handleActivityParsed}
                hasOngoingActivity={!!ongoingActivity}
                ongoingActivity={ongoingActivity}
              />
            </CardContent>
          </Card>
        )}

        {/* Gap Detection Dialog */}
        <GapDetectionDialog
          open={showGapDialog}
          onOpenChange={setShowGapDialog}
          gap={pendingGap}
          onFillGap={handleFillGap}
          onSkip={handleSkipGap}
        />

        {/* Distraction Prompt */}
        <DistractionPrompt
          distraction={pendingDistraction}
          onRespond={respondToDistraction}
        />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Timeline */}
          <Card className="lg:row-span-2">
            <CardHeader>
              <CardTitle className="text-lg">
                Activity Timeline
                {activities.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({activities.length} {activities.length === 1 ? 'activity' : 'activities'})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={activities} onDelete={deleteActivity} onUpdate={updateActivity} />
            </CardContent>
          </Card>

          {/* Charts */}
          <TimeCharts activities={activities} />

          {/* Time Spent Logging */}
          <AppSessionTimer selectedDate={selectedDate} isToday={isViewingToday} />

          {/* AI Insights */}
          <DailyInsights activities={activities} date={selectedDate} />

          {/* App Usage Settings (Focus Protection) */}
          <AppUsageSettings currentActivityDescription={ongoingActivity?.description} />
        </div>

        {/* Privacy Notice */}
        <div className="text-center py-6 border-t">
          <p className="text-sm text-muted-foreground">
            🔒 All your data is stored locally in your browser. Nothing is sent to any server except for AI analysis.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
