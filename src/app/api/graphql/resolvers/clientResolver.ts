import Client from '@/models/Client';
import { GraphQLError } from 'graphql';
import { MyContext } from '../route'; // Import our context type

// --- TypeScript Interfaces for Resolver Arguments ---

// Describes the structure for address inputs
interface AddressInput {
  street?: string;
  city?: string;
  pincode?: string;
}

// Describes the input for the createClient mutation
interface ClientInput {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  billingAddress?: AddressInput;
  installationAddress?: AddressInput;
}

// For updates, all fields are optional
type UpdateClientInput = Partial<ClientInput>;

// --- Resolver Map ---

const clientResolver = {
  Query: {
    clients: async (_: unknown, __: unknown, context: MyContext) => {
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
    createClient: async (_: unknown, { input }: { input: ClientInput }, context: MyContext) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in to perform this action.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      try {
        const newClient = new Client(input);
        await newClient.save();
        return newClient.toObject();
      } catch (error) {
        // Type-safe error handling for Mongoose duplicate key error
        if (error instanceof Error && (error as any).code === 11000) {
          throw new GraphQLError('A client with this phone or email already exists.');
        }
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
        throw new GraphQLError('An unknown error occurred while creating the client.');
      }
    },

    updateClient: async (_: unknown, { id, input }: { id: string, input: UpdateClientInput }, context: MyContext) => {
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
      } catch (error) {
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
        throw new GraphQLError('An unknown error occurred while updating the client.');
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
      } catch (error) {
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
        throw new GraphQLError('An unknown error occurred while deleting the client.');
      }
    },
  },
};

export default clientResolver;