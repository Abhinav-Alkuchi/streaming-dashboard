import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

class PostgreSQLStorageService {
  constructor() {
    this.pool = pool;
    this.testConnection();
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL connected successfully');
      client.release();
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
    }
  }

  // Helper function to format arrays for PostgreSQL (for platform column)
  formatArrayForPostgres(array) {
    if (!Array.isArray(array)) return '[]';
    if (array.length === 0) return '[]';
    
    try {
      return JSON.stringify(array);
    } catch (error) {
      console.warn('Error formatting array as JSON:', error);
      return '[]';
    }
  }

  // Helper function to parse PostgreSQL arrays (for platform column)
  parsePostgresArray(arrayString) {
    if (Array.isArray(arrayString)) {
      return arrayString;
    }
    
    if (!arrayString) {
      return [];
    }
    
    if (typeof arrayString === 'string') {
      try {
        if (arrayString.startsWith('[') && arrayString.endsWith(']')) {
          return JSON.parse(arrayString);
        } else if (arrayString.startsWith('{') && arrayString.endsWith('}')) {
          const items = arrayString.slice(1, -1).split(',');
          return items.map(item => {
            if (item.startsWith('"') && item.endsWith('"')) {
              return item.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            }
            return item;
          });
        } else {
          return JSON.parse(arrayString);
        }
      } catch (error) {
        console.warn('❌ Error parsing PostgreSQL array string:', error);
        return [];
      }
    }
    
    console.warn('❌ Unexpected type for PostgreSQL array:', typeof arrayString, arrayString);
    return [];
  }

  // Debug logging helper
  logRequestDataForDebugging(requestData) {
    console.log('=== DEBUG Request Data ===');
    console.log('Title:', requestData.title);
    console.log('SOT Type:', requestData.sotType);
    console.log('SOT Properties Type:', typeof requestData.sotProperties);
    console.log('SOT Properties Raw:', requestData.sotProperties);
    
    try {
      const parsed = typeof requestData.sotProperties === 'string' 
        ? JSON.parse(requestData.sotProperties)
        : requestData.sotProperties;
      console.log('SOT Properties Parsed:', parsed);
    } catch (e) {
      console.log('SOT Properties Parse Error:', e.message);
    }
    
    console.log('Platform:', requestData.platform);
    console.log('Attachments Count:', requestData.attachments?.length || 0);
    console.log('Attachments Type:', typeof requestData.attachments);
    console.log('=== END DEBUG ===');
  }

  // Create new Stag request - MODIFIED VERSION
  async createRequest(requestData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      this.logRequestDataForDebugging(requestData);

      // Process attachments to store as JSON array of Jira URLs
      let jiraAttachments = [];
      if (requestData.attachments && Array.isArray(requestData.attachments)) {
        // Filter and format only valid Jira attachments
        jiraAttachments = requestData.attachments
          .filter(att => att && (att.issueKey || att.imageUrl)) // Keep valid Jira attachments
          .map(att => ({
            id: att.id,
            issueKey: att.issueKey,
            imageUrl: att.imageUrl,
            imageThumbnail: att.imageThumbnail || att.imageUrl,
            filename: att.filename || att.name,
            mimeType: att.mimeType || att.type,
            size: att.size,
            created: att.created,
            self: att.self
          }));
      }

      let sotPropertiesJson;
      try {
        if (typeof requestData.sotProperties === 'string') {
          sotPropertiesJson = JSON.stringify(JSON.parse(requestData.sotProperties));
        } else {
          sotPropertiesJson = JSON.stringify(requestData.sotProperties || []);
        }
      } catch (jsonError) {
        console.warn('Invalid sot_properties JSON, using empty array:', jsonError);
        sotPropertiesJson = '[]';
      }

      const query = `
        INSERT INTO stag_requests (
          title, description, requested_by, sot_type, 
          sot_properties, platform, comments, jira_ticket, 
          jira_status, attachments, status
        ) 
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, $11)
        RETURNING *
      `;

      const values = [
        requestData.title || '',
        requestData.description || '',
        requestData.requestedBy || 'System',
        requestData.sotType || '',
        sotPropertiesJson,
        this.formatArrayForPostgres(requestData.platform || []),
        requestData.comments || '',
        requestData.jiraTicket || '',
        requestData.jiraStatus || 'To Do',
        JSON.stringify(jiraAttachments), // Store as JSON array of URLs
        requestData.status || 'submitted'
      ];

      console.log('📄 Creating request with Jira attachment URLs');

      const result = await client.query(query, values);
      await client.query('COMMIT');

      console.log('✅ Created request with ID:', result.rows[0].id);

      return {
        affectedRows: 1,
        request: this.mapDatabaseResult(result.rows[0])
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating stag request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all Stag requests
  async getAllRequests() {
    try {
      const query = `
        SELECT * FROM stag_requests 
        ORDER BY created_at DESC
      `;
      
      const result = await this.pool.query(query);
      console.log(`📊 Fetched ${result.rows.length} requests from database`);
      
      return result.rows.map(row => this.mapDatabaseResult(row));
    } catch (error) {
      console.error('❌ Error fetching all stag requests:', error);
      throw error;
    }
  }

  // Get Stag request by ID
  async getRequestById(id) {
    try {
      const query = 'SELECT * FROM stag_requests WHERE id = $1';
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapDatabaseResult(result.rows[0]);
    } catch (error) {
      console.error('❌ Error fetching stag request by ID:', error);
      throw error;
    }
  }

  // Update Stag request - MODIFIED VERSION
  async updateRequest(requestData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      this.logRequestDataForDebugging(requestData);

      const checkQuery = 'SELECT id FROM stag_requests WHERE id = $1';
      const checkResult = await client.query(checkQuery, [requestData.id]);
      
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.warn('⚠️ Request not found:', requestData.id);
        return {
          affectedRows: 0,
          request: null
        };
      }

      const updates = [];
      const values = [];
      let paramIndex = 1;

      // Handle attachments - store as JSON array of Jira URLs
      if (requestData.attachments !== undefined) {
        let jiraAttachments = [];
        
        // Filter and format only valid Jira attachments
        if (Array.isArray(requestData.attachments)) {
          jiraAttachments = requestData.attachments
            .filter(att => att && (att.issueKey || att.imageUrl || att.isJiraAttachment)) // Keep valid Jira attachments
            .map(att => ({
              id: att.id,
              issueKey: att.issueKey,
              imageUrl: att.imageUrl,
              imageThumbnail: att.imageThumbnail || att.imageUrl,
              filename: att.filename || att.name,
              mimeType: att.mimeType || att.type,
              size: att.size,
              created: att.created,
              self: att.self,
              isJiraAttachment: true
            }));
        }
        
        updates.push(`attachments = $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(jiraAttachments));
      }
      
      if (requestData.title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(requestData.title);
      }
      
      if (requestData.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(requestData.description);
      }
      
      if (requestData.sotType !== undefined) {
        updates.push(`sot_type = $${paramIndex++}`);
        values.push(requestData.sotType);
      }
      
      if (requestData.sotProperties !== undefined) {
        let sotPropertiesJson;
        try {
          if (typeof requestData.sotProperties === 'string') {
            sotPropertiesJson = JSON.stringify(JSON.parse(requestData.sotProperties));
          } else {
            sotPropertiesJson = JSON.stringify(requestData.sotProperties || []);
          }
        } catch (jsonError) {
          console.warn('Invalid sot_properties JSON, using empty array:', jsonError);
          sotPropertiesJson = '[]';
        }
        
        updates.push(`sot_properties = $${paramIndex++}`);
        values.push(sotPropertiesJson);
      }
      
      if (requestData.platform !== undefined) {
        updates.push(`platform = $${paramIndex++}::jsonb`);
        values.push(this.formatArrayForPostgres(requestData.platform || []));
      }
      
      if (requestData.comments !== undefined) {
        updates.push(`comments = $${paramIndex++}`);
        values.push(requestData.comments);
      }
      
      if (requestData.jiraTicket !== undefined) {
        updates.push(`jira_ticket = $${paramIndex++}`);
        values.push(requestData.jiraTicket);
      }
      
      if (requestData.jiraStatus !== undefined) {
        updates.push(`jira_status = $${paramIndex++}`);
        values.push(requestData.jiraStatus);
      }
      
      if (requestData.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(requestData.status);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(requestData.id);

      const query = `
        UPDATE stag_requests 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      console.log('📄 Updating request with Jira attachment URLs');

      const result = await client.query(query, values);
      await client.query('COMMIT');

      console.log('✅ Updated request:', result.rows[0]?.id);

      return {
        affectedRows: result.rowCount,
        request: result.rows.length > 0 ? this.mapDatabaseResult(result.rows[0]) : null
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error updating stag request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update Jira status for a request
  async updateJiraStatus(id, jiraStatus) {
    try {
      const query = `
        UPDATE stag_requests 
        SET jira_status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [jiraStatus, id]);
      
      console.log('✅ Updated Jira status for request:', id, 'to:', jiraStatus);
      
      return {
        affectedRows: result.rowCount,
        request: result.rows.length > 0 ? this.mapDatabaseResult(result.rows[0]) : null
      };
    } catch (error) {
      console.error('❌ Error updating Jira status:', error);
      throw error;
    }
  }

  // Delete Stag request
  async deleteRequest(id) {
    try {
      const checkQuery = 'SELECT title, jira_ticket FROM stag_requests WHERE id = $1';
      const checkResult = await this.pool.query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        console.warn('⚠️ Request not found for deletion:', id);
        return {
          affectedRows: 0
        };
      }

      const requestData = checkResult.rows[0];
      console.log('🗑️ Deleting request:', id, '-', requestData.title);

      const query = 'DELETE FROM stag_requests WHERE id = $1 RETURNING *';
      const result = await this.pool.query(query, [id]);
      
      console.log('✅ Deleted request:', id);
      
      return {
        affectedRows: result.rowCount,
        deletedRequest: result.rows.length > 0 ? this.mapDatabaseResult(result.rows[0]) : null
      };
    } catch (error) {
      console.error('❌ Error deleting stag request:', error);
      throw error;
    }
  }

  // Map database result to application format - MODIFIED VERSION
  mapDatabaseResult(row) {
    if (!row) return null;

    console.log('=== MAPPING DATABASE RESULT ===');
    console.log('Row ID:', row.id);
    console.log('Attachments type:', typeof row.attachments);
    console.log('Attachments raw:', row.attachments);

    // Process Jira attachment URLs
    let processedAttachments = [];
    
    if (row.attachments) {
      try {
        let attachmentsData;
        
        if (typeof row.attachments === 'string') {
          attachmentsData = JSON.parse(row.attachments);
        } else {
          attachmentsData = row.attachments;
        }
        
        if (Array.isArray(attachmentsData)) {
          processedAttachments = attachmentsData.map(att => ({
            id: att.id,
            issueKey: att.issueKey,
            imageUrl: att.imageUrl,
            imageThumbnail: att.imageThumbnail || att.imageUrl,
            src: att.imageThumbnail || att.imageUrl, // For display compatibility
            name: att.filename || `attachment_${att.id}`,
            type: att.mimeType || 'application/octet-stream',
            size: att.size,
            created: att.created,
            isExisting: true,
            isJiraAttachment: true
          }));
          
          console.log(`✅ Processed ${processedAttachments.length} Jira attachments`);
        }
      } catch (error) {
        console.error('❌ Error parsing attachments JSON:', error);
        // If parsing fails, try to handle as string array or empty array
        processedAttachments = [];
      }
    }

    console.log('=== END MAPPING ===\n');

    return {
      id: row.id.toString(),
      title: row.title,
      description: row.description,
      requestedBy: row.requested_by,
      sotType: row.sot_type,
      sotProperties: typeof row.sot_properties === 'string' 
        ? JSON.parse(row.sot_properties) 
        : row.sot_properties || [],
      platform: this.parsePostgresArray(row.platform),
      comments: row.comments,
      jiraTicket: row.jira_ticket,
      jiraStatus: row.jira_status || 'To Do',
      attachments: processedAttachments,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      timestamp: row.created_at
    };
  }

  // Batch update Jira statuses
  async batchUpdateJiraStatuses(updates) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updatePromises = updates.map(({ id, jiraStatus }) => 
        client.query(
          'UPDATE stag_requests SET jira_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [jiraStatus, id]
        )
      );
      
      await Promise.all(updatePromises);
      await client.query('COMMIT');
      
      console.log('✅ Batch updated', updates.length, 'Jira statuses');
      
      return {
        success: true,
        updatedCount: updates.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error batch updating Jira statuses:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get request statistics
  async getRequestStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
          COUNT(CASE WHEN jira_status = 'To Do' THEN 1 END) as todo,
          COUNT(CASE WHEN jira_status = 'In Progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN jira_status = 'Done' OR jira_status = 'Closed' THEN 1 END) as completed
        FROM stag_requests
      `;
      
      const result = await this.pool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error fetching request stats:', error);
      throw error;
    }
  }

  // Close connection pool
  async close() {
    await this.pool.end();
    console.log('👋 PostgreSQL connection pool closed');
  }
}

export default new PostgreSQLStorageService();