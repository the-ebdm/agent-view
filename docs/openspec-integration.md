# OpenSpec Integration Design

This document outlines how Agent View will integrate OpenSpec to provide structured spec views and guardrails for AI agents.

## Overview

Agent View will provide a UI-based OpenSpec experience that helps developers and agents:
1. **Browse specifications** - View capabilities, requirements, and scenarios in a structured format
2. **Manage change proposals** - Create, review, and track spec changes
3. **Validate work** - Ensure agents follow specs and changes are valid before implementation
4. **Guide agents** - Provide context to agents so they reference correct specs

## Architecture

### Components

```
src/
├── app/
│   ├── openspec/              # OpenSpec UI routes
│   │   ├── page.tsx           # Spec browser landing page
│   │   ├── specs/
│   │   │   └── [id]/page.tsx  # Individual spec viewer
│   │   ├── changes/
│   │   │   ├── page.tsx       # Active changes list
│   │   │   └── [id]/page.tsx  # Change proposal viewer
│   │   └── validate/
│   │       └── page.tsx       # Validation dashboard
│   └── api/
│       └── openspec/          # OpenSpec API routes
│           ├── list/route.ts
│           ├── show/route.ts
│           ├── validate/route.ts
│           └── diff/route.ts
├── components/
│   └── openspec/
│       ├── spec-browser.tsx       # Spec navigation component
│       ├── requirement-card.tsx   # Displays a requirement
│       ├── scenario-viewer.tsx    # Displays scenarios
│       ├── change-proposal.tsx    # Change proposal UI
│       ├── validation-status.tsx  # Validation results
│       └── spec-search.tsx        # Search specs/changes
└── lib/
    └── openspec/
        ├── client.ts              # OpenSpec CLI wrapper
        ├── parser.ts              # Parse spec markdown
        ├── validator.ts           # Validation logic
        └── types.ts               # TypeScript types
```

### Data Flow

```
User/Agent → UI Component → API Route → OpenSpec CLI → Filesystem
                                ↓
                        Format Response → UI
```

## Features

### 1. Spec Browser

**Route**: `/openspec/specs`

**Features**:
- List all capabilities with metadata (name, description, requirement count)
- Search/filter capabilities by name or content
- Navigate to individual spec pages
- Show spec status (current vs. pending changes)

**UI Components**:
- `SpecBrowser` - Main navigation component
- `SpecCard` - Individual capability card with summary
- `SpecSearch` - Full-text search across specs

**API Endpoint**: `GET /api/openspec/list?type=specs`

### 2. Spec Viewer

**Route**: `/openspec/specs/[capability-id]`

**Features**:
- Display full spec with requirements and scenarios
- Show pending changes (deltas) inline with current spec
- Link to related changes
- Export spec as markdown

**UI Components**:
- `SpecViewer` - Main spec display
- `RequirementCard` - Individual requirement with scenarios
- `ScenarioViewer` - Scenario display with WHEN/THEN formatting
- `DeltaBadge` - Indicate ADDED/MODIFIED/REMOVED status

**API Endpoint**: `GET /api/openspec/show?type=spec&id=[capability-id]`

### 3. Change Proposal Browser

**Route**: `/openspec/changes`

**Features**:
- List active change proposals
- Show proposal status (draft, in review, approved, in progress)
- Filter by status or affected capabilities
- Quick actions (validate, approve, archive)

**UI Components**:
- `ChangeBrowser` - List of active changes
- `ChangeCard` - Individual change summary
- `ChangeStatusBadge` - Visual status indicator

**API Endpoint**: `GET /api/openspec/list?type=changes`

### 4. Change Proposal Viewer

**Route**: `/openspec/changes/[change-id]`

**Features**:
- Display proposal (why, what, impact)
- Show tasks.md checklist with completion status
- Display design.md if present
- Show spec deltas for all affected capabilities
- Run validation and show results
- Approve/reject workflow

**UI Components**:
- `ChangeProposalViewer` - Main change display
- `ProposalMetadata` - Why/what/impact summary
- `TaskChecklist` - Interactive task list
- `SpecDelta` - Show ADDED/MODIFIED/REMOVED requirements
- `ValidationResults` - Display validation errors/warnings

**API Endpoints**:
- `GET /api/openspec/show?type=change&id=[change-id]`
- `POST /api/openspec/validate?id=[change-id]`
- `GET /api/openspec/diff?change=[change-id]`

### 5. Validation Dashboard

**Route**: `/openspec/validate`

**Features**:
- Run validation on all changes or specific change
- Display validation results (errors, warnings)
- Link to problematic files/lines
- Suggest fixes for common issues

**UI Components**:
- `ValidationDashboard` - Main validation interface
- `ValidationResultCard` - Individual validation result
- `ValidationError` - Display error with context
- `ValidationFix` - Suggest fix for error

**API Endpoint**: `POST /api/openspec/validate`

## Agent Guardrails

### How Agents Will Use Specs

1. **Before implementation**: Agent reads relevant specs to understand requirements
2. **During implementation**: Agent references scenarios to ensure correct behavior
3. **After implementation**: Agent validates against specs before marking complete

### Guardrail Mechanisms

#### 1. Pre-Implementation Check
```typescript
// When agent starts a task, check for relevant specs
const relevantSpecs = await findRelevantSpecs(taskDescription);
if (relevantSpecs.length > 0) {
  // Show agent the specs before proceeding
  await agentContext.addSpecs(relevantSpecs);
}
```

#### 2. Change Proposal Enforcement
```typescript
// When agent wants to make breaking changes
if (isBreakingChange(taskDescription)) {
  // Require change proposal
  throw new Error("Breaking changes require a change proposal. Use /openspec:proposal");
}
```

