/**
 * Agent 2: Intelligent Planner with Sequential Thinking
 * Strategic fix planning with architectural alignment
 * Speed: < 60s to produce implementation plan
 */

import type {
  Dependency,
  ImplementationPlan,
  Issue,
  PlanPhase,
  QualityMetrics,
  Risk,
  ValidationStep,
} from './coordination-logic';

export interface PlanningContext {
  issues: Issue[];
  metrics: QualityMetrics;
  platform: string;
  constraints: PlanningConstraints;
  goals: PlanningGoals;
}

export interface PlanningConstraints {
  maxRiskLevel: 'low' | 'medium' | 'high';
  maxDuration: string;
  mustPreserve: string[];
  cannotBreak: string[];
  resourceLimits: {
    concurrent: number;
    memory: string;
    time: string;
  };
}

export interface PlanningGoals {
  primary: 'security' | 'performance' | 'quality' | 'stability';
  secondary: string[];
  metrics: {
    targetSecurityScore: number;
    targetPerformanceScore: number;
    targetMaintainabilityScore: number;
  };
}

export interface ThinkingStep {
  step: number;
  thought: string;
  reasoning: string;
  conclusion: string;
  nextActions: string[];
}

export class IntelligentPlanner {
  private thinkingSteps: ThinkingStep[] = [];

  /**
   * Generate comprehensive implementation plan using sequential thinking
   */
  async generatePlan(context: PlanningContext): Promise<ImplementationPlan> {
    console.log('📋 Intelligent Planner: Starting strategic planning...');

    // Initialize planning constraints and goals
    const constraints = this.initializeConstraints(context);
    const goals = this.initializeGoals(context);

    // Use sequential thinking for complex planning
    await this.performSequentialAnalysis(context, constraints, goals);

    // Generate the actual plan based on thinking
    const plan = await this.synthesizePlan(context, constraints, goals);

    console.log(`✅ Intelligent Planner: Generated plan with ${plan.phases.length} phases`);
    return plan;
  }

  /**
   * Perform sequential thinking analysis
   */
  private async performSequentialAnalysis(
    context: PlanningContext,
    constraints: PlanningConstraints,
    goals: PlanningGoals
  ): Promise<void> {
    console.log('   🧠 Performing sequential thinking analysis...');

    // Step 1: Understand the problem space
    await this.thinkingStep(
      1,
      'Analyzing the current state of the Banshee codebase',
      `We have ${context.issues.length} issues across the platform. The security score is ${context.metrics.securityScore}/100, performance is ${context.metrics.performanceScore}/100, and maintainability is ${context.metrics.maintainabilityScore}/100.`,
      'Need to prioritize security and performance issues while maintaining system stability',
      ['Categorize issues by impact', 'Identify critical path', 'Assess dependencies']
    );

    // Step 2: Categorize and prioritize issues
    const issueCategories = this.categorizeIssues(context.issues);
    await this.thinkingStep(
      2,
      'Categorizing issues by type and impact',
      `Security issues: ${issueCategories.security.length}, Performance: ${issueCategories.performance.length}, Quality: ${issueCategories.quality.length}, Architecture: ${issueCategories.architecture.length}`,
      'Security and performance issues should be addressed first, followed by quality improvements',
      ['Create priority matrix', 'Identify blocking dependencies', 'Plan phase structure']
    );

    // Step 3: Identify dependencies and conflicts
    const dependencies = this.analyzeDependencies(context.issues);
    await this.thinkingStep(
      3,
      'Analyzing dependencies between fixes',
      `Found ${dependencies.length} dependencies between issues. Some fixes may conflict or require specific ordering.`,
      'Need to sequence fixes to avoid conflicts and ensure each phase builds on previous work',
      ['Create dependency graph', 'Identify bottlenecks', 'Plan parallel execution where possible']
    );

    // Step 4: Assess risks and mitigation strategies
    const risks = this.assessRisks(context.issues, constraints);
    await this.thinkingStep(
      4,
      'Assessing implementation risks',
      `Identified ${risks.length} potential risks. Main concerns are system stability and performance regression.`,
      'Need robust validation and rollback strategies for each phase',
      ['Design validation strategy', 'Create rollback plans', 'Set up monitoring']
    );

    // Step 5: Design phase structure
    await this.thinkingStep(
      5,
      'Designing optimal phase structure',
      'Based on dependencies and risks, will organize fixes into logical phases that minimize disruption',
      'Phase structure should allow for incremental progress with validation at each step',
      ['Define phase boundaries', 'Allocate issues to phases', 'Estimate timelines']
    );
  }

  /**
   * Add a thinking step to the analysis
   */
  private async thinkingStep(
    step: number,
    thought: string,
    reasoning: string,
    conclusion: string,
    nextActions: string[]
  ): Promise<void> {
    const thinkingStep: ThinkingStep = {
      step,
      thought,
      reasoning,
      conclusion,
      nextActions,
    };

    this.thinkingSteps.push(thinkingStep);
    console.log(`     💭 Step ${step}: ${thought}`);
  }

