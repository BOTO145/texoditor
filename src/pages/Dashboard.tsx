import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import Logo from '@/components/Logo';
import ProjectCard from '@/components/ProjectCard';
import CreateProjectModal from '@/components/CreateProjectModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  LogOut, 
  FolderOpen,
  Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';

const Dashboard: React.FC = () => {
  const { user, userProfile, logout, loading } = useAuth();
  const { projects, setCurrentProject, deleteProject } = useProjects();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const handleProjectClick = (project: typeof projects[0]) => {
    setCurrentProject(project);
    navigate(`/editor/${project.id}`);
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    toast.success('Project deleted');
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-medium">
                  {userProfile?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-muted-foreground hidden sm:inline">
                @{userProfile?.username || 'user'}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome section */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {userProfile?.username || 'User'}
          </h1>
          <p className="text-muted-foreground">
            Manage your projects and start collaborating
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Projects grid */}
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <FolderOpen className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {searchQuery 
                ? 'Try a different search term'
                : 'Create your first project to start organizing and collaborating on your work'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Create Your First Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, index) => (
              <div 
                key={project.id} 
                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                className="animate-slide-up"
              >
                <ProjectCard
                  project={project}
                  onClick={() => handleProjectClick(project)}
                  onDelete={() => handleDeleteProject(project.id)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateProjectModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
};

export default Dashboard;
