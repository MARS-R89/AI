'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayLang = language || 'code';

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-900 text-neutral-100 shadow-sm text-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-neutral-800/90 border-b border-neutral-700/60 text-xs text-neutral-400 select-none">
        <span className="font-mono lowercase">{displayLang}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-neutral-700/70 text-neutral-300 hover:text-white transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono">
        <pre className="m-0 p-0 font-mono text-neutral-200">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body space-y-3 leading-relaxed text-[15px] text-neutral-800 dark:text-neutral-200 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return <CodeBlock code={codeString} language={language} />;
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-200 font-mono text-[0.88em] border border-neutral-200/60 dark:border-neutral-700/60"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-3 last:mb-0 leading-7">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold text-neutral-900 dark:text-white mt-6 mb-3 first:mt-0 tracking-tight">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mt-5 mb-2.5 first:mt-0 tracking-tight">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold text-neutral-900 dark:text-white mt-4 mb-2 first:mt-0">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-neutral-300 dark:border-neutral-700 pl-4 my-3 text-neutral-600 dark:text-neutral-400 italic">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-neutral-50 dark:bg-neutral-900/80">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-3.5 py-2 text-left font-semibold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-3.5 py-2 text-neutral-700 dark:text-neutral-300 border-b border-neutral-100 dark:border-neutral-800/60">
                {children}
              </td>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                {children}
              </a>
            );
          },
          hr() {
            return <hr className="my-6 border-neutral-200 dark:border-neutral-800" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
