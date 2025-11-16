import express from 'express';
import csvStorageService from '../services/csvStorageService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

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

// Get all Stag requests
router.get('/api/stagRequests/', async (req, res) => {
  try {
    const requests = await csvStorageService.getAllRequests();
    res.json({
      success: true,
      data: requests
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
    const result = await csvStorageService.updateRequest(requestData);
    
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: 'Stag request updated successfully'
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
      message: 'Internal server error'
    });
  }
});

// Delete Stag request
router.delete('/api/stagRequests/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
      message: 'Internal server error'
    });
  }
});

// Create Jira ticket (mock implementation)
router.post('/api/stagRequests/createIssue', async (req, res) => {
  try {
    // Mock Jira API response
    const issueKey = `SA-${Math.floor(1000 + Math.random() * 9000)}`;
    
    res.json({
      success: true,
      data: {
        issueKey,
        id: uuidv4(),
        key: issueKey,
        self: `https://jira.sephora.com/rest/api/2/issue/${issueKey}`
      }
    });
  } catch (error) {
    console.error('Error creating Jira ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Jira ticket'
    });
  }
});

// Upload attachments (mock implementation)
router.post('/api/stagRequests/uploadAttachments', async (req, res) => {
  try {
    // Mock file upload response
    res.json({
      success: true,
      data: {
        message: 'Files uploaded successfully',
        uploadedFiles: req.body.attachments?.map(file => ({
          filename: file.name,
          size: file.size,
          url: `https://jira.sephora.com/attachments/${uuidv4()}`
        })) || []
      }
    });
  } catch (error) {
    console.error('Error uploading attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload attachments'
    });
  }
});

export default router;