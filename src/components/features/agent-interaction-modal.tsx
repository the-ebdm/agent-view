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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{agent.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {agent.directory}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {/* Lifecycle Controls */}
            {isRunning && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => pause.execute()}
                disabled={pause.isLoading}
              >
                {pause.isLoading ? "⏸️..." : "⏸️ Pause"}
              </Button>
            )}
            {isPaused && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => resume.execute()}
                disabled={resume.isLoading}
              >
                {resume.isLoading ? "▶️..." : "▶️ Resume"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isRunning
                    ? "bg-green-500 animate-pulse"
                    : isPaused
                    ? "bg-yellow-500"
                    : "bg-gray-500"
                }`}
              />
              <span className="font-medium capitalize">
                {agent.lifecycleState}
              </span>
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              {messages.length} messages
            </div>
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                agent.toolPermissions.preset === "read-only"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : agent.toolPermissions.preset === "standard"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : agent.toolPermissions.preset === "full-access"
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
              }`}
            >
              {agent.toolPermissions.preset}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-auto p-4">
          <AgentOutputStream messages={messages} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {isPaused && (
            <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⏸️ Agent is paused. Resume to continue interaction.
              </p>
            </div>
          )}

          {agent.lifecycleState === "stopped" && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                🛑 Agent has been stopped. No further interaction possible.
              </p>
            </div>
          )}

          {(isRunning || isPaused) && (
            <div className="space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a follow-up message to the agent... (Cmd+Enter to send)"
                rows={3}
                disabled={!isRunning || isSending}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Press Cmd+Enter to send
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => stop.execute()}
                    disabled={stop.isLoading}
                  >
                    {stop.isLoading ? "🛑 Stopping..." : "🛑 Stop Agent"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!input.trim() || !isRunning || isSending}
                  >
                    {isSending ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
