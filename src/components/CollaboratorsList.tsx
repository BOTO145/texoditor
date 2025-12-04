import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjects } from '@/contexts/ProjectContext';
import { Users, UserPlus, X, Circle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CollaboratorsListProps {
  projectId: string;
  collaborators: string[];
}

const CollaboratorsList: React.FC<CollaboratorsListProps> = ({ projectId, collaborators }) => {
  const [username, setUsername] = useState('');
  const [open, setOpen] = useState(false);
  const { addCollaborator } = useProjects();

  const handleAdd = () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    if (collaborators.includes(username)) {
      toast.error('User is already a collaborator');
      return;
    }

    addCollaborator(projectId, username);
    toast.success(`${username} added as collaborator`);
    setUsername('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          <span>{collaborators.length || 'Add'}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Collaborators
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Add collaborator */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} size="icon">
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Collaborators list */}
          <div className="space-y-2">
            {collaborators.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No collaborators yet. Add someone to start collaborating!
              </p>
            ) : (
              collaborators.map((collab) => (
                <div
                  key={collab}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {collab[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">{collab}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Circle className="h-2 w-2 fill-online text-online" />
                        Online
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollaboratorsList;
