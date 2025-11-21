import express from 'express';
import csvStorageService from '../services/csvStorageService.js';
import multer from 'multer';
import fetch from 'node-fetch';
import Headers from 'node-fetch/src/headers.js';
import cors from 'cors';
import FormData from 'form-data';
import fs from 'fs';

const router = express.Router();

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  JIRA_TOKEN,
  JIRA_COOKIE,
  JIRA_URL
} = process.env;

// ========================================
// HELPER FUNCTIONS
// ========================================

// Helper function to get Jira ticket status
const getJiraTicketStatus = async (issueKey) => {
  try {
    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    myHeaders.append("Authorization", `Bearer ${JIRA_TOKEN}`);
    myHeaders.append("Cookie", `${JIRA_COOKIE}`);
    
    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow'
    };
    
    const response = await fetch(`${JIRA_URL}/${issueKey}`, requestOptions);
    const data = await response.json();
    
    return data?.fields?.status?.name || 'To Do';
  } catch (error) {
    console.error('Error fetching Jira status:', error);
    return 'Unknown';
  }
};

// Helper function for creating FormData
const createFormDataFromArray = (array, formDataKey = "file") => {
  const formData = new FormData();
  
  if (array && Array.isArray(array)) {
    array.forEach((item) => {
      if (item.buffer && Buffer.isBuffer(item.buffer)) {
        formData.append(formDataKey, item.buffer, item.originalname);
      } else if (item instanceof Blob) {
        formData.append(formDataKey, item, item.name);
      } else {
        console.error(`Item is not a valid file object:`, item);
      }
    });
  } else {
    console.error('Expected array of files but got:', array);
  }

  return formData;
};

// ========================================
// STAG REQUEST ROUTES
// ========================================

