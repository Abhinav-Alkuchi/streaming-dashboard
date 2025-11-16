/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface StagRequest {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface JiraRequest {
  projectKey: string;
  summary: string;
  description: string;
  issueType: string;
  [key: string]: any;
}

export interface FileRequest {
  issueId: string;
  files: string[]; // Could be URLs, file names, or base64
}

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// Generic fetch function with error handling
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

export const createStagRequest = async (requestData: StagRequest): Promise<ApiResponse<StagRequest>> => {
  console.log(requestData);
  return fetchAPI<StagRequest>('/api/stagRequests/create', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
};

// Get all Stag requests
export const getAllStagRequests = async (): Promise<ApiResponse<StagRequest[]>> => {
  return fetchAPI<StagRequest[]>('/api/stagRequests/');
};

// Get Stag request by ID
export const getStagRequestById = async (id: string): Promise<ApiResponse<StagRequest>> => {
  return fetchAPI<StagRequest>(`/api/stagRequests/view/${id}`);
};

// Update Stag request
export const updateStagRequest = async (requestData: StagRequest): Promise<ApiResponse<StagRequest>> => {
  return fetchAPI<StagRequest>('/api/stagRequests/update', {
    method: 'PUT',
    body: JSON.stringify(requestData),
  });
};

// Delete Stag request
export const deleteStagRequest = async (id: string): Promise<ApiResponse<void>> => {
  return fetchAPI<void>(`/api/stagRequests/delete/${id}`, {
    method: 'DELETE',
  });
};

// Create Jira ticket
export const createJiraTicket = async (jiraRequest: JiraRequest): Promise<ApiResponse<any>> => {
  return fetchAPI('/api/stagRequests/createIssue', {
    method: 'POST',
    body: JSON.stringify(jiraRequest),
  });
};

// Upload attachments to Jira
export const uploadAttachmentsToJira = async (fileRequest: FileRequest): Promise<ApiResponse<any>> => {
  return fetchAPI('/api/stagRequests/uploadAttachments', {
    method: 'POST',
    body: JSON.stringify(fileRequest),
  });
};

// Health check
export const healthCheck = async (): Promise<ApiResponse<string>> => {
  return fetchAPI<string>('/api/stagRequests/health');
};