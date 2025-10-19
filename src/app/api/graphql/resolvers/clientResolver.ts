import Client, { IClient } from '@/models/Client';
import Quotation from '@/models/Quotation';
import Invoice from '@/models/Invoice';
import AMC from '@/models/AMC';
import { GraphQLError } from 'graphql';
import { MyContext } from '../route';

// --- TypeScript Interfaces for Resolver Arguments ---
interface AddressInput {
  tag: string;
  address: string;
}
interface ClientInput {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  addresses?: AddressInput[];
}
type UpdateClientInput = Partial<ClientInput>;

// --- Resolver Map ---
const clientResolver = {
  Query: {
    clients: async (_: unknown, __: unknown, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.', { extensions: { code: 'UNAUTHENTICATED' } });
      return await Client.find({}).sort({ createdAt: -1 });
    },
    client: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.', { extensions: { code: 'UNAUTHENTICATED' } });
      const client = await Client.findById(id);
      if (!client) throw new GraphQLError('Client not found.');
      return client;
    },
  },
  Mutation: {
    createClient: async (_: unknown, { input }: { input: ClientInput }, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.', { extensions: { code: 'UNAUTHENTICATED' } });
      try {
        const newClient = new Client(input);
        await newClient.save();
        return newClient.toObject();
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
          throw new GraphQLError('A client with this phone or email already exists.');
        }
        if (error instanceof Error) { throw new GraphQLError(error.message); }
        throw new GraphQLError('An unknown error occurred.');
      }
    },
    updateClient: async (_: unknown, { id, input }: { id: string, input: UpdateClientInput }, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.', { extensions: { code: 'UNAUTHENTICATED' } });
      try {
        const updatedClient = await Client.findByIdAndUpdate(id, input, { new: true });
        if (!updatedClient) throw new GraphQLError('Client not found.');
        return updatedClient.toObject();
      } catch (error) {
        if (error instanceof Error) { throw new GraphQLError(error.message); }
        throw new GraphQLError('An unknown error occurred.');
      }
    },
    deleteClient: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.', { extensions: { code: 'UNAUTHENTICATED' } });
      try {
        const deletedClient = await Client.findByIdAndDelete(id);
        if (!deletedClient) throw new GraphQLError('Client not found.');
        return deletedClient.toObject();
      } catch (error) {
        if (error instanceof Error) { throw new GraphQLError(error.message); }
        throw new GraphQLError('An unknown error occurred.');
      }
    },
  },
  // --- THIS IS THE FIX: Field resolvers to fetch related data ---
  Client: {
    quotations: async (parent: IClient) => {
      return await Quotation.find({ client: parent._id }).sort({ createdAt: -1 });
    },
    invoices: async (parent: IClient) => {
      return await Invoice.find({ client: parent._id }).sort({ issueDate: -1 });
    },
    amcs: async (parent: IClient) => {
      return await AMC.find({ client: parent._id }).sort({ startDate: -1 }).populate('productInstances.product');
    }
  }
};

export default clientResolver;

