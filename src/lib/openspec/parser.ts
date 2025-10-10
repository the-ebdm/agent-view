/**
 * OpenSpec Markdown Parser
 * Parse OpenSpec markdown files for requirements, scenarios, tasks, and structure
 */

import type { TaskItem } from '@/types/openspec';

/**
 * Parse tasks.md for checklist items
 */
export function parseTasksMarkdown(content: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  const lines = content.split('\n');

  let currentSection = '';
  let taskIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track section headers (## Section Name)
    if (line.startsWith('##')) {
      currentSection = line.replace(/^##\s*/, '').trim();
      continue;
    }

    // Match task items: - [ ] or - [x] or - [X]
    const taskMatch = line.match(/^-\s*\[([ xX])\]\s*(.+)/);
    if (taskMatch) {
      const [, checkbox, taskContent] = taskMatch;
      const completed = checkbox.toLowerCase() === 'x';

      tasks.push({
        index: taskIndex++,
        content: taskContent.trim(),
        completed,
        section: currentSection || undefined,
      });
    }
  }

  return tasks;
}

/**
 * Update a task checkbox in tasks.md content
 */
export function updateTaskCheckbox(
  content: string,
  taskIndex: number,
  checked: boolean
): string {
  const lines = content.split('\n');
  let currentTaskIndex = 0;

  const updatedLines = lines.map((line) => {
    // Match task items: - [ ] or - [x]
    const taskMatch = line.match(/^(-\s*\[)([ xX])(\]\s*.+)/);
    if (taskMatch) {
      if (currentTaskIndex === taskIndex) {
        // Update this task's checkbox
        const newCheckbox = checked ? 'x' : ' ';
        currentTaskIndex++;
        return `${taskMatch[1]}${newCheckbox}${taskMatch[3]}`;
      }
      currentTaskIndex++;
    }
    return line;
  });

  return updatedLines.join('\n');
}

/**
 * Parse spec markdown for requirements and scenarios
 */
export function parseSpecMarkdown(content: string) {
  const requirements: string[] = [];
  const scenarios: string[] = [];

  const lines = content.split('\n');
  let inRequirements = false;
  let inScenarios = false;

  for (const line of lines) {
    // Track sections
    if (line.match(/^##\s*Requirements?/i)) {
      inRequirements = true;
      inScenarios = false;
      continue;
    }

    if (line.match(/^##\s*Scenarios?/i)) {
      inRequirements = false;
      inScenarios = true;
      continue;
    }

    // New section header resets tracking
    if (line.startsWith('##')) {
      inRequirements = false;
      inScenarios = false;
      continue;
    }

    // Extract requirements (list items under Requirements section)
    if (inRequirements && line.match(/^[-*]\s+/)) {
      requirements.push(line.replace(/^[-*]\s+/, '').trim());
    }

    // Extract scenarios (list items or ### headers under Scenarios section)
    if (inScenarios) {
      if (line.match(/^###\s+/)) {
        scenarios.push(line.replace(/^###\s+/, '').trim());
      } else if (line.match(/^[-*]\s+/)) {
        scenarios.push(line.replace(/^[-*]\s+/, '').trim());
      }
    }
  }

  return {
    requirements,
    scenarios,
  };
}

/**
 * Parse proposal markdown for sections
 */
export function parseProposalMarkdown(content: string) {
  const sections: { [key: string]: string } = {};
  const lines = content.split('\n');

  let currentSection = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    // Match ## Section headers
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      // Save previous section if exists
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }

      // Start new section
      currentSection = headerMatch[1].trim();
      currentContent = [];
      continue;
    }

    // Add content to current section
    if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save final section
  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

/**
 * Extract title from markdown (first # heading)
 */
export function extractTitle(content: string): string {
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^#\s+(.+)/);
    if (match) {
      return match[1].trim();
    }
  }

  return 'Untitled';
}

/**
 * Count words in markdown content
 */
export function countWords(content: string): number {
  // Remove markdown syntax
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/[#*_\[\]()]/g, '') // Remove markdown symbols
    .replace(/\s+/g, ' '); // Normalize whitespace

  const words = plainText.trim().split(/\s+/);
  return words.filter((word) => word.length > 0).length;
}

/**
 * Extract frontmatter tags from markdown
 */
export function extractTags(content: string): string[] {
  const lines = content.split('\n');
  const tags: string[] = [];

  let inFrontmatter = false;

  for (const line of lines) {
    if (line.trim() === '---') {
      inFrontmatter = !inFrontmatter;
      continue;
    }

    if (inFrontmatter && line.match(/^tags:\s*/)) {
      // Parse tags array (YAML format)
      const tagMatch = line.match(/^tags:\s*\[(.*)\]/);
      if (tagMatch) {
        tags.push(
          ...tagMatch[1]
            .split(',')
            .map((tag) => tag.trim().replace(/['"]/g, ''))
        );
      }
    }
  }

  return tags;
}

/**
 * Generate table of contents from markdown headings
 */
export function generateTOC(content: string): { level: number; title: string; id: string }[] {
  const lines = content.split('\n');
  const toc: { level: number; title: string; id: string }[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');

      toc.push({ level, title, id });
    }
  }

  return toc;
}
