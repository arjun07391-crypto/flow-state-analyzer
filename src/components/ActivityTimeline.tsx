import React, { useState } from 'react';
import { format } from 'date-fns';
import { Clock, Trash2, Play, Pencil } from 'lucide-react';
import { Activity, CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/activity';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EditActivityDialog } from './EditActivityDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ActivityTimelineProps {
  activities: Activity[];
  onDelete: (id: string) => void;
  onUpdate: (activityId: string, updates: Partial<Activity>) => void;
}

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return format(date, 'HH:mm');
};

const formatDuration = (minutes?: number) => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  onDelete,
  onUpdate,
}) => {
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No activities yet</p>
        <p className="text-sm">Start tracking by typing what you're doing above</p>
      </div>
    );
  }

  // Sort activities by start time (most recent first)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedActivities.map((activity) => (
        <div
          key={activity.id}
          className={cn(
            "activity-block flex items-center gap-4 p-4 border",
            activity.isOngoing && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
          style={{
            backgroundColor: `${CATEGORY_COLORS[activity.category]}10`,
            borderColor: CATEGORY_COLORS[activity.category],
          }}
        >
          {/* Category indicator */}
          <div
            className="w-3 h-full min-h-[3rem] rounded-full shrink-0"
            style={{ backgroundColor: CATEGORY_COLORS[activity.category] }}
          />
          
          {/* Activity details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{activity.description}</h4>
              {activity.isOngoing && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  <Play className="h-3 w-3" />
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: CATEGORY_COLORS[activity.category],
                  color: 'white',
                }}
              >
                {CATEGORY_LABELS[activity.category]}
              </span>
              <span>
                {formatTime(activity.startTime)}
                {activity.endTime && ` — ${formatTime(activity.endTime)}`}
              </span>
              {activity.duration && (
                <span className="font-medium">{formatDuration(activity.duration)}</span>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setEditingActivity(activity)}
              aria-label={`Edit ${activity.description}`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setDeletingActivity(activity)}
              aria-label={`Delete ${activity.description}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ))}

      <EditActivityDialog
        activity={editingActivity}
        open={!!editingActivity}
        onOpenChange={(open) => !open && setEditingActivity(null)}
        onSave={onUpdate}
      />

      <AlertDialog open={!!deletingActivity} onOpenChange={(open) => !open && setDeletingActivity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingActivity?.description}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingActivity) {
                  onDelete(deletingActivity.id);
                  setDeletingActivity(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
