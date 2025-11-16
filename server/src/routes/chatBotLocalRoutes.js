import { Router } from 'express';
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import {
  processAndUpsert,
  processQuery,
  generateResponse,
  statsCache,
  chartsCache,
  getVectorStoreStats,
  clearVectorStore,
  backupVectorStore
} from '../services/chatBotLocalService.js';

const upload = multer({ dest: "uploads/" });
const router = Router();

// Ensure uploads dir
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
// Ensure data dir for vector store
if (!fs.existsSync("data")) fs.mkdirSync("data");

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
          message: `Loaded ${results.length} records to local vector store`,
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

// New endpoints for local vector store management
router.get("/api/vector-store/stats", async (req, res) => {
  try {
    const stats = await getVectorStoreStats();
    res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/vector-store/backup", async (req, res) => {
  try {
    const result = await backupVectorStore();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/clear', async (req, res) => {
  const { mode = 'all' } = req.body;

  try {
    if (mode === 'all') {
      const count = await clearVectorStore();
      console.log(`Successfully cleared ${count} vectors from local store`);
      return res.json({ 
        success: true, 
        message: `Cleared all data from local vector store (${count} vectors)` 
      });
    }

    return res.status(400).json({ error: 'Use {"mode": "all"}' });

  } catch (err) {
    console.error('Vector store clear error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;