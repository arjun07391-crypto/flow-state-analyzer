import React from 'react';
import { Smartphone, Shield, AlertCircle, Play, Square, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAppUsageMonitor, AppCategory } from '@/hooks/useAppUsageMonitor';
import { formatDistanceToNow } from 'date-fns';

interface AppUsageSettingsProps {
  currentActivityDescription?: string;
}

export const AppUsageSettings: React.FC<AppUsageSettingsProps> = ({
  currentActivityDescription
}) => {
  const {
    isNative,
    isMonitoring,
    hasPermission,
    appCategories,
    distractionHistory,
    requestPermission,
    startMonitoring,
    stopMonitoring,
    updateAppCategory,
    getTodayDistractionTime
  } = useAppUsageMonitor(currentActivityDescription);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const todayDistraction = getTodayDistractionTime();

  if (!isNative) {
    return (
      <Card className="border-dashed border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" />
            App Usage Detection
          </CardTitle>
          <CardDescription>
            This feature requires the native Android app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To detect when you switch to distraction apps like WhatsApp or Instagram,
            you'll need to build and install the native app on your Android device.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Focus Protection
          </CardTitle>
          {isMonitoring && (
            <Badge variant="default" className="bg-green-500">
              Active
            </Badge>
          )}
        </div>
        <CardDescription>
          Detect when you switch to non-work apps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasPermission ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">Permission Required</p>
                <p className="text-amber-700">
                  Grant usage access to detect app switches
                </p>
              </div>
            </div>
            <Button onClick={requestPermission} className="w-full">
              Grant Permission
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Monitor App Usage</span>
              <Button
                variant={isMonitoring ? 'destructive' : 'default'}
                size="sm"
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
              >
                {isMonitoring ? (
                  <>
                    <Square className="h-4 w-4 mr-1" /> Stop
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" /> Start
                  </>
                )}
              </Button>
            </div>

            {todayDistraction > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-900">
                  <span className="font-semibold">{formatDuration(todayDistraction)}</span>
                  {' '}lost to distractions today
                </p>
              </div>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Settings className="h-4 w-4" />
                  Manage App Categories
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>App Categories</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[400px] pr-4">
                  <div className="space-y-3">
                    {appCategories.map((app) => (
                      <div
                        key={app.packageName}
                        className="flex items-center justify-between p-2 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium text-sm">{app.appName}</p>
                          <Badge variant="secondary" className="text-xs">
                            {app.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`work-${app.packageName}`} className="text-xs">
                            Work App
                          </Label>
                          <Switch
                            id={`work-${app.packageName}`}
                            checked={app.isWorkApp}
                            onCheckedChange={(checked) => 
                              updateAppCategory(app.packageName, checked)
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {distractionHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Recent Switches</p>
                <div className="space-y-1">
                  {distractionHistory.slice(0, 5).map((d, i) => (
                    <div
                      key={d.id || i}
                      className="flex items-center justify-between text-xs p-2 bg-muted rounded"
                    >
                      <span>{d.appName}</span>
                      <div className="flex items-center gap-2">
                        {d.durationSeconds && (
                          <span className="text-muted-foreground">
                            {formatDuration(d.durationSeconds)}
                          </span>
                        )}
                        {d.userResponded && (
                          <Badge 
                            variant={d.isWorkRelated ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {d.isWorkRelated ? 'Work' : 'Distraction'}
                          </Badge>
                        )}
                        {!d.userResponded && (
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
