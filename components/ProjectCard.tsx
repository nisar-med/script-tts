import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Music, MessageSquare, Trash2, FolderOpen } from 'lucide-react';
import type { ProjectMetadata } from '@/types';

interface ProjectCardProps {
  project: ProjectMetadata;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onDelete }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="line-clamp-2">{project.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {project.hasScript && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Script
            </Badge>
          )}
          {project.hasDialogues && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Dialogues
            </Badge>
          )}
          {project.hasAudio && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Music className="w-3 h-3" />
              Audio
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          <div>Created: {formatDate(project.createdAt)}</div>
          <div>Updated: {formatDate(project.updatedAt)}</div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button
          onClick={() => onOpen(project.id)}
          className="flex-1 flex items-center gap-2"
        >
          <FolderOpen className="w-4 h-4" />
          Open
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onDelete(project.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
