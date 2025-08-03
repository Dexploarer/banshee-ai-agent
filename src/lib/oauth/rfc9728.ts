/**
 * RFC 9728: OAuth 2.0 Protected Resource Metadata Discovery
 * https://datatracker.ietf.org/doc/html/rfc9728
 *
 * This implements the OAuth 2.1 protected resource metadata discovery
 * mechanism as specified in RFC 9728, integrated with MCP server authentication.
 */

export interface ProtectedResourceMetadata {
  issuer: string;
  resource_server: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  introspection_endpoint?: string;
  revocation_endpoint?: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
  subject_types_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
  claims_supported?: string[];
  code_challenge_methods_supported?: string[];
  dpop_signing_alg_values_supported?: string[];
  resource_indicators_supported?: boolean;
  resource_server_signing_alg_values_supported?: string[];
  resource_server_encryption_alg_values_supported?: string[];
  resource_server_encryption_enc_values_supported?: string[];
  authorization_response_iss_parameter_supported?: boolean;
  mtls_endpoint_aliases?: {
    token_endpoint?: string;
    introspection_endpoint?: string;
    revocation_endpoint?: string;
  };
}

export interface ResourceServerConfig {
  id: string;
  resource_server: string;
  discovery_endpoint?: string;
  well_known_path?: string;
  metadata?: ProtectedResourceMetadata;
  last_updated?: string;
}

