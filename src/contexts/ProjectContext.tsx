import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  arrayUnion,
  arrayRemove,
  Timestamp,
  or
} from 'firebase/firestore';
import { toast } from 'sonner';

export type SheetType = 'single-lined' | 'crosslined' | 'clear' | 'dot-pattern';

export interface TextFormat {
  fontSize: string;
  fontFamily: string;
  textColor: string;
  highlightColor: string;
  activeFormats: string[];
}

export interface DrawingData {
  dataUrl: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  sheetType: SheetType;
  content: string;
  textFormat?: TextFormat;
  drawing?: DrawingData;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  ownerUsername: string;
  collaborators: string[]; // usernames
  collaboratorIds: string[]; // uids for querying
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  createProject: (name: string, description: string, sheetType: SheetType) => Promise<string | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  addCollaborator: (projectId: string, username: string) => Promise<boolean>;
  removeCollaborator: (projectId: string, username: string) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to projects from Firestore
  useEffect(() => {
    if (!userProfile) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Query projects where user is owner OR collaborator
    const projectsRef = collection(db, 'projects');
    const q = query(
      projectsRef,
      or(
        where('ownerId', '==', userProfile.uid),
        where('collaboratorIds', 'array-contains', userProfile.uid)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList: Project[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        projectsList.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          sheetType: data.sheetType,
          content: data.content,
          textFormat: data.textFormat,
          drawing: data.drawing ? {
            dataUrl: data.drawing.dataUrl,
            updatedAt: data.drawing.updatedAt?.toDate() || new Date(),
            updatedBy: data.drawing.updatedBy,
          } : undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          ownerId: data.ownerId,
          ownerUsername: data.ownerUsername || '',
          collaborators: data.collaborators || [],
          collaboratorIds: data.collaboratorIds || [],
        });
      });
      setProjects(projectsList);
      setIsLoading(false);

      // Update current project if it changed
      if (currentProject) {
        const updated = projectsList.find(p => p.id === currentProject.id);
        if (updated) {
          setCurrentProject(updated);
        }
      }
    }, (error) => {
      console.error('Error fetching projects:', error);
      setIsLoading(false);
      toast.error('Failed to load projects');
    });

    return () => unsubscribe();
  }, [userProfile]);

  const createProject = async (name: string, description: string, sheetType: SheetType): Promise<string | null> => {
    if (!userProfile) return null;
    
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name,
        description,
        sheetType,
        content: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ownerId: userProfile.uid,
        ownerUsername: userProfile.username,
        collaborators: [],
        collaboratorIds: [],
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const projectRef = doc(db, 'projects', id);
      const { id: _, createdAt, ...updateData } = updates as any;
      
      await updateDoc(projectRef, {
        ...updateData,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to save project');
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));
      if (currentProject?.id === id) {
        setCurrentProject(null);
      }
      toast.success('Project deleted');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const addCollaborator = async (projectId: string, username: string): Promise<boolean> => {
    if (!userProfile) return false;

    try {
      // Find user by username
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.error(`User "${username}" not found`);
        return false;
      }

      const collaboratorData = snapshot.docs[0].data();
      const collaboratorUid = snapshot.docs[0].id;

      // Check if already a collaborator
      const project = projects.find(p => p.id === projectId);
      if (project?.collaborators.includes(username)) {
        toast.error('User is already a collaborator');
        return false;
      }

      // Check if trying to add self
      if (collaboratorUid === userProfile.uid) {
        toast.error("You can't add yourself as a collaborator");
        return false;
      }

      // Add collaborator
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        collaborators: arrayUnion(username),
        collaboratorIds: arrayUnion(collaboratorUid),
        updatedAt: Timestamp.now(),
      });

      toast.success(`${username} added as collaborator`);
      return true;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      toast.error('Failed to add collaborator');
      return false;
    }
  };

  const removeCollaborator = async (projectId: string, username: string) => {
    try {
      // Find user by username to get their uid
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const collaboratorUid = snapshot.docs[0].id;
        
        const projectRef = doc(db, 'projects', projectId);
        await updateDoc(projectRef, {
          collaborators: arrayRemove(username),
          collaboratorIds: arrayRemove(collaboratorUid),
          updatedAt: Timestamp.now(),
        });

        toast.success(`${username} removed from project`);
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      isLoading,
      createProject,
      updateProject,
      deleteProject,
      setCurrentProject,
      addCollaborator,
      removeCollaborator,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
