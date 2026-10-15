import { Message } from './types';

export interface TestConnectionParams {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface StreamParams {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  systemPrompt?: string;
  messages: Message[];
  signal?: AbortSignal;
  onDelta: (chunk: string) => void;
  onReasoning?: (chunk: string) => void;
}

function cleanBaseUrl(url: string): string {
  let cleaned = (url || 'https://api.openai.com/v1').trim();
  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

function buildOpenAIMessages(messages: Message[], systemPrompt?: string) {
  const result: any[] = [];

  if (systemPrompt && systemPrompt.trim()) {
    result.push({
      role: 'system',
      content: systemPrompt.trim(),
    });
  }

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const hasAttachments = msg.attachments && msg.attachments.length > 0;
    const images = hasAttachments ? msg.attachments!.filter((a) => a.kind === 'image' && a.dataUrl) : [];
    const textFiles = hasAttachments ? msg.attachments!.filter((a) => (a.kind === 'text' || a.kind === 'pdf') && a.textContent) : [];

    let textBody = msg.content || '';

    // Append text files content if any
    if (textFiles.length > 0) {
      const filesContext = textFiles
        .map((f) => `--- File: ${f.name} ---\n\`\`\`\n${f.textContent}\n\`\`\``)
        .join('\n\n');
      textBody = textBody ? `${textBody}\n\n${filesContext}` : filesContext;
    }

    if (images.length > 0) {
      // Multimodal payload
      const contentParts: any[] = [];
      if (textBody.trim()) {
        contentParts.push({ type: 'text', text: textBody });
      }
      for (const img of images) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: img.dataUrl,
          },
        });
      }
      result.push({
        role: msg.role,
        content: contentParts,
      });
    } else {
      result.push({
        role: msg.role,
        content: textBody,
      });
    }
  }

  return result;
}

export async function testConnection({ apiKey, baseUrl, model }: TestConnectionParams): Promise<{ success: boolean; message: string }> {
  const url = `${cleanBaseUrl(baseUrl)}/chat/completions`;
  const key = apiKey.trim();

  if (!key) {
    return { success: false, message: 'Please provide an API key.' };
  }
  if (!model.trim()) {
    return { success: false, message: 'Please specify a model name.' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model.trim(),
        messages: [{ role: 'user', content: 'Respond with the single word "OK".' }],
        max_tokens: 5,
        stream: false,
      }),
    });

    if (res.ok) {
      return {
        success: true,
        message: `Connection successful! Successfully communicated with "${model}".`,
      };
    }

    // Handle error responses
    let errorDetail = '';
    try {
      const errorJson = await res.json();
      errorDetail = errorJson.error?.message || JSON.stringify(errorJson);
    } catch {
      errorDetail = await res.text();
    }

    if (res.status === 401) {
      return {
        success: false,
        message: `HTTP 401 Unauthorized: Invalid API key or key permissions. Detail: ${errorDetail}`,
      };
    }
    if (res.status === 404) {
      return {
        success: false,
        message: `HTTP 404 Not Found: Model "${model}" was not found or base URL is incorrect. Detail: ${errorDetail}`,
      };
    }
    if (res.status === 429) {
      return {
        success: false,
        message: `HTTP 429 Rate Limit / Quota Exceeded. Detail: ${errorDetail}`,
      };
    }

    return {
      success: false,
      message: `HTTP ${res.status} error from ${url}: ${errorDetail || res.statusText}`,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      return {
        success: false,
        message: `Network/CORS error: Could not reach "${url}". If using local Ollama/vLLM/LM Studio, make sure CORS is enabled (e.g. OLLAMA_ORIGINS='*'). If using an external provider, check your connection.`,
      };
    }
    return {
      success: false,
      message: `Connection failed: ${msg}`,
    };
  }
}

export async function streamChatCompletion({
  apiKey,
  baseUrl,
  model,
  temperature = 0.7,
  systemPrompt,
  messages,
  signal,
  onDelta,
  onReasoning,
}: StreamParams): Promise<void> {
  const url = `${cleanBaseUrl(baseUrl)}/chat/completions`;
  const formattedMessages = buildOpenAIMessages(messages, systemPrompt);

  const payload: any = {
    model: model.trim(),
    messages: formattedMessages,
    stream: true,
    temperature,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }

    if (response.status === 401) {
      throw new Error(`Authentication error (401): Invalid API key or access denied. Check your key in Settings.`);
    }
    if (response.status === 404) {
      throw new Error(`Model not found (404): The model "${model}" does not exist at this provider endpoint.`);
    }
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded (429): Quota reached or too many requests. Please wait or check your account balance.`);
    }
    throw new Error(`API error (${response.status}): ${errorDetail || response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is empty or streaming is not supported.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the incomplete last line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue; // Ignore empty lines and SSE comments

        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;

            // Reasoning content for models like DeepSeek-R1 / OpenAI o1 / o3
            if (delta?.reasoning_content && onReasoning) {
              onReasoning(delta.reasoning_content);
            }

            // Standard content delta
            if (delta?.content) {
              onDelta(delta.content);
            } else if (typeof choice?.text === 'string') {
              onDelta(choice.text);
            }
          } catch {
            // Partial JSON chunk, ignore and continue
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function generateChatTitle({
  apiKey,
  baseUrl,
  model,
  firstMessage,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  firstMessage: string;
}): Promise<string> {
  const fallback = firstMessage.trim().slice(0, 36) + (firstMessage.length > 36 ? '...' : '');

  if (!apiKey || !model) return fallback;

  try {
    const url = `${cleanBaseUrl(baseUrl)}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000); // 6s timeout max

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: model.trim(),
        messages: [
          {
            role: 'system',
            content: 'You generate very brief titles for chat conversations. Output ONLY 3 to 5 words summarizing the user topic. No quotes, no markdown, no punctuation.',
          },
          {
            role: 'user',
            content: firstMessage.slice(0, 400),
          },
        ],
        max_tokens: 15,
        temperature: 0.3,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const title = data.choices?.[0]?.message?.content?.trim();
      if (title && title.length < 50) {
        return title.replace(/^["']|["']$/g, '').trim();
      }
    }
  } catch {
    // Silently fall back to prompt snippet
  }

  return fallback;
}
