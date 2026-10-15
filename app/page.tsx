'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatSession,
  Message,
  Attachment,
  AppSettings,
  DEFAULT_SETTINGS,
} from '@/lib/types';
import {
  getAllChats,
  saveChat,
  deleteChat as dbDeleteChat,
  deleteAllChats as dbDeleteAllChats,
  importChats as dbImportChats,
} from '@/lib/storage';
import {
  streamChatCompletion,
  generateChatTitle,
} from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { ChatView } from '@/components/ChatView';
import { SettingsModal } from '@/components/SettingsModal';

const SETTINGS_KEY = 'astrachat_settings';

function createNewChatSession(model: string, systemPrompt?: string): ChatSession {
  const now = Date.now();
  return {
    id: `chat_${now}_${Math.random().toString(36).substring(2, 8)}`,
    title: 'New Conversation',
    messages: [],
    createdAt: now,
    updatedAt: now,
    model,
    systemPrompt,
  };
}

function applyTheme(theme: 'dark' | 'light') {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

function getInitialSettings(): { settings: AppSettings; isFirstLaunch: boolean } {
  if (typeof window === 'undefined') {
    return { settings: DEFAULT_SETTINGS, isFirstLaunch: false };
  }
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      const resolvedTheme: 'dark' | 'light' = parsed.theme === 'light' ? 'light' : 'dark';
      const merged: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        theme: resolvedTheme,
      };
      applyTheme(merged.theme);
      return { settings: merged, isFirstLaunch: !merged.apiKey };
    }
  } catch (e) {
    console.error('Failed to parse settings', e);
  }
  applyTheme('dark');
  return { settings: DEFAULT_SETTINGS, isFirstLaunch: true };
}

