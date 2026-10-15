'use client';

import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Search,
  Settings,
  Sun,
  Moon,
  Trash2,
  Pencil,
  Check,
  X,
  SidebarClose,
} from 'lucide-react';
import { ChatSession } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface SidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  currentModel: string;
}

export function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onOpenSettings,
  theme,
  onToggleTheme,
  isOpenMobile,
  onCloseMobile,
  currentModel,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (chat: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const saveRename = (chatId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
  };

  const confirmDelete = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteChat(chatId);
    setDeleteConfirmId(null);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-neutral-900 text-neutral-200 border-r border-neutral-800 w-[270px] select-none">
      {/* Top Header: New Chat & Mobile Close */}
      <div className="p-3.5 space-y-3 border-b border-neutral-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              A
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              AstraChat
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Mobile close button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              title="Close sidebar"
            >
              <SidebarClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <button
          type="button"
          onClick={() => {
            onNewChat();
            if (isOpenMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-white text-xs font-medium transition-colors border border-neutral-700/70 shadow-xs"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" />
            New chat
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">⌘K</span>
        </button>

        {/* Search Filter Box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-neutral-800/60 border border-neutral-700/60 text-xs text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
          Recent Chats ({filteredChats.length})
        </div>

        {filteredChats.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-neutral-400">
            {searchQuery ? 'No matching conversations' : 'No chats yet. Start a new one!'}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const isEditingThis = editingChatId === chat.id;
            const isDeletingThis = deleteConfirmId === chat.id;

            return (
              <div
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat.id);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-neutral-800 text-white font-medium border border-neutral-700/80 shadow-2xs'
                    : 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white'
                }`}
              >
                {/* Chat title or Inline Edit Input */}
                {isEditingThis ? (
                  <div
                    className="flex items-center gap-1 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(chat.id, e);
                        if (e.key === 'Escape') setEditingChatId(null);
                      }}
                      className="flex-1 bg-neutral-900 text-white px-2 py-1 rounded text-xs border border-blue-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={(e) => saveRename(chat.id, e)}
                      className="p-1 hover:text-emerald-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelRename}
                      className="p-1 hover:text-neutral-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : isDeletingThis ? (
                  <div
                    className="flex items-center justify-between w-full px-1 py-0.5 text-red-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[11px] truncate">Delete chat?</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => confirmDelete(chat.id, e)}
                        className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] hover:bg-red-700"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(null);
                        }}
                        className="px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-300 text-[10px]"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 pr-1 flex-1">
                      <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{chat.title}</span>
                    </div>

                    {/* Hover actions: rename & delete */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-neutral-400 mr-1 tabular-nums hidden sm:inline">
                        {formatDate(chat.updatedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => startRename(chat, e)}
                        className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-700"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(chat.id);
                        }}
                        className="p-1 text-neutral-400 hover:text-red-400 rounded hover:bg-neutral-700"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Footer: Active model & Actions */}
      <div className="p-3 border-t border-neutral-800 space-y-2">
        <div className="flex items-center justify-between text-xs px-1 text-neutral-400">
          <span className="truncate max-w-[140px] font-mono text-[11px]" title={currentModel}>
            {currentModel}
          </span>
          <div className="flex items-center gap-1">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                if (isOpenMobile) onCloseMobile();
              }}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Open settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (fixed/static) */}
      <aside className="hidden md:flex flex-col h-screen shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative flex-1 flex flex-col max-w-[280px] w-full z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
