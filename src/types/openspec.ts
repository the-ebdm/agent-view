/**
 * OpenSpec Integration Types
 * Defines type interfaces for OpenSpec entities, validation, and UI state
 */

/**
 * OpenSpec entity types
 */
export type OpenSpecEntityType = 'spec' | 'change' | 'archive';

/**
 * Change status derived from task completion
 */
export type ChangeStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Validation status for changes
 */
export type ValidationStatus = 'pending' | 'validating' | 'valid' | 'invalid';

/**
 * Base OpenSpec entity
 */
export interface OpenSpecEntity {
  id: string;
  type: OpenSpecEntityType;
  name: string;
  path: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Capability specification
 */
export interface CapabilitySpec extends OpenSpecEntity {
  type: 'spec';
  requirementCount: number;
  scenarioCount: number;
  content: string;
}

/**
 * Change proposal
 */
export interface ChangeProposal extends OpenSpecEntity {
  type: 'change';
  status: ChangeStatus;
  validationStatus: ValidationStatus;
  progressPercentage: number;
  taskCount: number;
  completedTaskCount: number;
  proposal?: string;
  design?: string;
  tasks?: string;
  deltas?: string[];
}

/**
 * Archived change
 */
export interface ArchivedChange extends OpenSpecEntity {
  type: 'archive';
  archivedAt: Date;
  proposal?: string;
  design?: string;
  tasks?: string;
}

/**
 * Task item from tasks.md
 */
export interface TaskItem {
  index: number;
  content: string;
  completed: boolean;
  section?: string;
}

/**
 * Validation error
 */
export interface ValidationError {
  file?: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  timestamp: Date;
}

/**
 * OpenSpec CLI command result
 */
export interface CLIResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * API response for listing entities
 */
export interface ListEntitiesResponse {
  specs: CapabilitySpec[];
  changes: ChangeProposal[];
  archives: ArchivedChange[];
}

/**
 * API request for creating a new change
 */
export interface CreateChangeRequest {
  id: string;
  description?: string;
}

/**
 * API request for updating content
 */
export interface UpdateContentRequest {
  content: string;
  file?: 'proposal' | 'design' | 'tasks';
}

/**
 * API request for executing slash command
 */
export interface SlashCommandRequest {
  command: string;
  args?: string;
}

/**
 * API response for slash command execution
 */
export interface SlashCommandResponse {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Search filter options
 */
export interface SearchFilter {
  query: string;
  type?: OpenSpecEntityType;
  status?: ChangeStatus;
}

/**
 * Sort options
 */
export type SortOption = 'name' | 'updated' | 'status';

/**
 * Dashboard state for OpenSpec section
 */
export interface OpenSpecDashboardState {
  entities: {
    specs: CapabilitySpec[];
    changes: ChangeProposal[];
    archives: ArchivedChange[];
  };
  loading: boolean;
  error?: string;
  selectedEntity?: OpenSpecEntity;
  searchFilter: SearchFilter;
  sortOption: SortOption;
}
