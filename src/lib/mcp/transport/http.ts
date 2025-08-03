import type { MCPMessage, MCPServerConfig, MCPTransport } from '../types';

export class HTTPTransport implements MCPTransport {
  private url: string;
  private config: MCPServerConfig;
  private eventSource: EventSource | undefined;
  private messageCallbacks: ((message: MCPMessage) => void)[] = [];
  private closeCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];

  constructor(url: string, config: MCPServerConfig) {
    this.url = url;
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // For HTTP transport, we'll use Server-Sent Events for receiving messages
      const headers = this.getHeaders();

      // Test connection first
      const response = await fetch(`${this.url}/health`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Set up SSE connection for receiving messages
      const sseUrl = new URL(`${this.url}/events`);
      if (this.config.auth?.token) {
        sseUrl.searchParams.set('token', this.config.auth.token);
      }

      this.eventSource = new EventSource(sseUrl.toString());

      this.eventSource.onmessage = (event) => {
        try {
          const message: MCPMessage = JSON.parse(event.data);
          for (const callback of this.messageCallbacks) {
            callback(message);
          }
        } catch (error) {
          for (const callback of this.errorCallbacks) {
            callback(new Error(`Failed to parse SSE message: ${error}`));
          }
        }
      };

      this.eventSource.onerror = () => {
        const error = new Error('SSE connection error');
        for (const callback of this.errorCallbacks) {
          callback(error);
        }
      };

      this.eventSource.onopen = () => {
        console.log('MCP HTTP transport connected via SSE');
      };
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
    for (const callback of this.closeCallbacks) {
      callback();
    }
  }

  async send(message: MCPMessage): Promise<void> {
    const headers = {
      ...this.getHeaders(),
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${this.url}/rpc`, {
      method: 'POST',
      headers: {
        ...headers,
        'MCP-Protocol-Version': '2025-06-18', // Ensure version header on all requests
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    });

    if (!response.ok) {
      // RFC 9728: Handle WWW-Authenticate header for 401 responses
      if (response.status === 401) {
        const wwwAuth = response.headers.get('WWW-Authenticate');
        if (wwwAuth) {
          await this.handleAuthError(response, wwwAuth);
        }
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // For synchronous responses, handle immediately
    if (response.headers.get('content-type')?.includes('application/json')) {
      const responseMessage: MCPMessage = await response.json();
      for (const callback of this.messageCallbacks) {
        callback(responseMessage);
      }
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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'MCP-Protocol-Version': '2025-06-18', // Required by latest MCP specification
      ...this.config.headers,
    };

    if (this.config.auth) {
      switch (this.config.auth.type) {
        case 'bearer':
          if (this.config.auth.token) {
            headers.Authorization = `Bearer ${this.config.auth.token}`;
          }
          break;
        case 'basic':
          if (this.config.auth.clientId && this.config.auth.clientSecret) {
            const credentials = btoa(
              `${this.config.auth.clientId}:${this.config.auth.clientSecret}`
            );
            headers.Authorization = `Basic ${credentials}`;
          }
          break;
        case 'oauth2.1':
          if (this.config.auth.token) {
            headers.Authorization = `Bearer ${this.config.auth.token}`;
          }
          break;
      }
    }

    return headers;
  }

  // RFC 9728: Handle protected resource metadata discovery
  private async handleAuthError(_response: Response, wwwAuth: string): Promise<void> {
    try {
      // Parse WWW-Authenticate header for protected resource metadata URL
      const metadataMatch = wwwAuth.match(/protected_resource_metadata=([^\\s,]+)/);
      if (metadataMatch?.[1]) {
        const metadataUrl = metadataMatch[1];
        await this.discoverAuthorizationServer(metadataUrl);
      }
    } catch (error) {
      console.warn('Failed to handle auth error:', error);
    }
  }

  // RFC 9728: Discover authorization server from protected resource metadata
  private async discoverAuthorizationServer(metadataUrl: string): Promise<void> {
    try {
      const response = await fetch(metadataUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'MCP-Protocol-Version': '2025-06-18',
        },
      });

      if (response.ok) {
        const metadata = await response.json();
        if (metadata.authorization_server) {
          // Update auth configuration with discovered authorization server
          if (this.config.auth) {
            this.config.auth.authorizationServerUrl = metadata.authorization_server;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to discover authorization server:', error);
    }
  }
}
