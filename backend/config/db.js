require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("Database connection error: ", err.stack);
  } else {
    console.log("Successfully connected to the REnder PostgreSQL database");
    release();
  }
});
module.exports = pool;
