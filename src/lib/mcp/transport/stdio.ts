import { invoke } from '@tauri-apps/api/core';
import type { MCPMessage, MCPServerConfig, MCPTransport } from '../types';

export class StdioTransport implements MCPTransport {
  private config: MCPServerConfig;
  private processId?: number;
  private messageCallbacks: ((message: MCPMessage) => void)[] = [];
  private closeCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      if (!this.config.command) {
        throw new Error('No command specified for stdio transport');
      }

      // Start the MCP server process via Tauri
      const result = await invoke<{ pid: number }>('start_mcp_process', {
        command: this.config.command,
        args: this.config.args || [],
        env: this.config.env || {},
      });

      this.processId = result.pid;

      // Set up message listeners via Tauri events
      const { listen } = await import('@tauri-apps/api/event');

      await listen<string>(`mcp_message_${this.processId}`, (event) => {
        try {
          const message: MCPMessage = JSON.parse(event.payload);
          for (const callback of this.messageCallbacks) {
            callback(message);
          }
        } catch (error) {
          for (const callback of this.errorCallbacks) {
            callback(new Error(`Failed to parse message: ${error}`));
          }
        }
      });

      await listen<string>(`mcp_error_${this.processId}`, (event) => {
        for (const callback of this.errorCallbacks) {
          callback(new Error(event.payload));
        }
      });

      await listen<void>(`mcp_close_${this.processId}`, () => {
        for (const callback of this.closeCallbacks) {
          callback();
        }
      });

      console.log(`MCP stdio transport connected with PID: ${this.processId}`);
    } catch (error) {
      throw new Error(`Failed to start MCP process: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.processId) {
      try {
        await invoke('stop_mcp_process', { pid: this.processId });
      } catch (error) {
        console.error('Failed to stop MCP process:', error);
      }
      (this as any).processId = undefined;
    }
    for (const callback of this.closeCallbacks) {
      callback();
    }
  }

  async send(message: MCPMessage): Promise<void> {
    if (!this.processId) {
      throw new Error('Transport not connected');
    }

    try {
      await invoke('send_mcp_message', {
        pid: this.processId,
        message: JSON.stringify(message),
      });
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  onMessage(callback: (message: MCPMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }
}