// Create new Stag request
router.post('/api/stagRequests/create', async (req, res) => {
  try {
    const requestData = req.body;
    console.log('Received request data:', requestData);
    
    const result = await csvStorageService.createRequest(requestData);
    
    if (result.affectedRows > 0) {
      res.status(201).json({
        success: true,
        message: 'Stag request created successfully',
        data: result.request
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create stag request'
      });
    }
  } catch (error) {
    console.error('Error creating stag request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all Stag requests with updated Jira status
router.get('/api/stagRequests/', async (req, res) => {
  try {
    const requests = await csvStorageService.getAllRequests();
    
    // Update Jira status for each request that has a Jira ticket
    const updatedRequests = await Promise.all(
      requests.map(async (request) => {
        if (request.jiraTicket) {
          // Extract issue key from Jira URL
          const issueKeyMatch = request.jiraTicket.match(/([A-Z]+-\d+)/);
          if (issueKeyMatch) {
            const issueKey = issueKeyMatch[1];
            const currentStatus = await getJiraTicketStatus(issueKey);
            
            // Update status in database if it changed
            if (currentStatus !== request.jiraStatus && currentStatus !== 'Unknown') {
              await csvStorageService.updateJiraStatus(request.id, currentStatus);
              request.jiraStatus = currentStatus;
            }
          }
        }
        return request;
      })
    );
    
    res.json({
      success: true,
      data: updatedRequests
    });
  } catch (error) {
    console.error('Error fetching stag requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get Stag request by ID
router.get('/api/stagRequests/view/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = await csvStorageService.getRequestById(id);
    
    if (request) {
      // Update Jira status if ticket exists
      if (request.jiraTicket) {
        const issueKeyMatch = request.jiraTicket.match(/([A-Z]+-\d+)/);
        if (issueKeyMatch) {
          const issueKey = issueKeyMatch[1];
          const currentStatus = await getJiraTicketStatus(issueKey);
          
          if (currentStatus !== request.jiraStatus && currentStatus !== 'Unknown') {
            await csvStorageService.updateJiraStatus(request.id, currentStatus);
            request.jiraStatus = currentStatus;
          }
        }
      }
      
      res.json({
        success: true,
        data: request
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Stag request not found'
      });
    }
  } catch (error) {
    console.error('Error fetching stag request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update Stag request
router.put('/api/stagRequests/update', async (req, res) => {
  try {
    const requestData = req.body;
    console.log('Updating request:', requestData);
    
    if (!requestData.id) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }
    
    const result = await csvStorageService.updateRequest(requestData);
    
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: 'Stag request updated successfully',
        data: result.request
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Stag request not found'
      });
    }
  } catch (error) {
    console.error('Error updating stag request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete Stag request
router.delete('/api/stagRequests/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting request:', id);
    
    const result = await csvStorageService.deleteRequest(id);
    
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: 'Stag request deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Stag request not found'
      });
    }
  } catch (error) {
    console.error('Error deleting stag request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update Jira status manually
router.put('/api/stagRequests/updateJiraStatus/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { jiraStatus } = req.body;
    
    const result = await csvStorageService.updateJiraStatus(id, jiraStatus);
    
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: 'Jira status updated successfully',
        data: result.request
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Stag request not found'
      });
    }
  } catch (error) {
    console.error('Error updating Jira status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ========================================
// JIRA ROUTES
// ========================================

// Create Jira ticket
router.post("/api/stagRequests/createIssue", async (req, res) => {
  try {
    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${JIRA_TOKEN}`);
    myHeaders.append("Cookie", `${JIRA_COOKIE}`);
    
    const data = JSON.stringify(req.body);
    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: data,
      redirect: 'follow'
    };
    
    const response = await fetch(`${JIRA_URL}`, requestOptions);
    const responseData = await response.json();
    console.log('Jira create response:', responseData);
    
    if (responseData.key) {
      res.json({ 
        success: true, 
        issueKey: responseData.key,
        data: responseData
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create Jira issue',
        error: responseData
      });
    }
  } catch (error) {
    console.error('Error creating Jira issue:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error.message
    });
  }
});

// Update Jira ticket
router.put("/api/stagRequests/updateJiraIssue/:issueKey", async (req, res) => {
  try {
    const { issueKey } = req.params;
    console.log('Updating Jira issue:', issueKey, req.body);
    
    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${JIRA_TOKEN}`);
    myHeaders.append("Cookie", `${JIRA_COOKIE}`);
    
    const data = JSON.stringify(req.body);
    const requestOptions = {
      method: 'PUT',
      headers: myHeaders,
      body: data,
      redirect: 'follow'
    };
    
    const response = await fetch(`${JIRA_URL}/${issueKey}`, requestOptions);
    
    if (response.status === 204 || response.ok) {
      res.json({ 
        success: true, 
        message: 'Jira issue updated successfully'
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('Jira update error:', errorData);
      res.status(response.status).json({ 
        success: false, 
        message: 'Failed to update Jira issue',
        error: errorData
      });
    }
  } catch (error) {
    console.error('Error updating Jira issue:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error.message
    });
  }
});

// Get Jira ticket transitions
router.get("/api/stagRequests/jiraTransitions/:issueKey", async (req, res) => {
  try {
    const { issueKey } = req.params;
    console.log('Getting transitions for:', issueKey);
    
    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    myHeaders.append("Authorization", `Bearer ${JIRA_TOKEN}`);
    myHeaders.append("Cookie", `${JIRA_COOKIE}`);
    
    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow'
    };
    
    const response = await fetch(`${JIRA_URL}/${issueKey}/transitions`, requestOptions);
    const data = await response.json();
    
    res.json({ 
      success: true, 
      transitions: data.transitions || []
    });
  } catch (error) {
    console.error('Error getting Jira transitions:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get Jira transitions',
      error: error.message
    });
  }
});

// Close Jira ticket
router.post("/api/stagRequests/closeJiraIssue/:issueKey", async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { comment } = req.body;
    console.log('Closing Jira issue:', issueKey, 'with comment:', comment);
    
    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${JIRA_TOKEN}`);
    myHeaders.append("Cookie", `${JIRA_COOKIE}`);
    
    // First, get available transitions
    const transitionsResponse = await fetch(
      `${JIRA_URL}/${issueKey}/transitions`,
      {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'
      }
    );
    
    const transitionsData = await transitionsResponse.json();
    console.log('Available transitions:', transitionsData.transitions);
    
    // Look for specific transitions in priority order
    const closeTransition = transitionsData.transitions?.find((t) => 
      t.name.toLowerCase() === 'closed'
    ) || transitionsData.transitions?.find((t) => 
      t.name.toLowerCase() === 'close'
    ) || transitionsData.transitions?.find((t) => 
      t.name.toLowerCase().includes('close')
    ) || transitionsData.transitions?.find((t) => 
      ['done', 'complete', 'resolved', 'resolve'].includes(t.name.toLowerCase())
    );
    
    if (!closeTransition) {
      console.warn('No close transition found for ticket:', issueKey);
      
      // Try to update the status directly if no transition is available
      try {
        const updateBody = JSON.stringify({
          fields: {
            status: { name: "Closed" }
          }
        });
        
        const directUpdateResponse = await fetch(
          `${JIRA_URL}/${issueKey}`,
          {
            method: 'PUT',
            headers: myHeaders,
            body: updateBody,
            redirect: 'follow'
          }
        );
        
        if (directUpdateResponse.ok) {
          console.log('Ticket status updated directly to Closed');
        }
      } catch (directError) {
        console.warn('Cannot update status directly:', directError);
      }
      
      return res.json({
        success: true,
        message: 'Ticket processed (no close transition available)',
        warning: 'Ticket may not be fully closed'
      });
    }
    
    console.log('Using transition:', closeTransition.name, 'ID:', closeTransition.id);
    
    // Execute the transition
    const transitionBody = JSON.stringify({
      transition: {
        id: closeTransition.id
      },
      update: {
        comment: [
          {
            add: {
              body: comment || "This ticket has been deleted by the user"
            }
          }
        ]
      }
    });
    
    const transitionResponse = await fetch(
      `${JIRA_URL}/${issueKey}/transitions`,
      {
        method: 'POST',
        headers: myHeaders,
        body: transitionBody,
        redirect: 'follow'
      }
    );
    
    if (transitionResponse.status === 204 || transitionResponse.ok) {
      console.log('Jira ticket closed successfully with comment');
      
      res.json({ 
        success: true, 
        message: 'Jira ticket closed successfully',
        transitionUsed: closeTransition.name
      });
    } else {
      // If transition fails, try to add comment separately and update status
      try {
        // Add comment
        if (comment) {
          const commentBody = JSON.stringify({
            body: comment
          });
          
          await fetch(
            `${JIRA_URL}/${issueKey}/comment`,
            {
              method: 'POST',
              headers: myHeaders,
              body: commentBody,
              redirect: 'follow'
            }
          );
        }
        
        // Update status to Closed directly
        const statusBody = JSON.stringify({
          fields: {
            status: { name: "Closed" }
          }
        });
        
        await fetch(
          `${JIRA_URL}/${issueKey}`,
          {
            method: 'PUT',
            headers: myHeaders,
            body: statusBody,
            redirect: 'follow'
          }
        );
        
        console.log('Ticket updated via direct status change');
        
        res.json({ 
          success: true, 
          message: 'Jira ticket updated to Closed status',
          method: 'direct_update'
        });
        
      } catch (fallbackError) {
        const errorData = await transitionResponse.json().catch(() => ({}));
        console.error('Jira close error:', errorData);
        res.status(transitionResponse.status).json({ 
          success: false, 
          message: 'Failed to close Jira ticket',
          error: errorData
        });
      }
    }
  } catch (error) {
    console.error('Error closing Jira ticket:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error.message
    });
  }
});

// ========================================
// FILE UPLOAD ROUTES - MODIFIED VERSION
// ========================================

// Upload attachments to Jira and store URLs
router.post("/api/stagRequests/uploadAttachments", upload.array('file'), async (req, res) => {
  try {
    console.log("Uploading attachments, files:", req.files);
    console.log("Ticket:", req.body.ticket);
    
    const myHeaders = new Headers();
    myHeaders.append("X-Atlassian-Token", "nocheck");
    myHeaders.append("Authorization", `Bearer ${JIRA_TOKEN}`);
    myHeaders.append("Cookie", `${JIRA_COOKIE}`);

    const formdata = createFormDataFromArray(req.files, "file");
    
    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: formdata,
      redirect: 'follow'
    };

    const response = await fetch(`${JIRA_URL}/${req.body.ticket}/attachments`, requestOptions);
    const jiraResponse = await response.json();
    
    console.log("Jira upload response:", jiraResponse);
    
    if (Array.isArray(jiraResponse) && jiraResponse.length > 0) {
      // Transform Jira response to our format
      const attachmentUrls = jiraResponse.map(att => ({
        id: att.id,
        issueKey: req.body.ticket,
        imageUrl: att.content,
        imageThumbnail: att.thumbnail || att.content,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        created: att.created,
        self: att.self
      }));
      
      res.json({ 
        success: true, 
        message: 'Files uploaded successfully',
        attachments: attachmentUrls
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to upload attachments to Jira',
        jiraResponse: jiraResponse
      });
    }
  } catch (error) {
    console.error('Error uploading attachments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload attachments',
      details: error.message
    });
  }
});

// ========================================
// HEALTH CHECK
// ========================================

router.get('/api/stagRequests/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Stag Request API is healthy',
    timestamp: new Date().toISOString()
  });
});

router.get("/api/stagRequests/proxy/jira-file", async (req, res) => {
  try {
    const fileUrl = req.query.url;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing 'url' query parameter.",
      });
    }

    console.log("Proxying Jira image:", fileUrl);

    const headers = {
      "Accept": "*/*",
      "Authorization": `Bearer ${JIRA_TOKEN}`
    };

    // add cookie only if needed
    if (JIRA_COOKIE) {
      headers["Cookie"] = JIRA_COOKIE;
    }

    const response = await fetch(fileUrl, {
      method: "GET",
      headers,
    });

    // Handle non-200 responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Jira image failed:", response.status, errorText);

      return res.status(response.status).json({
        success: false,
        message: "Failed to fetch Jira image",
        jiraStatus: response.status,
        jiraMessage: errorText,
      });
    }

    // Get Jira’s content type (image/jpeg, image/png, etc.)
    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    // Stream binary body back to client
    response.body.pipe(res);

  } catch (error) {
    console.error("Image proxy error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error proxying Jira image",
      error: error.message
    });
  }
});

export default router;