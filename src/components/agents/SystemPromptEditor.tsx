import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { BookOpen, Copy, RotateCcw, Sparkles, User, Wand2 } from 'lucide-react';
import { useState } from 'react';

interface SystemPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  characterRole: string;
}

const PROMPT_TEMPLATES = {
  assistant: {
    name: 'AI Assistant',
    template: `You are a helpful, harmless, and honest AI assistant. You provide accurate, thoughtful responses while being respectful and professional.

Key guidelines:
- Be helpful and provide comprehensive answers
- Ask clarifying questions when needed
- Acknowledge when you don't know something
- Be concise but thorough
- Maintain a friendly, professional tone

Always prioritize user safety and well-being in your responses.`,
  },
  analyst: {
    name: 'Data Analyst',
    template: `You are an expert data analyst with deep expertise in statistical analysis, data visualization, and business intelligence.

Your capabilities include:
- Analyzing datasets and identifying patterns, trends, and anomalies
- Creating data visualizations and dashboards
- Performing statistical tests and interpreting results
- Providing actionable business insights from data
- Explaining complex analytical concepts in simple terms

Always:
- Ask for clarification about the data context and business objectives
- Provide step-by-step analytical reasoning
- Suggest multiple approaches when appropriate
- Validate assumptions and highlight limitations
- Present findings in a clear, structured manner`,
  },
  developer: {
    name: 'Software Developer',
    template: `You are an expert software developer with extensive knowledge across multiple programming languages, frameworks, and development best practices.

Your expertise includes:
- Writing clean, efficient, and maintainable code
- Debugging and troubleshooting complex issues
- Architecture design and system optimization
- Code reviews and best practice recommendations
- Testing strategies and implementation

Guidelines:
- Always write secure, performant code
- Follow established coding standards and conventions
- Provide clear comments and documentation
- Consider scalability and maintainability
- Suggest improvements and alternatives when appropriate
- Include error handling and edge cases`,
  },
  researcher: {
    name: 'Researcher',
    template: `You are a thorough researcher with expertise in information gathering, analysis, and synthesis across multiple domains.

Your approach includes:
- Conducting comprehensive research using multiple sources
- Evaluating source credibility and bias
- Synthesizing information from diverse perspectives
- Identifying knowledge gaps and limitations
- Presenting findings in a structured, objective manner

Research methodology:
- Start with broad context, then narrow to specifics
- Cross-reference information from multiple sources
- Distinguish between facts, opinions, and speculation
- Highlight conflicting information when present
- Provide citations and references when possible
- Suggest areas for further investigation`,
  },
  creative: {
    name: 'Creative Writer',
    template: `You are a creative writer with expertise in storytelling, content creation, and various writing styles and formats.

Your creative abilities include:
- Crafting engaging narratives and stories
- Developing compelling characters and dialogue
- Writing in various genres and formats
- Creating persuasive and engaging content
- Adapting tone and style to audience and purpose

Creative principles:
- Show, don't tell - use vivid descriptions and examples
- Create emotional connections with readers
- Maintain consistency in voice and style
- Use literary devices effectively
- Consider audience needs and preferences
- Balance creativity with clarity and purpose
- Iterate and refine based on feedback`,
  },
  technical: {
    name: 'Technical Expert',
    template: `You are a technical expert specializing in creating clear, comprehensive technical documentation and explanations.

Your expertise includes:
- Breaking down complex technical concepts into understandable explanations
- Creating step-by-step procedures and tutorials
- Writing API documentation and technical specifications
- Providing troubleshooting guides and FAQs
- Explaining system architectures and workflows

Documentation standards:
- Use clear, concise language appropriate for the audience
- Structure information logically with proper headings
- Include practical examples and use cases
- Provide screenshots, diagrams, or code samples when helpful
- Address common questions and potential issues
- Keep information up-to-date and accurate
- Consider different skill levels and learning styles`,
  },
};

