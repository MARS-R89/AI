'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  Pencil,
  FileText,
  FileCode,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Message, Attachment } from '@/lib/types';
import { copyToClipboard, formatFileSize } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageItemProps {
  message: Message;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onRetry?: () => void;
}

export function MessageItem({
  message,
  isLastAssistant,
  onRegenerate,
  onEdit,
  onRetry,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showThinking, setShowThinking] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <div
      className={`group relative w-full py-4 transition-colors ${
        isUser ? 'flex justify-end' : 'flex justify-start'
      }`}
    >
      {/* USER MESSAGE */}
      {isUser ? (
        <div className="max-w-[85%] md:max-w-[75%] space-y-2">
          {/* Attached Files Chips */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end mb-1.5">
              {message.attachments.map((file: Attachment) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-200/70 dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 border border-neutral-300/60 dark:border-neutral-700"
                >
                  {file.kind === 'image' && file.dataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={file.dataUrl}
                      alt={file.name}
                      className="w-5 h-5 rounded object-cover"
                    />
                  ) : file.kind === 'pdf' ? (
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5 text-blue-500" />
                  )}
                  <span className="font-medium truncate max-w-[140px]">{file.name}</span>
                  <span className="text-[10px] text-neutral-500">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* User Bubble or Inline Editor */}
          {isEditing ? (
            <div className="w-full min-w-[280px] sm:min-w-[420px] p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 shadow-sm space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 p-2.5 rounded-xl text-sm border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y min-h-[90px]"
                rows={3}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="rounded-2xl px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-[15px] leading-relaxed break-words whitespace-pre-wrap select-text shadow-sm border border-neutral-200/50 dark:border-neutral-700/50">
                {message.content}
              </div>

              {/* Hover actions for user */}
              <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-end gap-1 mt-1 text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                  title="Edit message"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                  title="Copy message"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ASSISTANT MESSAGE */
        <div className="w-full space-y-2">
          <div className="flex items-start gap-3">
            {/* Assistant Avatar */}
            <div className="w-7 h-7 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/20">
              <Sparkles className="w-4 h-4" />
            </div>

            {/* Assistant Body (plain text / markdown, no bubble) */}
            <div className="flex-1 min-w-0">
              {/* Optional Reasoning / Thinking Disclosure (for reasoning models) */}
              {message.reasoning && (
                <div className="mb-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 overflow-hidden text-xs text-neutral-600 dark:text-neutral-400">
                  <button
                    type="button"
                    onClick={() => setShowThinking(!showThinking)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <span className="font-medium flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      {showThinking ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      Thinking process
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {showThinking ? 'Hide' : 'Expand'}
                    </span>
                  </button>
                  {showThinking && (
                    <div className="px-3 pb-3 pt-1 text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap font-mono text-[12px] leading-relaxed border-t border-neutral-200 dark:border-neutral-800">
                      {message.reasoning}
                    </div>
                  )}
                </div>
              )}

              {/* Error Message Card */}
              {message.error ? (
                <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-sm space-y-2.5 text-red-700 dark:text-red-300">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-red-800 dark:text-red-200">
                        Generation Failed
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed">
                        {message.errorMessage || 'An error occurred while generating the response.'}
                      </p>
                    </div>
                  </div>
                  {onRetry && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={onRetry}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Normal Markdown Response */
                <div className="relative">
                  <MarkdownRenderer content={message.content} />

                  {/* Pulsing cursor while actively streaming */}
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />
                  )}
                </div>
              )}

              {/* Assistant Message Actions */}
              {!message.isStreaming && !message.error && message.content && (
                <div className="flex items-center gap-1 mt-2 text-xs text-neutral-400 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                    title="Copy full response"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[11px] text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Copy</span>
                      </>
                    )}
                  </button>

                  {isLastAssistant && onRegenerate && (
                    <button
                      type="button"
                      onClick={onRegenerate}
                      className="flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                      title="Regenerate response"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Regenerate</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
