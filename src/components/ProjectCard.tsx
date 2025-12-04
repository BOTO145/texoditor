import React from 'react';
import { Project } from '@/contexts/ProjectContext';
import { FileText, Users, Clock, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete: () => void;
}

const sheetTypeLabels = {
  'single-lined': 'Single Lined',
  'crosslined': 'Cross Lined',
  'custom-cells': 'Custom Cells',
};

const sheetTypeColors = {
  'single-lined': 'bg-primary/20 text-primary',
  'crosslined': 'bg-warning/20 text-warning',
  'custom-cells': 'bg-success/20 text-success',
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onDelete }) => {
  return (
    <div 
      className="glass rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-glow-sm hover:border-primary/30 group animate-fade-in"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {project.description || 'No description'}
            </p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className={`px-2 py-1 rounded-md ${sheetTypeColors[project.sheetType]}`}>
          {sheetTypeLabels[project.sheetType]}
        </span>
        
        {project.collaborators.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{project.collaborators.length}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1 ml-auto">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