  /**
   * Synthesize the final implementation plan
   */
  private async synthesizePlan(
    context: PlanningContext,
    constraints: PlanningConstraints,
    goals: PlanningGoals
  ): Promise<ImplementationPlan> {
    console.log('   🔨 Synthesizing implementation plan...');

    const phases = this.createPhases(context.issues);
    const dependencies = this.analyzeDependencies(context.issues);
    const risks = this.assessRisks(context.issues, constraints);
    const validation = this.createValidationSteps(context);
    const timeline = this.estimateTimeline(phases);

    return {
      phases,
      dependencies,
      risks,
      timeline,
      validation,
    };
  }

  /**
   * Create implementation phases
   */
  private createPhases(issues: Issue[]): PlanPhase[] {
    const phases: PlanPhase[] = [];

    // Phase 1: Critical Security Fixes
    const criticalSecurity = issues.filter(
      (issue) => issue.type === 'security' && ['P0', 'P1'].includes(issue.severity)
    );

    if (criticalSecurity.length > 0) {
      phases.push({
        id: 'phase-1-security',
        name: 'Critical Security Fixes',
        description: 'Address immediate security vulnerabilities that pose critical risks',
        issues: criticalSecurity.map((issue) => issue.id),
        order: 1,
        estimatedDuration: '30-45 minutes',
      });
    }

    // Phase 2: Performance Critical Issues
    const performanceCritical = issues.filter(
      (issue) => issue.type === 'performance' && ['P0', 'P1', 'P2'].includes(issue.severity)
    );

    if (performanceCritical.length > 0) {
      phases.push({
        id: 'phase-2-performance',
        name: 'Performance Optimization',
        description: 'Fix performance bottlenecks and memory issues',
        issues: performanceCritical.map((issue) => issue.id),
        order: 2,
        estimatedDuration: '45-60 minutes',
      });
    }

    // Phase 3: Architecture & Quality Improvements
    const qualityIssues = issues.filter(
      (issue) =>
        ['quality', 'architecture'].includes(issue.type) && ['P2', 'P3'].includes(issue.severity)
    );

    if (qualityIssues.length > 0) {
      phases.push({
        id: 'phase-3-quality',
        name: 'Quality & Architecture',
        description: 'Improve code quality and architectural consistency',
        issues: qualityIssues.map((issue) => issue.id),
        order: 3,
        estimatedDuration: '30-40 minutes',
      });
    }

    // Phase 4: Compliance & Documentation
    const complianceIssues = issues.filter(
      (issue) => issue.type === 'compliance' || ['P4', 'P5'].includes(issue.severity)
    );

    if (complianceIssues.length > 0) {
      phases.push({
        id: 'phase-4-compliance',
        name: 'Compliance & Polish',
        description: 'Address remaining compliance issues and documentation',
        issues: complianceIssues.map((issue) => issue.id),
        order: 4,
        estimatedDuration: '20-30 minutes',
      });
    }

    return phases;
  }

  /**
   * Analyze dependencies between issues
   */
  private analyzeDependencies(issues: Issue[]): Dependency[] {
    const dependencies: Dependency[] = [];

    // Security issues typically block other work
    const securityIssues = issues.filter((issue) => issue.type === 'security');
    const otherIssues = issues.filter((issue) => issue.type !== 'security');

    securityIssues.forEach((secIssue) => {
      otherIssues.forEach((otherIssue) => {
        if (this.issuesConflict(secIssue, otherIssue)) {
          dependencies.push({
            source: secIssue.id,
            target: otherIssue.id,
            type: 'blocks',
            reason: 'Security fixes must be applied before other modifications',
          });
        }
      });
    });

    // Architecture changes typically require other changes
    const archIssues = issues.filter((issue) => issue.type === 'architecture');
    const qualityIssues = issues.filter((issue) => issue.type === 'quality');

    archIssues.forEach((archIssue) => {
      qualityIssues.forEach((qualityIssue) => {
        if (this.issuesRelated(archIssue, qualityIssue)) {
          dependencies.push({
            source: archIssue.id,
            target: qualityIssue.id,
            type: 'requires',
            reason: 'Architecture changes enable quality improvements',
          });
        }
      });
    });

    return dependencies;
  }

