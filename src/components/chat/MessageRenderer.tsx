import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface MessageRendererProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
  isStreaming?: boolean;
  className?: string;
}

interface CodeBlockProps {
  language?: string;
  children: string;
}

function CodeBlock({ language = 'text', children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <div className="relative group">
      <div className="flex items-center justify-between bg-muted px-4 py-2 text-sm border-b">
        <span className="font-medium">{language}</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 0.5rem 0.5rem',
          fontSize: '0.875rem',
        }}
        showLineNumbers={children.split('\n').length > 5}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export function MessageRenderer({
  content,
  role,
  isStreaming = false,
  className,
}: MessageRendererProps) {
  const messageClass = cn(
    'inline-block max-w-[85%] p-3 rounded-lg text-sm',
    role === 'user'
      ? 'bg-primary text-primary-foreground ml-auto'
      : role === 'system'
        ? 'bg-muted text-muted-foreground border'
        : 'bg-secondary text-secondary-foreground',
    className
  );

  // For user messages, render as plain text
  if (role === 'user') {
    return (
      <div className={messageClass}>
        {content}
        {isStreaming && <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />}
      </div>
    );
  }

  // For assistant and system messages, render as markdown
  return (
    <div className={messageClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom code block rendering
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            const isInline = !className?.includes('language-');

            if (!isInline) {
              return (
                <CodeBlock language={language || 'text'}>
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              );
            }

            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },

          // Custom heading rendering
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mt-3 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-medium mt-3 mb-2 first:mt-0">{children}</h3>
          ),

          // Custom paragraph rendering
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

          // Custom list rendering
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          ),

          // Custom link rendering
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),

          // Custom blockquote rendering
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic mb-2">
              {children}
            </blockquote>
          ),

          // Custom table rendering
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="border-collapse border border-muted-foreground/20 w-full text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-muted-foreground/20 px-2 py-1 bg-muted font-medium text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-muted-foreground/20 px-2 py-1">{children}</td>
          ),

          // Custom horizontal rule
          hr: () => <hr className="border-muted-foreground/20 my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>

      {isStreaming && <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />}
    </div>
  );
}