export default function Home() {
  const [initialData] = useState(getInitialSettings);
  const [settings, setSettings] = useState<AppSettings>(initialData.settings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(initialData.isFirstLaunch);
  const [isFirstLaunch, setIsFirstLaunch] = useState(initialData.isFirstLaunch);

  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync theme when settings change
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const handleToggleTheme = () => {
    const newTheme: 'dark' | 'light' = settings.theme === 'dark' ? 'light' : 'dark';
    const updated: AppSettings = { ...settings, theme: newTheme };
    setSettings(updated);
    applyTheme(newTheme);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    applyTheme(newSettings.theme);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
    setIsFirstLaunch(false);
  };

  // 2. Initialize chats from IndexedDB
  useEffect(() => {
    let isMounted = true;
    async function loadInitialChats() {
      try {
        const loadedChats = await getAllChats();
        if (!isMounted) return;

        if (loadedChats.length > 0) {
          setChats(loadedChats);
          setActiveChatId(loadedChats[0].id);
        } else {
          const fresh = createNewChatSession(settings.model, settings.systemPrompt);
          await saveChat(fresh);
          if (!isMounted) return;
          setChats([fresh]);
          setActiveChatId(fresh.id);
        }
      } catch (err) {
        console.error('Failed to initialize chats from IndexedDB:', err);
      }
    }
    loadInitialChats();
    return () => {
      isMounted = false;
    };
  }, [settings.model, settings.systemPrompt]);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  // Global keyboard shortcuts
  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Create new chat
  const handleNewChat = useCallback(async () => {
    if (activeChatRef.current && activeChatRef.current.messages.length === 0) {
      return;
    }
    const fresh = createNewChatSession(settings.model, settings.systemPrompt);
    await saveChat(fresh);
    setChats((prev) => [fresh, ...prev]);
    setActiveChatId(fresh.id);
  }, [settings.model, settings.systemPrompt]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewChat]);

  // Select chat
  const handleSelectChat = (id: string) => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveChatId(id);
  };

  // Rename chat
  const handleRenameChat = async (id: string, newTitle: string) => {
    const updatedChats = chats.map((c) =>
      c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c
    );
    setChats(updatedChats);
    const target = updatedChats.find((c) => c.id === id);
    if (target) {
      await saveChat(target);
    }
  };

  // Delete chat
  const handleDeleteChat = async (id: string) => {
    await dbDeleteChat(id);
    const remaining = chats.filter((c) => c.id !== id);
    setChats(remaining);

    if (activeChatId === id) {
      if (remaining.length > 0) {
        setActiveChatId(remaining[0].id);
      } else {
        const fresh = createNewChatSession(settings.model, settings.systemPrompt);
        await saveChat(fresh);
        setChats([fresh]);
        setActiveChatId(fresh.id);
      }
    }
  };

  // Delete all chats
  const handleDeleteAllChats = async () => {
    await dbDeleteAllChats();
    const fresh = createNewChatSession(settings.model, settings.systemPrompt);
    await saveChat(fresh);
    setChats([fresh]);
    setActiveChatId(fresh.id);
  };

  // Export all chats as backup JSON
  const handleExportAllChats = () => {
    const backupJson = JSON.stringify(chats, null, 2);
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astrachat_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import backup JSON
  const handleImportChats = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const chatsToImport: ChatSession[] = Array.isArray(parsed) ? parsed : [parsed];
      await dbImportChats(chatsToImport);
      const all = await getAllChats();
      setChats(all);
      if (all.length > 0) {
        setActiveChatId(all[0].id);
      }
    } catch (err: any) {
      console.error('Import failed', err);
      alert(`Import failed: ${err?.message || 'Invalid backup file'}`);
    }
  };

  // Core stream runner
  const executeGeneration = async (
    targetChatId: string,
    historyMessages: Message[],
    assistantMessageId: string
  ) => {
    if (!settings.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    let accumulatedContent = '';
    let accumulatedReasoning = '';

    try {
      await streamChatCompletion({
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl,
        model: settings.model,
        temperature: settings.temperature,
        systemPrompt: settings.systemPrompt,
        messages: historyMessages,
        signal: controller.signal,
        onDelta: (chunk) => {
          accumulatedContent += chunk;
          setChats((prev) =>
            prev.map((c) => {
              if (c.id !== targetChatId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: accumulatedContent,
                        isStreaming: true,
                        error: false,
                      }
                    : m
                ),
              };
            })
          );
        },
        onReasoning: (chunk) => {
          accumulatedReasoning += chunk;
          setChats((prev) =>
            prev.map((c) => {
              if (c.id !== targetChatId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        reasoning: accumulatedReasoning,
                        isStreaming: true,
                      }
                    : m
                ),
              };
            })
          );
        },
      });

      // Generation completed successfully
      setChats((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== targetChatId) return c;
          const finalMessages = c.messages.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: accumulatedContent,
                  reasoning: accumulatedReasoning || undefined,
                  isStreaming: false,
                  error: false,
                }
              : m
          );
          const updatedChat = {
            ...c,
            messages: finalMessages,
            updatedAt: Date.now(),
          };
          saveChat(updatedChat).catch(console.error);
          return updatedChat;
        });
        return updated;
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User aborted intentionally: keep what has streamed so far
        setChats((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== targetChatId) return c;
            const finalMessages = c.messages.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: accumulatedContent,
                    reasoning: accumulatedReasoning || undefined,
                    isStreaming: false,
                  }
                : m
            );
            const updatedChat = {
              ...c,
              messages: finalMessages,
              updatedAt: Date.now(),
            };
            saveChat(updatedChat).catch(console.error);
            return updatedChat;
          });
          return updated;
        });
      } else {
        // Real API or network error
        const errorMessage = err?.message || 'An unknown error occurred during generation.';
        setChats((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== targetChatId) return c;
            const finalMessages = c.messages.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: accumulatedContent,
                    error: true,
                    errorMessage,
                    isStreaming: false,
                  }
                : m
            );
            const updatedChat = {
              ...c,
              messages: finalMessages,
              updatedAt: Date.now(),
            };
            saveChat(updatedChat).catch(console.error);
            return updatedChat;
          });
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Send message
  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if (!activeChat) return;

    if (!settings.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    const isFirstUserMessage = activeChat.messages.length === 0;
    const now = Date.now();

    const userMessage: Message = {
      id: `msg_user_${now}_${Math.random().toString(36).substring(2, 6)}`,
      role: 'user',
      content: text,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: now,
    };

    const assistantMessageId = `msg_asst_${now + 1}_${Math.random().toString(36).substring(2, 6)}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: now + 1,
      isStreaming: true,
    };

    const updatedMessages = [...activeChat.messages, userMessage, assistantMessage];
    const updatedChat: ChatSession = {
      ...activeChat,
      messages: updatedMessages,
      updatedAt: now,
    };

    // Update in-memory state & persist
    setChats((prev) => prev.map((c) => (c.id === activeChat.id ? updatedChat : c)));
    await saveChat(updatedChat);

    // Auto-generate title if this is the first message
    if (isFirstUserMessage) {
      generateChatTitle({
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl,
        model: settings.model,
        firstMessage: text || (attachments[0]?.name ? `File: ${attachments[0].name}` : 'Conversation'),
      }).then((newTitle) => {
        handleRenameChat(activeChat.id, newTitle);
      });
    }

    // Execute generation with history excluding the empty assistant placeholder
    const conversationHistory = [...activeChat.messages, userMessage];
    executeGeneration(activeChat.id, conversationHistory, assistantMessageId);
  };

  // Stop streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = async () => {
    if (!activeChat || isStreaming) return;

    const msgs = [...activeChat.messages];
    if (msgs.length === 0) return;

    // Pop the last assistant message if present
    if (msgs[msgs.length - 1].role === 'assistant') {
      msgs.pop();
    }

    const now = Date.now();
    const assistantMessageId = `msg_asst_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const newAssistantMsg: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: now,
      isStreaming: true,
    };

    const updatedMessages = [...msgs, newAssistantMsg];
    const updatedChat: ChatSession = {
      ...activeChat,
      messages: updatedMessages,
      updatedAt: now,
    };

    setChats((prev) => prev.map((c) => (c.id === activeChat.id ? updatedChat : c)));
    await saveChat(updatedChat);

    executeGeneration(activeChat.id, msgs, assistantMessageId);
  };

  // Edit user message and re-run from that message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeChat || isStreaming) return;

    const index = activeChat.messages.findIndex((m) => m.id === messageId);
    if (index === -1) return;

    const originalMsg = activeChat.messages[index];
    const editedUserMsg: Message = {
      ...originalMsg,
      content: newContent,
    };

    // Keep all messages up to this user message, trim later ones
    const preservedHistory = activeChat.messages.slice(0, index);
    const updatedHistory = [...preservedHistory, editedUserMsg];

    const now = Date.now();
    const assistantMessageId = `msg_asst_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const assistantMsg: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: now,
      isStreaming: true,
    };

    const updatedChat: ChatSession = {
      ...activeChat,
      messages: [...updatedHistory, assistantMsg],
      updatedAt: now,
    };

    setChats((prev) => prev.map((c) => (c.id === activeChat.id ? updatedChat : c)));
    await saveChat(updatedChat);

    executeGeneration(activeChat.id, updatedHistory, assistantMessageId);
  };

  // Retry failed assistant message
  const handleRetry = () => {
    handleRegenerate();
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-white dark:bg-neutral-900 select-none">
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        currentModel={settings.model}
      />

      {/* Main Chat Area */}
      <ChatView
        currentChat={activeChat}
        currentModel={settings.model}
        isStreaming={isStreaming}
        onSendMessage={handleSendMessage}
        onStopStreaming={handleStopStreaming}
        onRegenerate={handleRegenerate}
        onEditMessage={handleEditMessage}
        onRetry={handleRetry}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onNewChat={handleNewChat}
        isKeyConfigured={Boolean(settings.apiKey)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Settings Modal (Also triggers on First Launch) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        isFirstLaunch={isFirstLaunch}
        onDeleteAllChats={handleDeleteAllChats}
        onExportAllChats={handleExportAllChats}
        onImportChats={handleImportChats}
      />
    </main>
  );
}
