/**
 * Unified Authentication Service
 *
 * Consolidates authentication and authorization logic from multiple sources.
 * Provides unified interface for all authentication needs across the application.
 */

import { AuthenticationManager, getAuthManager } from '../ai/providers/auth';
import { WalletAuthService, walletAuthService } from '../wallet/auth-service';
import type { AuthConfig, AuthMethod } from '../ai/providers/types';
import type { WalletAuth, WalletUser, GoogleOAuthResult } from '../wallet/types';
import type {
  AuthContext,
  IAuthService,
  Permission,
  ServiceError,
  ServiceErrorCode,
  ServiceResult,
} from './types';
import { ServiceErrorCodes } from './types';

interface UnifiedAuthResult {
  context: AuthContext;
  aiAuth?: AuthConfig;
  walletAuth?: WalletAuth;
}

interface SessionData {
  id: string;
  userId: string;
  agentId?: string;
  permissions: Permission[];
  aiProviders: Record<string, AuthConfig>;
  walletAuth?: WalletAuth;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
}

export class AuthService implements IAuthService {
  private aiAuthManager: AuthenticationManager;
  private walletAuthService: WalletAuthService;
  private activeSessions = new Map<string, SessionData>();
  private userPermissions = new Map<string, Permission[]>();
  private rolePermissions = new Map<string, Permission[]>();

  constructor() {
    this.aiAuthManager = getAuthManager();
    this.walletAuthService = walletAuthService;
    this.initializeDefaultRoles();
  }

  /**
   * Authenticate user with various credential types
   */
  async authenticate(credentials: any): Promise<ServiceResult<AuthContext>> {
    try {
      // Determine authentication type
      const authType = this.determineAuthType(credentials);

      let authResult: UnifiedAuthResult;

      switch (authType) {
        case 'api_key':
          authResult = await this.authenticateWithApiKey(credentials);
          break;
        case 'oauth_code':
          authResult = await this.authenticateWithOAuthCode(credentials);
          break;
        case 'wallet_oauth':
          authResult = await this.authenticateWithWalletOAuth(credentials);
          break;
        case 'session_token':
          authResult = await this.authenticateWithSessionToken(credentials);
          break;
        default:
          return this.createErrorResult(
            ServiceErrorCodes.INVALID_INPUT,
            'Unsupported authentication method'
          );
      }

      // Create session
      const sessionId = await this.createSession(authResult);

      const context: AuthContext = {
        userId: authResult.context.userId,
        agentId: authResult.context.agentId,
        permissions: authResult.context.permissions,
        sessionId,
      };

      return {
        success: true,
        data: context,
      };
    } catch (error) {
      return this.handleError(error, 'Authentication failed');
    }
  }

