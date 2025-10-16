// src/app/api/graphql/route.ts
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import connectDB from '@/lib/mongoose';
import typeDefs from './schemas';
import resolvers from './resolvers';
import jwt from 'jsonwebtoken';
import User, { IUser } from '@/models/User';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

// Define a type for our context
export interface MyContext {
  user?: IUser | null;
}

const server = new ApolloServer<MyContext>({ 
  typeDefs,
  resolvers,
});

// The handler now uses our corrected context logic
const handler = startServerAndCreateNextHandler(server, {
  // --- THIS IS THE CRITICAL FIX ---
  // The function must be passed as a value to the 'context' key
  context: async (req: NextRequest): Promise<MyContext> => {
    if (mongoose.connection.readyState === 0) {
  await connectDB();
}
    const token = req.headers.get('authorization')?.split(' ')[1] || '';

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        const user = await User.findById(decoded.userId);
        return { user };
      } catch (_) {
        return { user: null };
      }
    }
    return { user: null };
  },
});

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}