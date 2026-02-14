import React from 'react';
import { AlertTriangle, Check, X, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DistractionEvent } from '@/hooks/useAppUsageMonitor';

interface DistractionPromptProps {
  distraction: DistractionEvent | null;
  onRespond: (isWorkRelated: boolean) => void;
}

export const DistractionPrompt: React.FC<DistractionPromptProps> = ({
  distraction,
  onRespond,
}) => {
  if (!distraction || distraction.userResponded) return null;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.round(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <Dialog open={!!distraction && !distraction.userResponded} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Focus Check
          </DialogTitle>
          <DialogDescription className="pt-2">
            You switched to <strong>{distraction.appName}</strong> while working on:
            <br />
            <span className="text-foreground font-medium">
              "{distraction.currentActivityDescription || 'your current task'}"
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg font-semibold">
            {distraction.durationSeconds 
              ? formatDuration(distraction.durationSeconds)
              : 'Time calculating...'}
          </span>
          <span className="text-muted-foreground">spent on {distraction.appName}</span>
        </div>

        <p className="text-sm text-muted-foreground">
          Was this usage related to your work?
        </p>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={() => onRespond(false)}
          >
            <X className="h-4 w-4" />
            No, distraction
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => onRespond(true)}
          >
            <Check className="h-4 w-4" />
            Yes, work-related
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
