// src/app/api/graphql/resolvers/userResolver.ts
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import { GraphQLError } from 'graphql';
import { MyContext } from '../route'; // Import the context type

const userResolver = {
  Query: {
    // We can now add the 'me' query, which returns the logged-in user
    me: (_: unknown, __: unknown, context: MyContext) => {
      return context.user;
    }
  },
  Mutation: {
    createUser: async (_: unknown, { input }: { input: any }, context: MyContext) => {
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
      } catch (error: any) {
        throw new GraphQLError(error.message);
      }
    },
    login: async (_: unknown, { input }: { input: any }) => {
      const email = input.email.trim().toLowerCase();
      const password = input.password.trim();

      console.log('Login attempt:', { email, password }); // Debug

      const user = await User.findOne({ email }).select('+password');

      console.log('User found:', !!user); // Debug

      if (!user) {
        throw new GraphQLError('Invalid credentials.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const isMatch = await user.comparePassword(password);

      console.log('Password match:', isMatch); // Debug

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
        id: user._id.toString(),
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