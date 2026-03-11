'use client';

import { WorkflowActionCard } from './WorkflowActionCard';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    action?: any;
  };
  onApplyAction?: (action: any) => void;
}

function formatContent(content: string): string {
  // Strip workflow_action code blocks (they're shown as action cards)
  let formatted = content.replace(/```workflow_action[\s\S]*?```/g, '').trim();

  // Bold: **text** -> <strong>text</strong>
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Inline code: `code` -> <code>code</code>
  formatted = formatted.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-studio-bg px-1 py-0.5 text-[11px] font-mono text-indigo-300">$1</code>'
  );

  // Newlines -> <br>
  formatted = formatted.replace(/\n/g, '<br/>');

  return formatted;
}

export function ChatMessage({ message, onApplyAction }: ChatMessageProps) {
  if (message.role === 'system') {
    return (
      <div className="flex justify-center px-4 py-2">
        <p className="text-center text-xs text-studio-text-muted italic">{message.content}</p>
      </div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 py-1.5`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser
            ? 'border-l-2 border-l-indigo-400 bg-indigo-600/20'
            : 'border-l-2 border-l-studio-border bg-studio-surface'
        }`}
      >
        {/* Role label */}
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold uppercase ${
              isUser ? 'text-indigo-400' : 'text-studio-text-muted'
            }`}
          >
            {isUser ? 'You' : 'AI Assistant'}
          </span>
          <span className="text-[9px] text-studio-text-muted">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Message content */}
        {message.content && (
          <div
            className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-studio-text'}`}
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />
        )}

        {/* Workflow action card */}
        {message.action && onApplyAction && (
          <WorkflowActionCard
            action={message.action}
            onApply={() => onApplyAction(message.action)}
          />
        )}
      </div>
    </div>
  );
}
