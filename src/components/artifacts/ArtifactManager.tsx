import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DbArtifact } from '@/lib/database';
import { getArtifacts, saveArtifact } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Code, FileCode, FileText, Globe, Image, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ArtifactCanvas } from './ArtifactCanvas';

interface ArtifactManagerProps {
  conversationId: string;
  messageId?: string;
  onArtifactCreate?: (artifact: DbArtifact) => void;
  onArtifactUpdate?: (artifact: DbArtifact) => void;
  className?: string;
}

const ARTIFACT_TYPES = [
  {
    type: 'code' as const,
    name: 'Code',
    description: 'Python, JavaScript, and other programming languages',
    icon: Code,
    defaultLanguage: 'python',
  },
  {
    type: 'html' as const,
    name: 'HTML Page',
    description: 'Interactive web pages with HTML, CSS, and JavaScript',
    icon: Globe,
    defaultLanguage: 'html',
  },
  {
    type: 'react' as const,
    name: 'React Component',
    description: 'Interactive React components',
    icon: FileCode,
    defaultLanguage: 'jsx',
  },
  {
    type: 'svg' as const,
    name: 'SVG Graphic',
    description: 'Scalable vector graphics and illustrations',
    icon: Image,
    defaultLanguage: 'svg',
  },
  {
    type: 'text' as const,
    name: 'Document',
    description: 'Markdown, plain text, and formatted documents',
    icon: FileText,
    defaultLanguage: 'markdown',
  },
];

export function ArtifactManager({
  conversationId,
  messageId,
  onArtifactCreate,
  onArtifactUpdate,
  className,
}: ArtifactManagerProps) {
  const [artifacts, setArtifacts] = useState<DbArtifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<DbArtifact | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'artifact'>('list');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtifacts();
  }, []);

  const loadArtifacts = async () => {
    try {
      setLoading(true);
      const conversationArtifacts = await getArtifacts(conversationId);
      setArtifacts(conversationArtifacts);

      // Auto-select the first artifact if none selected
      if (conversationArtifacts.length > 0 && !selectedArtifact) {
        setSelectedArtifact(conversationArtifacts[0] || null);
        setActiveView('artifact');
      }
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createArtifact = async (type: DbArtifact['type'], language?: string) => {
    const typeConfig = ARTIFACT_TYPES.find((t) => t.type === type);

    const newArtifact: Omit<DbArtifact, 'created_at' | 'updated_at'> = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      message_id: messageId || crypto.randomUUID(),
      type,
      language: language || typeConfig?.defaultLanguage || 'text',
      title: `New ${typeConfig?.name || type}`,
      content: getDefaultContent(type, language || typeConfig?.defaultLanguage),
      version: 1,
      metadata: JSON.stringify({}),
    };

    try {
      const savedArtifact = await saveArtifact(newArtifact);
      setArtifacts((prev) => [...prev, savedArtifact]);
      setSelectedArtifact(savedArtifact);
      setActiveView('artifact');
      onArtifactCreate?.(savedArtifact);
    } catch (error) {
      console.error('Failed to create artifact:', error);
    }
  };

  const handleArtifactUpdate = (updatedArtifact: DbArtifact) => {
    setArtifacts((prev) => prev.map((a) => (a.id === updatedArtifact.id ? updatedArtifact : a)));
    setSelectedArtifact(updatedArtifact);
    onArtifactUpdate?.(updatedArtifact);
  };

  const handleArtifactSelect = (artifact: DbArtifact) => {
    setSelectedArtifact(artifact);
    setActiveView('artifact');
  };

  const handleBackToList = () => {
    setActiveView('list');
    setSelectedArtifact(null);
  };

  const getDefaultContent = (type: DbArtifact['type'], language?: string): string => {
    switch (type) {
      case 'code':
        switch (language) {
          case 'python':
            return `# Python Code Example
print("Hello, World!")

def greet(name):
    return f"Hello, {name}!"

result = greet("Developer")
print(result)`;

          case 'javascript':
            return `// JavaScript Code Example
console.log("Hello, World!");

function greet(name) {
    return \`Hello, \${name}!\`;
}

const result = greet("Developer");
console.log(result);`;

          default:
            return '// Write your code here\nconsole.log("Hello, World!");';
        }

      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Welcome to Your Interactive Page</h1>
        <p>This is a live HTML page that you can edit and preview in real-time.</p>
        <button onclick="alert('Hello from your HTML page!')">Click Me!</button>
    </div>
</body>
</html>`;

      case 'react':
        return `import React, { useState } from 'react';

function MyComponent() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>React Component</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count - 1)} style={{ marginLeft: '10px' }}>
        Decrement
      </button>
    </div>
  );
}

export default MyComponent;`;

      case 'svg':
        return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="400" height="300" fill="url(#gradient)" />
  
  <circle cx="200" cy="150" r="50" fill="white" opacity="0.8" />
  
  <text x="200" y="155" text-anchor="middle" fill="#333" font-family="Arial" font-size="16">
    SVG Graphic
  </text>
</svg>`;

      case 'text':
        return `# Document Title

This is a **markdown document** that demonstrates various formatting options.

## Features

- **Bold text** and *italic text*
- [Links](https://example.com)
- \`Inline code\`
- Lists and more

## Code Block

\`\`\`javascript
function hello() {
    console.log("Hello from markdown!");
}
\`\`\`

> This is a blockquote with important information.

Edit this content to create your document!`;

      default:
        return '// Default content';
    }
  };

  const getArtifactIcon = (type: DbArtifact['type']) => {
    const typeConfig = ARTIFACT_TYPES.find((t) => t.type === type);
    return typeConfig?.icon || FileCode;
  };

  if (activeView === 'artifact' && selectedArtifact) {
    return (
      <div className={className}>
        <div className="mb-4">
          <Button variant="outline" onClick={handleBackToList}>
            ← Back to Artifacts
          </Button>
        </div>
        <ArtifactCanvas artifact={selectedArtifact} onUpdate={handleArtifactUpdate} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Artifacts
          </CardTitle>
          <CardDescription>Create interactive content, code, and visualizations</CardDescription>
        </CardHeader>
      </Card>

      {/* Create New Artifact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create New Artifact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ARTIFACT_TYPES.map((type) => {
              const IconComponent = type.icon;
              return (
                <Card
                  key={type.type}
                  className="cursor-pointer transition-colors hover:bg-accent"
                  onClick={() => createArtifact(type.type)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <IconComponent className="w-5 h-5 text-primary" />
                      <span className="font-medium">{type.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Existing Artifacts */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">Loading artifacts...</div>
          </CardContent>
        </Card>
      ) : artifacts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileCode className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-medium mb-2">No artifacts yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first artifact to get started with interactive content
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversation Artifacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {artifacts.map((artifact) => {
                const IconComponent = getArtifactIcon(artifact.type);
                return (
                  <Card
                    key={artifact.id}
                    className="cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => handleArtifactSelect(artifact)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-5 h-5 text-primary" />
                          <div>
                            <div className="font-medium">{artifact.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {artifact.type} • v{artifact.version} • {artifact.language}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(artifact.updated_at).toLocaleDateString()}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle delete
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
