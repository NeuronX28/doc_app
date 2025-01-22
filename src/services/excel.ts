import * as XLSX from 'xlsx';

export class ExcelService {
  static async processExcel(file: File): Promise<{
    content: string;
    data: any[];
    columns: string[];
    sheets: { name: string; data: any[] }[];
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          let allContent = '';
          const sheets = workbook.SheetNames.map(name => {
            const sheet = workbook.Sheets[name];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { 
              header: 1,
              defval: '', // Default value for empty cells
              raw: false  // Convert all numbers to strings to preserve precision
            });

            // Convert the data to a more readable format
            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1);
            
            let sheetContent = `Sheet: ${name}\n`;
            sheetContent += `Headers: ${headers.join(', ')}\n`;
            
            rows.forEach((row: any, index: number) => {
              sheetContent += `Row ${index + 1}: `;
              headers.forEach((header, colIndex) => {
                if (row[colIndex] !== '') {
                  sheetContent += `${header}: ${row[colIndex]}, `;
                }
              });
              sheetContent += '\n';
            });
            
            allContent += sheetContent + '\n\n';
            
            return {
              name,
              data: rows.map((row: any) => {
                const rowObj: any = {};
                headers.forEach((header, index) => {
                  rowObj[header] = row[index];
                });
                return rowObj;
              })
            };
          });

          // Get unique columns across all sheets
          const columns = Array.from(
            new Set(
              sheets.flatMap(sheet => 
                sheet.data.length > 0 ? Object.keys(sheet.data[0]) : []
              )
            )
          );

          // Flatten all data for backward compatibility
          const flatData = sheets.flatMap(sheet => sheet.data);

          resolve({
            content: allContent,
            data: flatData,
            columns,
            sheets
          });
        } catch (error) {
          console.error('Excel Processing Error:', error);
          reject(new Error('Failed to process Excel file. Please ensure it\'s a valid Excel file.'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read the file. Please try again.'));
      };

      reader.readAsArrayBuffer(file);
    });
  }
}
