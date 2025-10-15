// src/app/api/graphql/resolvers/clientResolver.ts
import Client from '@/models/Client';
import { GraphQLError } from 'graphql';
import { MyContext } from '../route'; // Import our context type

const clientResolver = {
  Query: {
    clients: async (_: unknown, __: unknown, context: MyContext) => {
      // SECURE: Only logged-in users can view clients
      if (!context.user) {
        throw new GraphQLError('You must be logged in to perform this action.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return await Client.find({}).sort({ createdAt: -1 });
    },

    client: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in to perform this action.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const client = await Client.findById(id);
      if (!client) {
        throw new GraphQLError('Client not found.');
      }
      return client;
    },
  },
  Mutation: {
    createClient: async (_: unknown, { input }: { input: any }, context: MyContext) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in to perform this action.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      try {
        const newClient = new Client(input);
        await newClient.save();
        // Return the full object, including the virtual 'id'
        return newClient.toObject();
      } catch (error: any) {
        if (error.code === 11000) {
          throw new GraphQLError('A client with this phone or email already exists.');
        }
        throw new GraphQLError(error.message);
      }
    },

    updateClient: async (_: unknown, { id, input }: { id: string, input: any }, context: MyContext) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in to perform this action.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      try {
        const updatedClient = await Client.findByIdAndUpdate(id, input, { new: true });
        if (!updatedClient) {
          throw new GraphQLError('Client not found.');
        }
        return updatedClient.toObject();
      } catch (error: any) {
        throw new GraphQLError(error.message);
      }
    },

    deleteClient: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in to perform this action.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      try {
        const deletedClient = await Client.findByIdAndDelete(id);
        if (!deletedClient) {
          throw new GraphQLError('Client not found.');
        }
        return deletedClient.toObject();
      } catch (error: any) {
        throw new GraphQLError(error.message);
      }
    },
  },
};

export default clientResolver;