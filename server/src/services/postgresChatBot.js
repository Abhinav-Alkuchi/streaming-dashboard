import { 
  initDB, 
  processQuery, 
  generateResponse,
  processAndUpsert,
  debugSearchData,
  checkDatabaseHealth,
  clearDatabase,
  closeDatabase,
  queryAnalytics,
  statsCache,
  chartsCache
} from './chatBotPostgreSQL.js';

export class PostgresChatBotService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      await initDB();
      this.initialized = true;
      console.log('PostgreSQL ChatBot service initialized');
    } catch (error) {
      console.error('Failed to initialize PostgreSQL ChatBot:', error);
      throw error;
    }
  }

  async processNaturalLanguageQuery(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const defaultTopK = options.topK || 10;
    
    try {
      const vectorResults = await processQuery(query, defaultTopK);
      const response = generateResponse(query, vectorResults);
      
      return {
        success: true,
        response,
        rawResults: vectorResults,
        matchesCount: vectorResults.results.matches.length,
        method: vectorResults.method
      };
    } catch (error) {
      console.error('Query processing error:', error);
      return {
        success: false,
        error: error.message,
        response: "I encountered an error processing your query. Please try again."
      };
    }
  }

  async ingestData(records) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await processAndUpsert(records);
      return {
        success: true,
        message: `Successfully ingested ${records.length} records`
      };
    } catch (error) {
      console.error('Data ingestion error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getStats() {
    return {
      cacheStats: statsCache,
      charts: chartsCache,
      health: await checkDatabaseHealth()
    };
  }

  async debugSearchData() {
    if (!this.initialized) {
      await this.initialize();
    }

    return await debugSearchData();
  }

  async cleanup() {
    if (this.initialized) {
      await closeDatabase();
      this.initialized = false;
    }
  }
}