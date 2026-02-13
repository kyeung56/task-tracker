import React, { useEffect, useState } from 'react';
import type { Comment, User, Mention } from '../../types';
import { commentsApi, uploadsApi } from '../../api';
import { SkeletonList } from '../common';
import CommentItem from './CommentItem';
import CommentEditor from './CommentEditor';
import { EmptyComments } from '../common';

interface TaskCommentsProps {
  taskId: string;
  users: User[];
  currentUserId?: string;
}

const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, users, currentUserId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  const fetchComments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await commentsApi.getByTaskId(taskId);
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  const handleSubmitComment = async (content: string, mentions: Mention[], files: File[]) => {
    // Upload files first
    const uploadedAttachments = [];
    for (const file of files) {
      try {
        const attachment = await uploadsApi.upload(file, taskId);
        uploadedAttachments.push(attachment);
      } catch (err) {
        console.error('Failed to upload file:', err);
      }
    }

    // Create comment
    const newComment = await commentsApi.create(taskId, {
      content,
      mentions,
      parentCommentId: replyingTo?.id,
    });

    setComments((prev) => [...prev, newComment]);
    setReplyingTo(null);
  };

  const handleEditComment = async (comment: Comment, content: string, mentions: Mention[]) => {
    try {
      const updated = await commentsApi.update(comment.id, { content, mentions });
      setComments((prev) => prev.map((c) => (c.id === comment.id ? updated : c)));
      setEditingComment(null);
    } catch (err) {
      console.error('Failed to edit comment:', err);
    }
  };

  const handleDeleteComment = async (comment: Comment) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await commentsApi.delete(comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="py-4">
        <SkeletonList count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center text-red-600 dark:text-red-400">
        <p>{error}</p>
        <button
          onClick={fetchComments}
          className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="task-comments">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Comments ({comments.length})
      </h3>

      {/* Comments list */}
      {comments.length === 0 ? (
        <EmptyComments />
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {comments.map((comment) => (
            <div key={comment.id}>
              {editingComment?.id === comment.id ? (
                <CommentEditor
                  taskId={taskId}
                  users={users}
                  onSubmit={(content, mentions) =>
                    handleEditComment(comment, content, mentions)
                  }
                  onCancel={() => setEditingComment(null)}
                  initialContent={comment.content}
                  initialMentions={comment.mentions}
                  submitLabel="Save"
                />
              ) : (
                <CommentItem
                  comment={comment}
                  users={users}
                  currentUserId={currentUserId}
                  onReply={setReplyingTo}
                  onEdit={setEditingComment}
                  onDelete={handleDeleteComment}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply indicator */}
      {replyingTo && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Replying to <strong>{replyingTo.user?.name}</strong>
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      )}

      {/* New comment editor */}
      <div className="mt-4">
        <CommentEditor
          taskId={taskId}
          users={users}
          onSubmit={handleSubmitComment}
          placeholder={replyingTo ? 'Write a reply...' : 'Write a comment, @ to mention someone...'}
        />
      </div>
    </div>
  );
};

export default TaskComments;
