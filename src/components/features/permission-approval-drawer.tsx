/**
 * Permission Approval Drawer
 * Shows pending tool permission requests from agents
 */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface PendingApproval {
  id: string;
  toolName: string;
  description: string;
  params: Record<string, unknown>;
  timestamp: number;
}

interface PermissionApprovalDrawerProps {
  agentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PermissionApprovalDrawer({ agentId, isOpen, onClose }: PermissionApprovalDrawerProps) {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending approvals
  useEffect(() => {
    if (!isOpen || !agentId) return;

    const fetchApprovals = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}/approvals`);
        if (response.ok) {
          const data = await response.json();
          setApprovals(data.approvals || []);
        }
      } catch (error) {
        console.error('Error fetching approvals:', error);
      }
    };

    fetchApprovals();

    // Poll for updates while drawer is open
    const interval = setInterval(fetchApprovals, 2000);
    return () => clearInterval(interval);
  }, [agentId, isOpen]);

  const handleApprove = async (approvalId: string) => {
    setProcessingId(approvalId);
    setLoading(true);

    try {
      const response = await fetch(`/api/agents/${agentId}/approvals/${approvalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (response.ok) {
        setApprovals(prev => prev.filter(a => a.id !== approvalId));
      }
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setLoading(false);
      setProcessingId(null);
    }
  };

  const handleDeny = async (approvalId: string) => {
    setProcessingId(approvalId);
    setLoading(true);

    try {
      const response = await fetch(`/api/agents/${agentId}/approvals/${approvalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deny' }),
      });

      if (response.ok) {
        setApprovals(prev => prev.filter(a => a.id !== approvalId));
      }
    } catch (error) {
      console.error('Error denying:', error);
    } finally {
      setLoading(false);
      setProcessingId(null);
    }
  };

  const handleApproveAll = async () => {
    setLoading(true);
    try {
      await Promise.all(approvals.map(approval => handleApprove(approval.id)));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h2 className="text-lg font-bold text-orange-900 dark:text-orange-100">
                Pending Approvals
              </h2>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                {approvals.length} {approvals.length === 1 ? 'request' : 'requests'} waiting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            title="Close"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold mb-2">All Clear!</h3>
              <p className="text-gray-500 dark:text-gray-400">
                No pending approvals at this time
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="border-2 border-orange-200 dark:border-orange-800 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/10"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-2xl">
                      {approval.toolName === 'Write' && '✏️'}
                      {approval.toolName === 'Edit' && '📝'}
                      {approval.toolName === 'Bash' && '🔧'}
                      {!['Write', 'Edit', 'Bash'].includes(approval.toolName) && '🛠️'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {approval.toolName} Permission Required
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {approval.description}
                      </p>

                      {/* Show relevant params */}
                      {approval.toolName === 'Write' && approval.params.file_path && (
                        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs font-mono break-all">
                          📄 {String(approval.params.file_path)}
                        </div>
                      )}
                      {approval.toolName === 'Edit' && approval.params.file_path && (
                        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs font-mono break-all">
                          📄 {String(approval.params.file_path)}
                        </div>
                      )}
                      {approval.toolName === 'Bash' && approval.params.command && (
                        <div className="mt-2 p-2 bg-gray-900 dark:bg-black rounded text-xs font-mono text-green-400 break-all">
                          $ {String(approval.params.command)}
                        </div>
                      )}

                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {new Date(approval.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(approval.id)}
                      disabled={loading && processingId === approval.id}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {loading && processingId === approval.id ? 'Approving...' : '✓ Approve'}
                    </Button>
                    <Button
                      onClick={() => handleDeny(approval.id)}
                      disabled={loading && processingId === approval.id}
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {loading && processingId === approval.id ? 'Denying...' : '✕ Deny'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {approvals.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex gap-2">
              <Button
                onClick={handleApproveAll}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                ✓ Approve All ({approvals.length})
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
