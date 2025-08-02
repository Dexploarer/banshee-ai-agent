import { invoke } from '@tauri-apps/api/core';
import { type Tool, tool } from 'ai';
import { z } from 'zod';

// File system tools
export const readFileToolSchema = z.object({
  path: z.string().describe('The file path to read'),
});
type ReadFileParams = z.infer<typeof readFileToolSchema>;

export const writeFileToolSchema = z.object({
  path: z.string().describe('The file path to write to'),
  content: z.string().describe('The content to write to the file'),
});
type WriteFileParams = z.infer<typeof writeFileToolSchema>;

export const listFilesToolSchema = z.object({
  path: z.string().describe('The directory path to list files from'),
});
type ListFilesParams = z.infer<typeof listFilesToolSchema>;

// System tools
export const executeCommandToolSchema = z.object({
  command: z.string().describe('The shell command to execute'),
  args: z.array(z.string()).optional().describe('Command arguments'),
});
type ExecuteCommandParams = z.infer<typeof executeCommandToolSchema>;

// Network tools
export const httpRequestToolSchema = z.object({
  url: z.string().describe('The URL to make a request to'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
  headers: z.record(z.string()).optional().describe('Request headers'),
  body: z.string().optional().describe('Request body for POST/PUT'),
});
type HttpRequestParams = z.infer<typeof httpRequestToolSchema>;

// UI tools
export const showNotificationToolSchema = z.object({
  title: z.string().describe('Notification title'),
  message: z.string().describe('Notification message'),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
});
type ShowNotificationParams = z.infer<typeof showNotificationToolSchema>;

export const agentTools: Record<string, Tool<any, any>> = {
  readFile: tool({
    description: 'Read contents of a file from the filesystem',
    parameters: readFileToolSchema,
    execute: async ({ path }: ReadFileParams) => {
      try {
        const content = await invoke<string>('read_file_command', { path });
        return { success: true, content };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  }),

  writeFile: tool({
    description: 'Write content to a file on the filesystem',
    parameters: writeFileToolSchema,
    execute: async ({ path, content }: WriteFileParams) => {
      try {
        await invoke('write_file_command', { path, content });
        return { success: true, message: `File written to ${path}` };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  }),

  listFiles: tool({
    description: 'List files and directories in a given path',
    parameters: listFilesToolSchema,
    execute: async ({ path }: ListFilesParams) => {
      try {
        const files = await invoke<string[]>('list_files_command', { path });
        return { success: true, files };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  }),

  executeCommand: tool({
    description: 'Execute a shell command and return the output',
    parameters: executeCommandToolSchema,
    execute: async ({ command, args = [] }: ExecuteCommandParams) => {
      try {
        const result = await invoke<{ stdout: string; stderr: string; status: number }>(
          'execute_command',
          {
            command,
            args,
          }
        );
        return {
          success: result.status === 0,
          stdout: result.stdout,
          stderr: result.stderr,
          status: result.status,
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  }),

  httpRequest: tool({
    description: 'Make HTTP requests to external APIs',
    parameters: httpRequestToolSchema,
    execute: async ({ url, method, headers, body }: HttpRequestParams) => {
      try {
        const response = await invoke<{
          status: number;
          body: string;
          headers: Record<string, string>;
        }>('http_request_command', { url, method, headers, body });
        return {
          success: response.status < 400,
          status: response.status,
          body: response.body,
          headers: response.headers,
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  }),

  showNotification: tool({
    description: 'Show a system notification to the user',
    parameters: showNotificationToolSchema,
    execute: async ({ title, message, type }: ShowNotificationParams) => {
      try {
        await invoke('show_notification_command', { title, message, type });
        return { success: true, message: 'Notification shown' };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  }),
};

export function getToolsByCategory(
  category: 'filesystem' | 'system' | 'network' | 'ui'
): Record<string, Tool<any, any>> {
  const categories = {
    filesystem: ['readFile', 'writeFile', 'listFiles'],
    system: ['executeCommand'],
    network: ['httpRequest'],
    ui: ['showNotification'],
  };

  const toolNames = categories[category] || [];
  return Object.fromEntries(
    toolNames.map((name) => [name, agentTools[name]]).filter(([, tool]) => tool)
  );
}
