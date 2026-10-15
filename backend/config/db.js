require("dotenv").config();
const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL || "";
const isSupabasePooler = databaseUrl.includes(".pooler.supabase.com");
const useTransactionPooler =
  isSupabasePooler && process.env.DB_POOL_MODE !== "session";
const connectionString = useTransactionPooler
  ? databaseUrl.replace(/:5432(\/|$)/, ":6543$1")
  : databaseUrl;
const poolMax = Number.parseInt(process.env.DB_POOL_MAX || "5", 10);

const pool = new Pool({
  connectionString,
  // Transaction pooling avoids exhausting Supabase's per-project session
  // client limit. Keep the application pool bounded for either mode.
  max: Number.isInteger(poolMax) && poolMax > 0 ? poolMax : 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Render's hosted Postgres terminates TLS, so it needs ssl — but a plain
  // local/container Postgres doesn't speak it, and forcing ssl there makes
  // pg fail the handshake. Enable it only when the URL points at a remote
  // provider that requires it.
  ssl: isSupabasePooler || databaseUrl.includes("render.com")
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
