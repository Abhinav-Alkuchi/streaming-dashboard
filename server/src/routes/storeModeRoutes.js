import express from 'express';
// import { fetchStoreModeData } from '../services/databricksService.js';

import { fetchStoreModeData } from "../services/storeModeService.js";

const router = express.Router();

router.get('/api/store-mode-data', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required as query parameters'
      });
    }

    console.log(`====> Fetching store mode data for ${startDate} to ${endDate}`);
    console.log(`====> Request received at: ${new Date().toISOString()}`);
    
    const data = await fetchStoreModeData(startDate, endDate);
    
    console.log(`====> Successfully returned ${data.length} records`);
    
    res.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in store-mode-data route:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Check server logs for more information'
    });
  }
});

export default router;