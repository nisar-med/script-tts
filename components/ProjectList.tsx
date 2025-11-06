import React, { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { ProjectCard } from '@/components/ProjectCard';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { LoadingSpinner } from '@/components/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

export const ProjectList: React.FC = () => {
  const { projects, loading, createProject, deleteProject, loadProject } = useProject();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreateProject = async (name: string, description?: string) => {
    try {
      setError(null);
      const newProject = await createProject(name, description);
      // Navigate to home with the new project loaded
      await loadProject(newProject.id);
      navigate('/');
    } catch (error) {
      console.error('Failed to create project:', error);
      setError('Failed to create project. Please try again.');
    }
  };

  const handleOpenProject = async (id: string) => {
    try {
      setError(null);
      await loadProject(id);
      navigate('/');
    } catch (error) {
      console.error('Failed to open project:', error);
      setError('Failed to open project. Please try again.');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      await deleteProject(id);
    } catch (error) {
      console.error('Failed to delete project:', error);
      setError('Failed to delete project. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner className="w-12 h-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong className="font-bold">Error: </strong>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Projects</h1>
          <p className="text-muted-foreground mt-2">
            Organize your scripts, dialogues, and audio files in projects
          </p>
        </div>
        <CreateProjectDialog onCreateProject={handleCreateProject} />
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">No projects yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first project to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onDelete={handleDeleteProject}
              />
            ))}
        </div>
      )}
    </div>
  );
};