  /**
   * Assess implementation risks
   */
  private assessRisks(issues: Issue[], constraints: PlanningConstraints): Risk[] {
    const risks: Risk[] = [];

    // System stability risk
    const criticalIssues = issues.filter((issue) => ['P0', 'P1'].includes(issue.severity));
    if (criticalIssues.length > 5) {
      risks.push({
        level: 'high',
        description: 'Large number of critical fixes may destabilize the system',
        mitigation: 'Implement fixes incrementally with validation after each phase',
        impact: 'System instability, potential downtime, user experience degradation',
      });
    }

    // Performance regression risk
    const performanceIssues = issues.filter((issue) => issue.type === 'performance');
    if (performanceIssues.length > 3) {
      risks.push({
        level: 'medium',
        description: 'Performance optimizations may introduce new bottlenecks',
        mitigation: 'Profile performance before and after each change, maintain benchmarks',
        impact: 'Application slowdown, increased resource usage',
      });
    }

    // Security vulnerability risk
    const securityIssues = issues.filter((issue) => issue.type === 'security');
    if (securityIssues.some((issue) => issue.severity === 'P0')) {
      risks.push({
        level: 'critical',
        description: 'Critical security vulnerabilities expose system to attacks',
        mitigation: 'Prioritize security fixes, implement defense in depth',
        impact: 'Data breach, system compromise, reputation damage',
      });
    }

    // Integration risk
    const mcpIssues = issues.filter((issue) => issue.tags.includes('mcp'));
    if (mcpIssues.length > 0) {
      risks.push({
        level: 'medium',
        description: 'MCP protocol changes may break AI integration',
        mitigation: 'Test AI functionality thoroughly, maintain backward compatibility',
        impact: 'AI features malfunction, reduced application functionality',
      });
    }

    return risks;
  }

  /**
   * Create validation steps
   */
  private createValidationSteps(context: PlanningContext): ValidationStep[] {
    const steps: ValidationStep[] = [];

    // TypeScript compilation
    steps.push({
      type: 'compile',
      command: 'bun run typecheck',
      expectedResult: 'No TypeScript errors',
    });

    // Linting
    steps.push({
      type: 'lint',
      command: 'bun run check',
      expectedResult: 'No linting errors or warnings',
    });

    // Security validation
    if (context.issues.some((issue) => issue.type === 'security')) {
      steps.push({
        type: 'security',
        command: 'bun run security-scan',
        expectedResult: 'No security vulnerabilities detected',
      });
    }

    // Integration tests
    steps.push({
      type: 'integration',
      command: 'bun run test:integration',
      expectedResult: 'All integration tests pass',
    });

    // Performance tests
    if (context.issues.some((issue) => issue.type === 'performance')) {
      steps.push({
        type: 'test',
        command: 'bun run test:performance',
        expectedResult: 'Performance metrics within acceptable ranges',
      });
    }

    return steps;
  }

  /**
   * Estimate total timeline
   */
  private estimateTimeline(phases: PlanPhase[]): string {
    const totalMinutes = phases.reduce((total, phase) => {
      const match = phase.estimatedDuration.match(/(\d+)-(\d+)/);
      if (match) {
        const avg = (Number.parseInt(match[1]) + Number.parseInt(match[2])) / 2;
        return total + avg;
      }
      return total + 30; // Default estimate
    }, 0);

    const hours = Math.ceil(totalMinutes / 60);
    return `${hours}-${hours + 1} hours`;
  }

  // Helper methods
  private initializeConstraints(context: PlanningContext): PlanningConstraints {
    return {
      maxRiskLevel: 'medium',
      maxDuration: '4 hours',
      mustPreserve: ['AI functionality', 'MCP integration', 'User data'],
      cannotBreak: ['Build process', 'Core features', 'API compatibility'],
      resourceLimits: {
        concurrent: 3,
        memory: '2GB',
        time: '4 hours',
      },
    };
  }

  private initializeGoals(context: PlanningContext): PlanningGoals {
    return {
      primary: this.determinePrimaryGoal(context),
      secondary: ['maintainability', 'performance', 'security'],
      metrics: {
        targetSecurityScore: Math.min(100, context.metrics.securityScore + 20),
        targetPerformanceScore: Math.min(100, context.metrics.performanceScore + 15),
        targetMaintainabilityScore: Math.min(100, context.metrics.maintainabilityScore + 10),
      },
    };
  }

  private determinePrimaryGoal(
    context: PlanningContext
  ): 'security' | 'performance' | 'quality' | 'stability' {
    const { metrics } = context;

    if (metrics.securityScore < 70) return 'security';
    if (metrics.performanceScore < 70) return 'performance';
    if (metrics.maintainabilityScore < 60) return 'quality';
    return 'stability';
  }

  private categorizeIssues(issues: Issue[]) {
    return {
      security: issues.filter((issue) => issue.type === 'security'),
      performance: issues.filter((issue) => issue.type === 'performance'),
      quality: issues.filter((issue) => issue.type === 'quality'),
      architecture: issues.filter((issue) => issue.type === 'architecture'),
      compliance: issues.filter((issue) => issue.type === 'compliance'),
    };
  }

  private issuesConflict(issue1: Issue, issue2: Issue): boolean {
    // Check if issues affect the same file and could conflict
    return issue1.file === issue2.file && Math.abs((issue1.line || 0) - (issue2.line || 0)) < 10;
  }

  private issuesRelated(issue1: Issue, issue2: Issue): boolean {
    // Check if issues are in related files or have similar tags
    const sharedTags = issue1.tags.filter((tag) => issue2.tags.includes(tag));
    return (
      sharedTags.length > 0 ||
      issue1.file.includes(issue2.file.split('/')[1]) ||
      issue2.file.includes(issue1.file.split('/')[1])
    );
  }

  /**
   * Get the thinking process for debugging/logging
   */
  getThinkingProcess(): ThinkingStep[] {
    return this.thinkingSteps;
  }
}
