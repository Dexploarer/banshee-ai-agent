import { invoke } from '@tauri-apps/api/core';
import type { MCPServerHandler } from './server';
import type { MCPPrompt, MCPResource, MCPTool } from './types';

export class BansheeMCPHandler implements MCPServerHandler {
  async handleListResources(): Promise<MCPResource[]> {
    // Expose Banshee's file system and configuration as MCP resources
    const resources: MCPResource[] = [
      {
        uri: 'banshee://agents/configs',
        name: 'Agent Configurations',
        description: 'Available AI agent configurations',
        mimeType: 'application/json',
      },
      {
        uri: 'banshee://conversations/history',
        name: 'Conversation History',
        description: 'Chat conversation logs',
        mimeType: 'application/json',
      },
      {
        uri: 'banshee://system/status',
        name: 'System Status',
        description: 'Current system status and metrics',
        mimeType: 'application/json',
      },
      {
        uri: 'banshee://workspace/files',
        name: 'Workspace Files',
        description: 'Files in the current workspace',
        mimeType: 'application/json',
      },
    ];

    return resources;
  }

  async handleReadResource(uri: string): Promise<{ contents: string; mimeType?: string }> {
    try {
      switch (uri) {
        case 'banshee://agents/configs': {
          const agentConfigs = await invoke<string>('get_agent_configs');
          return {
            contents: agentConfigs,
            mimeType: 'application/json',
          };
        }

        case 'banshee://conversations/history': {
          const conversations = await invoke<string>('get_conversation_history');
          return {
            contents: conversations,
            mimeType: 'application/json',
          };
        }

        case 'banshee://system/status': {
          const status = await invoke<string>('get_system_status');
          return {
            contents: status,
            mimeType: 'application/json',
          };
        }

        case 'banshee://workspace/files': {
          const files = await invoke<string>('list_workspace_files');
          return {
            contents: files,
            mimeType: 'application/json',
          };
        }

        default:
          throw new Error(`Unknown resource URI: ${uri}`);
      }
    } catch (error) {
      throw new Error(`Failed to read resource: ${error}`);
    }
  }

