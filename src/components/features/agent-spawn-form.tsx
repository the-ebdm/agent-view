'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface AgentSpawnFormProps {
  onSpawn: (prompt: string, directory: string) => Promise<void>;
  disabled?: boolean;
}

export function AgentSpawnForm({ onSpawn, disabled }: AgentSpawnFormProps) {
  const [prompt, setPrompt] = useState('');
  const [directory, setDirectory] = useState(process.cwd?.() || '/');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!prompt.trim()) {
      setError('Prompt is required');
      return;
    }

    if (!directory.trim()) {
      setError('Directory is required');
      return;
    }

    setLoading(true);
    try {
      await onSpawn(prompt, directory);
      setPrompt(''); // Clear prompt after successful spawn
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="directory" className="block text-sm font-medium mb-2">
            Working Directory
          </label>
          <Input
            id="directory"
            type="text"
            value={directory}
            onChange={(e) => setDirectory(e.target.value)}
            placeholder="/path/to/directory"
            disabled={disabled || loading}
          />
        </div>

        <div>
          <label htmlFor="prompt" className="block text-sm font-medium mb-2">
            Agent Prompt
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What would you like the agent to do?"
            rows={4}
            disabled={disabled || loading}
            error={error || undefined}
          />
        </div>

        <Button
          type="submit"
          loading={loading}
          disabled={disabled || loading}
          className="w-full"
        >
          {loading ? 'Spawning Agent...' : 'Spawn Agent'}
        </Button>
      </form>
    </Card>
  );
}
