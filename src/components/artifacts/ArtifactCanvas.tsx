import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DbArtifact } from '@/lib/database';
import { updateArtifactContent } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Copy, Download, Edit, ExternalLink, FileCode, Play, Save, Share } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ArtifactCanvasProps {
  artifact: DbArtifact;
  onUpdate?: (artifact: DbArtifact) => void;
  className?: string;
}

const LANGUAGE_CONFIGS = {
  javascript: { name: 'JavaScript', extension: 'js', executable: true },
  typescript: { name: 'TypeScript', extension: 'ts', executable: false },
  python: { name: 'Python', extension: 'py', executable: true },
  html: { name: 'HTML', extension: 'html', executable: false },
  css: { name: 'CSS', extension: 'css', executable: false },
  json: { name: 'JSON', extension: 'json', executable: false },
  markdown: { name: 'Markdown', extension: 'md', executable: false },
  sql: { name: 'SQL', extension: 'sql', executable: false },
  bash: { name: 'Bash', extension: 'sh', executable: true },
};

export function ArtifactCanvas({ artifact, onUpdate, className }: ArtifactCanvasProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(artifact.content);
  const [activeView, setActiveView] = useState<'preview' | 'code' | 'output'>('preview');
  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setEditContent(artifact.content);
  }, [artifact.content]);

  useEffect(() => {
    // Load artifact versions (simplified - in real app would fetch from DB)
    // setVersions([{ version: artifact.version, timestamp: artifact.updated_at }]);
  }, []);

  const handleSave = async () => {
    if (editContent === artifact.content) {
      setIsEditing(false);
      return;
    }

    try {
      await updateArtifactContent(artifact.id, editContent, true);
      const updatedArtifact = { ...artifact, content: editContent, version: artifact.version + 1 };
      onUpdate?.(updatedArtifact);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save artifact:', error);
    }
  };

  const handleCancel = () => {
    setEditContent(artifact.content);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDownload = () => {
    const config = LANGUAGE_CONFIGS[artifact.language as keyof typeof LANGUAGE_CONFIGS];
    const filename = `${artifact.title.replace(/\s+/g, '_')}.${config?.extension || 'txt'}`;

    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExecute = async () => {
    if (
      !artifact.language ||
      !LANGUAGE_CONFIGS[artifact.language as keyof typeof LANGUAGE_CONFIGS]?.executable
    ) {
      return;
    }

    setIsExecuting(true);
    setActiveView('output');

    try {
      // Simulate code execution (in real implementation, would use secure sandbox)
      setExecutionOutput('Executing...\n');

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock execution results based on language
      switch (artifact.language) {
        case 'python':
          setExecutionOutput(
            (prev) =>
              `${prev}Python 3.9.0\n>>> ${artifact.content}\n\nExecution completed successfully.`
          );
          break;
        case 'javascript':
          setExecutionOutput(
            (prev) =>
              `${prev}Node.js v18.0.0\n> ${artifact.content}\n\nExecution completed successfully.`
          );
          break;
        default:
          setExecutionOutput((prev) => `${prev}Execution completed successfully.`);
      }
    } catch (error) {
      setExecutionOutput((prev) => `${prev}\nError: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const renderPreview = () => {
    switch (artifact.type) {
      case 'html':
        return (
          <iframe
            ref={previewRef}
            srcDoc={artifact.content}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="HTML Preview"
          />
        );

      case 'react':
        return (
          <div className="w-full h-full p-4 bg-white">
            <div className="text-center text-muted-foreground">
              React component preview would render here
            </div>
          </div>
        );

      case 'svg':
        return (
          <div
            className="w-full h-full flex items-center justify-center bg-white"
            dangerouslySetInnerHTML={{
              __html: artifact.content
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
                .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, ''),
            }}
          />
        );

      default:
        return (
          <pre className="w-full h-full p-4 text-sm font-mono overflow-auto bg-muted">
            {artifact.content}
          </pre>
        );
    }
  };

  const renderCodeEditor = () => (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-full p-4 text-sm font-mono resize-none border-0 focus:outline-none bg-muted"
          spellCheck={false}
        />
      </div>
      {isEditing && (
        <div className="flex gap-2 p-3 border-t bg-background">
          <Button size="sm" onClick={handleSave} disabled={editContent === artifact.content}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );

  const renderOutput = () => (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 p-4 bg-black text-green-400 font-mono text-sm overflow-auto">
        <pre className="whitespace-pre-wrap">
          {executionOutput || 'No output yet. Click "Run Code" to execute.'}
        </pre>
      </div>
      <div className="p-3 border-t bg-background">
        <Button
          size="sm"
          onClick={handleExecute}
          disabled={
            isExecuting ||
            !LANGUAGE_CONFIGS[artifact.language as keyof typeof LANGUAGE_CONFIGS]?.executable
          }
        >
          <Play className="w-4 h-4 mr-2" />
          {isExecuting ? 'Running...' : 'Run Code'}
        </Button>
      </div>
    </div>
  );

  const config = LANGUAGE_CONFIGS[artifact.language as keyof typeof LANGUAGE_CONFIGS];

  return (
    <Card className={cn('flex flex-col h-[600px]', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            <CardTitle className="text-lg">{artifact.title}</CardTitle>
            <span className="text-xs bg-muted px-2 py-1 rounded">v{artifact.version}</span>
            {config && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {config.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={handleCopy}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setIsEditing(!isEditing)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <Share className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <Tabs
          value={activeView}
          onValueChange={(v: string) => setActiveView(v)}
          className="flex-1 flex flex-col"
        >
          <div className="px-6 border-b">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">{isEditing ? 'Edit Code' : 'View Code'}</TabsTrigger>
              {config?.executable && <TabsTrigger value="output">Output</TabsTrigger>}
            </TabsList>
          </div>

          <div className="flex-1 min-h-0">
            <TabsContent value="preview" className="h-full m-0 border-0">
              {renderPreview()}
            </TabsContent>

            <TabsContent value="code" className="h-full m-0 border-0">
              {renderCodeEditor()}
            </TabsContent>

            {config?.executable && (
              <TabsContent value="output" className="h-full m-0 border-0">
                {renderOutput()}
              </TabsContent>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
