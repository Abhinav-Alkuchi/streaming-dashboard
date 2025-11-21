/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  issueKey?: string;
  data?: T;
}

export interface StagRequest {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  jiraStatus?: string;
  jiraTicket?: string;
  createdAt?: string;
  updatedAt?: string;
  sotType?: string;
  sotProperties?: any[];
  platform?: string | string[];
  comments?: string;
  requestedBy?: string;
  attachments?: any[];
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
  files: string[];
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error: any) {
    console.error('API call failed:', error);
    throw error;
  }
}

// ========================================
// STAG REQUEST OPERATIONS
// ========================================

// Create Stag request
export const createStagRequest = async (requestData: StagRequest): Promise<ApiResponse<StagRequest>> => {
  console.log('Creating stag request:', requestData);
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
export const updateStagRequest = async (id: string, requestData: StagRequest): Promise<ApiResponse<StagRequest>> => {
  console.log('Updating stag request:', id, requestData);
  
  return fetchAPI<StagRequest>('/api/stagRequests/update', {
    method: 'PUT',
    body: JSON.stringify({ ...requestData, id }),
  });
};

// Update Jira status
export const updateJiraStatus = async (id: string, jiraStatus: string): Promise<ApiResponse<StagRequest>> => {
  return fetchAPI<StagRequest>(`/api/stagRequests/updateJiraStatus/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ jiraStatus }),
  });
};

// Delete Stag request
export const deleteStagRequest = async (id: string): Promise<ApiResponse<void>> => {
  console.log('Deleting stag request:', id);
  return fetchAPI<void>(`/api/stagRequests/delete/${id}`, {
    method: 'DELETE',
  });
};

// ========================================
// JIRA OPERATIONS
// ========================================

// Create Jira ticket
export const createJiraTicket = async (jiraRequest: JiraRequest): Promise<ApiResponse<any>> => {
  console.log('Creating Jira ticket:', jiraRequest);
  return fetchAPI('/api/stagRequests/createIssue', {
    method: 'POST',
    body: JSON.stringify(jiraRequest),
  });
};

// Update Jira ticket
export const updateJiraTicket = async (issueKey: string, updateData: any): Promise<ApiResponse<any>> => {
  console.log('Updating Jira ticket:', issueKey, updateData);
  
  try {
    const response = await fetch(`${baseUrl}/api/stagRequests/updateJiraIssue/${issueKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update Jira ticket');
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('Error updating Jira ticket:', error);
    return {
      success: false,
      message: error.message || 'Failed to update Jira ticket',
    };
  }
};

// Close a Jira ticket with optional comment
export const closeJiraTicket = async (issueKey: string, comment?: string): Promise<ApiResponse<any>> => {
  console.log('Closing Jira ticket:', issueKey);
  
  try {
    const response = await fetch(`${baseUrl}/api/stagRequests/closeJiraIssue/${issueKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to close Jira ticket');
    }

    const data = await response.json();
    return {
      success: true,
      data,
      message: 'Jira ticket closed successfully',
    };
  } catch (error: any) {
    console.error('Error closing Jira ticket:', error);
    return {
      success: false,
      message: error.message || 'Failed to close Jira ticket',
    };
  }
};

// Get Jira ticket transitions
export const getJiraTransitions = async (issueKey: string): Promise<ApiResponse<any>> => {
  console.log('Getting Jira transitions for:', issueKey);
  return fetchAPI(`/api/stagRequests/jiraTransitions/${issueKey}`, {
    method: 'GET',
  });
};

// ========================================
// FILE OPERATIONS
// ========================================

// Upload attachments to Jira - FIXED VERSION
export const uploadAttachmentsToJira = async (issueKey: string, files: File[]): Promise<ApiResponse<any>> => {
  console.log('Uploading attachments to Jira:', issueKey, files);
  
  try {
    const formData = new FormData();
    
    // Append each file to FormData
    files.forEach((file) => {
      formData.append('file', file);
    });
    
    // Add the ticket/issueKey as a form field
    formData.append('ticket', issueKey);

    const response = await fetch(`${baseUrl}/api/stagRequests/uploadAttachments`, {
      method: 'POST',
      // Do NOT set Content-Type header - browser will set it automatically with boundary
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload attachments');
    }

    const data = await response.json();
    return {
      success: true,
      data,
      message: 'Attachments uploaded successfully',
      attachments: data.attachments // Return the Jira attachment URLs
    };
  } catch (error: any) {
    console.error('Error uploading attachments:', error);
    return {
      success: false,
      message: error.message || 'Failed to upload attachments',
    };
  }
};

// ========================================
// HEALTH CHECK
// ========================================

// Health check
export const healthCheck = async (): Promise<ApiResponse<string>> => {
  return fetchAPI<string>('/api/stagRequests/health');
};