const { Pool } = require('pg');

// 创建连接池
const pool = new Pool({
  user: 'postgres', 
  host: 'localhost',  
  database: 'postgres',  
  password: '12345',  
  port: 5432, 
});

module.exports = pool;