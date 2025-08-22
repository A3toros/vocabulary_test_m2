const { Pool } = require('pg');

exports.handler = async function(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  console.log('get-correct-answers function called');
  console.log('NEON_DATABASE_URL exists:', !!process.env.NEON_DATABASE_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);

  let client;
  
  try {
    if (!process.env.NEON_DATABASE_URL) {
      throw new Error('NEON_DATABASE_URL environment variable not set');
    }

    console.log('Creating database pool...');
    // Create database connection pool
    const pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    console.log('Pool created, attempting to connect...');
    // Get client from pool
    client = await pool.connect();
    console.log('Database connection successful!');

    // Query to get all correct answers from the correct_answers table
    console.log('Executing query...');
    const result = await client.query(`
      SELECT id, question_id, correct_answer 
      FROM correct_answers 
      ORDER BY question_id, id
    `);
    console.log('Query executed successfully, rows returned:', result.rows.length);

    // Release the client back to the pool
    client.release();
    console.log('Client released back to pool');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(result.rows)
    };

  } catch (error) {
    console.error('Database error:', error);
    
    // Release client if it exists
    if (client) {
      client.release();
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Database connection failed'
      })
    };
  }
};
