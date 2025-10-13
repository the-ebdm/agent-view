/**
 * OpenSpec Prompt Builder
 * Builds enriched prompts for OpenSpec agent spawning with full context
 */

export interface OpenSpecChangeContext {
  changeId: string;
  name: string;
  status?: string;
  validationStatus?: 'pending' | 'validating' | 'valid' | 'invalid';
  validationErrors?: Array<{ message: string; severity: string }>;
  tasksCompleted?: number;
  tasksTotal?: number;
  proposalContent?: string;
  designContent?: string;
  tasksContent?: string;
}

/**
 * Build enriched prompt for applying an OpenSpec change
 */
export function buildApplyChangePrompt(
  context: OpenSpecChangeContext,
  projectDirectory?: string
): string {
  const {
    changeId,
    name,
    status,
    validationStatus,
    validationErrors,
    tasksCompleted,
    tasksTotal,
    proposalContent,
    designContent,
    tasksContent,
  } = context;

  let prompt = `Use /openspec:apply to implement the approved proposal: ${changeId}

**Change: ${name}**

`;

  // Add status information
  if (status) {
    prompt += `**Current Status:** ${status}\n`;
  }

  if (validationStatus) {
    prompt += `**Validation Status:** ${validationStatus}\n`;
    if (validationStatus === 'invalid' && validationErrors && validationErrors.length > 0) {
      prompt += `\n**⚠️ Validation Errors:**\n`;
      validationErrors.forEach(error => {
        prompt += `- [${error.severity}] ${error.message}\n`;
      });
      prompt += '\nPlease address these validation errors before proceeding.\n';
    }
  }

  // Add task progress
  if (typeof tasksCompleted === 'number' && typeof tasksTotal === 'number') {
    const percentage = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
    prompt += `\n**Progress:** ${tasksCompleted}/${tasksTotal} tasks completed (${percentage}%)\n`;

    if (tasksCompleted > 0 && tasksCompleted < tasksTotal) {
      prompt += `\n⚠️ **Note:** This change is partially implemented. Review completed tasks before continuing.\n`;
    }
  }

  prompt += `\n---

## Implementation Plan

The agent will:
1. Read the approved proposal specification from openspec/changes/${changeId}/
2. Review the design document (design.md) for implementation details
3. Follow the task checklist (tasks.md) systematically
4. Implement changes according to the documented plan
5. Run tests and validation after each major step
6. Update task completion status as you progress
7. Keep the spec synced with actual implementation

`;

  // Add directory context
  if (projectDirectory) {
    prompt += `**Working Directory:** ${projectDirectory}\n`;
  }

  // Add content previews if available
  if (proposalContent) {
    prompt += `\n## Proposal Summary\n\n`;
    // Include first few lines of proposal for context
    const lines = proposalContent.split('\n').slice(0, 15);
    prompt += lines.join('\n');
    if (proposalContent.split('\n').length > 15) {
      prompt += '\n\n[...more content in full proposal file...]';
    }
    prompt += '\n';
  }

  if (designContent) {
    prompt += `\n## Design Overview\n\n`;
    const lines = designContent.split('\n').slice(0, 15);
    prompt += lines.join('\n');
    if (designContent.split('\n').length > 15) {
      prompt += '\n\n[...more content in full design file...]';
    }
    prompt += '\n';
  }

  if (tasksContent) {
    prompt += `\n## Task Checklist\n\n`;
    // Include all tasks for visibility
    prompt += tasksContent;
    prompt += '\n';
  }

  prompt += `\n---

**Important Guidelines:**
- Work through tasks systematically in order
- Mark tasks as complete using the checkbox format: [x]
- Run tests after implementing each feature/component
- If you encounter blockers or need clarification, document them clearly
- Update the proposal status when implementation is complete
- This ensures implementation matches the approved design

Ready to begin implementation!
`;

  return prompt;
}

/**
 * Build prompt for creating a new OpenSpec proposal
 */
export function buildProposalPrompt(
  description: string,
  projectDirectory?: string
): string {
  let prompt = `Use /openspec:proposal to create a new change proposal.

**Change Description:**
${description}

---

## Proposal Creation Process

The agent will guide you through creating a structured OpenSpec change proposal:

1. **Generate Proposal ID**
   - Create a kebab-case ID from the description (e.g., "add-new-feature")
   - Ensure the ID is unique in the openspec/changes/ directory

2. **Create Proposal Structure**
   - Create openspec/changes/[id]/ directory
   - Generate proposal.md with:
     - Problem statement
     - Proposed solution
     - Benefits and rationale
   - Generate design.md with:
     - Technical approach
     - Architecture changes
     - API/interface changes
     - Migration considerations
   - Generate tasks.md with:
     - Numbered checklist of implementation tasks
     - Clear, actionable items

3. **Validate Proposal**
   - Run openspec validate [id] to check schema compliance
   - Fix any validation errors

4. **Prepare for Review**
   - Display summary of created files
   - Suggest next steps (review, approval)

`;

  if (projectDirectory) {
    prompt += `**Working Directory:** ${projectDirectory}\n\n`;
  }

  prompt += `**Guidelines:**
- Keep the proposal focused and clear
- Include concrete examples where helpful
- Break down complex changes into reviewable chunks
- Document assumptions and dependencies
- Consider backwards compatibility

This ensures changes are properly documented and trackable from inception to completion.
`;

  return prompt;
}

/**
 * Build prompt for archiving a completed change
 */
export function buildArchivePrompt(
  changeId: string,
  projectDirectory?: string,
  skipSpecs: boolean = false,
  autoYes: boolean = true
): string {
  let flags = '';
  if (skipSpecs) flags += ' --skip-specs';
  if (autoYes) flags += ' --yes';

  let prompt = `Use /openspec:archive${flags} to archive the completed change: ${changeId}

---

## Archival Process

The agent will systematically archive the completed change:

1. **Pre-Archive Verification**
   - Confirm the change exists in openspec/changes/${changeId}/
   - Verify all tasks are marked as completed in tasks.md
   - Check that implementation matches the design specification
   - Ensure no open issues or blockers remain

2. **Archive Change Files**
   - Move openspec/changes/${changeId}/ → openspec/archive/${changeId}/
   - Preserve all proposal, design, and task documentation
   - Maintain metadata and validation status

3. **Update Specifications** ${skipSpecs ? '(SKIPPED via --skip-specs)' : ''}${skipSpecs ? '' : `
   - Review related spec files in openspec/specs/
   - Update specs to reflect implemented changes
   - Add references to archived change for traceability
   - Ensure specs are current with codebase`}

4. **Confirmation** ${autoYes ? '(AUTO-CONFIRMED via --yes)' : ''}${autoYes ? '' : `
   - Display summary of changes to be archived
   - Request user confirmation before proceeding
   - Allow cancellation if something looks wrong`}

5. **Cleanup and Validation**
   - Remove empty directories
   - Update any change indexes or manifests
   - Run validation to ensure archive integrity
   - Display archival summary

`;

  if (projectDirectory) {
    prompt += `**Working Directory:** ${projectDirectory}\n\n`;
  }

  prompt += `**Post-Archive:**
- The change documentation remains accessible in the archive
- Specs are updated to reflect the current system state
- Your active changes directory stays clean and organized

This keeps your OpenSpec workspace organized while preserving history.
`;

  return prompt;
}
