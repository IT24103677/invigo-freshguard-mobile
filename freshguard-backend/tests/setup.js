const path = require("path");
const mongoose = require("mongoose");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.MONGOMS_DOWNLOAD_DIR =
  process.env.MONGOMS_DOWNLOAD_DIR ||
  path.join(__dirname, "..", ".cache", "mongodb-binaries");
process.env.MONGOMS_PREFER_GLOBAL_PATH =
  process.env.MONGOMS_PREFER_GLOBAL_PATH || "0";
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || "7.0.14";

const { MongoMemoryReplSet } = require("mongodb-memory-server");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    binary: {
      version: process.env.MONGOMS_VERSION,
    },
    replSet: {
      count: 1,
      storageEngine: "wiredTiger",
    },
  });
  await mongoose.connect(mongoServer.getUri(), {
    dbName: "freshguard-test",
    serverSelectionTimeoutMS: 10000,
  });
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
});

afterAll(async () => {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
});
