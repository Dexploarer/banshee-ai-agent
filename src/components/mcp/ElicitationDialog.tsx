import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ElicitationRequest,
  type ElicitationResponse,
  getElicitationManager,
} from '@/lib/ai/elicitation';
import { AlertCircle, CheckCircle, HelpCircle, MessageSquare, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ElicitationDialogProps {
  onResponse?: (response: ElicitationResponse) => void;
  className?: string;
}

export function ElicitationDialog({ onResponse, className }: ElicitationDialogProps) {
  const [activeRequests, setActiveRequests] = useState<ElicitationRequest[]>([]);
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    const manager = getElicitationManager();

    // Load initial active requests
    setActiveRequests(manager.getActiveRequests());

    // Listen for elicitation events
    const handleElicitationEvent = (event: CustomEvent) => {
      const { type, data } = event.detail;

      switch (type) {
        case 'request':
          setActiveRequests((prev) => [...prev, data.request]);
          break;
        case 'response':
          setActiveRequests((prev) => prev.filter((req) => req.id !== data.request.id));
          break;
        case 'cancel':
          setActiveRequests((prev) => prev.filter((req) => req.id !== data.requestId));
          break;
      }
    };

    window.addEventListener('mcp-elicitation', handleElicitationEvent as EventListener);

    return () => {
      window.removeEventListener('mcp-elicitation', handleElicitationEvent as EventListener);
    };
  }, []);

  const handleResponse = async (request: ElicitationRequest) => {
    const responseValue = responses[request.id];
    if (responseValue === undefined || responseValue === '') {
      return;
    }

    const response: ElicitationResponse = {
      requestId: request.id,
      response: responseValue,
      metadata: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      },
    };

    try {
      const manager = getElicitationManager();
      await manager.respondToElicitation(response);

      // Clear the response from state
      setResponses((prev) => {
        const newResponses = { ...prev };
        delete newResponses[request.id];
        return newResponses;
      });

      onResponse?.(response);
    } catch (error) {
      console.error('Failed to respond to elicitation:', error);
    }
  };

  const handleCancel = (requestId: string) => {
    const manager = getElicitationManager();
    manager.cancelElicitation(requestId);

    setResponses((prev) => {
      const newResponses = { ...prev };
      delete newResponses[requestId];
      return newResponses;
    });
  };

  const updateResponse = (requestId: string, value: string | boolean) => {
    setResponses((prev) => ({
      ...prev,
      [requestId]: value,
    }));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'question':
        return <HelpCircle className="h-5 w-5 text-blue-500" />;
      case 'choice':
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case 'confirmation':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'input':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderInputForType = (request: ElicitationRequest) => {
    const value = responses[request.id];

    switch (request.type) {
      case 'confirmation':
        return (
          <div className="flex gap-2">
            <Button
              variant={value === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateResponse(request.id, true)}
            >
              Yes
            </Button>
            <Button
              variant={value === false ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateResponse(request.id, false)}
            >
              No
            </Button>
          </div>
        );

      case 'choice':
        return (
          <div className="space-y-2">
            {request.options?.map((option) => (
              <Button
                key={option}
                variant={value === option ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => updateResponse(request.id, option)}
              >
                {option}
              </Button>
            ))}
          </div>
        );

      default:
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => updateResponse(request.id, e.target.value)}
            placeholder="Enter your response..."
            className="w-full px-3 py-2 border rounded-lg resize-none"
            rows={3}
          />
        );
    }
  };

  if (activeRequests.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${className}`}
    >
      <div className="max-w-2xl w-full max-h-[80vh] overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Additional Information Required
            </CardTitle>
            <CardDescription>
              The AI system needs more information to complete your request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeRequests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Request Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getIcon(request.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{request.type}</Badge>
                            {request.required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-2">{request.prompt}</p>
                          {request.context && (
                            <div className="text-xs text-muted-foreground">
                              Context: {JSON.stringify(request.context, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleCancel(request.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Input Area */}
                    <div className="space-y-3">
                      {renderInputForType(request)}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleResponse(request)}
                          disabled={
                            !responses[request.id] || (request.required && !responses[request.id])
                          }
                          size="sm"
                        >
                          Submit Response
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleCancel(request.id)}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Footer */}
            <div className="text-xs text-muted-foreground text-center pt-4 border-t">
              MCP Elicitation • {activeRequests.length} pending request
              {activeRequests.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
