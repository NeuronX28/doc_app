import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { clsx } from 'clsx';
import { Message, Document, QuestionSuggestion } from '../types';
import { DataVisualization } from './DataVisualization';
import { marked } from 'marked';

interface ChatProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  document: Document;
}

// Helper function to safely parse markdown
const parseMarkdown = (content: string | null | undefined): string => {
  if (!content) return '';
  try {
    return marked(content);
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return String(content);
  }
};

export function Chat({ messages, onSendMessage, isProcessing, document }: ChatProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<QuestionSuggestion[]>([]);

  useEffect(() => {
    if (!input.trim() || !document) return;

    // Generate suggestions based on input and document data
    const newSuggestions: QuestionSuggestion[] = [];
    
    // Column-based suggestions
    document.columns.forEach(column => {
      if (column.toLowerCase().includes(input.toLowerCase())) {
        newSuggestions.push({
          text: `What is the distribution of ${column}?`,
          type: 'column'
        });
        newSuggestions.push({
          text: `What is the average ${column}?`,
          type: 'aggregate'
        });
      }
    });

    // Add common analytical questions
    if (input.toLowerCase().includes('how many')) {
      document.columns.forEach(column => {
        newSuggestions.push({
          text: `How many entries have ${column}?`,
          type: 'aggregate'
        });
      });
    }

    setSuggestions(newSuggestions.slice(0, 5));
  }, [input, document]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: QuestionSuggestion) => {
    setInput(suggestion.text);
    setSuggestions([]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              'flex flex-col',
              message.role === 'user' ? 'items-end' : 'items-start'
            )}
          >
            <div
              className={clsx(
                'max-w-[80%] rounded-lg p-4',
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              )}
            >
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: parseMarkdown(String(message.content)) 
                }} 
              />
            </div>
            {message.visualization && (
              <div className="w-full mt-4">
                <h3 className="text-lg font-semibold mb-2">{message.visualization.title}</h3>
                <DataVisualization
                  type={message.visualization.type}
                  data={message.visualization.data}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t">
        {suggestions.length > 0 && (
          <div className="mb-4 space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your document..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={clsx(
              'px-4 py-2 rounded-lg',
              !input.trim() || isProcessing
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}