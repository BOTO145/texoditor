import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects, SheetType } from '@/contexts/ProjectContext';
import { useCall } from '@/contexts/CallContext';
import Logo from '@/components/Logo';
import RichTextEditor from '@/components/RichTextEditor';
import CollaboratorsList from '@/components/CollaboratorsList';
import ThemeToggle from '@/components/ThemeToggle';
import DrawingCanvas from '@/components/DrawingCanvas';
import LiveCursors from '@/components/LiveCursors';
import { CallBar } from '@/components/call';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Save, 
  AlignLeft, 
  Grid3X3, 
  Circle,
  FileText,
  Check,
  Pencil,
  Type,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading, userProfile } = useAuth();
  const { projects, currentProject, setCurrentProject, updateProject, isLoading } = useProjects();
  const { callState } = useCall();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mode, setMode] = useState<'write' | 'draw'>('write');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  const isInCall = callState.status === 'calling' || callState.status === 'connected';

  // Load project when ID changes
  useEffect(() => {
    if (id && projects.length > 0) {
      const project = projects.find(p => p.id === id);
      if (project) {
        setCurrentProject(project);
        setContent(project.content);
        setHasUnsavedChanges(false);
      }
    }
  }, [id, projects, setCurrentProject]);

  // Sync content from real-time updates (only if not currently editing)
  useEffect(() => {
    if (currentProject && !hasUnsavedChanges && !isSaving) {
      if (currentProject.content !== content) {
        setContent(currentProject.content);
      }
    }
  }, [currentProject?.content]);

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  // Handle drawing save
  const handleDrawingSave = useCallback((dataUrl: string) => {
    if (!currentProject || !userProfile) return;
    updateProject(currentProject.id, {
      drawing: {
        dataUrl,
        updatedAt: new Date(),
        updatedBy: userProfile.username,
      }
    });
  }, [currentProject, updateProject, userProfile]);

  // Loading states
  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Auth check
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Project not found
  if (!isLoading && projects.length > 0 && !currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Project not found or you don't have access</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Still loading project
  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProject(currentProject.id, { content });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast.success('Project saved');
    } catch {
      toast.error('Failed to save');
    }
    setIsSaving(false);
  };

  const handleSheetTypeChange = (value: SheetType) => {
    updateProject(currentProject.id, { sheetType: value });
  };

  const handleNameChange = (name: string) => {
    updateProject(currentProject.id, { name });
  };

  // Auto-save every 3 seconds if there are unsaved changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) return;

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateProject(currentProject.id, { content });
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      } catch {
        // Silent fail for auto-save
      }
      setIsSaving(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [content, hasUnsavedChanges, currentProject?.id]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Call Bar - shown when in a call */}
      {isInCall && (
        <div className="sticky top-0 z-[60] px-4 py-2 bg-background border-b border-border">
          <CallBar />
        </div>
      )}
      
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-50" style={{ top: isInCall ? '52px' : 0 }}>
        <div className="px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <div className="hidden sm:block">
              <Logo size="sm" />
            </div>
          </div>

          <div className="flex-1 max-w-[150px] sm:max-w-md">
            <Input
              value={currentProject.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="text-center text-sm sm:text-base font-medium bg-transparent border-transparent hover:bg-secondary/50 focus:bg-secondary/50 h-8 sm:h-10"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Save status - hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              {isSaving ? (
                <span className="animate-pulse">Saving...</span>
              ) : lastSaved ? (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  Saved
                </>
              ) : hasUnsavedChanges ? (
                <span className="text-yellow-500">Unsaved</span>
              ) : null}
            </div>

            <ThemeToggle />

            <div className="hidden sm:block">
              <CollaboratorsList
                projectId={currentProject.id}
                collaborators={currentProject.collaborators}
                ownerId={currentProject.ownerId}
                ownerUsername={currentProject.ownerUsername}
              />
            </div>

            <Button onClick={handleSave} size="sm" className="gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3" disabled={isSaving || !hasUnsavedChanges}>
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-2 sm:px-4 py-1.5 sm:py-2 border-t border-border/50 flex items-center gap-2 sm:gap-4 flex-wrap overflow-x-auto">
          {/* Mode Toggle */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-secondary/50 rounded-lg p-0.5 sm:p-1 shrink-0">
            <Button
              variant={mode === 'write' ? 'default' : 'ghost'}
              size="sm"
              className="gap-1 sm:gap-2 h-6 sm:h-7 px-2 sm:px-3 text-xs"
              onClick={() => setMode('write')}
            >
              <Type className="h-3 w-3" />
              <span className="hidden sm:inline">Write</span>
            </Button>
            <Button
              variant={mode === 'draw' ? 'default' : 'ghost'}
              size="sm"
              className="gap-1 sm:gap-2 h-6 sm:h-7 px-2 sm:px-3 text-xs"
              onClick={() => setMode('draw')}
            >
              <Pencil className="h-3 w-3" />
              <span className="hidden sm:inline">Draw</span>
            </Button>
          </div>

          <Select value={currentProject.sheetType} onValueChange={handleSheetTypeChange}>
            <SelectTrigger className="w-28 sm:w-40 h-7 sm:h-8 text-[10px] sm:text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass">
              <SelectItem value="single-lined" className="text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <AlignLeft className="h-3 w-3" />
                  <span className="hidden sm:inline">Single </span>Lined
                </div>
              </SelectItem>
              <SelectItem value="crosslined" className="text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-3 w-3" />
                  <span className="hidden sm:inline">Cross </span>Grid
                </div>
              </SelectItem>
              <SelectItem value="clear" className="text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Clear
                </div>
              </SelectItem>
              <SelectItem value="dot-pattern" className="text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3" />
                  Dots
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Line Numbers Toggle - hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Switch
              id="line-numbers"
              checked={showLineNumbers}
              onCheckedChange={setShowLineNumbers}
              className="scale-90 sm:scale-100"
            />
            <Label htmlFor="line-numbers" className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Lines
            </Label>
          </div>

          <div className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
            {content.length} chars
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 flex flex-col relative" ref={editorContainerRef}>
        {/* Live Cursors */}
        <LiveCursors projectId={currentProject.id} containerRef={editorContainerRef} />

        {mode === 'write' ? (
          <RichTextEditor
            content={content}
            onChange={handleContentChange}
            sheetType={currentProject.sheetType}
            drawingMode={false}
            drawingDataUrl={currentProject.drawing?.dataUrl}
            showLineNumbers={showLineNumbers}
          />
        ) : (
          <DrawingCanvas
            initialData={currentProject.drawing?.dataUrl}
            onSave={handleDrawingSave}
            className="flex-1"
          />
        )}
      </main>
    </div>
  );
};

export default Editor;
