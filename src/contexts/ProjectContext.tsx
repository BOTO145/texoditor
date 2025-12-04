import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export type SheetType = 'single-lined' | 'crosslined' | 'custom-cells';

export interface Project {
  id: string;
  name: string;
  description: string;
  sheetType: SheetType;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  collaborators: string[];
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  createProject: (name: string, description: string, sheetType: SheetType) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (project: Project | null) => void;
  addCollaborator: (projectId: string, username: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Load projects from localStorage on mount
  useEffect(() => {
    if (userProfile) {
      const stored = localStorage.getItem(`texoditor_projects_${userProfile.uid}`);
      if (stored) {
        setProjects(JSON.parse(stored));
      }
    }
  }, [userProfile]);

  // Save projects to localStorage
  useEffect(() => {
    if (userProfile && projects.length > 0) {
      localStorage.setItem(`texoditor_projects_${userProfile.uid}`, JSON.stringify(projects));
    }
  }, [projects, userProfile]);

  const createProject = (name: string, description: string, sheetType: SheetType) => {
    if (!userProfile) return;
    
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      sheetType,
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: userProfile.uid,
      collaborators: [],
    };
    
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => 
      prev.map(p => 
        p.id === id 
          ? { ...p, ...updates, updatedAt: new Date() } 
          : p
      )
    );
    
    if (currentProject?.id === id) {
      setCurrentProject(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);
    }
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  };

  const addCollaborator = (projectId: string, username: string) => {
    setProjects(prev =>
      prev.map(p =>
        p.id === projectId
          ? { ...p, collaborators: [...p.collaborators, username] }
          : p
      )
    );
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      createProject,
      updateProject,
      deleteProject,
      setCurrentProject,
      addCollaborator,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