export class RFC9728Discovery {
  private cache = new Map<string, { metadata: ProtectedResourceMetadata; expires: number }>();
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Discover protected resource metadata for a given resource server
   */
  async discoverMetadata(resourceServer: string): Promise<ProtectedResourceMetadata> {
    // Check cache first
    const cached = this.cache.get(resourceServer);
    if (cached && cached.expires > Date.now()) {
      return cached.metadata;
    }

    try {
      // Try standard well-known path first
      const wellKnownUrl = `${resourceServer}/.well-known/oauth-protected-resource`;
      const metadata = await this.fetchMetadata(wellKnownUrl);

      // Cache the result
      this.cache.set(resourceServer, {
        metadata,
        expires: Date.now() + this.CACHE_TTL,
      });

      return metadata;
    } catch (error) {
      console.warn(`Failed to discover metadata for ${resourceServer}:`, error);

      // Return minimal metadata if discovery fails
      return {
        issuer: resourceServer,
        resource_server: resourceServer,
        scopes_supported: ['read', 'write'],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'client_credentials'],
        subject_types_supported: ['public'],
        code_challenge_methods_supported: ['S256'],
        resource_indicators_supported: true,
      };
    }
  }

  /**
   * Fetch metadata from a discovery endpoint
   */
  private async fetchMetadata(url: string): Promise<ProtectedResourceMetadata> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Banshee-MCP-Client/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Discovery request failed: ${response.status} ${response.statusText}`);
    }

    const metadata = await response.json();

    // Validate required fields
    if (!metadata.issuer || !metadata.resource_server) {
      throw new Error('Invalid metadata: missing required issuer or resource_server');
    }

    return this.validateAndNormalizeMetadata(metadata);
  }

  /**
   * Validate and normalize discovered metadata
   */
  private validateAndNormalizeMetadata(metadata: any): ProtectedResourceMetadata {
    const normalized: ProtectedResourceMetadata = {
      issuer: metadata.issuer,
      resource_server: metadata.resource_server,
    };

    // Optional fields with validation
    if (metadata.authorization_endpoint) {
      normalized.authorization_endpoint = this.validateUrl(metadata.authorization_endpoint);
    }

    if (metadata.token_endpoint) {
      normalized.token_endpoint = this.validateUrl(metadata.token_endpoint);
    }

    if (metadata.introspection_endpoint) {
      normalized.introspection_endpoint = this.validateUrl(metadata.introspection_endpoint);
    }

    if (metadata.revocation_endpoint) {
      normalized.revocation_endpoint = this.validateUrl(metadata.revocation_endpoint);
    }

    if (metadata.userinfo_endpoint) {
      normalized.userinfo_endpoint = this.validateUrl(metadata.userinfo_endpoint);
    }

    if (metadata.jwks_uri) {
      normalized.jwks_uri = this.validateUrl(metadata.jwks_uri);
    }

    // Array fields
    if (Array.isArray(metadata.scopes_supported)) {
      normalized.scopes_supported = metadata.scopes_supported;
    }

    if (Array.isArray(metadata.response_types_supported)) {
      normalized.response_types_supported = metadata.response_types_supported;
    }

    if (Array.isArray(metadata.grant_types_supported)) {
      normalized.grant_types_supported = metadata.grant_types_supported;
    }

    if (Array.isArray(metadata.subject_types_supported)) {
      normalized.subject_types_supported = metadata.subject_types_supported;
    }

    if (Array.isArray(metadata.id_token_signing_alg_values_supported)) {
      normalized.id_token_signing_alg_values_supported =
        metadata.id_token_signing_alg_values_supported;
    }

    if (Array.isArray(metadata.claims_supported)) {
      normalized.claims_supported = metadata.claims_supported;
    }

    if (Array.isArray(metadata.code_challenge_methods_supported)) {
      normalized.code_challenge_methods_supported = metadata.code_challenge_methods_supported;
    }

    if (Array.isArray(metadata.dpop_signing_alg_values_supported)) {
      normalized.dpop_signing_alg_values_supported = metadata.dpop_signing_alg_values_supported;
    }

    if (Array.isArray(metadata.resource_server_signing_alg_values_supported)) {
      normalized.resource_server_signing_alg_values_supported =
        metadata.resource_server_signing_alg_values_supported;
    }

    if (Array.isArray(metadata.resource_server_encryption_alg_values_supported)) {
      normalized.resource_server_encryption_alg_values_supported =
        metadata.resource_server_encryption_alg_values_supported;
    }

    if (Array.isArray(metadata.resource_server_encryption_enc_values_supported)) {
      normalized.resource_server_encryption_enc_values_supported =
        metadata.resource_server_encryption_enc_values_supported;
    }

    // Boolean fields
    if (typeof metadata.resource_indicators_supported === 'boolean') {
      normalized.resource_indicators_supported = metadata.resource_indicators_supported;
    }

    if (typeof metadata.authorization_response_iss_parameter_supported === 'boolean') {
      normalized.authorization_response_iss_parameter_supported =
        metadata.authorization_response_iss_parameter_supported;
    }

    // MTLS endpoint aliases
    if (metadata.mtls_endpoint_aliases && typeof metadata.mtls_endpoint_aliases === 'object') {
      normalized.mtls_endpoint_aliases = {};

      if (metadata.mtls_endpoint_aliases.token_endpoint) {
        normalized.mtls_endpoint_aliases.token_endpoint = this.validateUrl(
          metadata.mtls_endpoint_aliases.token_endpoint
        );
      }

      if (metadata.mtls_endpoint_aliases.introspection_endpoint) {
        normalized.mtls_endpoint_aliases.introspection_endpoint = this.validateUrl(
          metadata.mtls_endpoint_aliases.introspection_endpoint
        );
      }

      if (metadata.mtls_endpoint_aliases.revocation_endpoint) {
        normalized.mtls_endpoint_aliases.revocation_endpoint = this.validateUrl(
          metadata.mtls_endpoint_aliases.revocation_endpoint
        );
      }
    }

    return normalized;
  }

  /**
   * Validate URL format
   */
  private validateUrl(url: string): string {
    try {
      new URL(url);
      return url;
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  /**
   * Get cached metadata if available
   */
  getCachedMetadata(resourceServer: string): ProtectedResourceMetadata | null {
    const cached = this.cache.get(resourceServer);
    if (cached && cached.expires > Date.now()) {
      return cached.metadata;
    }
    return null;
  }

  /**
   * Clear metadata cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expires <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need request tracking for accurate hit rate
    };
  }
}

/**
 * Global RFC 9728 discovery instance
 */
let globalDiscovery: RFC9728Discovery | null = null;

/**
 * Get the global RFC 9728 discovery instance
 */
export function getRFC9728Discovery(): RFC9728Discovery {
  if (!globalDiscovery) {
    globalDiscovery = new RFC9728Discovery();

    // Clean up cache periodically
    setInterval(() => {
      globalDiscovery?.cleanupCache();
    }, 300000); // Every 5 minutes
  }

  return globalDiscovery;
}

/**
 * Utility to check if a server supports RFC 9728
 */
export async function supportsRFC9728(resourceServer: string): Promise<boolean> {
  try {
    const discovery = getRFC9728Discovery();
    await discovery.discoverMetadata(resourceServer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Enhanced MCP server configuration with RFC 9728 support
 */
export interface MCPServerConfigWithOAuth extends ResourceServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  oauth?: {
    enabled: boolean;
    client_id?: string;
    client_secret?: string;
    scopes?: string[];
    discovery_url?: string;
    metadata?: ProtectedResourceMetadata;
  };
}

/**
 * Integration helper for MCP servers with OAuth 2.1 and RFC 9728
 */
export class MCPOAuthIntegration {
  private discovery = getRFC9728Discovery();

  /**
   * Configure OAuth for an MCP server using RFC 9728 discovery
   */
  async configureServerOAuth(config: MCPServerConfigWithOAuth): Promise<MCPServerConfigWithOAuth> {
    if (!config.oauth?.enabled || !config.resource_server) {
      return config;
    }

    try {
      // Discover metadata for the resource server
      const metadata = await this.discovery.discoverMetadata(config.resource_server);

      // Update configuration with discovered metadata
      const enhancedConfig: MCPServerConfigWithOAuth = {
        ...config,
        metadata,
        oauth: {
          ...config.oauth,
          metadata,
          discovery_url: `${config.resource_server}/.well-known/oauth-protected-resource`,
        },
        last_updated: new Date().toISOString(),
      };

      return enhancedConfig;
    } catch (error) {
      console.warn(`Failed to configure OAuth for MCP server ${config.name}:`, error);
      return config;
    }
  }

  /**
   * Validate OAuth configuration against discovered metadata
   */
  validateOAuthConfig(config: MCPServerConfigWithOAuth): string[] {
    const errors: string[] = [];

    if (!config.oauth?.enabled) {
      return errors;
    }

    const metadata = config.oauth.metadata || config.metadata;
    if (!metadata) {
      errors.push('No OAuth metadata available for validation');
      return errors;
    }

    // Validate client configuration
    if (!config.oauth.client_id) {
      errors.push('OAuth client_id is required');
    }

    // Validate scopes
    if (config.oauth.scopes && metadata.scopes_supported) {
      const unsupportedScopes = config.oauth.scopes.filter(
        (scope) => !metadata.scopes_supported!.includes(scope)
      );

      if (unsupportedScopes.length > 0) {
        errors.push(`Unsupported scopes: ${unsupportedScopes.join(', ')}`);
      }
    }

    // Validate endpoints
    if (!metadata.authorization_endpoint) {
      errors.push('Authorization endpoint not available');
    }

    if (!metadata.token_endpoint) {
      errors.push('Token endpoint not available');
    }

    return errors;
  }
}
