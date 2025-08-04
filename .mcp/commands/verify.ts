/**
 * Multi-Agent Verification Command System
 * Usage: /verify [files] [--scope=all] [--mode=full-pipeline]
 */

import { verificationCoordinator } from '../agents/coordination-logic';
import { invoke } from '@tauri-apps/api/core';

export interface VerifyCommandOptions {
  files?: string[];
  scope?: 'file' | 'component' | 'module' | 'platform';
  mode?: 'quick' | 'standard' | 'full-pipeline';
  watch?: boolean;
  output?: 'console' | 'file' | 'both';
  skipCache?: boolean;
  concurrent?: boolean;
}

export class VerificationCommand {
  /**
   * Main verification command entry point
   */
  static async execute(options: VerifyCommandOptions = {}): Promise<string> {
    console.log('🤖 Multi-Agent AI Code Verification System v1.0 — CROSS-PLATFORM EDITION');
    console.log('✅ SYSTEM STATUS: FULLY OPERATIONAL\n');

    const {
      files = [],
      scope = 'platform',
      mode = 'standard',
      watch = false,
      output = 'console',
      skipCache = false,
      concurrent = false,
    } = options;

    try {
      // Determine files to verify
      const targetFiles = await this.resolveTargetFiles(files, scope);
      console.log(`📂 Target files: ${targetFiles.length} files`);
      console.log(`🔍 Scope: ${scope.toUpperCase()}`);
      console.log(`⚡ Mode: ${mode.toUpperCase()}`);
      console.log(`🔄 Concurrent: ${concurrent ? 'ENABLED' : 'DISABLED'}\n`);

      // Start verification session
      const sessionId = await verificationCoordinator.startVerification(targetFiles, {
        scope,
        mode,
        skipCache,
      });

      console.log(`🎯 Session ID: ${sessionId}`);
      console.log('🏗️ SYSTEM ARCHITECTURE: Multi-Agent Pipeline Active\n');

      // Monitor progress
      if (watch) {
        await this.watchProgress(sessionId, output);
      } else {
        await this.waitForCompletion(sessionId, output);
      }

      // Generate final report
      const session = verificationCoordinator.getSession(sessionId);
      if (session) {
        await this.generateReport(session, output);
      }

      return sessionId;
    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    }
  }

  /**
   * Resolve target files based on scope
   */
  private static async resolveTargetFiles(files: string[], scope: string): Promise<string[]> {
    if (files.length > 0) {
      return files;
    }

    switch (scope) {
      case 'platform':
        return await this.getAllPlatformFiles();
      case 'module':
        return await this.getModuleFiles();
      case 'component':
        return await this.getComponentFiles();
      case 'file':
        return await this.getCurrentFiles();
      default:
        return await this.getAllPlatformFiles();
    }
  }

  /**
   * Get all platform files for comprehensive verification
   */
  private static async getAllPlatformFiles(): Promise<string[]> {
    const patterns = [
      'src/**/*.ts',
      'src/**/*.tsx',
      'src/**/*.js',
      'src/**/*.jsx',
      'src-tauri/src/**/*.rs',
      'src-tauri/Cargo.toml',
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'biome.json',
    ];

    const allFiles: string[] = [];
    for (const pattern of patterns) {
      try {
        const matches = await this.globFiles(pattern);
        allFiles.push(...matches);
      } catch (error) {
        console.warn(`Failed to match pattern ${pattern}:`, error);
      }
    }

    return [...new Set(allFiles)]; // Remove duplicates
  }

  /**
   * Get module-specific files
   */
  private static async getModuleFiles(): Promise<string[]> {
    const patterns = [
      'src/lib/**/*.ts',
      'src/lib/**/*.tsx',
      'src/components/**/*.ts',
      'src/components/**/*.tsx',
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await this.globFiles(pattern);
      files.push(...matches);
    }

    return files;
  }

  /**
   * Get component files
   */
  private static async getComponentFiles(): Promise<string[]> {
    return await this.globFiles('src/components/**/*.{ts,tsx}');
  }

  /**
   * Get current working files
   */
  private static async getCurrentFiles(): Promise<string[]> {
    // Get recently modified files
    try {
      const recentFiles = await invoke<string[]>('get_recent_files', {
        since: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.rs'],
      });
      return recentFiles;
    } catch (error) {
      console.warn('Failed to get recent files, falling back to all files');
      return await this.getAllPlatformFiles();
    }
  }

  /**
   * Glob file pattern matching
   */
  private static async globFiles(pattern: string): Promise<string[]> {
    try {
      return await invoke<string[]>('glob_files', { pattern });
    } catch (error) {
      console.warn(`Glob pattern failed: ${pattern}`, error);
      return [];
    }
  }

