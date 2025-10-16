import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */

// 1. Define an interface for our cached mongoose object.
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// 2. Augment the NodeJS global type to declare a `mongoose` property.
// This tells TypeScript about the new property we're adding.
declare global {
  var mongoose: MongooseCache;
}

// 3. Use the global cache or create a new one.
let cached: MongooseCache = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB(): Promise<Mongoose> {
  if (cached.conn) {
    console.log("=> using cached database connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log("=> new database connection established");
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: unknown) { // 4. Type the catch block error as `unknown`.
    cached.promise = null;
    throw e;
  }

  // If the connection is successful, cached.conn will be populated.
  // The non-null assertion (!) tells TypeScript to trust that it's not null here.
  return cached.conn!;
}

export default connectDB;