'use client';

import React, { useState } from 'react';
import {
  X,
  Key,
  Globe,
  Cpu,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Download,
  Upload,
  Sparkles,
} from 'lucide-react';
import { AppSettings } from '@/lib/types';
import { testConnection } from '@/lib/api';
import { maskApiKey } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  isFirstLaunch?: boolean;
  onDeleteAllChats?: () => void;
  onExportAllChats?: () => void;
  onImportChats?: (file: File) => void;
}

const PRESETS = [
  {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
  },
  {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
  },
  {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  {
    name: 'Local Ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
  },
];

function SettingsModalDialog({
  onClose,
  settings,
  onSaveSettings,
  isFirstLaunch = false,
  onDeleteAllChats,
  onExportAllChats,
  onImportChats,
}: Omit<SettingsModalProps, 'isOpen'>) {
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || 'https://api.openai.com/v1');
  const [model, setModel] = useState(settings.model || 'gpt-4o');
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt || '');
  const [temperature, setTemperature] = useState(settings.temperature ?? 0.7);

  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const res = await testConnection({
      apiKey,
      baseUrl,
      model,
    });

    setTestResult(res);
    setIsTesting(false);
  };

  const handleSave = () => {
    onSaveSettings({
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || 'https://api.openai.com/v1',
      model: model.trim() || 'gpt-4o',
      systemPrompt,
      theme: settings.theme,
      temperature,
    });
    onClose();
  };

  const handleRemoveKey = () => {
    setApiKey('');
    setTestResult(null);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setBaseUrl(preset.baseUrl);
    setModel(preset.defaultModel);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 text-neutral-900 dark:text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              {isFirstLaunch ? 'Welcome to AstraChat' : 'API & Model Settings'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isFirstLaunch
                ? 'Bring your own API key. All credentials remain private in your browser.'
                : 'Configure any OpenAI-compatible provider endpoint and model.'}
            </p>
          </div>
          {!isFirstLaunch && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="py-4 space-y-5">
          {/* Presets Bar */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
              Quick Provider Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors border border-neutral-200/60 dark:border-neutral-700/60"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-500" />
                API Key <span className="text-red-500">*</span>
              </label>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleRemoveKey}
                  className="text-[11px] text-red-500 hover:underline"
                >
                  Remove key
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              Saved strictly in your browser&apos;s localStorage. Never sent to any third-party server.
              {apiKey && !showKey && (
                <span className="block text-neutral-400 mt-0.5">
                  Current key: {maskApiKey(apiKey)}
                </span>
              )}
            </p>
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-[11px] text-neutral-500">
              Must support the standard OpenAI <code className="text-[10px]">/chat/completions</code> format with streaming.
            </p>
          </div>

          {/* Model Name (free text input) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              Model Name (Free Text) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-4o, gpt-6-astra, claude-3-5-sonnet, deepseek-chat"
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-[11px] text-neutral-500">
              Type the exact model identifier required by your provider.
            </p>
          </div>

          {/* System Prompt (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Default System Prompt (Optional)
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
              placeholder="Instructions given to the model for all new chats..."
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Test Connection Button & Result */}
          <div className="pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !apiKey.trim() || !model.trim()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-40"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Testing connection...
                  </>
                ) : (
                  'Test connection'
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-2.5 p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 break-words">{testResult.message}</div>
              </div>
            )}
          </div>

          {/* Backup, Restore & Data Management */}
          {!isFirstLaunch && (
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Data & Storage (IndexedDB)
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {onExportAllChats && (
                  <button
                    type="button"
                    onClick={onExportAllChats}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export all chats (JSON)
                  </button>
                )}
                {onImportChats && (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Import chats
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImportChats(file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                )}
                {onDeleteAllChats && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete all chats
                  </button>
                )}
              </div>

              {showDeleteConfirm && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 space-y-2">
                  <p className="font-semibold">Are you sure you want to delete all chats?</p>
                  <p>This will permanently erase all local conversation history in IndexedDB.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteAllChats?.();
                        setShowDeleteConfirm(false);
                      }}
                      className="px-2.5 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-700"
                    >
                      Yes, delete everything
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          {!isFirstLaunch && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!apiKey.trim() || !model.trim()}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isFirstLaunch ? 'Start Chatting' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsModal(props: SettingsModalProps) {
  if (!props.isOpen) return null;
  return (
    <SettingsModalDialog
      key={`${props.settings.apiKey}-${props.settings.baseUrl}-${props.settings.model}`}
      {...props}
    />
  );
}
