import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects, SheetType, TextFormat } from '@/contexts/ProjectContext';
import Logo from '@/components/Logo';
import SheetEditor from '@/components/SheetEditor';
import CollaboratorsList from '@/components/CollaboratorsList';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DrawingCanvas from '@/components/DrawingCanvas';
import { 
  ArrowLeft, 
  Save, 
  AlignLeft, 
  Grid3X3, 
  LayoutGrid,
  Check,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading, userProfile } = useAuth();
  const { projects, currentProject, setCurrentProject, updateProject, isLoading } = useProjects();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);

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

  // Handle format changes - save to project
  const handleFormatChange = useCallback((format: TextFormat) => {
    if (!currentProject) return;
    updateProject(currentProject.id, { textFormat: format });
  }, [currentProject, updateProject]);

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
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Logo size="sm" />
          </div>

          <div className="flex-1 max-w-md">
            <Input
              value={currentProject.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="text-center font-medium bg-transparent border-transparent hover:bg-secondary/50 focus:bg-secondary/50"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Save status */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

            <CollaboratorsList
              projectId={currentProject.id}
              collaborators={currentProject.collaborators}
              ownerId={currentProject.ownerId}
              ownerUsername={currentProject.ownerUsername}
            />

            <Button onClick={handleSave} size="sm" className="gap-2" disabled={isSaving || !hasUnsavedChanges}>
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 border-t border-border/50 flex items-center gap-4">
          <Select value={currentProject.sheetType} onValueChange={handleSheetTypeChange}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass">
              <SelectItem value="single-lined">
                <div className="flex items-center gap-2">
                  <AlignLeft className="h-3 w-3" />
                  Single Lined
                </div>
              </SelectItem>
              <SelectItem value="crosslined">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-3 w-3" />
                  Cross Lined
                </div>
              </SelectItem>
              <SelectItem value="custom-cells">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-3 w-3" />
                  Custom Cells
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="text-xs text-muted-foreground">
            {content.split('\n').length} lines · {content.length} characters
          </div>

          <div className="ml-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowDrawing(true)}
            >
              <Pencil className="h-4 w-4" />
              Draw
            </Button>
          </div>
        </div>
      </header>

      {/* Drawing Canvas */}
      {showDrawing && (
        <DrawingCanvas 
          onClose={() => setShowDrawing(false)} 
          initialData={currentProject.drawing?.dataUrl}
          onSave={handleDrawingSave}
        />
      )}

      {/* Editor */}
      <main className="flex-1 p-4">
        <SheetEditor
          content={content}
          onChange={handleContentChange}
          sheetType={currentProject.sheetType}
          projectId={currentProject.id}
          textFormat={currentProject.textFormat}
          onFormatChange={handleFormatChange}
        />
      </main>
    </div>
  );
};

export default Editor;