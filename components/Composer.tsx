'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Paperclip,
  ArrowUp,
  Square,
  X,
  FileText,
  FileCode,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Attachment } from '@/lib/types';
import { extractPdfText } from '@/lib/pdf';
import { formatFileSize } from '@/lib/utils';

interface ComposerProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

export function Composer({ onSend, onStop, isStreaming, disabled }: ComposerProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 200);
    el.style.height = `${Math.max(newHeight, 48)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [text, adjustTextareaHeight]);

  const processFiles = async (fileList: FileList | File[]) => {
    setFileWarning(null);
    setIsProcessingFile(true);

    const newAttachments: Attachment[] = [];

    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE) {
        setFileWarning(`"${file.name}" exceeds the 10MB size limit and was skipped.`);
        continue;
      }

      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 1. Image
      if (file.type.startsWith('image/')) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });

          newAttachments.push({
            id,
            name: file.name,
            size: file.size,
            type: file.type,
            kind: 'image',
            dataUrl,
          });
        } catch (err) {
          console.error('Failed to read image:', err);
          setFileWarning(`Could not read image "${file.name}".`);
        }
      }
      // 2. PDF
      else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
          const extractedText = await extractPdfText(file);
          newAttachments.push({
            id,
            name: file.name,
            size: file.size,
            type: 'application/pdf',
            kind: 'pdf',
            textContent: extractedText,
          });
        } catch (err: any) {
          console.error('Failed to process PDF:', err);
          setFileWarning(err?.message || `Could not extract text from "${file.name}".`);
        }
      }
      // 3. Text or code file
      else {
        try {
          const textContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
          });

          newAttachments.push({
            id,
            name: file.name,
            size: file.size,
            type: file.type || 'text/plain',
            kind: 'text',
            textContent,
          });
        } catch (err) {
          console.error('Failed to read text file:', err);
          setFileWarning(`Could not read text file "${file.name}".`);
        }
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsProcessingFile(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isStreaming) {
      onStop();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isProcessingFile || disabled) return;

    onSend(trimmed, attachments);
    setText('');
    setAttachments([]);
    setFileWarning(null);

    // Reset textarea height after sending
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px';
      }
    }, 0);
  };

  // Clipboard paste support for images
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToProcess: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) filesToProcess.push(file);
      }
    }

    if (filesToProcess.length > 0) {
      processFiles(filesToProcess);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isProcessingFile;

  return (
    <div
      className="relative w-full max-w-3xl mx-auto px-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Over Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 mx-4 bg-blue-600/10 dark:bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-3xl flex items-center justify-center backdrop-blur-sm pointer-events-none">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Drop images, PDFs, or documents to attach
          </p>
        </div>
      )}

      {/* File Size Warning */}
      {fileWarning && (
        <div className="mb-2 flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fileWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setFileWarning(null)}
            className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative flex flex-col rounded-3xl bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200/90 dark:border-neutral-700/80 shadow-sm focus-within:border-neutral-400 dark:focus-within:border-neutral-600 transition-colors">
        {/* Attachment Previews */}
        {(attachments.length > 0 || isProcessingFile) && (
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-1">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="group relative flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 shadow-2xs"
              >
                {file.kind === 'image' && file.dataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="w-7 h-7 rounded-md object-cover"
                  />
                ) : file.kind === 'pdf' ? (
                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                ) : (
                  <FileCode className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="font-medium truncate max-w-[120px]">{file.name}</span>
                  <span className="text-[10px] text-neutral-400">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(file.id)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {isProcessingFile && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Processing file...</span>
              </div>
            )}
          </div>
        )}

        {/* Input & Action Row */}
        <div className="flex items-end gap-2 px-3 pb-2 pt-1.5">
          {/* File Picker Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.json,.csv,.js,.jsx,.ts,.tsx,.py,.html,.css"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile || disabled}
            className="p-2 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors disabled:opacity-40"
            title="Attach images, documents, or code"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Growing Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              disabled
                ? 'Configure your API key in Settings to begin chatting...'
                : 'Message AstraChat... (Shift+Enter for new line)'
            }
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-[15px] leading-relaxed resize-none focus:outline-none py-2 px-1 max-h-[200px]"
          />

          {/* Send / Stop Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
              title="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend || disabled}
              className={`p-2 rounded-full transition-all ${
                canSend && !disabled
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
              }`}
              title="Send message (Enter)"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
      <div className="text-center mt-2">
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
          Everything runs entirely in your browser. Chats are stored locally in IndexedDB.
        </p>
      </div>
    </div>
  );
}
