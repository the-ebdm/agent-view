import { Badge } from '@/components/ui/badge';
import type { AgentStatus } from '@/types/agent';

interface AgentStatusBadgeProps {
  status: AgentStatus;
}

export function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
  const statusConfig: Record<
    AgentStatus,
    { variant: 'gray' | 'blue' | 'green' | 'red' | 'yellow'; label: string; icon: string; pulse?: boolean }
  > = {
    idle: { variant: 'gray', label: 'Idle', icon: '⏸️' },
    running: { variant: 'blue', label: 'Running', icon: '⚡', pulse: true },
    completed: { variant: 'green', label: 'Completed', icon: '✓' },
    error: { variant: 'red', label: 'Error', icon: '✗' },
    interrupted: { variant: 'yellow', label: 'Interrupted', icon: '⏹️' },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} pulse={config.pulse}>
      <span className="flex items-center gap-1">
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    </Badge>
  );
}
