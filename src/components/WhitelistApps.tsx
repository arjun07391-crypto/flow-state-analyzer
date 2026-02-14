import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Search, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppEntry {
  id: string;
  packageName: string;
  appName: string;
  category: string;
  isWorkApp: boolean;
  isWhitelisted: boolean;
}

export const WhitelistApps: React.FC = () => {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [search, setSearch] = useState('');
  const [newAppName, setNewAppName] = useState('');

  const loadApps = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_categories')
      .select('*')
      .order('app_name');

    if (!error && data) {
      setApps(data.map(d => ({
        id: d.id,
        packageName: d.package_name,
        appName: d.app_name,
        category: d.category,
        isWorkApp: d.is_work_app ?? false,
        isWhitelisted: (d as any).is_whitelisted ?? false,
      })));
    }
  }, []);

  useEffect(() => { loadApps(); }, [loadApps]);

  const toggleWhitelist = async (id: string, whitelisted: boolean) => {
    await supabase
      .from('app_categories')
      .update({ is_whitelisted: whitelisted } as any)
      .eq('id', id);
    
    setApps(prev => prev.map(a => a.id === id ? { ...a, isWhitelisted: whitelisted } : a));
    toast.success(whitelisted ? 'App whitelisted — no more prompts' : 'App removed from whitelist');
  };

  const toggleWorkApp = async (id: string, isWork: boolean) => {
    await supabase
      .from('app_categories')
      .update({ is_work_app: isWork })
      .eq('id', id);
    
    setApps(prev => prev.map(a => a.id === id ? { ...a, isWorkApp: isWork } : a));
  };

  const addApp = async () => {
    if (!newAppName.trim()) return;
    const { error } = await supabase
      .from('app_categories')
      .insert({
        app_name: newAppName.trim(),
        package_name: newAppName.trim().toLowerCase().replace(/\s+/g, '.'),
        category: 'other',
        is_work_app: false,
        is_whitelisted: false,
      } as any);

    if (!error) {
      setNewAppName('');
      loadApps();
      toast.success('App added');
    }
  };

  const filtered = apps.filter(a =>
    a.appName.toLowerCase().includes(search.toLowerCase())
  );

  const whitelisted = filtered.filter(a => a.isWhitelisted);
  const others = filtered.filter(a => !a.isWhitelisted);

  return (
    <div className="space-y-4">
      {/* Add App */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add App
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="App name (e.g., Instagram)"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addApp()}
            />
            <Button onClick={addApp} size="sm">Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search apps..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Whitelisted Apps */}
      {whitelisted.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Whitelisted
            </CardTitle>
            <CardDescription>These apps won't trigger focus prompts</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {whitelisted.map(app => (
                  <AppRow key={app.id} app={app} onToggleWhitelist={toggleWhitelist} onToggleWork={toggleWorkApp} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Other Apps */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Apps</CardTitle>
          <CardDescription>Toggle whitelist to skip prompts for specific apps</CardDescription>
        </CardHeader>
        <CardContent>
          {others.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {apps.length === 0 ? 'No apps configured yet. Add apps or they\'ll be detected automatically.' : 'No results'}
            </p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {others.map(app => (
                  <AppRow key={app.id} app={app} onToggleWhitelist={toggleWhitelist} onToggleWork={toggleWorkApp} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const AppRow: React.FC<{
  app: AppEntry;
  onToggleWhitelist: (id: string, val: boolean) => void;
  onToggleWork: (id: string, val: boolean) => void;
}> = ({ app, onToggleWhitelist, onToggleWork }) => (
  <div className="flex items-center justify-between p-3 rounded-lg border">
    <div className="space-y-1">
      <p className="font-medium text-sm">{app.appName}</p>
      <div className="flex gap-1">
        <Badge variant="secondary" className="text-xs">{app.category}</Badge>
        {app.isWorkApp && <Badge variant="outline" className="text-xs">Work</Badge>}
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor={`work-${app.id}`} className="text-xs">Work</Label>
        <Switch id={`work-${app.id}`} checked={app.isWorkApp} onCheckedChange={(v) => onToggleWork(app.id, v)} />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor={`wl-${app.id}`} className="text-xs">Skip</Label>
        <Switch id={`wl-${app.id}`} checked={app.isWhitelisted} onCheckedChange={(v) => onToggleWhitelist(app.id, v)} />
      </div>
    </div>
  </div>
);
