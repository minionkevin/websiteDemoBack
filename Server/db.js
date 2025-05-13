const { Pool } = require('pg');

// local pool
// const pool = new Pool({
//   user: 'postgres', 
//   host: 'localhost',  
//   database: 'postgres',  
//   password: '12345',  
//   port: 5432, 
// });

// external pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;