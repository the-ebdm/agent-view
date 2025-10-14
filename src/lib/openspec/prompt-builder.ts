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
    tasksTotal
  } = context;

  let prompt = `Implement the approved OpenSpec change: ${changeId}

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

**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to \`openspec/AGENTS.md\` (located inside the \`openspec/\` directory—run \`ls openspec\` or \`openspec update\` if you don't see it) if you need additional OpenSpec conventions or clarifications.

**Steps**
Track these steps as TODOs and complete them one by one.
1. Read \`changes/${changeId}/proposal.md\`, \`design.md\` (if present), and \`tasks.md\` to confirm scope and acceptance criteria.
2. Work through tasks sequentially, keeping edits minimal and focused on the requested change.
  2a. Important: Update tasks.md as you go to reflect the progress of the change. Do not move on to the next task until you have marked the current task complete.
3. Confirm completion before updating statuses—make sure every item in \`tasks.md\` is finished.
4. Update the checklist after all work is done so each task is marked \`- [x]\` and reflects reality.
5. Reference \`openspec list\` or \`openspec show <item>\` when additional context is required.

**Reference**
- Use \`openspec show ${changeId} --json --deltas-only\` if you need additional context from the proposal while implementing.

`;

  // Add directory context
  if (projectDirectory) {
    prompt += `**Working Directory:** ${projectDirectory}\n`;
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
 * Build prompt for reviewing a change proposal
 */
export function buildReviewChangePrompt(
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
    tasksTotal
  } = context;

  let prompt = `Review the OpenSpec change proposal: ${changeId}

**Change: ${name}**

`;

  if (projectDirectory) {
    prompt += `**Working Directory:** ${projectDirectory}\n`;
  }

  if (status) {
    prompt += `**Current Status:** ${status}\n`;
  }

  if (validationStatus) {
    prompt += `**Validation Status:** ${validationStatus}\n`;
  }

  if (validationErrors && validationErrors.length > 0) {
    prompt += `\n**⚠️ Validation Errors:**\n`;
    validationErrors.forEach(error => {
      prompt += `- [${error.severity}] ${error.message}\n`;
    });
    prompt += '\nPlease address these validation errors before proceeding.\n';
  }

  if (tasksCompleted && tasksTotal) {
    prompt += `\n**Progress:** ${tasksCompleted}/${tasksTotal} tasks completed (${Math.round((tasksCompleted / tasksTotal) * 100)}%)\n`;
    if (tasksCompleted > 0 && tasksCompleted < tasksTotal) {
      prompt += `\n⚠️ **Note:** This change is partially implemented.\n`;
    }
  }

  prompt += `

**Guardrails**
- Review the change proposal and provide feedback on the proposed changes.
- Identify any vague or ambiguous details and ask the necessary follow-up questions before editing files.
- Refer to \`openspec/AGENTS.md\` (located inside the \`openspec/\` directory—run \`ls openspec\` or \`openspec update\` if you don't see it) if you need additional OpenSpec conventions or clarifications.

**Steps**
1. Review \`openspec/project.md\`, run \`openspec list\` and \`openspec list --specs\`, and inspect related code or docs (e.g., via \`rg\`/\`ls\`) to ground the proposal in current behaviour; note any gaps that require clarification.
2. Review \`openspec/changes/<id>/proposal.md\`, \`design.md\` (if present), and \`tasks.md\` to confirm scope and acceptance criteria.
3. Validate with \`openspec validate <id> --strict\` and resolve every issue before sharing the proposal.
3a. If the validation fails, provide feedback on the proposed changes and ask the necessary follow-up questions.
4. Check for the existence of any files mentioned by the tasks.md and review the implementation.
5. Update tasks.md to reflect the progress of the change.
6. Provide feedback on the proposed changes and ask the necessary follow-up questions.
7. If all the tasks are complete, update the status to completed.

Your job is to review the proposal and provide feedback on the proposed changes not to complete the tasks.
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
  let prompt = `Create a new OpenSpec change proposal.

**Change Description:**
${description}

`;

  if (projectDirectory) {
    prompt += `**Working Directory:** ${projectDirectory}\n`;
  }

  prompt += `
---

**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to \`openspec/AGENTS.md\` (located inside the \`openspec/\` directory—run \`ls openspec\` or \`openspec update\` if you don't see it) if you need additional OpenSpec conventions or clarifications.
- Identify any vague or ambiguous details and ask the necessary follow-up questions before editing files.

**Steps**
1. Review \`openspec/project.md\`, run \`openspec list\` and \`openspec list --specs\`, and inspect related code or docs (e.g., via \`rg\`/\`ls\`) to ground the proposal in current behaviour; note any gaps that require clarification.
2. Choose a unique verb-led \`change-id\` and scaffold \`proposal.md\`, \`tasks.md\`, and \`design.md\` (when needed) under \`openspec/changes/<id>/\`.
3. Map the change into concrete capabilities or requirements, breaking multi-scope efforts into distinct spec deltas with clear relationships and sequencing.
4. Capture architectural reasoning in \`design.md\` when the solution spans multiple systems, introduces new patterns, or demands trade-off discussion before committing to specs.
5. Draft spec deltas in \`changes/<id>/specs/<capability>/spec.md\` (one folder per capability) using \`## ADDED|MODIFIED|REMOVED Requirements\` with at least one \`#### Scenario:\` per requirement and cross-reference related capabilities when relevant.
6. Draft \`tasks.md\` as an ordered list of small, verifiable work items that deliver user-visible progress, include validation (tests, tooling), and highlight dependencies or parallelizable work.
7. Validate with \`openspec validate <id> --strict\` and resolve every issue before sharing the proposal.

**Reference**
- Use \`openspec show <id> --json --deltas-only\` or \`openspec show <spec> --type spec\` to inspect details when validation fails.
- Search existing requirements with \`rg -n "Requirement:|Scenario:" openspec/specs\` before writing new ones.
- Explore the codebase with \`rg <keyword>\`, \`ls\`, or direct file reads so proposals align with current implementation realities.
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

  let prompt = `Archive the completed OpenSpec change: ${changeId}

**Command flags:** ${flags || '(none)'}

`;

  if (projectDirectory) {
    prompt += `**Working Directory:** ${projectDirectory}\n`;
  }

  prompt += `
---

**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to \`openspec/AGENTS.md\` (located inside the \`openspec/\` directory—run \`ls openspec\` or \`openspec update\` if you don't see it) if you need additional OpenSpec conventions or clarifications.

**Steps**
1. Identify the requested change ID (via the prompt or \`openspec list\`).
2. Run \`openspec archive ${changeId}${flags}\` to let the CLI move the change and apply spec updates without prompts (use \`--skip-specs\` only for tooling-only work).
3. Review the command output to confirm the target specs were updated and the change landed in \`changes/archive/\`.
4. Validate with \`openspec validate --strict\` and inspect with \`openspec show ${changeId}\` if anything looks off.

**Reference**
- Inspect refreshed specs with \`openspec list --specs\` and address any validation issues before handing off.
`;

  return prompt;
}
