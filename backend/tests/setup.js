/**
 * Jest setup file — runs before each test suite.
 * Connects to the in-memory MongoDB and cleans all collections between tests.
 */

const mongoose = require('mongoose');

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  // Clean all collections between tests to avoid cross-test contamination
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