  async handleListTools(): Promise<MCPTool[]> {
    // Expose Banshee's capabilities as MCP tools
    const tools: MCPTool[] = [
      {
        name: 'execute_agent',
        description: 'Execute an AI agent with a specific prompt',
        inputSchema: {
          type: 'object',
          properties: {
            agentType: {
              type: 'string',
              enum: ['assistant', 'fileManager', 'webAgent', 'developer', 'systemAdmin'],
              description: 'Type of agent to execute',
            },
            prompt: {
              type: 'string',
              description: 'Prompt to send to the agent',
            },
            context: {
              type: 'object',
              description: 'Additional context for the agent',
            },
          },
          required: ['agentType', 'prompt'],
        },
      },
      {
        name: 'read_file',
        description: 'Read contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to read',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write contents to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to write',
            },
            contents: {
              type: 'string',
              description: 'Contents to write to the file',
            },
          },
          required: ['path', 'contents'],
        },
      },
      {
        name: 'list_files',
        description: 'List files in a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory path to list',
            },
            recursive: {
              type: 'boolean',
              description: 'Whether to list recursively',
              default: false,
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'execute_command',
        description: 'Execute a safe system command',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Command to execute',
            },
            args: {
              type: 'array',
              items: { type: 'string' },
              description: 'Command arguments',
            },
          },
          required: ['command'],
        },
      },
    ];

    return tools;
  }

  async handleCallTool(
    name: string,
    arguments_: unknown
  ): Promise<{ content: unknown; isError?: boolean }> {
    try {
      // Input validation
      if (!name || typeof name !== 'string') {
        throw new Error('Invalid tool name');
      }

      if (!arguments_ || typeof arguments_ !== 'object') {
        throw new Error('Invalid tool arguments');
      }

      const args = arguments_ as Record<string, unknown>;

      // Validate string inputs to prevent injection
      const validateString = (value: unknown, fieldName: string): string => {
        if (typeof value !== 'string') {
          throw new Error(`${fieldName} must be a string`);
        }

        // Basic sanitization - remove null bytes and control characters
        const sanitized = value.replace(/[\x00-\x1f\x7f]/g, '');

        if (sanitized.length > 10000) {
          throw new Error(`${fieldName} too long`);
        }

        return sanitized;
      };

      switch (name) {
        case 'execute_agent': {
          const agentType = validateString(args.agentType, 'agentType');
          const prompt = validateString(args.prompt, 'prompt');

          // Whitelist allowed agent types
          const allowedAgentTypes = [
            'assistant',
            'fileManager',
            'webAgent',
            'developer',
            'systemAdmin',
          ];
          if (!allowedAgentTypes.includes(agentType)) {
            throw new Error('Invalid agent type');
          }

          const agentResult = await invoke('execute_agent_tool_secure', {
            agentType,
            prompt,
            context: args.context || {},
          });
          return { content: agentResult };
        }

        case 'read_file': {
          const path = validateString(args.path, 'path');

          // Basic path validation - prevent directory traversal
          if (path.includes('..') || path.startsWith('/') || path.includes('\x00')) {
            throw new Error('Invalid file path');
          }

          const fileContents = await invoke<string>('read_file_tool_secure', {
            path,
          });
          return { content: fileContents };
        }

        case 'write_file': {
          const path = validateString(args.path, 'path');
          const contents = validateString(args.contents, 'contents');

          // Path validation
          if (path.includes('..') || path.startsWith('/') || path.includes('\x00')) {
            throw new Error('Invalid file path');
          }

          await invoke('write_file_tool_secure', {
            path,
            contents,
          });
          return { content: 'File written successfully' };
        }

        case 'list_files': {
          const path = validateString(args.path, 'path');

          // Path validation
          if (path.includes('..') || path.startsWith('/') || path.includes('\x00')) {
            throw new Error('Invalid directory path');
          }

          const files = await invoke<string[]>('list_files_tool_secure', {
            path,
            recursive: Boolean(args.recursive) || false,
          });
          return { content: files };
        }

        case 'execute_command': {
          const command = validateString(args.command, 'command');
          const commandArgs = Array.isArray(args.args)
            ? (args.args as unknown[]).map((arg) => validateString(arg, 'command argument'))
            : [];

          // This will use the secure command execution with whitelist validation
          const commandResult = await invoke<string>('execute_command_tool_secure', {
            command,
            args: commandArgs,
          });
          return { content: commandResult };
        }

        default:
          throw new Error('Unknown tool requested');
      }
    } catch (error) {
      // Sanitized error response - don't leak internal details
      return {
        content: 'Tool execution failed - invalid input or internal error',
        isError: true,
      };
    }
  }

  async handleListPrompts(): Promise<MCPPrompt[]> {
    // Expose Banshee's agent prompts as MCP prompts
    const prompts: MCPPrompt[] = [
      {
        name: 'assistant_prompt',
        description: 'General purpose assistant prompt template',
        arguments: [
          {
            name: 'task',
            description: 'The task to perform',
            required: true,
          },
          {
            name: 'context',
            description: 'Additional context information',
            required: false,
          },
        ],
      },
      {
        name: 'file_analysis_prompt',
        description: 'Prompt for analyzing file contents',
        arguments: [
          {
            name: 'filePath',
            description: 'Path to the file to analyze',
            required: true,
          },
          {
            name: 'analysisType',
            description: 'Type of analysis to perform',
            required: false,
          },
        ],
      },
      {
        name: 'code_review_prompt',
        description: 'Prompt for reviewing code changes',
        arguments: [
          {
            name: 'codeChanges',
            description: 'The code changes to review',
            required: true,
          },
          {
            name: 'reviewType',
            description: 'Type of review (security, performance, style)',
            required: false,
          },
        ],
      },
      {
        name: 'system_status_prompt',
        description: 'Prompt for checking system status',
        arguments: [
          {
            name: 'checkType',
            description: 'Type of status check to perform',
            required: false,
          },
        ],
      },
    ];

    return prompts;
  }

  async handleGetPrompt(
    name: string,
    arguments_?: Record<string, unknown>
  ): Promise<{ prompt: string }> {
    const args = arguments_ || {};

    try {
      switch (name) {
        case 'assistant_prompt': {
          const assistantPrompt = `You are a helpful AI assistant. Your task is: ${args.task || 'General assistance'}
${args.context ? `\nContext: ${args.context}` : ''}

Please provide a clear, helpful, and accurate response.`;
          return { prompt: assistantPrompt };
        }

        case 'file_analysis_prompt': {
          const fileAnalysisPrompt = `Analyze the file at path: ${args.filePath}
${args.analysisType ? `Focus on: ${args.analysisType}` : ''}

Provide a comprehensive analysis including:
- File structure and organization
- Code quality and potential issues
- Suggestions for improvement
- Security considerations (if applicable)`;
          return { prompt: fileAnalysisPrompt };
        }

        case 'code_review_prompt': {
          const codeReviewPrompt = `Review the following code changes:

${args.codeChanges}

${args.reviewType ? `Focus on: ${args.reviewType}` : ''}

Provide feedback on:
- Code quality and style
- Potential bugs or issues
- Performance considerations
- Security implications
- Best practices`;
          return { prompt: codeReviewPrompt };
        }

        case 'system_status_prompt': {
          const systemStatusPrompt = `Check the current system status${args.checkType ? ` focusing on: ${args.checkType}` : ''}.

Report on:
- System health and performance
- Resource usage
- Active processes
- Potential issues or warnings
- Recommendations for optimization`;
          return { prompt: systemStatusPrompt };
        }

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    } catch (error) {
      throw new Error(`Failed to generate prompt: ${error}`);
    }
  }
}
