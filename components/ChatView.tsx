'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Menu,
  Download,
  Plus,
  ArrowDown,
  Sparkles,
  Code,
  FileSearch,
  Lightbulb,
} from 'lucide-react';
import { ChatSession, Attachment } from '@/lib/types';
import { exportChatAsMarkdown, exportChatAsJson, downloadFile } from '@/lib/utils';
import { MessageItem } from './MessageItem';
import { Composer } from './Composer';

interface ChatViewProps {
  currentChat: ChatSession | null;
  currentModel: string;
  isStreaming: boolean;
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  onStopStreaming: () => void;
  onRegenerate: () => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onRetry: () => void;
  onOpenMobileSidebar: () => void;
  onNewChat: () => void;
  isKeyConfigured: boolean;
  onOpenSettings: () => void;
}

const STARTER_PROMPTS = [
  {
    icon: Lightbulb,
    title: 'Explain a complex concept',
    prompt: 'Explain quantum computing in simple terms with everyday analogies.',
  },
  {
    icon: Code,
    title: 'Write production code',
    prompt: 'Write a robust TypeScript generic debounce function with leading and trailing options.',
  },
  {
    icon: FileSearch,
    title: 'Document & PDF analysis',
    prompt: 'I will upload a PDF or code file. Help me summarize the key takeaways and architectural points.',
  },
  {
    icon: Sparkles,
    title: 'Brainstorm creative ideas',
    prompt: 'Give me 5 distinctive product ideas for an AI-native productivity tool.',
  },
];

export function ChatView({
  currentChat,
  currentModel,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onRegenerate,
  onEditMessage,
  onRetry,
  onOpenMobileSidebar,
  onNewChat,
  isKeyConfigured,
  onOpenSettings,
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  // Auto-scroll handler
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // Listen to scroll events to detect if user has scrolled away from bottom
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceToBottom > 120;
    setShowScrollBottom(isUp);
    setIsUserScrolledUp(isUp);
  };

  // Auto-scroll when messages update or streaming, only if user hasn't scrolled up
  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom(false);
    }
  }, [currentChat?.messages, isUserScrolledUp, scrollToBottom]);

  const messages = currentChat?.messages || [];
  const isEmpty = messages.length === 0;

  const handleExportMd = () => {
    if (!currentChat) return;
    const md = exportChatAsMarkdown(currentChat);
    const safeTitle = currentChat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadFile(md, `${safeTitle}.md`, 'text/markdown');
  };

  const handleExportJson = () => {
    if (!currentChat) return;
    const json = exportChatAsJson(currentChat);
    const safeTitle = currentChat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadFile(json, `${safeTitle}.json`, 'application/json');
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Chat Title / Model Pill */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-semibold text-sm truncate max-w-[200px] sm:max-w-[320px] text-neutral-900 dark:text-neutral-100">
              {currentChat?.title || 'New Conversation'}
            </h1>
            <button
              type="button"
              onClick={onOpenSettings}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
              title="Change model in settings"
            >
              {currentModel}
            </button>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* New Chat icon shortcut */}
          <button
            type="button"
            onClick={onNewChat}
            className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Export Dropdown / Menu */}
          {!isEmpty && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleExportMd}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700"
                title="Export as Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export .md</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700"
                title="Export as JSON"
              >
                <span>.json</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-6 relative"
      >
        <div className="max-w-3xl mx-auto w-full min-h-full flex flex-col justify-between py-6">
          {isEmpty ? (
            /* Empty State Screen */
            <div className="my-auto py-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>

              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight mb-1.5">
                What can I help you with today?
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mb-8">
                Powered by{' '}
                <span className="font-mono text-neutral-700 dark:text-neutral-300 font-medium">
                  {currentModel}
                </span>
                . Attach code, images, or PDFs to discuss and analyze.
              </p>

              {/* Starter Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
                {STARTER_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSendMessage(item.prompt, [])}
                      className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 hover:bg-neutral-100/80 dark:hover:bg-neutral-800 transition-colors group text-left shadow-2xs"
                    >
                      <div className="flex items-center gap-2 mb-1 text-neutral-700 dark:text-neutral-300 text-xs font-medium">
                        <Icon className="w-4 h-4 text-blue-500" />
                        <span>{item.title}</span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                        {item.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Message List */
            <div className="space-y-4 divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {messages.map((message, idx) => {
                const isLastAssistant =
                  message.role === 'assistant' && idx === messages.length - 1;

                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isLastAssistant={isLastAssistant}
                    onRegenerate={onRegenerate}
                    onEdit={onEditMessage}
                    onRetry={onRetry}
                  />
                );
              })}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Floating Scroll To Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => {
            setIsUserScrolledUp(false);
            scrollToBottom(true);
          }}
          className="fixed bottom-28 right-6 md:right-1/2 md:translate-x-44 z-20 p-2 rounded-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 shadow-md text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-all hover:scale-105"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Fixed Bottom Input Composer */}
      <div className="w-full pb-4 pt-1 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-neutral-900 dark:via-neutral-900/95 dark:to-transparent shrink-0">
        <Composer
          onSend={onSendMessage}
          onStop={onStopStreaming}
          isStreaming={isStreaming}
          disabled={!isKeyConfigured}
        />
      </div>
    </div>
  );
}
