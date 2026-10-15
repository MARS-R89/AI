export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  kind: 'image' | 'text' | 'pdf';
  dataUrl?: string; // base64 data URL for images
  textContent?: string; // for txt, md, code, and pdf extracted text
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
  createdAt: number;
  error?: boolean;
  errorMessage?: string;
  reasoning?: string; // model's chain-of-thought if provided
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  systemPrompt?: string;
}

export interface AppSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  theme: 'dark' | 'light';
  temperature: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  systemPrompt: 'You are a helpful, direct, and knowledgeable AI assistant.',
  theme: 'dark',
  temperature: 0.7,
};
