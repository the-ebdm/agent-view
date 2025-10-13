/**
 * OpenSpec Section Component
 * Dashboard section displaying OpenSpec entities with search and filtering
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CapabilityCard } from './capability-card';
import { ChangeCard } from './change-card';
import { ArchiveCard } from './archive-card';
import { OpenSpecModalEnhanced } from './openspec-modal-enhanced';
import { NewProposalButton } from './slash-command-button';
import { Button } from '@/components/ui/button';
import type {
  CapabilitySpec,
  ChangeProposal,
  ArchivedChange,
  OpenSpecEntity,
} from '@/types/openspec';

interface OpenSpecSectionProps {
  projectDirectory?: string;
  openspecPath?: string;
}

export function OpenSpecSection({ projectDirectory, openspecPath }: OpenSpecSectionProps = {}) {
  const [specs, setSpecs] = useState<CapabilitySpec[]>([]);
  const [changes, setChanges] = useState<ChangeProposal[]>([]);
  const [archives, setArchives] = useState<ArchivedChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<OpenSpecEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'spec' | 'change' | 'archive'>('all');

  // Fetch OpenSpec entities
  const fetchEntities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (projectDirectory) {
        params.set('directory', projectDirectory);
      }

      const url = `/api/openspec/list${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch OpenSpec entities');

      const data = await response.json();
      setSpecs(data.specs || []);
      setChanges(data.changes || []);
      setArchives(data.archives || []);
    } catch (err: unknown) {
      setError(err.message || 'Failed to load OpenSpec data');
    } finally {
      setLoading(false);
    }
  }, [projectDirectory]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEntities();
    setRefreshing(false);
  };

  // Filter entities based on search and type
  const filteredSpecs = specs.filter((spec) =>
    (filterType === 'all' || filterType === 'spec') &&
    (searchQuery === '' || spec.name.toLowerCase().includes(searchQuery.toLowerCase()) || spec.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredChanges = changes.filter((change) =>
    (filterType === 'all' || filterType === 'change') &&
    (searchQuery === '' || change.name.toLowerCase().includes(searchQuery.toLowerCase()) || change.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredArchives = archives.filter((archive) =>
    (filterType === 'all' || filterType === 'archive') &&
    (searchQuery === '' || archive.name.toLowerCase().includes(searchQuery.toLowerCase()) || archive.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading OpenSpec entities...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-sm border border-red-200 dark:border-red-900/50 p-6">
        <div className="text-center text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  const totalCount = filteredSpecs.length + filteredChanges.length + filteredArchives.length;

  return (
    <div className="space-y-4">
      {/* Header with Search and Filter */}
      <div className="flex flex-col gap-3">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 dark:from-purple-600 dark:to-blue-700 flex items-center justify-center shadow-sm">
              <span className="text-xl">📁</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">OpenSpec</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totalCount} {totalCount === 1 ? 'entity' : 'entities'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              title="Refresh OpenSpec entities"
              className="w-9 h-9 p-0 flex items-center justify-center"
            >
              <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
            </Button>

            {/* New Proposal Button */}
            <NewProposalButton
              onSuccess={(output) => {
                console.log('Proposal created:', output);
                fetchEntities();
              }}
              onError={(error) => {
                console.error('Failed to create proposal:', error);
              }}
            />
          </div>
        </div>

        {/* Search and Filter Row */}
        <div className="flex gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search specs, changes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              🔍
            </span>
          </div>

          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'spec' | 'change' | 'archive')}
            className="px-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="spec">Specs</option>
            <option value="change">Changes</option>
            <option value="archive">Archives</option>
          </select>
        </div>
      </div>

      {/* Active Changes */}
      {filteredChanges.length > 0 && (
        <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {filteredChanges.length}
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Active Changes
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChanges.map((change) => (
              <ChangeCard
                key={change.id}
                change={change}
                onView={() => setSelectedEntity(change)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Specifications */}
      {filteredSpecs.length > 0 && (
        <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {filteredSpecs.length}
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Specifications
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpecs.map((spec) => (
              <CapabilityCard
                key={spec.id}
                spec={spec}
                onView={() => setSelectedEntity(spec)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Archives */}
      {filteredArchives.length > 0 && (
        <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {filteredArchives.length}
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Archives
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArchives.map((archive) => (
              <ArchiveCard
                key={archive.id}
                archive={archive}
                onView={() => setSelectedEntity(archive)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-900/30 rounded-xl shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 p-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white dark:bg-gray-800 shadow-lg mb-4">
            <span className="text-5xl">📁</span>
          </div>
          <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            No OpenSpec entities found
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search or filter to find what you\'re looking for'
              : 'Create your first spec or change to get started with OpenSpec'}
          </p>
          {!searchQuery && (
            <div className="mt-6">
              <NewProposalButton
                onSuccess={(output) => {
                  console.log('Proposal created:', output);
                  fetchEntities();
                }}
                onError={(error) => {
                  console.error('Failed to create proposal:', error);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {selectedEntity && (
        <OpenSpecModalEnhanced
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
          onUpdate={() => {
            fetchEntities();
          }}
          projectDirectory={projectDirectory}
        />
      )}
    </div>
  );
}
