import React, { useState } from 'react';
import type { User, Mention } from '../../types';
import { MentionInput, FileUploader } from '../common';

interface CommentEditorProps {
  taskId: string;
  users: User[];
  onSubmit: (content: string, mentions: Mention[], files: File[]) => Promise<void>;
  onCancel?: () => void;
  initialContent?: string;
  initialMentions?: Mention[];
  placeholder?: string;
  submitLabel?: string;
}

const CommentEditor: React.FC<CommentEditorProps> = ({
  taskId,
  users,
  onSubmit,
  onCancel,
  initialContent = '',
  initialMentions = [],
  placeholder = 'Write a comment, @ to mention someone...',
  submitLabel = 'Send',
}) => {
  const [content, setContent] = useState(initialContent);
  const [mentions, setMentions] = useState<Mention[]>(initialMentions);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content, mentions, files);
      setContent('');
      setMentions([]);
      setFiles([]);
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex gap-3">
        {/* Avatar would go here */}
        <div className="flex-1">
          <MentionInput
            value={content}
            onChange={(newContent, newMentions) => {
              setContent(newContent);
              setMentions(newMentions);
            }}
            users={users}
            placeholder={placeholder}
            rows={3}
          />

          <div className="mt-3 flex items-center justify-between">
            <FileUploader
              files={files}
              onChange={setFiles}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              maxSize={10 * 1024 * 1024}
              maxFiles={5}
            />

            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (!content.trim() && files.length === 0)}
                className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Sending...' : submitLabel}
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> to send
          </p>
        </div>
      </div>
    </div>
  );
};

export default CommentEditor;
