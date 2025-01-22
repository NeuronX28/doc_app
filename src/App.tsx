import React, { useState, Component } from 'react';
import { FileUpload } from './components/FileUpload';
import { Chat } from './components/Chat';
import { DataVisualization } from './components/DataVisualization';
import { Document, Message } from './types';
import { FileText } from 'lucide-react';
import { GeminiService } from './services/gemini';
import { ExcelService } from './services/excel';
import { marked } from 'marked';
import { clsx } from 'clsx';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p>Please try refreshing the page or uploading a different file.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Helper function to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to safely parse markdown
const parseMarkdown = (content: string | null | undefined): string => {
  if (!content) return '';
  try {
    return marked(content);
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return content;
  }
};

export default function App() {
  const [document, setDocument] = useState<Document | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geminiService = new GeminiService();

  const handleFileProcess = async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const { content, data, columns, sheets } = await ExcelService.processExcel(file);
      
      setDocument({
        id: generateId(),
        name: file.name,
        content,
        type: file.type,
        data,
        columns,
        sheets
      });

      const summary = await geminiService.analyzeDocument(
        content,
        "Provide a brief summary of this Excel file's contents. Include the number of sheets, total rows, and key information found in the data."
      );

      setMessages([{
        id: generateId(),
        content: summary,
        role: 'assistant',
        timestamp: new Date(),
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      console.error('File Processing Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!document) return;

    const newMessage: Message = {
      id: generateId(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setIsProcessing(true);
    setError(null);

    try {
      const response = await geminiService.analyzeDocument(document.content, content);

      const aiResponse: Message = {
        id: generateId(),
        content: response.content,
        role: 'assistant',
        timestamp: new Date(),
        visualization: response.visualization
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process question');
      console.error('Question Processing Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900">Excel Q&A Assistant</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {!document ? (
            <div className="max-w-xl mx-auto">
              <h2 className="text-xl font-semibold mb-4">Upload your Excel file</h2>
              <FileUpload onFileProcess={handleFileProcess} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-semibold mb-4">Current Document</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium">File Name:</p>
                      <p className="text-gray-600">{document.name}</p>
                    </div>
                    <div>
                      <p className="font-medium">Sheets:</p>
                      <ul className="list-disc list-inside text-gray-600">
                        {document.sheets?.map(sheet => (
                          <li key={sheet.name}>
                            {sheet.name} ({sheet.data.length} rows)
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">Total Columns:</p>
                      <p className="text-gray-600">{document.columns.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                  {error && (
                    <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                      {error}
                    </div>
                  )}
                  <Chat
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isProcessing={isProcessing}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}