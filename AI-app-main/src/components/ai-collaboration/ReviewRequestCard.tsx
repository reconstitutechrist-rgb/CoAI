/**
 * ReviewRequestCard - Individual review request display
 *
 * Shows review details, file changes, and allows reviewers to respond.
 */

'use client';

import React, { useState } from 'react';
import { AIReviewRequest, AIReviewResponse } from '@/types/aiCollaboration';

interface ReviewRequestCardProps {
  review: AIReviewRequest;
  currentUserId: string;
  teamMembers: { id: string; name?: string; email?: string }[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSubmitResponse: (
    reviewId: string,
    decision: 'approve' | 'request_changes' | 'reject',
    comments?: string,
    inlineComments?: { filePath: string; line: number; comment: string }[]
  ) => Promise<void>;
  onApply: (reviewId: string) => Promise<void>;
}

export default function ReviewRequestCard({
  review,
  currentUserId,
  teamMembers,
  isExpanded,
  onToggleExpand,
  onSubmitResponse,
  onApply,
}: ReviewRequestCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseDecision, setResponseDecision] = useState<'approve' | 'request_changes' | 'reject' | null>(null);
  const [responseComments, setResponseComments] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const isReviewer = review.assignedReviewers.includes(currentUserId);
  const isRequester = review.requestedBy === currentUserId;
  const hasResponded = review.responses?.some((r) => r.reviewerId === currentUserId);
  const canReview = isReviewer && !hasResponded && (review.status === 'pending' || review.status === 'in_review');
  const canApply = isRequester && review.status === 'approved';

  const approvalCount = review.responses?.filter((r) => r.decision === 'approve').length || 0;
  const requiredApprovals = review.requiredApprovals || 1;

  const statusConfig = {
    pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
    in_review: { color: 'bg-blue-500/20 text-blue-400', label: 'In Review' },
    changes_requested: { color: 'bg-orange-500/20 text-orange-400', label: 'Changes Requested' },
    approved: { color: 'bg-green-500/20 text-green-400', label: 'Approved' },
    rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rejected' },
    applied: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Applied' },
    expired: { color: 'bg-gray-500/20 text-gray-400', label: 'Expired' },
  };

  const reviewTypeConfig = {
    phase_output: { label: 'Phase Output', color: 'text-blue-400' },
    code_change: { label: 'Code Change', color: 'text-purple-400' },
    feature_addition: { label: 'Feature Addition', color: 'text-green-400' },
    bug_fix: { label: 'Bug Fix', color: 'text-orange-400' },
    refactor: { label: 'Refactor', color: 'text-cyan-400' },
  };

