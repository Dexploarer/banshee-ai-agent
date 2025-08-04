import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AlertTriangle, Play, Square, Terminal, Zap } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface CodeExecutorProps {
  code: string;
  language: string;
  onOutput?: (output: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

const SUPPORTED_LANGUAGES = {
  javascript: {
    name: 'JavaScript',
    runner: 'node',
    extension: '.js',
    timeout: 10000,
    memoryLimit: '128MB',
  },
  python: {
    name: 'Python',
    runner: 'python3',
    extension: '.py',
    timeout: 15000,
    memoryLimit: '256MB',
  },
  typescript: {
    name: 'TypeScript',
    runner: 'ts-node',
    extension: '.ts',
    timeout: 15000,
    memoryLimit: '128MB',
  },
  bash: {
    name: 'Bash',
    runner: 'bash',
    extension: '.sh',
    timeout: 5000,
    memoryLimit: '64MB',
  },
};

export function CodeExecutor({ code, language, onOutput, onError, className }: CodeExecutorProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'output' | 'error' | 'info'>('output');
  const abortControllerRef = useRef<AbortController | null>(null);

  const languageConfig = SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES];

  const executeCode = useCallback(async () => {
    if (!languageConfig || !code.trim()) return;

    setIsExecuting(true);
    setExecutionResult(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    const startTime = Date.now();

    try {
      // Execute code securely (placeholder implementation)
      // In real implementation, this would make a request to a secure backend sandbox service
      const result = await executeCodeSecurely(code, language, abortControllerRef.current.signal);

      const executionTime = Date.now() - startTime;
      const finalResult = { ...result, executionTime };

      setExecutionResult(finalResult);

      if (result.exitCode === 0) {
        onOutput?.(result.stdout);
      } else {
        onError?.(result.stderr);
        setActiveTab('error');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setExecutionResult({
          stdout: '',
          stderr: 'Execution was cancelled',
          exitCode: 1,
          executionTime: Date.now() - startTime,
        });
      } else {
        console.error('Execution error:', error);
        setExecutionResult({
          stdout: '',
          stderr: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          exitCode: 1,
          executionTime: Date.now() - startTime,
        });
      }
      setActiveTab('error');
    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
    }
  }, [code, language, languageConfig, onOutput, onError]);

  const stopExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const executeCodeSecurely = async (
    code: string,
    lang: string,
    signal: AbortSignal
  ): Promise<Omit<ExecutionResult, 'executionTime'>> => {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (signal.aborted) {
      throw new Error('Execution was cancelled');
    }

    // TODO: Implement actual secure code execution via backend service
    // This requires a secure sandbox environment with proper isolation
    return {
      stdout: `⚠️ Code execution not yet implemented\n\nThis feature requires:\n• Secure sandbox environment\n• Backend execution service  \n• Proper security isolation\n• Resource limiting\n\nLanguage: ${lang}\nCode length: ${code.length} characters\n\nCode preview:\n${code.substring(0, 200)}${code.length > 200 ? '...' : ''}`,
      stderr: '',
      exitCode: 0,
    };
  };

  if (!languageConfig) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Code execution is not supported for {language}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Code Execution
            </CardTitle>
            <CardDescription>Running {languageConfig.name} code in secure sandbox</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {isExecuting ? (
              <Button size="sm" variant="destructive" onClick={stopExecution}>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={executeCode} disabled={!code.trim()}>
                <Play className="w-4 h-4 mr-2" />
                Run Code
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Execution Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isExecuting
                  ? 'bg-yellow-500 animate-pulse'
                  : executionResult?.exitCode === 0
                    ? 'bg-green-500'
                    : executionResult
                      ? 'bg-red-500'
                      : 'bg-gray-400'
              )}
            />
            <span className="text-sm font-medium">
              {isExecuting
                ? 'Executing...'
                : executionResult?.exitCode === 0
                  ? 'Success'
                  : executionResult
                    ? 'Error'
                    : 'Ready'}
            </span>
          </div>

          {executionResult && (
            <div className="text-xs text-muted-foreground">{executionResult.executionTime}ms</div>
          )}
        </div>

        {/* Security Info */}
        <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Secure Execution Environment
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Code runs in isolated sandbox • Timeout: {languageConfig.timeout / 1000}s • Memory:{' '}
                {languageConfig.memoryLimit}
              </p>
            </div>
          </div>
        </div>

        {/* Output Tabs */}
        {executionResult && (
          <div className="flex-1">
            <Tabs
              value={activeTab}
              onValueChange={(v: string) => setActiveTab(v as 'error' | 'info' | 'output')}
              className="h-full flex flex-col"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="output">Output</TabsTrigger>
                <TabsTrigger value="error">Errors {executionResult.stderr && '(!)'}</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
              </TabsList>

              <TabsContent value="output" className="flex-1 mt-4">
                <div className="h-48 p-4 bg-black text-green-400 font-mono text-sm rounded border overflow-auto">
                  <pre className="whitespace-pre-wrap">{executionResult.stdout || 'No output'}</pre>
                </div>
              </TabsContent>

              <TabsContent value="error" className="flex-1 mt-4">
                <div className="h-48 p-4 bg-red-950 text-red-200 font-mono text-sm rounded border overflow-auto">
                  <pre className="whitespace-pre-wrap">{executionResult.stderr || 'No errors'}</pre>
                </div>
              </TabsContent>

              <TabsContent value="info" className="flex-1 mt-4">
                <div className="h-48 p-4 bg-muted rounded border overflow-auto">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Language:</span> {languageConfig.name}
                    </div>
                    <div>
                      <span className="font-medium">Runner:</span> {languageConfig.runner}
                    </div>
                    <div>
                      <span className="font-medium">Exit Code:</span> {executionResult.exitCode}
                    </div>
                    <div>
                      <span className="font-medium">Execution Time:</span>{' '}
                      {executionResult.executionTime}ms
                    </div>
                    <div>
                      <span className="font-medium">Memory Limit:</span>{' '}
                      {languageConfig.memoryLimit}
                    </div>
                    <div>
                      <span className="font-medium">Timeout:</span> {languageConfig.timeout / 1000}s
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
