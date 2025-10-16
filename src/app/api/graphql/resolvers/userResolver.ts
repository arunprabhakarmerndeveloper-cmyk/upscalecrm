import jwt from 'jsonwebtoken';
import { Document } from 'mongoose';
import User from '@/models/User'; // Assuming this is your Mongoose User model
import { GraphQLError } from 'graphql';
import { MyContext } from '../route'; // Import the context type

// --- TypeScript Interfaces ---

// Describes the role for a user
type UserRole = 'Admin' | 'User';

// Describes the input for the createUser mutation
interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}

// Describes the input for the login mutation
interface LoginInput {
  email: string;
  password: string;
}

// Describes the Mongoose User document, including custom methods
interface UserDocument extends Document {
  id: string; // Mongoose virtual getter
  name: string;
  email: string;
  password?: string; // It's selected explicitly, so it might be present
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>; // Custom method from your schema
}

// --- Resolver Map ---

const userResolver = {
  Query: {
    me: (_: unknown, __: unknown, context: MyContext) => {
      return context.user;
    }
  },
  Mutation: {
    createUser: async (_: unknown, { input }: { input: CreateUserInput }, context: MyContext) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in to perform this action.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      if (context.user.role !== 'Admin') {
        throw new GraphQLError('You are not authorized to perform this action.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      try {
        const existingUser = await User.findOne({ email: input.email });
        if (existingUser) {
          throw new GraphQLError('User with this email already exists.');
        }
        const user = new User(input);
        await user.save();
        return user;
      } catch (error) {
        if (error instanceof Error) {
            throw new GraphQLError(error.message);
        }
        throw new GraphQLError('An unknown error occurred while creating the user.');
      }
    },
    login: async (_: unknown, { input }: { input: LoginInput }) => {
      const email = input.email.trim().toLowerCase();
      const password = input.password.trim();

      // Type the result of the Mongoose query
      const user = await User.findOne({ email }).select('+password') as UserDocument | null;

      if (!user) {
        throw new GraphQLError('Invalid credentials.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // The `comparePassword` method is now recognized by TypeScript
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        throw new GraphQLError('Invalid credentials.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '1d' }
      );

      const userForPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      return { token, user: userForPayload };
    },
  },
};

export default userResolver;