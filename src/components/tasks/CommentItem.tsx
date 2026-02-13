import React, { useState } from 'react';
import type { Comment, User } from '../../types';
import { Avatar, Badge } from '../common';

interface CommentItemProps {
  comment: Comment;
  users: User[];
  currentUserId?: string;
  onReply?: (comment: Comment) => void;
  onEdit?: (comment: Comment) => void;
  onDelete?: (comment: Comment) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  users,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongContent = comment.content.length > 300;

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderContent = (content: string) => {
    // Replace @mentions with highlighted spans
    const parts = content.split(/(@\w+|\S+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const name = part.slice(1);
        const user = users.find((u) => u.name.toLowerCase() === name.toLowerCase());
        if (user) {
          return (
            <span
              key={index}
              className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1 rounded"
            >
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  const isOwner = currentUserId === comment.userId;

  return (
    <div className="flex gap-3 py-4">
      {/* Avatar */}
      <Avatar
        name={comment.user?.name || 'Unknown'}
        src={comment.user?.avatarUrl || null}
        size="md"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 dark:text-white">
            {comment.user?.name || 'Unknown User'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimeAgo(comment.createdAt)}
          </span>
          {comment.updatedAt !== comment.createdAt && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
        </div>

        {/* Content */}
        <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
          {isLongContent && !isExpanded ? (
            <>
              {renderContent(comment.content.slice(0, 300) + '...')}
              <button
                onClick={() => setIsExpanded(true)}
                className="ml-1 text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Show more
              </button>
            </>
          ) : (
            <>
              {renderContent(comment.content)}
              {isLongContent && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="ml-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Show less
                </button>
              )}
            </>
          )}
        </div>

        {/* Mentions badges */}
        {comment.mentions && comment.mentions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {comment.mentions.map((mention, index) => (
              <Badge key={index} variant="primary" size="sm">
                @{mention.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Attachments */}
        {comment.attachments && comment.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {comment.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {attachment.fileName}
              </a>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-2 flex items-center gap-3">
          {onReply && (
            <button
              onClick={() => onReply(comment)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Reply
            </button>
          )}
          {isOwner && onEdit && (
            <button
              onClick={() => onEdit(comment)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Edit
            </button>
          )}
          {(isOwner || onDelete) && onDelete && (
            <button
              onClick={() => onDelete(comment)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
