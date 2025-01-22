export interface Document {
  id: string;
  name: string;
  content: string;
  type: string;
  data: any[];
  columns: string[];
  sheets?: { 
    name: string; 
    data: any[] 
  }[];
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  visualization?: {
    type: string;
    data: any[];
  };
}

export interface QuestionSuggestion {
  text: string;
  type: 'column' | 'aggregate' | 'filter';
}