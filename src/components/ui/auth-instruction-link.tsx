import { ExternalLink } from 'lucide-react';

interface AuthInstructionLinkProps {
  instruction: string;
  className?: string;
}

export function AuthInstructionLink({ instruction, className }: AuthInstructionLinkProps) {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Split the instruction by URLs
  const parts = instruction.split(urlRegex);

  return (
    <span className={className}>
      {parts.map((part) => {
        // Check if this part is a URL
        if (part.match(urlRegex)) {
          return (
            <a
              key={part}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              {part}
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        }
        // Otherwise, render as normal text
        return <span key={part}>{part}</span>;
      })}
    </span>
  );
}