  const handleSubmitResponse = async () => {
    if (!responseDecision) return;

    setIsSubmitting(true);
    try {
      await onSubmitResponse(review.id, responseDecision, responseComments || undefined);
      setShowResponseForm(false);
      setResponseDecision(null);
      setResponseComments('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply(review.id);
    } finally {
      setIsApplying(false);
    }
  };

  const totalFiles = (review.filesToAdd?.length || 0) + (review.filesToModify?.length || 0);

  return (
    <div className={`bg-gray-800 rounded-lg border transition-colors ${
      canReview ? 'border-emerald-500/30' : 'border-gray-700'
    }`}>
      {/* Card Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-750"
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[review.status].color}`}>
                {statusConfig[review.status].label}
              </span>
              <span className={`text-xs ${reviewTypeConfig[review.reviewType].color}`}>
                {reviewTypeConfig[review.reviewType].label}
              </span>
              {review.featureName && (
                <span className="text-xs text-gray-500">• {review.featureName}</span>
              )}
            </div>
            <h4 className="text-white font-medium">{review.title}</h4>
            {review.description && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{review.description}</p>
            )}
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

        {/* Progress */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="text-gray-400">
              {totalFiles} file{totalFiles !== 1 ? 's' : ''} changed
            </span>
            <span className="text-gray-400">
              {approvalCount}/{requiredApprovals} approvals
            </span>
          </div>
          <div className="flex items-center gap-1">
            {review.assignedReviewers.map((reviewerId) => {
              const member = teamMembers.find((m) => m.id === reviewerId);
              const response = review.responses?.find((r) => r.reviewerId === reviewerId);
              const responseColor = response
                ? response.decision === 'approve'
                  ? 'ring-green-500'
                  : response.decision === 'reject'
                    ? 'ring-red-500'
                    : 'ring-orange-500'
                : 'ring-gray-600';
              return (
                <div
                  key={reviewerId}
                  className={`w-6 h-6 rounded-full bg-gray-700 ring-2 ${responseColor} flex items-center justify-center text-xs text-white`}
                  title={member?.name || member?.email || 'Reviewer'}
                >
                  {(member?.name || member?.email || 'R')[0].toUpperCase()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700 p-4 space-y-4">
          {/* Files to Add */}
          {review.filesToAdd && review.filesToAdd.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <span className="text-green-400">+</span>
                Files to Add ({review.filesToAdd.length})
              </h5>
              <div className="space-y-1">
                {review.filesToAdd.map((file, index) => (
                  <FilePreview
                    key={index}
                    path={file.path}
                    content={file.content}
                    type="add"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Files to Modify */}
          {review.filesToModify && review.filesToModify.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <span className="text-yellow-400">~</span>
                Files to Modify ({review.filesToModify.length})
              </h5>
              <div className="space-y-1">
                {review.filesToModify.map((file, index) => (
                  <FilePreview
                    key={index}
                    path={file.path}
                    oldContent={file.oldContent}
                    newContent={file.newContent}
                    type="modify"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Responses */}
          {review.responses && review.responses.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Reviews</h5>
              {review.responses.map((response) => (
                <ResponseCard
                  key={response.id}
                  response={response}
                  teamMembers={teamMembers}
                />
              ))}
            </div>
          )}

          {/* Response Form */}
          {canReview && (
            <div className="space-y-3 pt-2 border-t border-gray-700">
              {showResponseForm ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(['approve', 'request_changes', 'reject'] as const).map((decision) => {
                      const config = {
                        approve: { bg: 'bg-green-600', label: 'Approve' },
                        request_changes: { bg: 'bg-orange-600', label: 'Request Changes' },
                        reject: { bg: 'bg-red-600', label: 'Reject' },
                      };
                      return (
                        <button
                          key={decision}
                          onClick={() => setResponseDecision(decision)}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            responseDecision === decision
                              ? `${config[decision].bg} text-white`
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {config[decision].label}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={responseComments}
                    onChange={(e) => setResponseComments(e.target.value)}
                    placeholder="Add comments (optional)..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmitResponse}
                      disabled={!responseDecision || isSubmitting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        'Submit Review'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowResponseForm(false);
                        setResponseDecision(null);
                        setResponseComments('');
                      }}
                      className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowResponseForm(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Add Your Review
                </button>
              )}
            </div>
          )}

          {/* Apply Button */}
          {canApply && (
            <div className="pt-2 border-t border-gray-700">
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isApplying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Applying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Apply Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FilePreviewProps {
  path: string;
  content?: string;
  oldContent?: string;
  newContent?: string;
  type: 'add' | 'modify';
}

function FilePreview({ path, content, oldContent, newContent, type }: FilePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={type === 'add' ? 'text-green-400' : 'text-yellow-400'}>
            {type === 'add' ? '+' : '~'}
          </span>
          <span className="text-sm text-gray-300 font-mono">{path}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="border-t border-gray-800 max-h-64 overflow-auto">
          <pre className="p-3 text-xs text-gray-300 font-mono whitespace-pre-wrap">
            {type === 'add' ? content : newContent}
          </pre>
        </div>
      )}
    </div>
  );
}

interface ResponseCardProps {
  response: AIReviewResponse;
  teamMembers: { id: string; name?: string; email?: string }[];
}

function ResponseCard({ response, teamMembers }: ResponseCardProps) {
  const reviewer = teamMembers.find((m) => m.id === response.reviewerId);

  const decisionConfig = {
    approve: { color: 'text-green-400 bg-green-500/20', icon: '✓', label: 'Approved' },
    request_changes: { color: 'text-orange-400 bg-orange-500/20', icon: '✎', label: 'Requested Changes' },
    reject: { color: 'text-red-400 bg-red-500/20', icon: '✗', label: 'Rejected' },
  };

  const config = decisionConfig[response.decision];

  return (
    <div className="bg-gray-900 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center text-sm`}>
          {config.icon}
        </span>
        <span className="text-sm text-white font-medium">
          {reviewer?.name || reviewer?.email || 'Reviewer'}
        </span>
        <span className={`text-xs ${config.color.split(' ')[0]}`}>
          {config.label}
        </span>
        <span className="text-xs text-gray-500 ml-auto">
          {new Date(response.createdAt).toLocaleDateString()}
        </span>
      </div>
      {response.comments && (
        <p className="text-sm text-gray-400 ml-8">{response.comments}</p>
      )}
    </div>
  );
}
