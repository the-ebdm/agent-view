/**
 * Markdown Editor Component
 * Split-pane editor with live preview and formatting toolbar
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MarkdownRenderer } from './markdown-renderer';
import { ValidationPanel, ValidationError } from './validation-panel';
import { ValidationIndicator, ValidationStatus } from './validation-indicator';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: (content: string) => Promise<void>;
  placeholder?: string;
  showPreview?: boolean;
  validationErrors?: ValidationError[];
  validationStatus?: ValidationStatus;
  onValidate?: () => void;
  className?: string;
}

export function MarkdownEditor({
  content,
  onChange,
  onSave,
  placeholder = 'Start typing...',
  showPreview = true,
  validationErrors = [],
  validationStatus,
  onValidate,
  className = '',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [localContent, setLocalContent] = useState(content);

  // Sync local content with prop changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Handle content change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    onChange(newContent);
  }, [onChange]);

  // Handle save (Ctrl+S)
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(localContent);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, localContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Validate: Ctrl+Shift+V
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'v') {
        e.preventDefault();
        onValidate?.();
        return;
      }

      // Only apply formatting shortcuts if textarea is focused
      if (document.activeElement !== textareaRef.current) return;

      // Bold: Ctrl+B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        applyFormatting('bold');
        return;
      }

      // Italic: Ctrl+I
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        applyFormatting('italic');
        return;
      }

      // Code: Ctrl+E
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        applyFormatting('code');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, onValidate, localContent]);

  // Apply markdown formatting
  const applyFormatting = useCallback((type: 'bold' | 'italic' | 'code' | 'codeblock' | 'heading' | 'list') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = localContent.substring(start, end);
    const beforeText = localContent.substring(0, start);
    const afterText = localContent.substring(end);

    let newText = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'code':
        newText = `\`${selectedText || 'code'}\``;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'codeblock':
        newText = `\`\`\`\n${selectedText || 'code block'}\n\`\`\``;
        cursorOffset = selectedText ? newText.length : 4;
        break;
      case 'heading':
        newText = `## ${selectedText || 'Heading'}`;
        cursorOffset = newText.length;
        break;
      case 'list':
        const lines = (selectedText || 'List item').split('\n');
        newText = lines.map(line => `- ${line}`).join('\n');
        cursorOffset = newText.length;
        break;
    }

    const updated = beforeText + newText + afterText;
    setLocalContent(updated);
    onChange(updated);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [localContent, onChange]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          {/* Formatting buttons */}
          <button
            onClick={() => applyFormatting('bold')}
            className="px-2 py-1 text-sm font-bold hover:bg-gray-200 rounded transition-colors"
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={() => applyFormatting('italic')}
            className="px-2 py-1 text-sm italic hover:bg-gray-200 rounded transition-colors"
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={() => applyFormatting('code')}
            className="px-2 py-1 text-sm font-mono hover:bg-gray-200 rounded transition-colors"
            title="Code (Ctrl+E)"
          >
            {'</>'}
          </button>
          <button
            onClick={() => applyFormatting('codeblock')}
            className="px-2 py-1 text-sm font-mono hover:bg-gray-200 rounded transition-colors"
            title="Code Block"
          >
            {'{ }'}
          </button>
          <button
            onClick={() => applyFormatting('heading')}
            className="px-2 py-1 text-sm font-bold hover:bg-gray-200 rounded transition-colors"
            title="Heading"
          >
            H
          </button>
          <button
            onClick={() => applyFormatting('list')}
            className="px-2 py-1 text-sm hover:bg-gray-200 rounded transition-colors"
            title="List"
          >
            ≡
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Validate button */}
          {onValidate && (
            <button
              onClick={onValidate}
              className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
              title="Validate (Ctrl+Shift+V)"
            >
              Validate
            </button>
          )}
        </div>

        {/* Save status and validation indicator */}
        <div className="flex items-center gap-3">
          {validationStatus && (
            <ValidationIndicator
              status={validationStatus}
              errorCount={validationErrors.length}
              compact
            />
          )}
          {isSaving && (
            <span className="text-sm text-gray-500">Saving...</span>
          )}
          {lastSaved && !isSaving && (
            <span className="text-sm text-gray-500">
              Saved {formatTimeAgo(lastSaved)}
            </span>
          )}
        </div>
      </div>

      {/* Editor + Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor pane */}
        <div className="flex-1 flex flex-col border-r">
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={handleChange}
            placeholder={placeholder}
            className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* Preview pane */}
        {showPreview && (
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div className="prose prose-sm max-w-none">
              <MarkdownRenderer content={localContent} />
            </div>
          </div>
        )}
      </div>

      {/* Validation panel */}
      {validationErrors.length > 0 && (
        <div className="border-t p-4 bg-white">
          <ValidationPanel
            errors={validationErrors}
            onJumpToError={(error) => {
              // TODO: Implement jump to line
              console.log('Jump to error:', error);
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Format time ago
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
