/**
 * AIReviewPanel - AI Code Review Workflow
 *
 * Manages review gates before AI-generated code is applied to the codebase.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { AIReviewRequest, ReviewStatus, ReviewType } from '@/types/aiCollaboration';
import ReviewRequestCard from './ReviewRequestCard';
import CreateReviewModal from './CreateReviewModal';

interface AIReviewPanelProps {
  reviews: AIReviewRequest[];
  currentUserId: string;
  teamMembers: { id: string; name?: string; email?: string }[];
  onCreateReview: (input: {
    appId: string;
    teamId?: string;
    reviewType: ReviewType;
    title: string;
    description?: string;
    aiOutput: unknown;
    phaseId?: string;
    featureName?: string;
    filesToAdd?: { path: string; content: string }[];
    filesToModify?: { path: string; oldContent: string; newContent: string }[];
    assignedReviewers: string[];
    requiredApprovals?: number;
    expiresAt?: string;
  }) => Promise<void>;
  onSubmitResponse: (
    reviewId: string,
    decision: 'approve' | 'request_changes' | 'reject',
    comments?: string,
    inlineComments?: { filePath: string; line: number; comment: string }[]
  ) => Promise<void>;
  onApplyReview: (reviewId: string) => Promise<void>;
  appId: string;
  teamId?: string;
  isLoading?: boolean;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'changes_requested';

export default function AIReviewPanel({
  reviews,
  currentUserId,
  teamMembers,
  onCreateReview,
  onSubmitResponse,
  onApplyReview,
  appId,
  teamId,
  isLoading = false,
}: AIReviewPanelProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const myPendingReviews = useMemo(() => {
    return reviews.filter(
      (r) =>
        r.assignedReviewers.includes(currentUserId) &&
        (r.status === 'pending' || r.status === 'in_review') &&
        !r.responses?.some((resp) => resp.reviewerId === currentUserId)
    );
  }, [reviews, currentUserId]);

  const filteredReviews = useMemo(() => {
    switch (filterStatus) {
      case 'pending':
        return reviews.filter((r) => r.status === 'pending' || r.status === 'in_review');
      case 'approved':
        return reviews.filter((r) => r.status === 'approved' || r.status === 'applied');
      case 'changes_requested':
        return reviews.filter((r) => r.status === 'changes_requested' || r.status === 'rejected');
      default:
        return reviews;
    }
  }, [reviews, filterStatus]);

  const statusCounts = useMemo(() => ({
    all: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending' || r.status === 'in_review').length,
    approved: reviews.filter((r) => r.status === 'approved' || r.status === 'applied').length,
    changes_requested: reviews.filter((r) => r.status === 'changes_requested' || r.status === 'rejected').length,
  }), [reviews]);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Code Reviews</h3>
            <p className="text-sm text-gray-400">
              {myPendingReviews.length > 0 ? (
                <span className="text-emerald-400">
                  {myPendingReviews.length} awaiting your review
                </span>
              ) : (
                'No pending reviews'
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Request Review
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-2 border-b border-gray-700 bg-gray-800/50">
        {([
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'changes_requested', label: 'Changes Requested' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              filterStatus === tab.key
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filterStatus === tab.key ? 'bg-emerald-500' : 'bg-gray-600'
            }`}>
              {statusCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Review List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-gray-400">No {filterStatus !== 'all' ? filterStatus.replace('_', ' ') : ''} reviews</p>
            <p className="text-sm text-gray-500 mt-1">
              Request a review before applying AI-generated code
            </p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <ReviewRequestCard
              key={review.id}
              review={review}
              currentUserId={currentUserId}
              teamMembers={teamMembers}
              isExpanded={expandedReviewId === review.id}
              onToggleExpand={() => setExpandedReviewId(
                expandedReviewId === review.id ? null : review.id
              )}
              onSubmitResponse={onSubmitResponse}
              onApply={onApplyReview}
            />
          ))
        )}
      </div>

      {/* Create Review Modal */}
      {showCreateModal && (
        <CreateReviewModal
          appId={appId}
          teamId={teamId}
          teamMembers={teamMembers}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (input) => {
            await onCreateReview(input);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
