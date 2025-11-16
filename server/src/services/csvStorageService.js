import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'json2csv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE_PATH = path.join(__dirname, 'stag_requests.csv');
const CSV_HEADERS = [
  'id',
  'timestamp',
  'title',
  'description',
  'eventType',
  'platform',
  'sotType',
  'sotProperties',
  'jiraTicket',
  'status',
  'comments',
  'attachments'
];

class CSVStorageService {
  constructor() {
    this.ensureCSVFile();
  }

  ensureCSVFile() {
    if (!fs.existsSync(CSV_FILE_PATH)) {
      const fields = CSV_HEADERS;
      const opts = { fields };
      const csv = parse([], opts);
      fs.writeFileSync(CSV_FILE_PATH, csv);
    }
  }

 readCSV() {
  try {
    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    if (!fileContent.trim()) {
      return [];
    }
    
    const rows = fileContent.trim().split('\n');
    const headers = this.parseCSVLine(rows[0]);
    const data = [];
    
    for (let i = 1; i < rows.length; i++) {
      const values = this.parseCSVLine(rows[i]);
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }
    
    return data;
  } catch (error) {
    console.error('Error reading CSV:', error);
    return [];
  }
}

// Helper method to properly parse CSV lines with quoted fields
parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Handle escaped quotes ("")
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      // Regular character
      current += char;
    }
  }
  
  // Push the last field
  result.push(current);
  return result;
}

  writeCSV(data) {
    try {
      const fields = CSV_HEADERS;
      const opts = { fields, header: true };
      const csv = parse(data, opts);
      fs.writeFileSync(CSV_FILE_PATH, csv);
      return true;
    } catch (error) {
      console.error('Error writing CSV:', error);
      return false;
    }
  }

  generateId() {
    return `STAG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async createRequest(requestData) {
    const requests = this.readCSV();
    
    // Format SOT properties properly
    let sotPropertiesFormatted = '';
    if (Array.isArray(requestData.sotProperties)) {
      sotPropertiesFormatted = requestData.sotProperties
        .map(p => typeof p === 'object' ? p.tagName : p)
        .join(';');
    } else {
      sotPropertiesFormatted = requestData.sotProperties || '';
    }

    // Format platform properly
    let platformFormatted = '';
    if (Array.isArray(requestData.platform)) {
      platformFormatted = requestData.platform.join(',');
    } else {
      platformFormatted = requestData.platform || '';
    }

    const newRequest = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      title: requestData.title || '',
      description: requestData.description || '',
      eventType: requestData.sotType || '', // Map sotType to eventType
      platform: platformFormatted,
      sotType: requestData.sotType || '',
      sotProperties: sotPropertiesFormatted,
      jiraTicket: requestData.jiraTicket || '',
      status: 'submitted', // Match frontend status
      comments: requestData.comments || '',
      attachments: Array.isArray(requestData.attachments) ? 
        requestData.attachments.map(f => f.name).join(';') : 
        requestData.attachments || ''
    };

    console.log('Creating new request:', newRequest);
    requests.push(newRequest);
    const success = this.writeCSV(requests);
    
    return success ? { 
      affectedRows: 1, 
      request: newRequest,
      data: newRequest 
    } : { affectedRows: 0 };
  }

  async getAllRequests() {
    const requests = this.readCSV();
    console.log('Retrieved requests:', requests);
    return requests;
  }

  async getRequestById(id) {
    const requests = this.readCSV();
    const request = requests.find(request => request.id === id) || null;
    console.log('Found request by ID:', request);
    return request;
  }

  async updateRequest(requestData) {
    const requests = this.readCSV();
    const index = requests.findIndex(request => request.id === requestData.id);
    
    if (index === -1) {
      return { affectedRows: 0 };
    }

    // Format fields properly for update
    let platformFormatted = requestData.platform;
    if (Array.isArray(requestData.platform)) {
      platformFormatted = requestData.platform.join(',');
    }

    let sotPropertiesFormatted = requestData.sotProperties;
    if (Array.isArray(requestData.sotProperties)) {
      sotPropertiesFormatted = requestData.sotProperties
        .map(p => typeof p === 'object' ? p.tagName : p)
        .join(';');
    }

    requests[index] = {
      ...requests[index],
      ...requestData,
      platform: platformFormatted,
      sotProperties: sotPropertiesFormatted,
      attachments: Array.isArray(requestData.attachments) ? 
        requestData.attachments.map(f => f.name).join(';') : 
        requestData.attachments
    };

    const success = this.writeCSV(requests);
    return success ? { affectedRows: 1 } : { affectedRows: 0 };
  }

  async deleteRequest(id) {
    const requests = this.readCSV();
    const filteredRequests = requests.filter(request => request.id !== id);
    
    if (filteredRequests.length === requests.length) {
      return { affectedRows: 0 };
    }

    const success = this.writeCSV(filteredRequests);
    return success ? { affectedRows: 1 } : { affectedRows: 0 };
  }
}

export default new CSVStorageService();