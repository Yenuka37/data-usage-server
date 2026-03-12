const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME     = "datapulse_db";

let db = null;

async function connectDB() {
  if (db) return db;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`Connected to MongoDB — database: ${DB_NAME}`);
  return db;
}

function getDB() {
  if (!db) throw new Error("Database not connected. Call connectDB() first.");
  return db;
}

module.exports = { connectDB, getDB };