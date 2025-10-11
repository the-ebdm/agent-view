/**
 * Keyboard Shortcuts Hook
 * Provides application-wide keyboard shortcuts
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Command on Mac
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const matchesShift = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const matchesAlt = shortcut.alt ? event.altKey : !event.altKey;
        const matchesMeta = shortcut.meta ? event.metaKey : !event.metaKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
          // Don't trigger if user is typing in an input/textarea
          const target = event.target as HTMLElement;
          if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
          ) {
            // Allow Cmd+K even in inputs for search
            if (!(shortcut.meta && shortcut.key === 'k')) {
              continue;
            }
          }

          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function formatShortcut(shortcut: Omit<KeyboardShortcut, 'action' | 'description'>): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Meta');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}
