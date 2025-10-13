/**
 * Markdown Renderer Component
 * Render OpenSpec markdown with syntax highlighting
 */

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            return !inline && language ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={`${className} bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 px-1 py-0.5 rounded text-sm`} {...props}>
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-5 mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-5 space-y-1 mb-3 text-gray-700 dark:text-gray-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 space-y-1 mb-3 text-gray-700 dark:text-gray-300">{children}</ol>
          ),
          li: ({ children, ...props }: any) => {
            // Check if this is a task list item
            const childrenArray = React.Children.toArray(children);
            const firstChild = childrenArray[0];

            if (typeof firstChild === 'string') {
              // Check for [ ] or [x] at the start
              const taskMatch = firstChild.match(/^\[([ xX])\]\s*/);
              if (taskMatch) {
                const isChecked = taskMatch[1].toLowerCase() === 'x';
                const restOfText = firstChild.slice(taskMatch[0].length);

                return (
                  <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300 list-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled
                      className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-blue-500 focus:ring-0 cursor-default"
                    />
                    <span className={isChecked ? 'line-through text-gray-400 dark:text-gray-500' : ''}>
                      {restOfText}
                      {childrenArray.slice(1)}
                    </span>
                  </li>
                );
              }
            }

            return <li className="text-gray-700 dark:text-gray-300">{children}</li>;
          },
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-3">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border border-gray-300 dark:border-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-300 dark:divide-gray-700">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
