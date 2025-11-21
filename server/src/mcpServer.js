import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequest,
  ListToolsRequest,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { DatabricksService } from './services/databricksService.js';
import { PostgresChatBotService } from './services/postgresChatBot.js';

export class MCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'databricks-genie-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.databricksService = new DatabricksService();
    this.postgresChatBot = new PostgresChatBotService();

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // Handle ListTools requests
    this.server.setRequestHandler(ListToolsRequest, async () => {
      return {
        tools: this.getTools(),
      };
    });

    // Handle CallTool requests
    this.server.setRequestHandler(CallToolRequest, async (request) => {
      const { name, arguments: args } = request.params;
      return await this.handleToolCall(name, args);
    });
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  getTools() {
    return [
      // Existing Databricks Tools
      {
        name: "query_databricks",
        description: "Execute SQL queries on Databricks tables and return results",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "SQL query to execute"
            },
            catalog: {
              type: "string",
              description: "Catalog name (optional)",
              default: "main"
            },
            schema: {
              type: "string",
              description: "Schema name (optional)",
              default: "default"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "list_tables",
        description: "List all available tables in Databricks",
        inputSchema: {
          type: "object",
          properties: {
            catalog: {
              type: "string",
              description: "Catalog name (optional)",
              default: "main"
            },
            schema: {
              type: "string",
              description: "Schema name (optional)",
              default: "default"
            }
          }
        }
      },
      {
        name: "get_table_schema",
        description: "Get schema information for a specific table",
        inputSchema: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "Name of the table"
            },
            catalog: {
              type: "string",
              description: "Catalog name (optional)",
              default: "main"
            },
            schema: {
              type: "string",
              description: "Schema name (optional)",
              default: "default"
            }
          },
          required: ["table_name"]
        }
      },
      {
        name: "get_query_history",
        description: "Get recent query execution history",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of recent queries to fetch (default: 10)",
              default: 10
            }
          }
        }
      },

      // New PostgreSQL ChatBot Tools
      {
        name: "query_events_natural_language",
        description: "Query event data using natural language. Ask about purchases, page views, searches, rankings, aggregations etc.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Natural language query about event data (e.g., 'show me top 5 purchases', 'what did users search for yesterday', 'most viewed pages')"
            },
            top_k: {
              type: "number",
              description: "Number of results to return (default: 10)",
              default: 10
            }
          },
          required: ["query"]
        }
      },
      {
        name: "ingest_events_data",
        description: "Ingest event data into PostgreSQL for natural language querying",
        inputSchema: {
          type: "object",
          properties: {
            records: {
              type: "array",
              description: "Array of event records to ingest"
            },
            record_type: {
              type: "string",
              description: "Type of records being ingested (purchase, pageview, search, etc.)",
              enum: ["purchase", "pageview", "search", "custom"],
              default: "custom"
            }
          },
          required: ["records"]
        }
      },
      {
        name: "get_event_analytics",
        description: "Get statistics and analytics about ingested event data",
        inputSchema: {
          type: "object",
          properties: {
            detailed: {
              type: "boolean",
              description: "Whether to include detailed charts and analytics",
              default: false
            }
          }
        }
      },
      {
        name: "debug_event_data",
        description: "Debug and inspect event data in PostgreSQL (for development)",
        inputSchema: {
          type: "object",
          properties: {
            data_type: {
              type: "string",
              description: "Type of data to debug",
              enum: ["search", "purchase", "pageview", "all"],
              default: "all"
            }
          }
        }
      },
      {
        name: "check_database_health",
        description: "Check PostgreSQL database health and statistics",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ];
  }

  async handleToolCall(toolName, args) {
    try {
      console.log(`Handling tool call: ${toolName}`, args);

      switch (toolName) {
        // Existing Databricks tool handlers
        case "query_databricks":
          return await this.handleDatabricksQuery(args);
        
        case "list_tables":
          return await this.handleListTables(args);
        
        case "get_table_schema":
          return await this.handleGetTableSchema(args);
        
        case "get_query_history":
          return await this.handleGetQueryHistory(args);

        // New PostgreSQL ChatBot tool handlers
        case "query_events_natural_language":
          return await this.handleNaturalLanguageQuery(args);
        
        case "ingest_events_data":
          return await this.handleIngestEvents(args);
        
        case "get_event_analytics":
          return await this.handleGetEventAnalytics(args);
        
        case "debug_event_data":
          return await this.handleDebugEventData(args);
        
        case "check_database_health":
          return await this.handleCheckDatabaseHealth(args);

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${toolName}`
          );
      }
    } catch (error) {
      console.error(`Error in tool ${toolName}:`, error);
      
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error.message}`
      );
    }
  }

  // Existing Databricks tool handlers
  async handleDatabricksQuery(args) {
    const { query, catalog, schema } = args;
    
    if (!query || typeof query !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Query must be a non-empty string'
      );
    }

    const result = await this.databricksService.executeQuery(query, catalog, schema);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async handleListTables(args) {
    const { catalog, schema } = args;
    const tables = await this.databricksService.listTables(catalog, schema);
    
    return {
      content: [
        {
          type: "text",
          text: `Available tables:\n${tables.map(table => `• ${table}`).join('\n')}`
        }
      ]
    };
  }

  async handleGetTableSchema(args) {
    const { table_name, catalog, schema } = args;
    
    if (!table_name) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Table name is required'
      );
    }

    const schemaInfo = await this.databricksService.getTableSchema(table_name, catalog, schema);
    
    return {
      content: [
        {
          type: "text",
          text: `Schema for table ${table_name}:\n${JSON.stringify(schemaInfo, null, 2)}`
        }
      ]
    };
  }

  async handleGetQueryHistory(args) {
    const { limit } = args;
    const history = await this.databricksService.getQueryHistory(limit);
    
    return {
      content: [
        {
          type: "text",
          text: `Recent query history:\n${JSON.stringify(history, null, 2)}`
        }
      ]
    };
  }

  // New PostgreSQL ChatBot tool handlers
  async handleNaturalLanguageQuery(args) {
    const { query, top_k } = args;
    
    if (!query || typeof query !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Query must be a non-empty string'
      );
    }

    const result = await this.postgresChatBot.processNaturalLanguageQuery(query, { topK: top_k });
    
    if (!result.success) {
      throw new McpError(
        ErrorCode.InternalError,
        result.error || 'Failed to process natural language query'
      );
    }

    return {
      content: [
        {
          type: "text",
          text: result.response
        },
        {
          type: "text",
          text: `\n---\n*Technical details: Found ${result.matchesCount} matches using ${result.method} method*`
        }
      ]
    };
  }

  async handleIngestEvents(args) {
    const { records, record_type } = args;
    
    if (!records || !Array.isArray(records) || records.length === 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Records must be a non-empty array'
      );
    }

    console.log(`Ingesting ${records.length} records of type: ${record_type}`);
    
    const result = await this.postgresChatBot.ingestData(records);
    
    if (!result.success) {
      throw new McpError(
        ErrorCode.InternalError,
        result.error || 'Failed to ingest event data'
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `✅ ${result.message}\n\nSuccessfully ingested ${records.length} event records into PostgreSQL for natural language querying.`
        }
      ]
    };
  }

  async handleGetEventAnalytics(args) {
    const { detailed } = args;
    
    const stats = await this.postgresChatBot.getStats();
    
    let responseText = `📊 Event Data Analytics\n\n`;
    
    if (stats.health && stats.health.healthy) {
      responseText += `**Database Health:** ✅ Healthy\n`;
      responseText += `• Total Vectors: ${stats.health.stats.total_vectors}\n`;
      responseText += `• Event Types: ${stats.health.stats.unique_event_types}\n`;
      responseText += `• Unique Emails: ${stats.health.stats.unique_emails}\n`;
      responseText += `• Date Range: ${stats.health.stats.earliest_date} to ${stats.health.stats.latest_date}\n\n`;
    } else {
      responseText += `**Database Health:** ❌ ${stats.health?.error || 'Unhealthy'}\n\n`;
    }

    if (stats.cacheStats) {
      responseText += `**Cache Statistics:**\n`;
      responseText += `• Total Records: ${stats.cacheStats.totalRecords}\n`;
      
      if (stats.cacheStats.byEventType) {
        responseText += `• Events by Type:\n`;
        Object.entries(stats.cacheStats.byEventType).forEach(([type, count]) => {
          responseText += `  - ${type}: ${count}\n`;
        });
      }
      
      if (stats.cacheStats.uniqueDates) {
        responseText += `• Unique Dates: ${stats.cacheStats.uniqueDates.size}\n`;
      }
    }

    if (detailed && stats.charts) {
      responseText += `\n**Detailed Charts:**\n`;
      // Add chart data here if available
      responseText += `• Charts data available for visualization\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: responseText
        }
      ]
    };
  }

  async handleDebugEventData(args) {
    const { data_type } = args;
    
    let debugResult;
    
    if (data_type === 'search' || data_type === 'all') {
      debugResult = await this.postgresChatBot.debugSearchData();
    } else {
      debugResult = { message: `Debug for ${data_type} data type not implemented yet` };
    }

    return {
      content: [
        {
          type: "text",
          text: `🔍 Debug Information for ${data_type} data:\n\n${JSON.stringify(debugResult, null, 2)}`
        }
      ]
    };
  }

  async handleCheckDatabaseHealth(args) {
    const health = await this.postgresChatBot.getStats();
    
    let healthText = `🏥 PostgreSQL Database Health Check\n\n`;
    
    if (health.health && health.health.healthy) {
      healthText += `✅ **Status: Healthy**\n`;
      healthText += `📊 **Statistics:**\n`;
      healthText += `• Total Vectors: ${health.health.stats.total_vectors}\n`;
      healthText += `• Unique Event Types: ${health.health.stats.unique_event_types}\n`;
      healthText += `• Unique Users: ${health.health.stats.unique_emails}\n`;
      healthText += `• Data Range: ${health.health.stats.earliest_date} to ${health.health.stats.latest_date}\n`;
      healthText += `• Last Check: ${health.health.timestamp}\n`;
    } else {
      healthText += `❌ **Status: Unhealthy**\n`;
      healthText += `• Error: ${health.health?.error || 'Unknown error'}\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: healthText
        }
      ]
    };
  }

  async initialize() {
    try {
      console.log('Initializing MCP Server...');
      
      // Initialize Databricks service
      await this.databricksService.initialize();
      console.log('Databricks service initialized');
      
      // Initialize PostgreSQL ChatBot (optional - will fail gracefully if not configured)
      try {
        await this.postgresChatBot.initialize();
        console.log('PostgreSQL ChatBot service initialized');
      } catch (error) {
        console.warn('PostgreSQL ChatBot initialization failed, continuing without it:', error.message);
      }
      
      // Start server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log('MCP Server running on stdio');
      
    } catch (error) {
      console.error('Failed to initialize MCP Server:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      console.log('Cleaning up MCP Server...');
      
      // Cleanup PostgreSQL ChatBot
      if (this.postgresChatBot.initialized) {
        await this.postgresChatBot.cleanup();
      }
      
      // Close server connection
      await this.server.close();
      
      console.log('MCP Server cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Server startup
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MCPServer();
  
  server.initialize().catch(async (error) => {
    console.error('Failed to start MCP Server:', error);
    await server.cleanup();
    process.exit(1);
  });
}