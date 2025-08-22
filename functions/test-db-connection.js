const { Pool } = require('pg');

exports.handler = async function(event, context) {
  try {
    console.log('Testing database connection...');
    console.log('NEON_DATABASE_URL exists:', !!process.env.NEON_DATABASE_URL);
    
    if (!process.env.NEON_DATABASE_URL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'NEON_DATABASE_URL environment variable not set',
          message: 'Please check your Netlify environment variables'
        })
      };
    }

    // Create database connection pool
    const pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    console.log('Pool created, attempting connection...');

    // Test connection
    const client = await pool.connect();
    console.log('Database connection successful!');

    // Test simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Test query result:', result.rows);

    // Release the client
    client.release();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Database connection successful',
        currentTime: result.rows[0].current_time,
        databaseUrl: process.env.NEON_DATABASE_URL ? 'Set (hidden for security)' : 'Not set'
      })
    };

  } catch (error) {
    console.error('Database connection test failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Database connection failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : 'Check function logs for details'
      })
    };
  }
};
