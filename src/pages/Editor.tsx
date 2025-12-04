import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects, SheetType } from '@/contexts/ProjectContext';
import Logo from '@/components/Logo';
import SheetEditor from '@/components/SheetEditor';
import CollaboratorsList from '@/components/CollaboratorsList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  LayoutGrid,
  Circle,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { projects, currentProject, setCurrentProject, updateProject, isLoading } = useProjects();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (id && projects.length > 0) {
      const project = projects.find(p => p.id === id);
      if (project) {
        setCurrentProject(project);
        setContent(project.content);
      }
    }
  }, [id, projects, setCurrentProject]);

  // Sync content when currentProject updates from real-time
  useEffect(() => {
    if (currentProject && currentProject.content !== content && !isSaving) {
      // Only update if content changed externally (real-time sync)
      const timeSinceLastSave = lastSaved ? Date.now() - lastSaved.getTime() : Infinity;
      if (timeSinceLastSave > 3000) {
        setContent(currentProject.content);
      }
    }
  }, [currentProject?.content]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isLoading && !currentProject && projects.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Project not found or you don't have access</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    await updateProject(currentProject.id, { content });
    setLastSaved(new Date());
    setIsSaving(false);
    toast.success('Project saved');
  };

  const handleSheetTypeChange = (value: SheetType) => {
    updateProject(currentProject.id, { sheetType: value });
  };

  const handleNameChange = (name: string) => {
    updateProject(currentProject.id, { name });
  };

  // Auto-save
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentProject && content !== currentProject.content) {
        updateProject(currentProject.id, { content });
        setLastSaved(new Date());
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [content]);

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
                <>
                  <Circle className="h-2 w-2 fill-warning text-warning animate-pulse" />
                  Saving...
                </>
              ) : lastSaved ? (
                <>
                  <Check className="h-3 w-3 text-success" />
                  Saved
                </>
              ) : null}
            </div>

            {/* Collaborators */}
            <CollaboratorsList
              projectId={currentProject.id}
              collaborators={currentProject.collaborators}
              ownerId={currentProject.ownerId}
              ownerUsername={currentProject.ownerUsername}
            />

            {/* Save button */}
            <Button onClick={handleSave} size="sm" className="gap-2" disabled={isSaving}>
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
        </div>
      </header>

      {/* Editor */}
      <main className="flex-1 p-4 animate-fade-in">
        <SheetEditor
          content={content}
          onChange={setContent}
          sheetType={currentProject.sheetType}
        />
      </main>
    </div>
  );
};

export default Editor;
