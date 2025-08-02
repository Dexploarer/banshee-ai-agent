import { invoke } from '@tauri-apps/api/core';
import type { MCPMessage, MCPServerConfig, MCPTransport } from '../types';

export class LocalTransport implements MCPTransport {
  private config: MCPServerConfig;
  private socketPath?: string;
  private connected = false;
  private messageCallbacks: ((message: MCPMessage) => void)[] = [];
  private closeCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      if (!this.config.path) {
        throw new Error('No path specified for local transport');
      }

      this.socketPath = this.config.path;

      // Connect to local Unix socket via Tauri
      await invoke('connect_local_mcp', {
        socketPath: this.socketPath,
      });

      this.connected = true;

      // Set up message listeners via Tauri events
      const { listen } = await import('@tauri-apps/api/event');

      await listen<string>(`local_mcp_message_${this.socketPath}`, (event) => {
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

      await listen<string>(`local_mcp_error_${this.socketPath}`, (event) => {
        for (const callback of this.errorCallbacks) {
          callback(new Error(event.payload));
        }
      });

      await listen<void>(`local_mcp_close_${this.socketPath}`, () => {
        this.connected = false;
        for (const callback of this.closeCallbacks) {
          callback();
        }
      });

      console.log(`MCP local transport connected to: ${this.socketPath}`);
    } catch (error) {
      throw new Error(`Failed to connect to local MCP server: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected && this.socketPath) {
      try {
        await invoke('disconnect_local_mcp', {
          socketPath: this.socketPath,
        });
      } catch (error) {
        console.error('Failed to disconnect local MCP:', error);
      }
      this.connected = false;
    }
    for (const callback of this.closeCallbacks) {
      callback();
    }
  }

  async send(message: MCPMessage): Promise<void> {
    if (!this.connected || !this.socketPath) {
      throw new Error('Transport not connected');
    }

    try {
      await invoke('send_local_mcp_message', {
        socketPath: this.socketPath,
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