#### 3. Validation Gate
```typescript
// Before marking task complete
const validationResults = await validateChanges(changeId);
if (validationResults.errors.length > 0) {
  // Show errors and prevent completion
  return { status: "blocked", errors: validationResults.errors };
}
```

#### 4. Spec Reference Injection
```typescript
// Automatically inject spec context into agent prompts
const agentPrompt = `
Task: ${userTask}

Relevant Specifications:
${relevantSpecs.map(spec => spec.content).join('\n\n')}

Requirements:
- Follow the requirements and scenarios in the specs above
- If the task conflicts with specs, ask for clarification
- If this requires a spec change, create a proposal first
`;
```

## Implementation Plan

### Phase 1: CLI Integration
- [ ] Wrap OpenSpec CLI commands in TypeScript API
- [ ] Parse CLI output (JSON and markdown)
- [ ] Create TypeScript types for specs/changes
- [ ] Build basic API routes

### Phase 2: Read-Only UI
- [ ] Implement spec browser
- [ ] Implement spec viewer with requirement/scenario display
- [ ] Implement change proposal browser
- [ ] Implement change proposal viewer

### Phase 3: Validation
- [ ] Build validation dashboard
- [ ] Show validation results inline in change viewer
- [ ] Add "Validate All" functionality
- [ ] Display validation errors with context

### Phase 4: Agent Integration
- [ ] Add spec context to agent prompts
- [ ] Implement pre-implementation spec check
- [ ] Add change proposal enforcement
- [ ] Build validation gate for task completion

### Phase 5: Interactive Features (Future)
- [ ] Create change proposals from UI
- [ ] Edit proposals in browser
- [ ] Approve/reject workflow
- [ ] Archive changes from UI
- [ ] In-browser spec editor

## Technical Considerations

### OpenSpec CLI Wrapper

```typescript
// lib/openspec/client.ts
export class OpenSpecClient {
  async list(options: { type?: 'specs' | 'changes'; json?: boolean }) {
    const args = ['list'];
    if (options.type === 'specs') args.push('--specs');
    if (options.json) args.push('--json');

    const result = await execCommand('openspec', args);
    return options.json ? JSON.parse(result) : result;
  }

  async show(id: string, options: { type?: 'spec' | 'change'; json?: boolean }) {
    const args = ['show', id];
    if (options.type) args.push('--type', options.type);
    if (options.json) args.push('--json');

    const result = await execCommand('openspec', args);
    return options.json ? JSON.parse(result) : result;
  }

  async validate(id?: string, options: { strict?: boolean; json?: boolean }) {
    const args = ['validate'];
    if (id) args.push(id);
    if (options.strict) args.push('--strict');
    if (options.json) args.push('--json');

    const result = await execCommand('openspec', args);
    return options.json ? JSON.parse(result) : result;
  }

  async diff(changeId: string) {
    return execCommand('openspec', ['diff', changeId]);
  }
}
```

### Spec Parser

```typescript
// lib/openspec/parser.ts
export interface Requirement {
  header: string;
  content: string;
  scenarios: Scenario[];
}

export interface Scenario {
  name: string;
  steps: { type: 'WHEN' | 'THEN' | 'AND'; text: string }[];
}

export function parseSpec(markdown: string): {
  requirements: Requirement[];
} {
  // Parse markdown into structured data
  // Extract requirements and scenarios
}
```

### Type Definitions

```typescript
// lib/openspec/types.ts
export interface Spec {
  id: string;
  name: string;
  path: string;
  requirements: Requirement[];
}

export interface Change {
  id: string;
  name: string;
  proposal: {
    why: string;
    what: string[];
    impact: string[];
  };
  tasks: Task[];
  design?: string;
  deltas: SpecDelta[];
}

export interface SpecDelta {
  capability: string;
  added: Requirement[];
  modified: Requirement[];
  removed: Requirement[];
  renamed: Array<{ from: string; to: string }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

## User Workflows

### Developer: Browse Specs
1. Navigate to `/openspec/specs`
2. See list of all capabilities
3. Click on a capability to view details
4. Read requirements and scenarios

### Developer: Create Change Proposal
1. Navigate to `/openspec/changes`
2. Click "New Proposal" (future feature)
3. Fill out proposal form (or use CLI)
4. Add spec deltas
5. Validate proposal
6. Submit for review

### Agent: Implement Feature
1. Receive task from user
2. Check if relevant specs exist
3. Read spec requirements
4. Reference scenarios during implementation
5. Validate against specs before completion
6. Mark task as complete only if validation passes

### Developer: Review Change
1. Navigate to `/openspec/changes/[change-id]`
2. Review proposal (why, what, impact)
3. Check spec deltas
4. Review validation results
5. Approve or request changes

## Security & Permissions

- **Read access**: All users can browse specs and changes
- **Write access**: Only approved agents can create proposals (future)
- **Validation**: Anyone can run validation (read-only operation)
- **Archive**: Require explicit user approval before archiving changes

## Performance Considerations

- **Caching**: Cache CLI output for frequently accessed specs
- **Lazy loading**: Load spec content on demand, not all at once
- **Incremental parsing**: Parse only visible requirements/scenarios
- **Background validation**: Run validation in background, show cached results

## Future Enhancements

- **Visual diff**: Show before/after for modified requirements
- **Spec versioning**: Track spec changes over time
- **Dependency graph**: Show relationships between capabilities
- **Impact analysis**: Predict impact of proposed changes
- **AI-assisted spec writing**: Generate specs from implementation
- **Collaborative editing**: Real-time spec editing with multiple users
- **Spec templates**: Pre-defined templates for common capabilities
