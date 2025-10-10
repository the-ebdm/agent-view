import { Badge } from '@/components/ui/badge';
import type { AgentStatus } from '@/types/agent';

interface AgentStatusBadgeProps {
  status: AgentStatus;
}

export function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
  const statusConfig: Record<AgentStatus, { variant: 'gray' | 'blue' | 'green' | 'red' | 'yellow'; label: string; pulse?: boolean }> = {
    idle: { variant: 'gray', label: 'Idle' },
    running: { variant: 'blue', label: 'Running', pulse: true },
    completed: { variant: 'green', label: 'Completed' },
    error: { variant: 'red', label: 'Error' },
    interrupted: { variant: 'yellow', label: 'Interrupted' },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} pulse={config.pulse}>
      {config.label}
    </Badge>
  );
}
