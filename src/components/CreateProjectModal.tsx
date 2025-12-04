import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjects, SheetType } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { AlignLeft, Grid3X3, LayoutGrid, Check, Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sheetTypes: { type: SheetType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: 'single-lined',
    label: 'Single Lined',
    description: 'Traditional lined paper for notes',
    icon: <AlignLeft className="h-5 w-5" />,
  },
  {
    type: 'crosslined',
    label: 'Cross Lined',
    description: 'Grid with diagonal lines for diagrams',
    icon: <Grid3X3 className="h-5 w-5" />,
  },
  {
    type: 'custom-cells',
    label: 'Custom Cells',
    description: 'Customizable cell grid layout',
    icon: <LayoutGrid className="h-5 w-5" />,
  },
];

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ open, onOpenChange }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sheetType, setSheetType] = useState<SheetType>('single-lined');
  const [isCreating, setIsCreating] = useState(false);
  const { createProject } = useProjects();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsCreating(true);
    const projectId = await createProject(name, description, sheetType);
    setIsCreating(false);
    
    if (projectId) {
      toast.success('Project created successfully!');
      onOpenChange(false);
      setName('');
      setDescription('');
      setSheetType('single-lined');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Project Name</label>
            <Input
              placeholder="Enter project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description (optional)</label>
            <Input
              placeholder="Brief description of your project"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Sheet Type</label>
            <div className="grid gap-3">
              {sheetTypes.map((type) => (
                <button
                  key={type.type}
                  onClick={() => setSheetType(type.type)}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                    sheetType === type.type
                      ? 'border-primary bg-primary/10 shadow-glow-sm'
                      : 'border-border bg-secondary/30 hover:bg-secondary/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    sheetType === type.type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {type.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>
                  {sheetType === type.type && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="flex-1" disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isCreating ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectModal;
