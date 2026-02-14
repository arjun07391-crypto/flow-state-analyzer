import React, { useState } from 'react';
import { AlertTriangle, Check, X, Clock, MessageSquare, Shield, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DistractionEvent } from '@/hooks/useAppUsageMonitor';

// Known app recommendations
const APP_RECOMMENDATIONS: Record<string, { likely: 'distraction' | 'work'; label: string }> = {
  instagram: { likely: 'distraction', label: 'Social media — likely distraction' },
  facebook: { likely: 'distraction', label: 'Social media — likely distraction' },
  twitter: { likely: 'distraction', label: 'Social media — likely distraction' },
  tiktok: { likely: 'distraction', label: 'Short-form video — likely distraction' },
  snapchat: { likely: 'distraction', label: 'Social media — likely distraction' },
  reddit: { likely: 'distraction', label: 'Social forum — likely distraction' },
  youtube: { likely: 'distraction', label: 'Video platform — could be either' },
  whatsapp: { likely: 'distraction', label: 'Messaging — likely distraction' },
  telegram: { likely: 'distraction', label: 'Messaging — likely distraction' },
  netflix: { likely: 'distraction', label: 'Streaming — likely distraction' },
  spotify: { likely: 'distraction', label: 'Music — usually background' },
  // Work apps
  docs: { likely: 'work', label: 'Documents — likely work' },
  sheets: { likely: 'work', label: 'Spreadsheets — likely work' },
  slides: { likely: 'work', label: 'Presentations — likely work' },
  notion: { likely: 'work', label: 'Productivity — likely work' },
  slack: { likely: 'work', label: 'Team messaging — likely work' },
  teams: { likely: 'work', label: 'Team messaging — likely work' },
  zoom: { likely: 'work', label: 'Video conferencing — likely work' },
  meet: { likely: 'work', label: 'Video conferencing — likely work' },
  vscode: { likely: 'work', label: 'Code editor — likely work' },
  figma: { likely: 'work', label: 'Design tool — likely work' },
  jira: { likely: 'work', label: 'Project management — likely work' },
  github: { likely: 'work', label: 'Code hosting — likely work' },
  gmail: { likely: 'work', label: 'Email — likely work' },
  outlook: { likely: 'work', label: 'Email — likely work' },
  chrome: { likely: 'work', label: 'Browser — depends on usage' },
};

function getRecommendation(appName: string) {
  const lower = appName.toLowerCase();
  for (const [key, val] of Object.entries(APP_RECOMMENDATIONS)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function getSeverity(durationSeconds?: number): 'ignored' | 'grouped' | 'normal' | 'hard' {
  if (!durationSeconds) return 'normal';
  if (durationSeconds < 120) return 'ignored'; // <2 min
  if (durationSeconds <= 300) return 'grouped'; // 2-5 min
  return 'hard'; // >5 min
}

interface DistractionPromptProps {
  distraction: DistractionEvent | null;
  batchDistractions?: DistractionEvent[];
  onRespond: (isWorkRelated: boolean, reason?: string) => void;
  onBatchRespond?: (responses: { id: string; isWorkRelated: boolean; reason?: string }[]) => void;
  isBatchMode?: boolean;
}

export const DistractionPrompt: React.FC<DistractionPromptProps> = ({
  distraction,
  batchDistractions = [],
  onRespond,
  onBatchRespond,
  isBatchMode = false,
}) => {
  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [pendingResponse, setPendingResponse] = useState<boolean | null>(null);
  const [batchResponses, setBatchResponses] = useState<Record<string, { isWorkRelated: boolean; reason?: string }>>({});

  const items = isBatchMode ? batchDistractions : (distraction ? [distraction] : []);
  const visibleItems = items.filter(d => {
    const sev = getSeverity(d.durationSeconds);
    return sev !== 'ignored' && !d.userResponded;
  });

  if (visibleItems.length === 0) return null;

  const currentItem = visibleItems[0];
  const recommendation = getRecommendation(currentItem.appName);
  const severity = getSeverity(currentItem.durationSeconds);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.round(seconds / 60);
    return `${minutes}m`;
  };

  const handleResponse = (isWorkRelated: boolean) => {
    // Check if user contradicts AI recommendation
    if (recommendation) {
      const contradicts = (recommendation.likely === 'distraction' && isWorkRelated) ||
                          (recommendation.likely === 'work' && !isWorkRelated);
      if (contradicts && !showReasonInput) {
        setShowReasonInput(true);
        setPendingResponse(isWorkRelated);
        return;
      }
    }
    finalizeResponse(isWorkRelated);
  };

  const finalizeResponse = (isWorkRelated: boolean) => {
    if (isBatchMode && currentItem.id) {
      const newResponses = { ...batchResponses, [currentItem.id]: { isWorkRelated, reason: reason || undefined } };
      setBatchResponses(newResponses);
      
      // Check if all visible items have been responded to
      if (Object.keys(newResponses).length >= visibleItems.length && onBatchRespond) {
        onBatchRespond(Object.entries(newResponses).map(([id, r]) => ({ id, ...r })));
      }
    } else {
      onRespond(isWorkRelated, reason || undefined);
    }
    setReason('');
    setShowReasonInput(false);
    setPendingResponse(null);
  };

  const submitWithReason = () => {
    if (pendingResponse !== null) {
      finalizeResponse(pendingResponse);
    }
  };

  return (
    <Dialog open={visibleItems.length > 0} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {severity === 'hard' ? (
              <Zap className="h-5 w-5 text-primary" />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground" />
            )}
            {severity === 'hard' ? 'Focus Check' : 'Quick Check'}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {isBatchMode && visibleItems.length > 1 && (
              <Badge variant="secondary" className="mb-2">
                {Object.keys(batchResponses).length + 1} of {visibleItems.length}
              </Badge>
            )}
            <span className="block">
              You used <strong>{currentItem.appName}</strong>
              {currentItem.currentActivityDescription && (
                <> while working on <span className="text-foreground font-medium">"{currentItem.currentActivityDescription}"</span></>
              )}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Duration & Recommendation */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold">
              {currentItem.durationSeconds ? formatDuration(currentItem.durationSeconds) : '...'}
            </span>
            <span className="text-muted-foreground">on {currentItem.appName}</span>
          </div>

          {recommendation && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              recommendation.likely === 'distraction' 
                ? 'bg-accent/50 border-accent' 
                : 'bg-secondary/50 border-secondary'
            }`}>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{recommendation.label}</span>
            </div>
          )}

          {severity === 'grouped' && (
            <p className="text-xs text-muted-foreground italic">
              Brief usage (2–5 min) — quick check
            </p>
          )}
        </div>

        {/* Reason input - shown when contradicting recommendation */}
        {showReasonInput && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              That's different from what we'd expect. Mind sharing why?
            </p>
            <Textarea
              placeholder={`Why was ${currentItem.appName} ${pendingResponse ? 'work-related' : 'a distraction'}?`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
            <Button onClick={submitWithReason} className="w-full" size="sm">
              Submit
            </Button>
          </div>
        )}

        {!showReasonInput && (
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleResponse(false)}
            >
              <X className="h-4 w-4" />
              Distraction
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => handleResponse(true)}
            >
              <Check className="h-4 w-4" />
              Work-related
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
