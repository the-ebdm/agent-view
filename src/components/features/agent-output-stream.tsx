'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import type { AgentMessage } from '@/types/agent';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface AgentOutputStreamProps {
  messages: AgentMessage[];
  autoScroll?: boolean;
}

export function AgentOutputStream({ messages, autoScroll = true }: AgentOutputStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);

  useEffect(() => {
    if (autoScroll && !isUserScrolling.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
    isUserScrolling.current = !isAtBottom;
  };

  if (messages.length === 0) {
    return (
      <Card>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No messages yet. Spawn an agent to get started.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="space-y-4 max-h-[600px] overflow-y-auto"
      >
        {messages.map((message, index) => (
          <MessageItem key={index} message={message} />
        ))}
      </div>
    </Card>
  );
}

function MessageItem({ message }: { message: AgentMessage }) {
  const typeColors = {
    assistant: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    tool_use: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    tool_result: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    result: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const typeLabels = {
    assistant: 'Assistant',
    tool_use: 'Tool',
    tool_result: 'Result',
    result: 'Completed',
    error: 'Error',
  };

  return (
    <div className={`p-4 rounded-lg border ${typeColors[message.type]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{typeLabels[message.type]}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {message.type === 'tool_use' && message.toolName && (
        <div className="mb-2 text-sm">
          <span className="font-mono text-purple-700 dark:text-purple-300">
            {message.toolName}
          </span>
          {message.toolParams && (
            <pre className="mt-1 text-xs bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
              {JSON.stringify(message.toolParams, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="prose prose-sm dark:prose-invert max-w-none">
        {message.type === 'assistant' ? (
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}
