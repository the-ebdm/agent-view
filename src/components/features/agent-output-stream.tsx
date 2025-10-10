'use client';

import { useEffect, useRef, useState } from 'react';
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
      <Card className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">💬</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Agent Activity
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Spawn an agent to see real-time output here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="flex flex-col"
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agent Output</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        </div>
      }
    >
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="space-y-3 max-h-[600px] overflow-y-auto -m-6 p-6"
      >
        {groupMessages(messages).map((item, index) => (
          <MessageItem key={index} item={item} />
        ))}
      </div>
    </Card>
  );
}

// Group tool_use messages with their corresponding tool_result
type MessageGroup =
  | { type: 'single'; message: AgentMessage }
  | { type: 'tool'; toolUse: AgentMessage; toolResult?: AgentMessage };

function groupMessages(messages: AgentMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let i = 0;

  while (i < messages.length) {
    const message = messages[i];

    if (message.type === 'tool_use') {
      // Look ahead for the next tool_result
      const nextMessage = messages[i + 1];
      if (nextMessage && nextMessage.type === 'tool_result') {
        groups.push({ type: 'tool', toolUse: message, toolResult: nextMessage });
        i += 2; // Skip both messages
      } else {
        groups.push({ type: 'tool', toolUse: message });
        i += 1;
      }
    } else if (message.type === 'tool_result') {
      // Orphaned tool result (shouldn't happen, but handle it)
      groups.push({ type: 'single', message });
      i += 1;
    } else {
      groups.push({ type: 'single', message });
      i += 1;
    }
  }

  return groups;
}

function MessageItem({ item }: { item: MessageGroup }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (item.type === 'tool') {
    return <ToolCallItem toolUse={item.toolUse} toolResult={item.toolResult} isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />;
  }

  return <SingleMessageItem message={item.message} />;
}

function ToolCallItem({
  toolUse,
  toolResult,
  isExpanded,
  onToggle
}: {
  toolUse: AgentMessage;
  toolResult?: AgentMessage;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-200 dark:border-purple-700 border-t border-r border-b rounded-lg transition-all hover:shadow-md">
      <button
        onClick={onToggle}
        className="w-full p-3 text-left flex items-center justify-between hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">🔧</span>
          <span className="font-mono text-sm text-purple-600 dark:text-purple-400 font-semibold truncate">
            {toolUse.toolName}
          </span>
          {toolResult && (
            <span className="text-xs text-green-600 dark:text-green-400 ml-2">✓</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {new Date(toolUse.timestamp).toLocaleTimeString()}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {toolUse.toolParams && (
            <div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Parameters:
              </div>
              <pre className="text-xs bg-black/10 dark:bg-white/10 p-2 rounded overflow-x-auto font-mono">
                {JSON.stringify(toolUse.toolParams, null, 2)}
              </pre>
            </div>
          )}

          {toolResult && (
            <div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Result:
              </div>
              <pre className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded overflow-x-auto font-mono max-h-48 overflow-y-auto">
                {typeof toolResult.content === 'string'
                  ? toolResult.content
                  : JSON.stringify(toolResult.content, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SingleMessageItem({ message }: { message: AgentMessage }) {
  const typeColors = {
    assistant: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
    tool_use: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700',
    tool_result: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    result: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
  };

  const typeLabels = {
    assistant: 'Assistant',
    tool_use: 'Tool Use',
    tool_result: 'Tool Result',
    result: 'Completed',
    error: 'Error',
  };

  const typeIcons = {
    assistant: '🤖',
    tool_use: '🔧',
    tool_result: '✓',
    result: '✨',
    error: '❌',
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 border-t border-r border-b ${typeColors[message.type]} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[message.type]}</span>
          <span className="text-sm font-semibold">{typeLabels[message.type]}</span>
        </div>
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        {message.type === 'assistant' ? (
          <ReactMarkdown
            components={{
              code({ inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                // Convert children to string - handle both arrays and single values
                const codeString = Array.isArray(children)
                  ? children.join('')
                  : typeof children === 'string'
                  ? children
                  : String(children || '');

                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {codeString.replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {codeString}
                  </code>
                );
              },
            }}
          >
            {typeof message.content === 'string'
              ? message.content
              : JSON.stringify(message.content, null, 2)}
          </ReactMarkdown>
        ) : (
          <p className="whitespace-pre-wrap">
            {typeof message.content === 'string'
              ? message.content
              : JSON.stringify(message.content, null, 2)}
          </p>
        )}
      </div>
    </div>
  );
}
