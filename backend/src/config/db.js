const { Pool } = require("pg");
const env = require("./env");

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
});

pool.on("error", (err) => {
  console.error("Unexpected PG error:", err);
});

module.exports = pool;
