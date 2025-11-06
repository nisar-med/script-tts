/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Project, ProjectMetadata, DialogueLine, Character } from '@/types';

interface ProjectContextType {
  projects: ProjectMetadata[];
  currentProject: Project | null;
  loading: boolean;
  createProject: (name: string, description?: string) => Promise<Project>;
  loadProject: (id: string) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  saveCurrentProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'script_tts_projects';
const STORAGE_INDEX_KEY = 'script_tts_projects_index';

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Load projects index from localStorage on mount
  useEffect(() => {
    try {
      const indexData = localStorage.getItem(STORAGE_INDEX_KEY);
      if (indexData) {
        const parsedIndex = JSON.parse(indexData) as ProjectMetadata[];
        setProjects(parsedIndex);
      }
    } catch (error) {
      console.error('[ProjectContext] Failed to load projects index:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save projects index to localStorage whenever it changes
  const saveProjectsIndex = useCallback((updatedProjects: ProjectMetadata[]) => {
    try {
      localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(updatedProjects));
      setProjects(updatedProjects);
    } catch (error) {
      console.error('[ProjectContext] Failed to save projects index:', error);
      throw error;
    }
  }, []);

  const createProject = useCallback(async (name: string, description?: string): Promise<Project> => {
    const now = new Date().toISOString();
    const id = `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newProject: Project = {
      id,
      name,
      description,
      createdAt: now,
      updatedAt: now,
    };

    const metadata: ProjectMetadata = {
      id,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      hasScript: false,
      hasDialogues: false,
      hasAudio: false,
    };

    try {
      // Save full project data
      localStorage.setItem(`${STORAGE_KEY}_${id}`, JSON.stringify(newProject));

      // Update index
      const updatedProjects = [...projects, metadata];
      saveProjectsIndex(updatedProjects);

      setCurrentProject(newProject);

      return newProject;
    } catch (error) {
      console.error('[ProjectContext] Failed to create project:', error);
      throw error;
    }
  }, [projects, saveProjectsIndex]);

  const loadProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      const projectData = localStorage.getItem(`${STORAGE_KEY}_${id}`);
      if (!projectData) {
        console.warn('[ProjectContext] Project not found:', id);
        return null;
      }

      const project = JSON.parse(projectData) as Project;
      setCurrentProject(project);
      return project;
    } catch (error) {
      console.error('[ProjectContext] Failed to load project:', error);
      return null;
    }
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>): Promise<void> => {
    try {
      const projectData = localStorage.getItem(`${STORAGE_KEY}_${id}`);
      if (!projectData) {
        throw new Error('Project not found');
      }

      const project = JSON.parse(projectData) as Project;
      const updatedProject: Project = {
        ...project,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Save updated project
      localStorage.setItem(`${STORAGE_KEY}_${id}`, JSON.stringify(updatedProject));

      // Update index metadata
      const updatedProjects = projects.map(p => {
        if (p.id === id) {
          return {
            ...p,
            name: updatedProject.name,
            description: updatedProject.description,
            updatedAt: updatedProject.updatedAt,
            hasScript: !!updatedProject.script,
            hasDialogues: !!updatedProject.dialogues && updatedProject.dialogues.length > 0,
            hasAudio: !!updatedProject.audioUrl,
          };
        }
        return p;
      });
      saveProjectsIndex(updatedProjects);

      // Update current project if it's the one being edited
      if (currentProject?.id === id) {
        setCurrentProject(updatedProject);
      }
    } catch (error) {
      console.error('[ProjectContext] Failed to update project:', error);
      throw error;
    }
  }, [projects, currentProject, saveProjectsIndex]);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    try {
      // Remove project data
      localStorage.removeItem(`${STORAGE_KEY}_${id}`);

      // Update index
      const updatedProjects = projects.filter(p => p.id !== id);
      saveProjectsIndex(updatedProjects);

      // Clear current project if it's the one being deleted
      if (currentProject?.id === id) {
        setCurrentProject(null);
      }
    } catch (error) {
      console.error('[ProjectContext] Failed to delete project:', error);
      throw error;
    }
  }, [projects, currentProject, saveProjectsIndex]);

  const saveCurrentProject = useCallback(async (): Promise<void> => {
    if (!currentProject) {
      throw new Error('No current project to save');
    }
    await updateProject(currentProject.id, currentProject);
  }, [currentProject, updateProject]);

  const value: ProjectContextType = {
    projects,
    currentProject,
    loading,
    createProject,
    loadProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    saveCurrentProject,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
