import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChatSession } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••••••${suffix}`;
}

export function exportChatAsMarkdown(chat: ChatSession): string {
  let md = `# ${chat.title}\n`;
  md += `*Exported on ${new Date().toLocaleString()}*\n\n`;
  if (chat.model) {
    md += `**Model:** ${chat.model}\n\n`;
  }
  md += `---\n\n`;

  for (const msg of chat.messages) {
    const roleLabel = msg.role === 'user' ? '### User' : '### Assistant';
    md += `${roleLabel} (${new Date(msg.createdAt).toLocaleTimeString()})\n\n`;
    
    if (msg.attachments && msg.attachments.length > 0) {
      md += `*Attached files:* ${msg.attachments.map((a) => a.name).join(', ')}\n\n`;
    }
    
    if (msg.reasoning) {
      md += `> **Thinking:**\n> ${msg.reasoning.replace(/\n/g, '\n> ')}\n\n`;
    }

    md += `${msg.content}\n\n---\n\n`;
  }

  return md;
}

export function exportChatAsJson(chat: ChatSession): string {
  return JSON.stringify(chat, null, 2);
}
