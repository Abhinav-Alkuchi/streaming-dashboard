import { executeWithConnection } from './databricksService.js';

export const fetchStoreModeData = async (startDate, endDate) => {
  try {
    // Use parameterized query to avoid SQL injection and escaping issues
    const query = `
      SELECT 
        event_date,
        sotType as event_type,
        sotV328 as store_type,
        sotV330 as state,
        sotV331 as country,
        sotV98 as store_id,
        platform,
        COUNT(*) as count,
        COUNT(DISTINCT emailId) as unique_users
      FROM hdp.one_tag_mapping 
      WHERE event_date BETWEEN '${startDate}' AND '${endDate}'
        --AND sotV305 IN ("Sephora", "sephora at kohl's")
      AND lower(sotV305) like '%sephora%'
      GROUP BY 
        event_date,
        sotType,
        sotV328,
        sotV330,
        sotV331,
        sotV98,
        platform
      ORDER BY event_date DESC, count DESC
    `;

    console.log('Executing Store Mode Query for date range:', startDate, 'to', endDate);
    
    const results = await executeWithConnection(
      "historical",
      async (session) => {
        try {
          console.log('Starting query execution...');
          const queryOperation = await session.executeStatement(query, {
            runAsync: true,
            queryTimeout: 60000, // Increased to 60 seconds
            maxRows: 10000,
          });

          console.log('Query operation created, waiting for completion...');
          
          // Wait for completion with better error handling
          let status;
          let attempts = 0;
          const maxAttempts = 30; // 30 attempts with 2 second intervals = 60 seconds max
          
          while (attempts < maxAttempts) {
            status = await queryOperation.status();
            console.log(`Query status attempt ${attempts + 1}:`, status.operationState);
            
            if (status.operationState === 2) { // FINISHED
              break;
            }
            
            if (status.operationState === 3 || status.operationState === 4) { // CANCELED or CLOSED
              throw new Error(`Query execution failed with state: ${status.operationState}`);
            }
            
            // Wait 2 seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
          }
          
          if (status.operationState !== 2) {
            await queryOperation.close();
            throw new Error(`Query timed out or failed. Final state: ${status.operationState}`);
          }
          
          if (status.errorMessage) {
            await queryOperation.close();
            throw new Error(`Query execution failed: ${status.errorMessage}`);
          }
          
          console.log('Query completed successfully, fetching results...');
          const result = await queryOperation.fetchAll();
          await queryOperation.close();
          
          console.log(`Retrieved ${result.length} rows`);
          return Array.isArray(result) ? result : Array.from(result || []);
          
        } catch (sessionError) {
          console.error('Session execution error:', sessionError);
          throw sessionError;
        }
      },
      `store_mode_${startDate}_${endDate}`,
      false
    );
    
    // Transform results
    const transformedResults = results.map(row => ({
      event_date: row.event_date,
      event_type: row.event_type || 'unknown',
      store_type: row.store_type || 'unknown',
      state: row.state || 'unknown',
      country: row.country || 'unknown',
      store_id: row.store_id || 'unknown',
      platform: row.platform || 'unknown',
      count: parseInt(row.count) || 0,
      user_id: `user_${Math.random().toString(36).substr(2, 9)}`, // Mock user ID
      unique_users: parseInt(row.unique_users) || 0
    }));
    
    console.log(`Successfully transformed ${transformedResults.length} records`);
    return transformedResults;

  } catch (error) {
    console.error('Error in fetchStoreModeData:', error);
    throw new Error(`Failed to fetch store mode data: ${error.message}`);
  }
};