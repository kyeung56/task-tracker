import React, { useState, useRef, useEffect } from 'react';
import type { User, Mention } from '../../types';

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: Mention[]) => void;
  users: User[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  users,
  placeholder = 'Write a comment, @ to mention someone...',
  className = '',
  disabled = false,
  rows = 3,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [filter, setFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter users based on current input
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(filter.toLowerCase())
  );

  // Find @ mentions in the text
  const extractMentions = (text: string): Mention[] => {
    const mentionRegex = /@(\w+|\S+)/g;
    const mentions: Mention[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const name = match[1];
      const user = users.find(
        (u) => u.name.toLowerCase() === name.toLowerCase() || u.id === name
      );
      if (user) {
        mentions.push({ userId: user.id, name: user.name });
      }
    }

    return mentions;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    // Find if we're typing a mention
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && lastAtIndex < cursorPos) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

      // Check if there's a space (which would end the mention)
      if (!textAfterAt.includes(' ')) {
        setMentionStart(lastAtIndex);
        setFilter(textAfterAt);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }

    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);
  };

  const insertMention = (user: User) => {
    if (!textareaRef.current || mentionStart === -1) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart || 0;
    const before = value.substring(0, mentionStart);
    const after = value.substring(cursorPos);
    const newValue = `${before}@${user.name} ${after}`;

    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);

    setShowSuggestions(false);
    setMentionStart(-1);
    setFilter('');

    // Set cursor position after the inserted mention
    setTimeout(() => {
      const newCursorPos = mentionStart + user.name.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredUsers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSuggestionIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        insertMention(filteredUsers[suggestionIndex]);
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  useEffect(() => {
    setSuggestionIndex(0);
  }, [filter]);

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
      />

      {/* Mention suggestions dropdown */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className={`w-full flex items-center px-3 py-2 text-left ${
                index === suggestionIndex
                  ? 'bg-indigo-50 dark:bg-indigo-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-sm font-medium text-indigo-600 dark:text-indigo-300 mr-2">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
