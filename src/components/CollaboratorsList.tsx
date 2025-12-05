import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserPlus, X, Circle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CollaboratorsListProps {
  projectId: string;
  collaborators: string[];
  ownerId: string;
  ownerUsername: string;
}

const CollaboratorsList: React.FC<CollaboratorsListProps> = ({ 
  projectId, 
  collaborators, 
  ownerId,
  ownerUsername 
}) => {
  const [username, setUsername] = useState('');
  const [open, setOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { addCollaborator, removeCollaborator } = useProjects();
  const { userProfile } = useAuth();

  const isOwner = userProfile?.uid === ownerId;

  const handleAdd = async () => {
    if (!username.trim()) return;

    setIsAdding(true);
    const success = await addCollaborator(projectId, username.trim());
    setIsAdding(false);
    
    if (success) {
      setUsername('');
    }
  };

  const handleRemove = async (collabUsername: string) => {
    await removeCollaborator(projectId, collabUsername);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          <span>{collaborators.length + 1}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Collaborators
          </DialogTitle>
          <DialogDescription>Manage who can access and edit this project.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Add collaborator - only owner can add */}
          {isOwner && (
            <div className="flex gap-2">
              <Input
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isAdding && handleAdd()}
                disabled={isAdding}
              />
              <Button onClick={handleAdd} size="icon" disabled={isAdding || !username.trim()}>
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* Collaborators list */}
          <div className="space-y-2">
            {/* Owner */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {ownerUsername[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">{ownerUsername}</span>
                  <div className="flex items-center gap-1 text-xs text-primary">
                    Owner
                  </div>
                </div>
              </div>
            </div>

            {/* Collaborators */}
            {collaborators.map((collab) => (
              <div
                key={collab}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground">
                      {collab[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">{collab}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Circle className="h-2 w-2 fill-online text-online" />
                      Collaborator
                    </div>
                  </div>
                </div>
                {isOwner && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                    onClick={() => handleRemove(collab)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {collaborators.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No collaborators yet
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollaboratorsList;
