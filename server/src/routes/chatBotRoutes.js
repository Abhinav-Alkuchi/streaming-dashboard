import { Router } from 'express';
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import {
  processAndUpsert,
  processQuery,
  generateResponse,
  generateLLMResponse,
  generateLLMResponseOpenAI,
  statsCache,
  chartsCache,
  checkDatabaseHealth,
  clearDatabase
} from '../services/chatBotPostgreSQL.js';

const upload = multer({ dest: "uploads/" });
const router = Router();

// Ensure uploads dir
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

router.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        await processAndUpsert(results);
        fs.unlinkSync(req.file.path);
        res.json({
          success: true,
          message: `Loaded ${results.length} records to PostgreSQL`,
          stats: statsCache,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    })
    .on("error", (err) => {
      res.status(500).json({ error: err.message });
    });
});

router.post("/api/search", async (req, res) => {
  const { query, topK = 10, useLLM = true, llmProvider = 'openai' } = req.body;
  if (!query) return res.status(400).json({ error: "Query required" });

  try {
    const { results, method } = await processQuery(query, topK);
    
    // Choose response generation method
    let response;
    if (useLLM) {
      if (llmProvider === 'openai') {
        response = await generateLLMResponseOpenAI(query, results);
      } else {
        response = await generateLLMResponse(query, results);
      }
    } else {
      response = generateResponse(query, results);
    }

    res.json({
      success: true,
      query,
      matches: results.matches,
      response,
      method,
      totalFound: results.matches.length,
      usedLLM: useLLM,
      llmProvider: useLLM ? llmProvider : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/stats", (req, res) => {
  res.json(statsCache || { totalRecords: 0, status: "empty" });
});

router.get("/api/charts", (req, res) => {
  res.json(chartsCache || { dateData: [], brandData: [] });
});

router.get("/api/health", async (req, res) => {
  try {
    const health = await checkDatabaseHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({ 
      healthy: false, 
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.delete('/api/clear', async (req, res) => {
  const { mode = 'all' } = req.body;

  try {
    await clearDatabase(mode);
    res.json({ 
      success: true, 
      message: `Cleared data from PostgreSQL (mode: ${mode})` 
    });
  } catch (err) {
    console.error('PostgreSQL clear error:', err);
    res.status(500).json({ error: err.message });
  }
});

// New endpoint for pre-warming (optional for PostgreSQL)
router.post("/api/pre-warm", async (req, res) => {
  try {
    // For PostgreSQL, we can run a simple query to warm up the connection
    await checkDatabaseHealth();
    res.json({ success: true, message: "PostgreSQL connection warmed up" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cache clearing endpoint (clears in-memory cache only)
router.delete("/api/cache", (req, res) => {
  statsCache = null;
  chartsCache = null;
  res.json({ success: true, message: "In-memory cache cleared" });
});

export default router;