require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render's hosted Postgres terminates TLS, so it needs ssl — but a plain
  // local/container Postgres doesn't speak it, and forcing ssl there makes
  // pg fail the handshake. Enable it only when the URL points at a remote
  // provider that requires it.
  ssl: process.env.DATABASE_URL?.includes("render.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("Database connection error: ", err.stack);
  } else {
    console.log("Successfully connected to the PostgreSQL database");
    release();
  }
});
module.exports = pool;
