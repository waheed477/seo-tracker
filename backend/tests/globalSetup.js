/**
 * Jest global setup — starts an in-memory MongoDB instance before all tests.
 * The URI is stored in process.env.MONGO_URI so the app can pick it up.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
  process.env.FRONTEND_URL = 'http://localhost:5000';
  process.env.GROQ_API_KEY = 'test-groq-key';
  process.env.SITE_ENCRYPTION_KEY = 'test-encryption-key-32-chars-min!!';
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5001/api/gsc/callback';
  process.env.RESEND_API_KEY = 'test-resend-key';

  // Store the mongod instance so teardown can stop it
  global.__MONGOD__ = mongod;
};
