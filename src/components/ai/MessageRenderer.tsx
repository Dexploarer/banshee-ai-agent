import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

// Import katex CSS in your app
// import 'katex/dist/katex.min.css';
// import 'highlight.js/styles/github-dark.css';

interface MessageRendererProps {
  content: string;
  className?: string;
}

export function MessageRenderer({ content, className }: MessageRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // Custom code block rendering
          pre({ children, ...props }) {
            const codeElement = children as React.ReactElement;
            const code = codeElement?.props?.children?.[0] || '';
            const language = codeElement?.props?.className?.replace('language-', '') || 'text';

            return (
              <div className="relative group">
                <pre
                  {...props}
                  className="!bg-secondary/50 !text-secondary-foreground rounded-lg p-4 overflow-x-auto"
                >
                  {children}
                </pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(code)}
                  className="absolute top-2 right-2 p-2 rounded-md bg-secondary hover:bg-secondary/80 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy code"
                >
                  {copiedCode === code ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {language !== 'text' && (
                  <span className="absolute top-2 left-2 text-xs text-muted-foreground">
                    {language}
                  </span>
                )}
              </div>
            );
          },
          // Custom inline code
          code({ children, ...props }) {
            return (
              <code
                {...props}
                className="!bg-secondary/50 !text-secondary-foreground px-1 py-0.5 rounded text-sm"
              >
                {children}
              </code>
            );
          },
          // Custom link rendering
          a({ children, href, ...props }) {
            return (
              <a
                {...props}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline underline-offset-2"
              >
                {children}
              </a>
            );
          },
          // Custom table rendering
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto">
                <table {...props} className="min-w-full border-collapse">
                  {children}
                </table>
              </div>
            );
          },
          th({ children, ...props }) {
            return (
              <th
                {...props}
                className="border border-border bg-secondary/50 px-3 py-2 text-left font-medium"
              >
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td {...props} className="border border-border px-3 py-2">
                {children}
              </td>
            );
          },
          // Custom blockquote
          blockquote({ children, ...props }) {
            return (
              <blockquote
                {...props}
                className="border-l-4 border-primary pl-4 italic text-muted-foreground"
              >
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
