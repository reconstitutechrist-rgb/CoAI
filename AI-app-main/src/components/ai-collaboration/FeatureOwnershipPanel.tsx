/**
 * FeatureOwnershipPanel - Feature ownership during AI build
 *
 * Allows team members to claim ownership of specific features
 * during the AI build process.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { FeatureOwnership, OwnershipStatus } from '@/types/aiCollaboration';
import AssignOwnerModal from './AssignOwnerModal';

interface FeatureOwnershipPanelProps {
  ownerships: FeatureOwnership[];
  currentUserId: string;
  appId: string;
  teamId?: string;
  teamMembers: { id: string; name?: string; email?: string }[];
  phases?: { number: number; name: string; features: string[] }[];
  onAssignOwner: (input: {
    appId: string;
    teamId?: string;
    featureName: string;
    ownerId: string;
    phaseId?: string;
    responsibilities?: string[];
    notes?: string;
  }) => Promise<void>;
  onUpdateOwnership: (ownershipId: string, updates: Partial<FeatureOwnership>) => Promise<void>;
  onRemoveOwnership: (ownershipId: string) => Promise<void>;
  isLoading?: boolean;
}

type ViewMode = 'list' | 'by_owner' | 'by_phase';

export default function FeatureOwnershipPanel({
  ownerships,
  currentUserId,
  appId,
  teamId,
  teamMembers,
  phases = [],
  onAssignOwner,
  onUpdateOwnership,
  onRemoveOwnership,
  isLoading = false,
}: FeatureOwnershipPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [expandedOwnerId, setExpandedOwnerId] = useState<string | null>(null);

  const ownershipsByOwner = useMemo(() => {
    const grouped = new Map<string, FeatureOwnership[]>();
    ownerships.forEach((o) => {
      const key = o.ownerId;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(o);
    });
    return grouped;
  }, [ownerships]);

  const ownershipsByPhase = useMemo(() => {
    const grouped = new Map<string, FeatureOwnership[]>();
    ownerships.forEach((o) => {
      const key = o.phaseId || 'unassigned';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(o);
    });
    return grouped;
  }, [ownerships]);

  const unassignedFeatures = useMemo(() => {
    const assignedFeatures = new Set(ownerships.map((o) => o.featureName));
    const allFeatures: { name: string; phase?: string }[] = [];
    phases.forEach((phase) => {
      phase.features.forEach((f) => {
        if (!assignedFeatures.has(f)) {
          allFeatures.push({ name: f, phase: phase.name });
        }
      });
    });
    return allFeatures;
  }, [ownerships, phases]);

  const handleAssign = (featureName?: string) => {
    setSelectedFeature(featureName || null);
    setShowAssignModal(true);
  };

  const myOwnerships = ownerships.filter((o) => o.ownerId === currentUserId);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Feature Ownership</h3>
            <p className="text-sm text-gray-400">
              {ownerships.length} assigned • {unassignedFeatures.length} unassigned
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {[
              { key: 'list', label: 'List' },
              { key: 'by_owner', label: 'By Owner' },
              { key: 'by_phase', label: 'By Phase' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key as ViewMode)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === tab.key
                    ? 'bg-amber-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleAssign()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Assign
          </button>
        </div>
      </div>

      {/* My Ownerships Banner */}
      {myOwnerships.length > 0 && (
        <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-amber-400">You own {myOwnerships.length} feature{myOwnerships.length !== 1 ? 's' : ''}:</span>
            <span className="text-gray-300">
              {myOwnerships.map((o) => o.featureName).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="space-y-4">
            {/* Assigned Features */}
            {ownerships.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Assigned</h4>
                {ownerships.map((ownership) => (
                  <OwnershipCard
                    key={ownership.id}
                    ownership={ownership}
                    currentUserId={currentUserId}
                    teamMembers={teamMembers}
                    onUpdate={onUpdateOwnership}
                    onRemove={onRemoveOwnership}
                  />
                ))}
              </div>
            )}

            {/* Unassigned Features */}
            {unassignedFeatures.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Unassigned</h4>
                {unassignedFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div>
                      <p className="text-white font-medium">{feature.name}</p>
                      {feature.phase && (
                        <p className="text-xs text-gray-500">Phase: {feature.phase}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAssign(feature.name)}
                      className="px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            )}

            {ownerships.length === 0 && unassignedFeatures.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">No features to assign</p>
                <p className="text-sm text-gray-500 mt-1">Generate a build plan to see features</p>
              </div>
            )}
          </div>
        ) : viewMode === 'by_owner' ? (
          /* By Owner View */
          <div className="space-y-4">
            {Array.from(ownershipsByOwner.entries()).map(([ownerId, ownerOwnerships]) => {
              const member = teamMembers.find((m) => m.id === ownerId);
              return (
                <div key={ownerId} className="bg-gray-800 rounded-lg border border-gray-700">
                  <button
                    onClick={() => setExpandedOwnerId(expandedOwnerId === ownerId ? null : ownerId)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-750"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-medium">
                        {(member?.name || member?.email || 'U')[0].toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">
                          {member?.name || member?.email || 'Team Member'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ownerOwnerships.length} feature{ownerOwnerships.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedOwnerId === ownerId ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedOwnerId === ownerId && (
                    <div className="border-t border-gray-700 p-4 space-y-2">
                      {ownerOwnerships.map((o) => (
                        <div key={o.id} className="p-2 bg-gray-900 rounded-lg">
                          <p className="text-white text-sm">{o.featureName}</p>
                          {o.notes && (
                            <p className="text-xs text-gray-500 mt-1">{o.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {ownershipsByOwner.size === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">No features assigned yet</p>
              </div>
            )}
          </div>
        ) : (
          /* By Phase View */
          <div className="space-y-4">
            {phases.map((phase) => {
              const phaseOwnerships = ownershipsByPhase.get(phase.name) || [];
              const unassignedInPhase = phase.features.filter(
                (f) => !ownerships.some((o) => o.featureName === f)
              );
              return (
                <div key={phase.number} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <div className="p-3 bg-gray-750 border-b border-gray-700">
                    <p className="text-white font-medium">Phase {phase.number}: {phase.name}</p>
                    <p className="text-xs text-gray-500">
                      {phaseOwnerships.length} assigned • {unassignedInPhase.length} unassigned
                    </p>
                  </div>
                  <div className="p-3 space-y-2">
                    {phase.features.map((feature, index) => {
                      const ownership = ownerships.find((o) => o.featureName === feature);
                      const owner = ownership
                        ? teamMembers.find((m) => m.id === ownership.ownerId)
                        : null;
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-900 rounded-lg"
                        >
                          <p className="text-sm text-white">{feature}</p>
                          {owner ? (
                            <span className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded">
                              {owner.name || owner.email}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAssign(feature)}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-amber-400 transition-colors"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignOwnerModal
          appId={appId}
          teamId={teamId}
          selectedFeature={selectedFeature}
          teamMembers={teamMembers}
          phases={phases}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedFeature(null);
          }}
          onSubmit={async (input) => {
            await onAssignOwner(input);
            setShowAssignModal(false);
            setSelectedFeature(null);
          }}
        />
      )}
    </div>
  );
}

interface OwnershipCardProps {
  ownership: FeatureOwnership;
  currentUserId: string;
  teamMembers: { id: string; name?: string; email?: string }[];
  onUpdate: (ownershipId: string, updates: Partial<FeatureOwnership>) => Promise<void>;
  onRemove: (ownershipId: string) => Promise<void>;
}

function OwnershipCard({
  ownership,
  currentUserId,
  teamMembers,
  onUpdate,
  onRemove,
}: OwnershipCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const owner = teamMembers.find((m) => m.id === ownership.ownerId);
  const isOwner = ownership.ownerId === currentUserId;

  const statusConfig = {
    assigned: { color: 'bg-blue-500/20 text-blue-400', label: 'Assigned' },
    in_progress: { color: 'bg-yellow-500/20 text-yellow-400', label: 'In Progress' },
    completed: { color: 'bg-green-500/20 text-green-400', label: 'Completed' },
    transferred: { color: 'bg-gray-500/20 text-gray-400', label: 'Transferred' },
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div
        className="p-3 cursor-pointer hover:bg-gray-750"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white font-medium">{ownership.featureName}</p>
              <span className={`px-2 py-0.5 text-xs rounded-full ${statusConfig[ownership.status].color}`}>
                {statusConfig[ownership.status].label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Owner: {owner?.name || owner?.email || 'Unknown'}</span>
              {ownership.phaseId && <span>• Phase: {ownership.phaseId}</span>}
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-700 p-3 space-y-3">
          {ownership.responsibilities && ownership.responsibilities.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-2">
              <h5 className="text-xs font-medium text-gray-400 mb-1">Responsibilities</h5>
              <ul className="space-y-1">
                {ownership.responsibilities.map((r, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-amber-400">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ownership.notes && (
            <div className="bg-gray-900 rounded-lg p-2">
              <h5 className="text-xs font-medium text-gray-400 mb-1">Notes</h5>
              <p className="text-sm text-gray-300">{ownership.notes}</p>
            </div>
          )}

          {isOwner && (
            <div className="flex gap-2 pt-2 border-t border-gray-700">
              {ownership.status === 'assigned' && (
                <button
                  onClick={() => onUpdate(ownership.id, { status: 'in_progress' })}
                  className="px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  Start Working
                </button>
              )}
              {ownership.status === 'in_progress' && (
                <button
                  onClick={() => onUpdate(ownership.id, { status: 'completed' })}
                  className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Mark Complete
                </button>
              )}
              <button
                onClick={() => onRemove(ownership.id)}
                className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
