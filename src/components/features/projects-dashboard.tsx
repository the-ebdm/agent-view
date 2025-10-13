'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types/project';

export function ProjectsDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-500 dark:text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={fetchProjects}>Retry</Button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-6xl mb-4">📁</div>
        <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
          Projects are automatically discovered when you spawn your first agent.
          <br />
          Start by spawning an agent in a directory to create your first project.
        </p>
      </div>
    );
  }

  // Group projects by favorites
  const favoriteProjects = projects.filter(p => p.isFavorite);
  const regularProjects = projects.filter(p => !p.isFavorite);

  return (
    <div className="space-y-8">
      {/* Favorites Section */}
      {favoriteProjects.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>⭐</span>
            <span>Favorites</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Projects Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📁</span>
          <span>All Projects</span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({projects.length})
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regularProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => handleProjectClick(project.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const lastUsedText = project.lastUsed
    ? new Date(project.lastUsed).toLocaleDateString()
    : 'Never';

  return (
    <button
      onClick={onClick}
      className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-200 text-left"
    >
      {/* Favorite Badge */}
      {project.isFavorite && (
        <div className="absolute top-4 right-4">
          <span className="text-xl">⭐</span>
        </div>
      )}

      {/* Project Icon & Name */}
      <div className="mb-3">
        <div className="text-3xl mb-2">
          {project.openspecPath ? '📋' : '📁'}
        </div>
        <h3 className="text-lg font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {project.name}
        </h3>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span>🤖</span>
          <span>{project.agentCount}</span>
        </div>
        {project.worktreeCount > 0 && (
          <div className="flex items-center gap-1">
            <span>🌳</span>
            <span>{project.worktreeCount}</span>
          </div>
        )}
        {project.activeAgentCount > 0 && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <span>●</span>
            <span>{project.activeAgentCount} active</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {project.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              +{project.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Last Used */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Last used: {lastUsedText}
        </p>
      </div>

      {/* Hover Arrow */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-blue-500">→</span>
      </div>
    </button>
  );
}
