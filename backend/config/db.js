require('dotenv').config();
const {pool} = require('pg');

const pool = new pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err) => {
  if(err) {
    console.error('Database connection error: ', err.stack);
  } else {
    console.log('Successfully connected to the REnder PostgreSQL database');
  }
});
module.exports = pool;
