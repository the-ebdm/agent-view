## ADDED Requirements

### Requirement: Agent Configuration Persistence

The system SHALL persist saved agent configurations to SQLite database instead of browser localStorage.

#### Scenario: Configuration saved
- **WHEN** a user saves an agent configuration via `AgentConfigStorage.saveConfig()`
- **THEN** the configuration MUST be inserted into the `agent_configs` table with id, name, prompt, directory, tool_preset, custom_tools (if applicable), and timestamps

#### Scenario: Configuration retrieved
- **WHEN** `AgentConfigStorage.getConfigs()` is called
- **THEN** all saved configurations MUST be retrieved from the database
- **AND** results MUST be ordered by last_used DESC, then created_at DESC

#### Scenario: Configuration deleted
- **WHEN** `AgentConfigStorage.deleteConfig(id)` is called
- **THEN** the configuration record MUST be deleted from the database

#### Scenario: Duplicate configuration prevented
- **WHEN** a configuration is saved with a name and directory that already exists
- **THEN** the operation MUST fail with a unique constraint violation error

### Requirement: Recent Configurations

The system SHALL track recently used agent configurations for quick access.

#### Scenario: Configuration used
- **WHEN** an agent is spawned using a saved configuration
- **THEN** the configuration's last_used timestamp MUST be updated in the database

#### Scenario: Recent configurations retrieved
- **WHEN** `AgentConfigStorage.getRecent()` is called
- **THEN** the 10 most recently used configurations MUST be returned
- **AND** results MUST be ordered by last_used DESC

#### Scenario: Recent configurations limited
- **WHEN** retrieving recent configurations
- **THEN** a maximum of 10 results MUST be returned

### Requirement: Configuration Migration from localStorage

The system SHALL automatically migrate existing configurations from browser localStorage to database on first startup.

#### Scenario: localStorage configurations exist
- **WHEN** the server starts for the first time
- **AND** configurations exist in localStorage (detected via API call)
- **THEN** the system MUST provide a migration endpoint `/api/configs/migrate`

#### Scenario: Migration executed
- **WHEN** the migration endpoint is called with localStorage data
- **THEN** all configurations MUST be inserted into the database
- **AND** duplicate names MUST be handled by appending a suffix (e.g., "Config Name (2)")
- **AND** the operation MUST be atomic (transaction)

#### Scenario: Migration idempotent
- **WHEN** migration is executed multiple times
- **THEN** duplicate configurations MUST NOT be created (check by name+directory)

### Requirement: Database Schema - Agent Configs Table

The system SHALL maintain an `agent_configs` table with the following schema:

```sql
CREATE TABLE agent_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  directory TEXT NOT NULL,
  tool_preset TEXT NOT NULL CHECK(tool_preset IN ('read-only', 'standard', 'full-access', 'custom')),
  custom_tools TEXT,
  created_at INTEGER NOT NULL,
  last_used INTEGER,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT,
  UNIQUE(name, directory)
);
```

#### Scenario: Configs table indexes
- **WHEN** the agent_configs table is created
- **THEN** indexes MUST be created on last_used and is_favorite columns for query performance

### Requirement: Configs Repository

The system SHALL provide a `ConfigsRepository` class with type-safe data access methods.

#### Scenario: Create config record
- **WHEN** `ConfigsRepository.create(config)` is called
- **THEN** the configuration MUST be inserted into the database
- **AND** a unique constraint violation MUST be thrown if name+directory already exists

#### Scenario: Find config by ID
- **WHEN** `ConfigsRepository.findById(id)` is called
- **THEN** the configuration record MUST be returned if found, otherwise undefined

#### Scenario: Find all configs
- **WHEN** `ConfigsRepository.findAll()` is called
- **THEN** all saved configurations MUST be returned
- **AND** results MUST be ordered by is_favorite DESC, last_used DESC, created_at DESC

#### Scenario: Find recent configs
- **WHEN** `ConfigsRepository.findRecent(limit)` is called
- **THEN** the most recently used configurations MUST be returned
- **AND** results MUST be limited to the specified count (default: 10)

#### Scenario: Update config last_used
- **WHEN** `ConfigsRepository.updateLastUsed(id)` is called
- **THEN** the last_used timestamp MUST be set to current time

#### Scenario: Toggle config favorite
- **WHEN** `ConfigsRepository.toggleFavorite(id)` is called
- **THEN** the is_favorite field MUST be toggled (0 → 1 or 1 → 0)

#### Scenario: Delete config
- **WHEN** `ConfigsRepository.delete(id)` is called
- **THEN** the configuration record MUST be deleted from the database

### Requirement: Cross-Device Configuration Sync

The system SHALL enable cross-device access to saved configurations via shared database.

#### Scenario: Configuration saved on desktop
- **WHEN** a configuration is saved on the desktop browser
- **THEN** the configuration MUST be immediately available via API on mobile device (via Tailscale)

#### Scenario: Configuration used on mobile
- **WHEN** a configuration is spawned from mobile device
- **THEN** the last_used timestamp MUST be updated in the shared database
- **AND** the configuration MUST appear in recent list on all devices
