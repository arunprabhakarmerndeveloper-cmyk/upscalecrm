import { GraphQLError } from "graphql";
import { Types, Document } from "mongoose";
import AMC from "@/models/AMC";
import Client from "@/models/Client";
import { getNextSequenceValue } from "@/models/Counter";
import { MyContext } from "../route";

// --- TypeScript Interfaces for Resolver Arguments ---

interface ProductInstanceInput {
  productId: string;
  serialNumber?: string;
  purchaseDate?: string;
}
interface ServiceVisitInput {
  scheduledDate: string;
}

interface CreateAMCInput {
  clientId: string;
  productInstances: ProductInstanceInput[];
  startDate: string;
  endDate: string;
  contractAmount: number;
  frequencyPerYear: number;
  serviceVisits: ServiceVisitInput[];
  originatingInvoiceId?: string;
  billingAddress: string;
  installationAddress: string;
}

type UpdateAMCInput = Partial<Omit<CreateAMCInput, 'clientId'>>;
type ServiceVisitStatus = 'Scheduled' | 'Completed' | 'Cancelled';
interface AMCDocument extends Document {
  productInstances: Types.DocumentArray<{
    product: Types.ObjectId | { name: string };
    serialNumber?: string;
    purchaseDate?: Date;
  }>;
  createdBy: Types.ObjectId | { name: string };
}

// --- Resolver Map ---
const amcResolver = {
  Query: {
    amcs: async (_: unknown, __: unknown, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      return await AMC.find({})
        .sort({ startDate: -1 })
        .populate("client")
        .populate("createdBy");
    },
    amc: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      return await AMC.findById(id)
        .populate("client")
        .populate("productInstances.product")
        .populate("createdBy")
        .populate("originatingInvoice");
    },
  },
  Mutation: {
    createAMC: async (
      _: unknown,
      { input }: { input: CreateAMCInput },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      try {
        const { clientId, billingAddress, installationAddress } = input;
        
        const client = await Client.findById(clientId);
        if (!client) {
          throw new GraphQLError("Client not found.");
        }

        const amcClientInfo = {
            name: client.name,
            phone: client.phone,
            email: client.email || '',
            billingAddress: billingAddress,
            installationAddress: installationAddress,
        };

        const amcNumber = await getNextSequenceValue("amc");
        const amcId = `AMC-${new Date().getFullYear()}-${amcNumber}`;
        
        const productInstances = input.productInstances.map(p => ({
            product: p.productId,
            serialNumber: p.serialNumber,
            purchaseDate: p.purchaseDate ? new Date(p.purchaseDate) : undefined,
        }));
        
        const serviceVisits = input.serviceVisits.map(visit => ({
          ...visit,
          status: 'Scheduled' as ServiceVisitStatus,
          scheduledDate: new Date(visit.scheduledDate),
        }));

        const newAmc = new AMC({
          ...input,
          amcId,
          client: client._id,
          clientInfo: amcClientInfo,
          productInstances,
          serviceVisits,
          createdBy: context.user._id,
        });

        await newAmc.save();
        return newAmc;
      } catch (error) {
        if (error instanceof Error) { throw new GraphQLError(error.message); }
        throw new GraphQLError("An unknown error occurred during AMC creation.");
      }
    },
    updateAMC: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateAMCInput },
      context: MyContext
    ) => {
      if (!context.user || context.user.role !== "Admin") {
        throw new GraphQLError("You are not authorized to perform this action.");
      }
      const updatedAmc = await AMC.findByIdAndUpdate(id, input, { new: true });
      if (!updatedAmc) throw new GraphQLError("AMC not found.");
      return updatedAmc;
    },

    deleteAMC: async (_: unknown, { id }: { id: string }, context: MyContext) => {
        if (!context.user || context.user.role !== "Admin") {
          throw new GraphQLError("You are not authorized to perform this action.");
        }
        const deletedAmc = await AMC.findByIdAndDelete(id);
        if (!deletedAmc) throw new GraphQLError("AMC not found.");
        return deletedAmc;
    },

    updateAmcServiceStatus: async (
      _: unknown,
      { amcId, visitIndex, status, completedDate }: { amcId: string; visitIndex: number; status: ServiceVisitStatus; completedDate?: string; },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const amc = await AMC.findById(amcId);
      if (!amc) throw new GraphQLError("AMC not found.");
      
      const visit = amc.serviceVisits[visitIndex];
      if (!visit) throw new GraphQLError("Service visit not found.");

      visit.status = status;
      if (completedDate) {
        visit.completedDate = new Date(completedDate);
      }
      
      await amc.save();
      return amc;
    },
  },
  // --- ✅ THIS IS THE FIX ---
  // A chained resolver ensures that productInstances are always populated when requested.
  AMC: {
    productInstances: async (parent: AMCDocument) => {
        // Check if the 'product' field in the first instance is already populated.
        // If it's just an ObjectId, it needs to be populated.
        if (parent.productInstances && parent.productInstances.length > 0 && parent.productInstances[0].product instanceof Types.ObjectId) {
            await parent.populate('productInstances.product');
        }
        return parent.productInstances;
    },
  },
};

export default amcResolver;

