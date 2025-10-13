// Phase 2: Interactive modal for chatting with agents
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentOutputStream } from "./agent-output-stream";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { useAgentLifecycle } from "@/hooks/use-agent-lifecycle";
import type { AgentSession } from "@/types/agent";

interface AgentInteractionModalProps {
  agent: AgentSession;
  onClose: () => void;
}

export function AgentInteractionModal({
  agent,
  onClose,
}: AgentInteractionModalProps) {
  const { messages, status } = useAgentStream(agent.id);
  const { pause, resume, stop } = useAgentLifecycle(agent.id);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);
    try {
      // TODO: Implement follow-up message API endpoint
      // For now, this would require SDK support for continuing conversations
      console.log("Sending message to agent:", agent.id, input);

      // Placeholder - in a real implementation, you'd call an API endpoint
      // that continues the agent's conversation
      await new Promise((resolve) => setTimeout(resolve, 500));

      setInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isRunning = agent.lifecycleState === "running";
  const isPaused = agent.lifecycleState === "paused";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isRunning
                  ? "bg-green-500 animate-pulse"
                  : isPaused
                  ? "bg-yellow-500"
                  : "bg-gray-500"
              }`}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold truncate">{agent.name}</h2>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {messages.length} msgs
            </span>
          </div>

          <div className="flex items-center gap-1 ml-3 flex-shrink-0">
            {isRunning && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => pause.execute()}
                disabled={pause.isLoading}
                className="h-7 px-2 text-xs"
              >
                ⏸️
              </Button>
            )}
            {isPaused && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => resume.execute()}
                disabled={resume.isLoading}
                className="h-7 px-2 text-xs"
              >
                ▶️
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="h-7 px-2 text-xs"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden px-3 py-2 flex flex-col">
          <AgentOutputStream messages={messages} />
        </div>

        {/* Collapsible Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsInputCollapsed(!isInputCollapsed)}
            className="w-full px-3 py-1 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-xs"
          >
            <span className="text-gray-500 dark:text-gray-400">
              {isInputCollapsed ? "Show input" : "Hide input"}
            </span>
            <span className="text-gray-400">{isInputCollapsed ? "▲" : "▼"}</span>
          </button>

          {!isInputCollapsed && (
            <div className="px-3 pb-3">
              {isPaused && (
                <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
                  ⏸️ Agent is paused. Resume to continue.
                </div>
              )}

              {agent.lifecycleState === "stopped" && (
                <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                  🛑 Agent stopped. No further interaction possible.
                </div>
              )}

              {(isRunning || isPaused) && (
                <div className="space-y-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Send message (Cmd+Enter)..."
                    rows={2}
                    disabled={!isRunning || isSending}
                    className="resize-none text-sm"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => stop.execute()}
                      disabled={stop.isLoading}
                      className="h-7 px-2 text-xs"
                    >
                      {stop.isLoading ? "🛑..." : "🛑 Stop"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!input.trim() || !isRunning || isSending}
                      className="h-7 px-3 text-xs"
                    >
                      {isSending ? "..." : "Send"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
