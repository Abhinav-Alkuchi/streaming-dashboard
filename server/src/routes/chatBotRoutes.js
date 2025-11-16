import { Router } from 'express';
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { Pinecone } from "@pinecone-database/pinecone";
import {
  processAndUpsert,
  processQuery,
  generateResponse,
  statsCache,
  chartsCache,
} from '../services/chatBotService.js';

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
          message: `Loaded ${results.length} records to Pinecone`,
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
  const { query, topK = 10 } = req.body;
  if (!query) return res.status(400).json({ error: "Query required" });

  try {
    const { results, method } = await processQuery(query, topK);
    const response = generateResponse(query, results);
    res.json({
      success: true,
      query,
      matches: results.matches,
      response,
      method,
      totalFound: results.matches.length,
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

router.delete('/api/clear', async (req, res) => {
  const { mode = 'all' } = req.body;

  try {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || "purchases";

    console.log(`Connecting to Pinecone index: ${indexName}`);
    
    const index = pinecone.Index(indexName);

    if (mode === 'all') {
      await pinecone.deleteIndex(indexName);
      console.log(`Index '${indexName}' successfully deleted.`);
      console.log(`Successfully cleared ${indexName}`);
      return res.json({ 
        success: true, 
        message: `Cleared all data from Pinecone index: ${indexName}` 
      });
    }

    return res.status(400).json({ error: 'Use {"mode": "all"}' });

  } catch (err) {
    console.error('Pinecone clear error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;