  /**
   * Refresh authentication context
   */
  async refreshAuth(context: AuthContext): Promise<ServiceResult<AuthContext>> {
    try {
      const session = this.activeSessions.get(context.sessionId);
      if (!session) {
        return this.createErrorResult(ServiceErrorCodes.INVALID_TOKEN, 'Invalid session');
      }

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        this.activeSessions.delete(context.sessionId);
        return this.createErrorResult(ServiceErrorCodes.INVALID_TOKEN, 'Session expired');
      }

      // Refresh AI provider tokens if needed
      const refreshedAiAuth = await this.refreshAiProviderTokens(session);

      // Refresh wallet tokens if needed
      const refreshedWalletAuth = await this.refreshWalletTokens(session);

      // Update session
      const updatedSession: SessionData = {
        ...session,
        aiProviders: refreshedAiAuth,
        walletAuth: refreshedWalletAuth,
        lastActivity: Date.now(),
      };
      this.activeSessions.set(context.sessionId, updatedSession);

      // Update permissions if needed
      const updatedPermissions = await this.getUserPermissions(session.userId);

      const refreshedContext: AuthContext = {
        ...context,
        permissions: updatedPermissions,
      };

      return {
        success: true,
        data: refreshedContext,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to refresh authentication');
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(context: AuthContext): Promise<ServiceResult<void>> {
    try {
      const session = this.activeSessions.get(context.sessionId);
      if (session) {
        // Cleanup AI provider sessions
        for (const [providerId] of Object.entries(session.aiProviders)) {
          await this.aiAuthManager.removeAuth(providerId);
        }

        // Cleanup wallet session
        if (session.walletAuth) {
          this.walletAuthService.clearActiveFlow();
        }

        // Remove session
        this.activeSessions.delete(context.sessionId);
      }

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Logout failed');
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(context: AuthContext, resource: string, action: string): Promise<boolean> {
    return context.permissions.some((p) => p.resource === resource && p.action === action);
  }

  /**
   * Check multiple permissions at once
   */
  async checkPermissions(context: AuthContext, permissions: Permission[]): Promise<boolean[]> {
    return permissions.map((permission) =>
      context.permissions.some(
        (p) =>
          p.resource === permission.resource &&
          p.action === permission.action &&
          (!permission.scope || p.scope === permission.scope)
      )
    );
  }

  /**
   * Validate session and return context
   */
  async validateSession(sessionId: string): Promise<ServiceResult<AuthContext>> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return this.createErrorResult(ServiceErrorCodes.INVALID_TOKEN, 'Invalid session');
      }

      if (session.expiresAt < Date.now()) {
        this.activeSessions.delete(sessionId);
        return this.createErrorResult(ServiceErrorCodes.INVALID_TOKEN, 'Session expired');
      }

      // Update last activity
      session.lastActivity = Date.now();
      this.activeSessions.set(sessionId, session);

      const context: AuthContext = {
        userId: session.userId,
        agentId: session.agentId,
        permissions: session.permissions,
        sessionId,
      };

      return {
        success: true,
        data: context,
      };
    } catch (error) {
      return this.handleError(error, 'Session validation failed');
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string): Promise<ServiceResult<void>> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Session not found');
      }

      // Extend expiration by 1 hour
      session.expiresAt = Date.now() + 3600000;
      session.lastActivity = Date.now();
      this.activeSessions.set(sessionId, session);

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to extend session');
    }
  }

  /**
   * Invalidate specific session
   */
  async invalidateSession(sessionId: string): Promise<ServiceResult<void>> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        // Cleanup associated auth
        for (const [providerId] of Object.entries(session.aiProviders)) {
          await this.aiAuthManager.removeAuth(providerId);
        }

        this.activeSessions.delete(sessionId);
      }

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to invalidate session');
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(userId: string, context: AuthContext): Promise<ServiceResult<any>> {
    try {
      // Authorization check
      if (context.userId !== userId && !(await this.hasPermission(context, 'user', 'read_any'))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to read user info'
        );
      }

      const session = this.activeSessions.get(context.sessionId);
      if (!session) {
        return this.createErrorResult(ServiceErrorCodes.INVALID_TOKEN, 'Invalid session');
      }

      const userInfo = {
        id: userId,
        permissions: session.permissions,
        aiProviders: Object.keys(session.aiProviders),
        hasWalletAuth: !!session.walletAuth,
        walletUser: session.walletAuth?.user,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      };

      return {
        success: true,
        data: userInfo,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get user info');
    }
  }

  /**
   * Update user information
   */
  async updateUserInfo(
    userId: string,
    updates: any,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    try {
      // Authorization check
      if (context.userId !== userId && !(await this.hasPermission(context, 'user', 'update_any'))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to update user info'
        );
      }

      const session = this.activeSessions.get(context.sessionId);
      if (!session) {
        return this.createErrorResult(ServiceErrorCodes.INVALID_TOKEN, 'Invalid session');
      }

      // Apply allowed updates
      if (updates.agentId && typeof updates.agentId === 'string') {
        session.agentId = updates.agentId;
        this.activeSessions.set(context.sessionId, session);
      }

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to update user info');
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    role: string,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    try {
      // Authorization check
      if (!(await this.hasPermission(context, 'user', 'assign_role'))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to assign roles'
        );
      }

      const rolePermissions = this.rolePermissions.get(role);
      if (!rolePermissions) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Role not found');
      }

      // Add role permissions to user
      const currentPermissions = this.userPermissions.get(userId) || [];
      const updatedPermissions = [
        ...currentPermissions,
        ...rolePermissions.filter(
          (rp) =>
            !currentPermissions.some(
              (cp) =>
                cp.resource === rp.resource && cp.action === rp.action && cp.scope === rp.scope
            )
        ),
      ];

      this.userPermissions.set(userId, updatedPermissions);

      // Update active sessions for this user
      for (const [sessionId, session] of this.activeSessions) {
        if (session.userId === userId) {
          session.permissions = updatedPermissions;
          this.activeSessions.set(sessionId, session);
        }
      }

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to assign role');
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRole(
    userId: string,
    role: string,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    try {
      // Authorization check
      if (!(await this.hasPermission(context, 'user', 'revoke_role'))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to revoke roles'
        );
      }

      const rolePermissions = this.rolePermissions.get(role);
      if (!rolePermissions) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Role not found');
      }

      // Remove role permissions from user
      const currentPermissions = this.userPermissions.get(userId) || [];
      const updatedPermissions = currentPermissions.filter(
        (cp) =>
          !rolePermissions.some(
            (rp) => cp.resource === rp.resource && cp.action === rp.action && cp.scope === rp.scope
          )
      );

      this.userPermissions.set(userId, updatedPermissions);

      // Update active sessions for this user
      for (const [sessionId, session] of this.activeSessions) {
        if (session.userId === userId) {
          session.permissions = updatedPermissions;
          this.activeSessions.set(sessionId, session);
        }
      }

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to revoke role');
    }
  }

  /**
   * Grant specific permission to user
   */
  async grantPermission(
    userId: string,
    permission: Permission,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    try {
      // Authorization check
      if (!(await this.hasPermission(context, 'user', 'grant_permission'))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to grant permissions'
        );
      }

      const currentPermissions = this.userPermissions.get(userId) || [];

      // Check if permission already exists
      const exists = currentPermissions.some(
        (p) =>
          p.resource === permission.resource &&
          p.action === permission.action &&
          p.scope === permission.scope
      );

      if (!exists) {
        currentPermissions.push(permission);
        this.userPermissions.set(userId, currentPermissions);

        // Update active sessions
        for (const [sessionId, session] of this.activeSessions) {
          if (session.userId === userId) {
            session.permissions = currentPermissions;
            this.activeSessions.set(sessionId, session);
          }
        }
      }

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to grant permission');
    }
  }

  /**
   * Revoke specific permission from user
   */
  async revokePermission(
    userId: string,
    permission: Permission,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    try {
      // Authorization check
      if (!(await this.hasPermission(context, 'user', 'revoke_permission'))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to revoke permissions'
        );
      }

      const currentPermissions = this.userPermissions.get(userId) || [];
      const updatedPermissions = currentPermissions.filter(
        (p) =>
          !(
            p.resource === permission.resource &&
            p.action === permission.action &&
            p.scope === permission.scope
          )
      );

      this.userPermissions.set(userId, updatedPermissions);

      // Update active sessions
      for (const [sessionId, session] of this.activeSessions) {
        if (session.userId === userId) {
          session.permissions = updatedPermissions;
          this.activeSessions.set(sessionId, session);
        }
      }

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to revoke permission');
    }
  }

  // Private helper methods

  private determineAuthType(credentials: any): string {
    if (credentials.apiKey && credentials.providerId) {
      return 'api_key';
    }
    if (credentials.authCode && credentials.state && credentials.flowId) {
      return 'oauth_code';
    }
    if (credentials.walletAuthCode && credentials.walletState) {
      return 'wallet_oauth';
    }
    if (credentials.sessionToken) {
      return 'session_token';
    }
    return 'unknown';
  }

  private async authenticateWithApiKey(credentials: any): Promise<UnifiedAuthResult> {
    const { apiKey, providerId, userId } = credentials;

    // Validate API key
    if (!this.aiAuthManager.validateApiKey(providerId, apiKey)) {
      throw new Error('Invalid API key format');
    }

    // Set auth config
    const authConfig: AuthConfig = {
      method: 'api_key' as AuthMethod,
      credentials: { api_key: apiKey },
      expires_at: Date.now() + 86400000, // 24 hours
    };

    await this.aiAuthManager.setAuthConfig(providerId, authConfig);

    // Get user permissions
    const permissions = await this.getUserPermissions(userId || 'anonymous');

    return {
      context: {
        userId: userId || 'anonymous',
        permissions,
        sessionId: '', // Will be set later
      },
      aiAuth: authConfig,
    };
  }

  private async authenticateWithOAuthCode(credentials: any): Promise<UnifiedAuthResult> {
    const { authCode, flowId, userId } = credentials;

    // Complete OAuth flow
    const success = await this.aiAuthManager.completeOAuthFlow(flowId, authCode);
    if (!success) {
      throw new Error('OAuth flow completion failed');
    }

    // Get auth config
    const authConfig = await this.aiAuthManager.getAuthConfig(flowId);
    if (!authConfig) {
      throw new Error('Failed to retrieve auth config after OAuth');
    }

    // Get user permissions
    const permissions = await this.getUserPermissions(userId || 'oauth_user');

    return {
      context: {
        userId: userId || 'oauth_user',
        permissions,
        sessionId: '',
      },
      aiAuth: authConfig,
    };
  }

  private async authenticateWithWalletOAuth(credentials: any): Promise<UnifiedAuthResult> {
    const { walletAuthCode, walletState } = credentials;

    // Complete wallet OAuth flow
    const oauthResult = await this.walletAuthService.completeOAuthFlow(walletAuthCode, walletState);
    const walletAuth = this.walletAuthService.createWalletAuth(oauthResult);

    // Get user permissions
    const permissions = await this.getUserPermissions(oauthResult.user.id);

    return {
      context: {
        userId: oauthResult.user.id,
        permissions,
        sessionId: '',
      },
      walletAuth,
    };
  }

  private async authenticateWithSessionToken(credentials: any): Promise<UnifiedAuthResult> {
    const { sessionToken } = credentials;

    const session = this.activeSessions.get(sessionToken);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error('Invalid or expired session token');
    }

    return {
      context: {
        userId: session.userId,
        agentId: session.agentId,
        permissions: session.permissions,
        sessionId: sessionToken,
      },
    };
  }

  private async createSession(authResult: UnifiedAuthResult): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 86400000; // 24 hours

    const session: SessionData = {
      id: sessionId,
      userId: authResult.context.userId,
      agentId: authResult.context.agentId,
      permissions: authResult.context.permissions,
      aiProviders: authResult.aiAuth ? { default: authResult.aiAuth } : {},
      walletAuth: authResult.walletAuth,
      createdAt: Date.now(),
      expiresAt,
      lastActivity: Date.now(),
    };

    this.activeSessions.set(sessionId, session);
    return sessionId;
  }

  private async refreshAiProviderTokens(session: SessionData): Promise<Record<string, AuthConfig>> {
    const refreshedProviders: Record<string, AuthConfig> = {};

    for (const [providerId, authConfig] of Object.entries(session.aiProviders)) {
      if (
        authConfig.method === 'oauth2' &&
        authConfig.expires_at &&
        authConfig.expires_at < Date.now()
      ) {
        const refreshSuccess = await this.aiAuthManager.refreshOAuthToken(providerId);
        if (refreshSuccess) {
          const refreshedConfig = await this.aiAuthManager.getAuthConfig(providerId);
          if (refreshedConfig) {
            refreshedProviders[providerId] = refreshedConfig;
          }
        }
      } else {
        refreshedProviders[providerId] = authConfig;
      }
    }

    return refreshedProviders;
  }

  private async refreshWalletTokens(session: SessionData): Promise<WalletAuth | undefined> {
    if (!session.walletAuth || !session.walletAuth.refreshToken) {
      return session.walletAuth;
    }

    // Check if wallet token needs refresh
    if (session.walletAuth.expiresAt && session.walletAuth.expiresAt < Date.now()) {
      try {
        const tokenResponse = await this.walletAuthService.refreshAccessToken(
          session.walletAuth.refreshToken
        );

        return {
          ...session.walletAuth,
          accessToken: tokenResponse.access_token,
          expiresAt: Date.now() + tokenResponse.expires_in * 1000,
          idToken: tokenResponse.id_token || session.walletAuth.idToken,
        };
      } catch (error) {
        console.error('Failed to refresh wallet token:', error);
        return undefined; // Token refresh failed, wallet auth invalid
      }
    }

    return session.walletAuth;
  }

  private async getUserPermissions(userId: string): Promise<Permission[]> {
    // Get user-specific permissions
    const userPermissions = this.userPermissions.get(userId) || [];

    // Add default permissions for authenticated users
    const defaultPermissions: Permission[] = [
      { resource: 'memory', action: 'create' },
      { resource: 'memory', action: 'read' },
      { resource: 'knowledge', action: 'read' },
      { resource: 'graph', action: 'read' },
    ];

    return [...defaultPermissions, ...userPermissions];
  }

  private initializeDefaultRoles(): void {
    // Admin role
    this.rolePermissions.set('admin', [{ resource: '*', action: '*' }]);

    // User role
    this.rolePermissions.set('user', [
      { resource: 'memory', action: 'create' },
      { resource: 'memory', action: 'read' },
      { resource: 'memory', action: 'update' },
      { resource: 'memory', action: 'delete' },
      { resource: 'knowledge', action: 'create' },
      { resource: 'knowledge', action: 'read' },
      { resource: 'knowledge', action: 'share' },
      { resource: 'graph', action: 'create_node' },
      { resource: 'graph', action: 'create_edge' },
      { resource: 'graph', action: 'read' },
    ]);

    // Reader role
    this.rolePermissions.set('reader', [
      { resource: 'memory', action: 'read' },
      { resource: 'knowledge', action: 'read' },
      { resource: 'graph', action: 'read' },
    ]);

    // Agent role (for AI agents)
    this.rolePermissions.set('agent', [
      { resource: 'memory', action: 'create', scope: 'self' },
      { resource: 'memory', action: 'read', scope: 'self' },
      { resource: 'memory', action: 'update', scope: 'self' },
      { resource: 'knowledge', action: 'create' },
      { resource: 'knowledge', action: 'read' },
      { resource: 'knowledge', action: 'share' },
      { resource: 'graph', action: 'create_node', scope: 'self' },
      { resource: 'graph', action: 'create_edge', scope: 'self' },
      { resource: 'graph', action: 'read', scope: 'self' },
    ]);
  }

  // Public utility methods

  /**
   * Get authentication status for AI providers
   */
  async getAiProviderStatus(context: AuthContext): Promise<Record<string, boolean>> {
    const session = this.activeSessions.get(context.sessionId);
    if (!session) return {};

    const status: Record<string, boolean> = {};
    for (const [providerId, authConfig] of Object.entries(session.aiProviders)) {
      status[providerId] = authConfig.expires_at ? authConfig.expires_at > Date.now() : true;
    }

    return status;
  }

  /**
   * Get wallet authentication status
   */
  async getWalletStatus(
    context: AuthContext
  ): Promise<{ authenticated: boolean; user?: WalletUser }> {
    const session = this.activeSessions.get(context.sessionId);
    if (!session?.walletAuth) {
      return { authenticated: false };
    }

    const isValid = this.walletAuthService.isAuthValid(session.walletAuth);
    return {
      authenticated: isValid,
      user: isValid ? session.walletAuth.user : undefined,
    };
  }

  /**
   * Add AI provider authentication to existing session
   */
  async addAiProvider(
    context: AuthContext,
    providerId: string,
    authConfig: AuthConfig
  ): Promise<ServiceResult<void>> {
    try {
      const session = this.activeSessions.get(context.sessionId);
      if (!session) {
        return this.createErrorResult(ServiceErrorCodes.INVALID_TOKEN, 'Invalid session');
      }

      session.aiProviders[providerId] = authConfig;
      this.activeSessions.set(context.sessionId, session);

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to add AI provider');
    }
  }

  /**
   * Remove AI provider authentication from session
   */
  async removeAiProvider(context: AuthContext, providerId: string): Promise<ServiceResult<void>> {
    try {
      const session = this.activeSessions.get(context.sessionId);
      if (!session) {
        return this.createErrorResult(ServiceErrorCodes.INVALID_TOKEN, 'Invalid session');
      }

      delete session.aiProviders[providerId];
      this.activeSessions.set(context.sessionId, session);

      // Also remove from AI auth manager
      await this.aiAuthManager.removeAuth(providerId);

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to remove AI provider');
    }
  }

  // Error handling
  private createErrorResult<T>(code: ServiceErrorCode, message: string): ServiceResult<T> {
    return {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private handleError(error: any, defaultMessage: string): ServiceResult<any> {
    console.error(defaultMessage, error);

    return {
      success: false,
      error: {
        code: ServiceErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : defaultMessage,
        timestamp: new Date().toISOString(),
        details: { originalError: String(error) },
      },
    };
  }
}

// Global service instance
let globalAuthService: AuthService | null = null;

/**
 * Get the global authentication service
 */
export function getAuthService(): AuthService {
  if (!globalAuthService) {
    globalAuthService = new AuthService();
  }
  return globalAuthService;
}
