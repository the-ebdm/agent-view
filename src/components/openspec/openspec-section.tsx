/**
 * OpenSpec Section Component
 * Dashboard section displaying OpenSpec entities with search and filtering
 */

'use client';

import React, { useEffect, useState } from 'react';
import { CapabilityCard } from './capability-card';
import { ChangeCard } from './change-card';
import { ArchiveCard } from './archive-card';
import { OpenSpecModal } from './openspec-modal';
import type {
  CapabilitySpec,
  ChangeProposal,
  ArchivedChange,
  OpenSpecEntity,
} from '@/types/openspec';

export function OpenSpecSection() {
  const [specs, setSpecs] = useState<CapabilitySpec[]>([]);
  const [changes, setChanges] = useState<ChangeProposal[]>([]);
  const [archives, setArchives] = useState<ArchivedChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<OpenSpecEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'spec' | 'change' | 'archive'>('all');

  // Fetch OpenSpec entities
  useEffect(() => {
    async function fetchEntities() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/openspec/list');
        if (!response.ok) throw new Error('Failed to fetch OpenSpec entities');

        const data = await response.json();
        setSpecs(data.specs || []);
        setChanges(data.changes || []);
        setArchives(data.archives || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load OpenSpec data');
      } finally {
        setLoading(false);
      }
    }

    fetchEntities();
  }, []);

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
      <div className="bg-gray-800/50 dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-700 dark:border-gray-700 p-6">
        <div className="text-center text-gray-400 dark:text-gray-400">Loading OpenSpec entities...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 dark:bg-gray-800/50 rounded-lg shadow-sm border border-red-900/50 p-6">
        <div className="text-center text-red-400">Error: {error}</div>
      </div>
    );
  }

  const totalCount = filteredSpecs.length + filteredChanges.length + filteredArchives.length;

  return (
    <div className="space-y-6">
      {/* Header with Search and Filter */}
      <div className="bg-gray-800/50 dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-700 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📁</span>
            <div>
              <h2 className="text-lg font-semibold text-white dark:text-white">OpenSpec</h2>
              <p className="text-xs text-gray-400 dark:text-gray-400">{totalCount} entities</p>
            </div>
          </div>

          <div className="flex-1 flex gap-2">
            {/* Search */}
            <input
              type="text"
              placeholder="Search specs, changes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-gray-900/50 border border-gray-600 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 text-sm bg-gray-900/50 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="spec">Specs</option>
              <option value="change">Changes</option>
              <option value="archive">Archives</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Changes */}
      {filteredChanges.length > 0 && (
        <div className="bg-gray-800/50 dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-700 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white dark:text-white mb-3">
            Active Changes ({filteredChanges.length})
          </h3>
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
        <div className="bg-gray-800/50 dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-700 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white dark:text-white mb-3">
            Specifications ({filteredSpecs.length})
          </h3>
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
        <div className="bg-gray-800/50 dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-700 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-white dark:text-white mb-3">
            Archives ({filteredArchives.length})
          </h3>
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
        <div className="bg-gray-800/50 dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-700 dark:border-gray-700 p-12 text-center">
          <span className="text-6xl">📁</span>
          <h3 className="mt-4 text-lg font-medium text-white dark:text-white">No OpenSpec entities found</h3>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-400">
            {searchQuery
              ? 'Try adjusting your search or filter'
              : 'Create your first spec or change to get started'}
          </p>
        </div>
      )}

      {/* Modal */}
      {selectedEntity && (
        <OpenSpecModal
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </div>
  );
}