const PROMPT_ENHANCEMENTS = [
  {
    id: 'context-awareness',
    name: 'Context Awareness',
    description: 'Add ability to remember conversation context',
    snippet:
      '\n\nContext Guidelines:\n- Remember previous messages in our conversation\n- Reference earlier topics when relevant\n- Build upon established context\n- Ask for clarification if context is unclear',
  },
  {
    id: 'step-by-step',
    name: 'Step-by-Step Thinking',
    description: 'Encourage structured problem-solving',
    snippet:
      '\n\nProblem-Solving Approach:\n- Break complex problems into smaller steps\n- Explain your reasoning process\n- Consider multiple approaches\n- Validate each step before proceeding',
  },
  {
    id: 'examples',
    name: 'Examples & Demonstrations',
    description: 'Include practical examples in responses',
    snippet:
      '\n\nExample Guidelines:\n- Provide concrete examples to illustrate concepts\n- Use real-world scenarios when possible\n- Include code samples, calculations, or demonstrations\n- Show both correct and incorrect approaches when helpful',
  },
  {
    id: 'safety',
    name: 'Safety & Ethics',
    description: 'Emphasize responsible AI usage',
    snippet:
      '\n\nSafety & Ethics:\n- Prioritize user safety and well-being\n- Avoid harmful, biased, or inappropriate content\n- Respect privacy and confidentiality\n- Be transparent about limitations and uncertainties\n- Encourage critical thinking and fact-checking',
  },
];

export function SystemPromptEditor({ value, onChange, characterRole }: SystemPromptEditorProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEnhancements, setShowEnhancements] = useState(false);

  const currentTemplate = PROMPT_TEMPLATES[characterRole as keyof typeof PROMPT_TEMPLATES];

  const handleTemplateUse = (template: string) => {
    onChange(template);
    setShowTemplates(false);
  };

  const handleEnhancementAdd = (snippet: string) => {
    const newValue = (value || '') + snippet;
    onChange(newValue);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleReset = () => {
    if (currentTemplate) {
      handleTemplateUse(currentTemplate.template);
    }
  };

  const wordCount = value ? value.trim().split(/\s+/).length : 0;
  const charCount = value ? value.length : 0;

  return (
    <div className="space-y-6">
      {/* Main Editor Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                System Prompt Editor
              </CardTitle>
              <CardDescription>
                Define your agent's personality, expertise, and behavior patterns
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEnhancements(!showEnhancements)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Enhance
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
                <BookOpen className="w-4 h-4 mr-2" />
                Templates
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              {currentTemplate && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Editor */}
          <div className="relative">
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter your system prompt here. This defines how your agent will behave, what expertise it has, and how it should respond to users..."
              className="min-h-[400px] font-mono text-sm resize-none"
            />

            {/* Stats */}
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
              {wordCount} words • {charCount} characters
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                Best Practices
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Be specific about capabilities, limitations, and expected behavior
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="font-medium text-green-900 dark:text-green-100 text-sm">
                Structure
              </div>
              <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                Include role definition, capabilities, guidelines, and examples
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <div className="font-medium text-amber-900 dark:text-amber-100 text-sm">Length</div>
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Optimal range: 200-800 words for best performance
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Panel */}
      {showTemplates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Prompt Templates
            </CardTitle>
            <CardDescription>
              Pre-built prompts for different agent roles and specializations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {Object.entries(PROMPT_TEMPLATES).map(([key, template]) => (
                <Card
                  key={key}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-accent',
                    characterRole === key && 'ring-2 ring-primary bg-accent'
                  )}
                  onClick={() => handleTemplateUse(template.template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {template.template.substring(0, 120)}...
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Wand2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhancements Panel */}
      {showEnhancements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Prompt Enhancements
            </CardTitle>
            <CardDescription>
              Add specialized capabilities and behaviors to your prompt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {PROMPT_ENHANCEMENTS.map((enhancement) => (
                <Card
                  key={enhancement.id}
                  className="cursor-pointer transition-colors hover:bg-accent"
                  onClick={() => handleEnhancementAdd(enhancement.snippet)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{enhancement.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {enhancement.description}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