  /**
   * Watch verification progress in real-time
   */
  private static async watchProgress(sessionId: string, output: string): Promise<void> {
    console.log('👀 Watching verification progress...\n');

    const startTime = Date.now();
    let lastStatus = '';

    while (true) {
      const session = verificationCoordinator.getSession(sessionId);
      if (!session) break;

      // Display agent status
      if (session.status !== lastStatus) {
        this.displayAgentStatus(session);
        lastStatus = session.status;
      }

      // Check if completed
      if (session.status === 'completed' || session.status === 'failed') {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  Total duration: ${duration}s\n`);
  }

  /**
   * Wait for verification completion
   */
  private static async waitForCompletion(sessionId: string, output: string): Promise<void> {
    console.log('⏳ Running verification pipeline...\n');

    while (true) {
      const session = verificationCoordinator.getSession(sessionId);
      if (!session) break;

      if (session.status === 'completed' || session.status === 'failed') {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  /**
   * Display agent status
   */
  private static displayAgentStatus(session: any): void {
    console.log(`🔄 Status: ${session.status.toUpperCase()}`);

    const agentEmojis = {
      verifier: '🔍',
      planner: '📋',
      implementer: '⚡',
    };

    for (const agent of session.agents) {
      const emoji = agentEmojis[agent.agent] || '🤖';
      const progress = `${agent.progress}%`;
      const status = agent.status.toUpperCase();
      const task = agent.currentTask ? ` - ${agent.currentTask}` : '';

      console.log(`${emoji} ${agent.agent}: ${status} (${progress})${task}`);
    }
    console.log('');
  }

  /**
   * Generate verification report
   */
  private static async generateReport(session: any, output: string): Promise<void> {
    console.log('📊 VERIFICATION RESULTS\n');
    console.log('=' + '='.repeat(50));

    const { results } = session;
    const { issues, metrics } = results;

    // Summary
    console.log(`📈 Total Issues: ${metrics.totalIssues}`);
    console.log(`🔒 Security Score: ${metrics.securityScore}/100`);
    console.log(`⚡ Performance Score: ${metrics.performanceScore}/100`);
    console.log(`🔧 Maintainability Score: ${metrics.maintainabilityScore}/100\n`);

    // Issues by priority
    if (metrics.issuesByPriority) {
      console.log('🎯 Issues by Priority:');
      Object.entries(metrics.issuesByPriority).forEach(([priority, count]) => {
        const emoji = this.getPriorityEmoji(priority);
        console.log(`   ${emoji} ${priority.toUpperCase()}: ${count}`);
      });
      console.log('');
    }

    // Top issues
    if (issues.length > 0) {
      console.log('🔥 Top Priority Issues:');
      const topIssues = issues
        .filter((issue) => ['P0', 'P1', 'P2'].includes(issue.severity))
        .slice(0, 5);

      topIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.severity}] ${issue.title}`);
        console.log(`      📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`      💡 ${issue.suggestion.substring(0, 80)}...`);
        console.log('');
      });
    }

    // Agent performance
    console.log('🤖 Agent Performance:');
    for (const agent of session.agents) {
      const duration =
        agent.endTime && agent.startTime
          ? (
              (new Date(agent.endTime).getTime() - new Date(agent.startTime).getTime()) /
              1000
            ).toFixed(1)
          : 'N/A';
      console.log(`   ${agent.agent}: ${agent.status.toUpperCase()} (${duration}s)`);
    }

    console.log('\n' + '='.repeat(51));
    console.log(`📋 Session Report: .mcp/sessions/report-${session.id}.json`);
    console.log(`🔍 Detailed Log: .mcp/sessions/session-${session.id}.json`);
  }

  /**
   * Get priority emoji
   */
  private static getPriorityEmoji(priority: string): string {
    const emojis: Record<string, string> = {
      critical: '🚨',
      high: '🔴',
      medium: '🟡',
      low: '🟢',
      P0: '🚨',
      P1: '🔴',
      P2: '🟠',
      P3: '🟡',
      P4: '🔵',
      P5: '🟢',
    };
    return emojis[priority] || '📌';
  }
}

// CLI-style usage
export async function verify(options: VerifyCommandOptions = {}): Promise<string> {
  return await VerificationCommand.execute(options);
}

// Quick verification shortcuts
export async function verifyAll(): Promise<string> {
  return await verify({ scope: 'platform', mode: 'standard' });
}

export async function verifyQuick(files?: string[]): Promise<string> {
  return await verify({ files, mode: 'quick' });
}

export async function verifyFull(files?: string[]): Promise<string> {
  return await verify({ files, mode: 'full-pipeline' });
}
