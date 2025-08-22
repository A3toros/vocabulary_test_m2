const { Pool } = require('pg');

exports.handler = async function(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let client;
  
  try {
    // Create database connection pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Get client from pool
    client = await pool.connect();

    // Query to get all correct answers from the correct_answers table
    const result = await client.query(`
      SELECT id, question_id, correct_answer 
      FROM correct_answers 
      ORDER BY question_id, id
    `);

    // Release the client back to the pool
    client.release();

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
