// graphql/resolvers/clientResolver.ts

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
  phone?: string;
  email?: string;
  addresses?: AddressInput[];
}
type UpdateClientInput = Partial<ClientInput>;

// --- Resolver Map ---
const clientResolver = {
  Query: {
    clients: async (_: unknown, __: unknown, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.');
      return await Client.find({}).sort({ createdAt: -1 });
    },
    client: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.');
      const client = await Client.findById(id);
      if (!client) throw new GraphQLError('Client not found.');
      return client;
    },
    searchClients: async (_: unknown, { term }: { term: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const searchRegex = new RegExp(term, 'i');
      return await Client.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ]
      }).limit(10);
    },
  },
  Mutation: {
    createClient: async (_: unknown, { input }: { input: ClientInput }, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.');
      
      // 👇 FIX: Manually check for duplicates, ignoring blank values
      if (input.phone || input.email) {
        const conditions = [];
        if (input.phone) conditions.push({ phone: input.phone });
        if (input.email) conditions.push({ email: input.email });
        
        const existingClient = await Client.findOne({ $or: conditions });
        if (existingClient) {
          throw new GraphQLError('A client with this phone or email already exists.');
        }
      }
      
      const newClient = new Client(input);
      await newClient.save();
      return newClient.toObject();
    },

    updateClient: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateClientInput },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("You must be logged in.");

      // 👇 FIX: Manually check for duplicates on *other* clients
      if (input.phone || input.email) {
        const conditions = [];
        if (input.phone) conditions.push({ phone: input.phone });
        if (input.email) conditions.push({ email: input.email });

        const existingClient = await Client.findOne({
          _id: { $ne: id }, // Exclude the current client from the search
          $or: conditions,
        });
        if (existingClient) {
          throw new GraphQLError('Another client with this phone or email already exists.');
        }
      }

      // No need for complex $set/$unset logic anymore
      const updatedClient = await Client.findByIdAndUpdate(id, input, { new: true });
      
      if (!updatedClient) throw new GraphQLError("Client not found.");
      return updatedClient.toObject();
    },

    deleteClient: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError('You must be logged in.');
      const deletedClient = await Client.findByIdAndDelete(id);
      if (!deletedClient) throw new GraphQLError('Client not found.');
      return deletedClient.toObject();
    },
  },
  Client: {
    quotations: async (parent: IClient) => await Quotation.find({ client: parent._id }).sort({ createdAt: -1 }),
    invoices: async (parent: IClient) => await Invoice.find({ client: parent._id }).sort({ issueDate: -1 }),
    amcs: async (parent: IClient) => await AMC.find({ client: parent._id }).sort({ startDate: -1 }).populate('productInstances.product'),
  }
};

export default clientResolver;