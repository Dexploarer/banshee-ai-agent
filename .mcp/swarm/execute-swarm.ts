/**
 * Execute Swarm Analysis
 * Runs the multi-agent verification swarm on the Banshee platform
 */

import { SwarmCoordinator } from './swarm-coordinator';

export async function executeSwarmAnalysis() {
  console.log('🚀 Initiating Multi-Agent Verification Swarm...\n');

  const coordinator = new SwarmCoordinator();

  // Define files to analyze based on gap analysis findings
  const targetFiles = [
    '/Users/michelleeidschun/agent/Banshee/src-tauri/src/database/simple_commands.rs',
    '/Users/michelleeidschun/agent/Banshee/src-tauri/src/ai/security.rs',
    '/Users/michelleeidschun/agent/Banshee/src-tauri/src/database/memory.rs',
    '/Users/michelleeidschun/agent/Banshee/src/lib/ai/memory/client.ts',
    '/Users/michelleeidschun/agent/Banshee/src/lib/ai/memory/hooks.ts',
    '/Users/michelleeidschun/agent/Banshee/src/lib/ai/mcpNative.ts',
    '/Users/michelleeidschun/agent/Banshee/src/lib/wallet/phantom-provider.tsx',
    '/Users/michelleeidschun/agent/Banshee/src/lib/ai/providers/auth.ts',
  ];

  const context = {
    platform: 'Banshee AI Agent Desktop Application',
    stack: 'Tauri (Rust + React)',
    focusAreas: ['Security', 'Performance', 'Architecture', 'Quality'],
    knownIssues: [
      'SecurityManager not integrated',
      'Frontend/backend API mismatch',
      'Placeholder implementations',
      'No test infrastructure',
    ],
  };

  try {
    const swarmResult = await coordinator.orchestrateSwarmAnalysis(targetFiles, context);

    console.log('\n📊 Swarm Analysis Complete!\n');
    console.log('='.repeat(80));

    // Display key findings
    console.log('\n🎯 CONSENSUS CRITICAL ISSUES:');
    swarmResult.consensus.criticalIssues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.title}`);
      console.log(
        `   Severity: ${issue.severity} | Confidence: ${(issue.confidence * 100).toFixed(0)}%`
      );
      console.log(`   Agents: ${issue.agentAgreement.join(', ')}`);
      console.log(`   ${issue.description}`);
    });

    console.log('\n💡 EMERGENT INSIGHTS:');
    swarmResult.emergentInsights.forEach((insight, index) => {
      console.log(`\n${index + 1}. ${insight.title} (${insight.type})`);
      console.log(`   Novelty: ${insight.novelty} | Action: ${insight.actionability}`);
      console.log(`   ${insight.description}`);
    });

    console.log('\n🔄 CROSS-AGENT PATTERNS:');
    swarmResult.crossAgentPatterns.forEach((pattern, index) => {
      console.log(`\n${index + 1}. ${pattern.pattern}`);
      console.log(`   Occurrences: ${pattern.occurrences.length} across agents`);
      console.log(`   Significance: ${pattern.significance}`);
    });

    console.log('\n📈 CONFIDENCE SCORES:');
    console.log(`   Overall: ${(swarmResult.confidenceScores.overall * 100).toFixed(0)}%`);
    Object.entries(swarmResult.confidenceScores.byCategory).forEach(([category, score]) => {
      console.log(`   ${category}: ${(score * 100).toFixed(0)}%`);
    });

    console.log('\n🎬 PRIORITIZED ACTIONS:');
    swarmResult.prioritizedActions.slice(0, 5).forEach((action) => {
      console.log(`\n${action.priority}. ${action.action}`);
      console.log(
        `   Impact: ${action.impact} | Effort: ${action.effort} | Consensus: ${action.consensus}%`
      );
    });

    console.log('\n🧠 COLLECTIVE INTELLIGENCE METRICS:');
    console.log(
      `   Synergy Score: ${(swarmResult.collectiveIntelligence.synergyScore * 100).toFixed(0)}%`
    );
    console.log(
      `   Coverage: ${(swarmResult.collectiveIntelligence.coverageCompleteness * 100).toFixed(0)}%`
    );
    console.log(
      `   Insight Depth: ${(swarmResult.collectiveIntelligence.insightDepth * 100).toFixed(0)}%`
    );
    console.log(
      `   Convergence: ${(swarmResult.collectiveIntelligence.convergenceRate * 100).toFixed(0)}%`
    );

    console.log('\n' + '='.repeat(80));

    // Convert to standard verification results
    const verificationResults = coordinator.convertToVerificationResults(swarmResult);

    console.log(`\n✅ Total Issues Identified: ${verificationResults.issues.length}`);
    console.log(`   Critical: ${verificationResults.issuesByPriority.critical}`);
    console.log(`   High: ${verificationResults.issuesByPriority.high}`);
    console.log(`   Medium: ${verificationResults.issuesByPriority.medium}`);
    console.log(`   Low: ${verificationResults.issuesByPriority.low}`);

    return { swarmResult, verificationResults };
  } catch (error) {
    console.error('❌ Swarm analysis failed:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  executeSwarmAnalysis().catch(console.error);
}
