import { GoogleGenerativeAI } from '@google/generative-ai';

interface AnalysisResponse {
  content: string;
  visualization?: {
    type: 'bar' | 'line' | 'pie';
    data: any[];
    title: string;
  };
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI('AIzaSyBxr9BGxBek480z9MT4nRgMN6dOaIDfmbI');
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  async analyzeDocument(content: string, question: string): Promise<AnalysisResponse> {
    try {
      const prompt = `
        You are an AI assistant analyzing Excel document data. Format your response in a clear, structured way using markdown.
        When providing summaries or analysis:
        1. Use clear headings and subheadings
        2. Use bullet points for lists
        3. Bold important numbers and metrics
        4. Group related information together
        5. If the data contains numerical information that could be visualized, provide it in a format that can be charted
        
        Document content: ${content}
        Question: ${question}
        
        If the response contains data that can be visualized (like time series, comparisons, or distributions), 
        include a separate JSON object with visualization data in this format:
        ###VISUALIZATION###
        {
          "type": "bar|line|pie",
          "title": "Chart title",
          "data": [{"name": "label1", "value": number}, ...]
        }
        ###END_VISUALIZATION###
        
        Please provide a detailed and accurate answer based on the data provided.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Parse visualization data if present
      const visualizationMatch = responseText.match(/###VISUALIZATION###\n([\s\S]*?)\n###END_VISUALIZATION###/);
      let visualization;
      let finalContent = responseText;

      if (visualizationMatch) {
        try {
          visualization = JSON.parse(visualizationMatch[1]);
          // Remove the visualization block from the content
          finalContent = responseText.replace(/###VISUALIZATION###[\s\S]*?###END_VISUALIZATION###/, '').trim();
        } catch (e) {
          console.error('Failed to parse visualization data:', e);
        }
      }

      return {
        content: finalContent || "Failed to process response",
        visualization: visualization
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        content: "Sorry, I couldn't analyze the document. Please try again."
      };
    }
  }
}
