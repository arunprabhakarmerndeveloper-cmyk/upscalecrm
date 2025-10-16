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
}

type UpdateAMCInput = Partial<Omit<CreateAMCInput, 'clientId'>>; // clientId is usually not updatable

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
        const client = await Client.findById(input.clientId);
        if (!client) throw new GraphQLError("Client not found.");

        const amcNumber = await getNextSequenceValue("amc");
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const amcId = `AMC-${year}${month}${day}-${amcNumber}-${randomSuffix}`;

        const productInstances = input.productInstances.map(p => ({
          product: p.productId,
          serialNumber: p.serialNumber,
          purchaseDate: p.purchaseDate,
        }));

        const serviceVisits = input.serviceVisits.map(visit => ({
          ...visit,
          status: 'Scheduled'
        }));

        const newAmc = new AMC({
          amcId,
          client: client._id,
          clientInfo: client.toObject(),
          productInstances,
          startDate: input.startDate,
          endDate: input.endDate,
          contractAmount: input.contractAmount,
          frequencyPerYear: input.frequencyPerYear,
          serviceVisits,
          createdBy: context.user._id,
          originatingInvoice: input.originatingInvoiceId,
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
      try {
        // --- FIX 1: Create a type-safe payload without using 'any' ---
        const { productInstances, ...restOfInput } = input;
        const updatePayload: Record<string, unknown> = { ...restOfInput };

        if (productInstances) {
          updatePayload.productInstances = productInstances.map(p => ({
            product: p.productId,
            serialNumber: p.serialNumber,
            purchaseDate: p.purchaseDate,
          }));
        }

        const updatedAmc = await AMC.findByIdAndUpdate(id, updatePayload, { new: true });
        if (!updatedAmc) throw new GraphQLError("AMC not found.");
        return updatedAmc;
      } catch (error) {
        if (error instanceof Error) { throw new GraphQLError(error.message); }
        throw new GraphQLError("An unknown error occurred while updating the AMC.");
      }
    },

    deleteAMC: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user || context.user.role !== "Admin") {
        throw new GraphQLError("You are not authorized to perform this action.");
      }
      try {
        const deletedAmc = await AMC.findByIdAndDelete(id);
        if (!deletedAmc) throw new GraphQLError("AMC not found.");
        return deletedAmc;
      } catch (error) {
        if (error instanceof Error) { throw new GraphQLError(error.message); }
        throw new GraphQLError("An unknown error occurred while deleting the AMC.");
      }
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
      visit.completedDate = completedDate ? new Date(completedDate) : undefined;
      await amc.save();
      return amc;
    },
  },
  AMC: {
    productInstances: async (parent: AMCDocument) => {
      // --- FIX 2: Use a type-safe 'in' check instead of 'as any' ---
      if (
        parent.productInstances?.[0]?.product &&
        typeof parent.productInstances[0].product === 'object' &&
        !('name' in parent.productInstances[0].product)
      ) {
        await parent.populate("productInstances.product");
      }
      return parent.productInstances;
    },
    createdBy: async (parent: AMCDocument) => {
      // --- FIX 3: Use a type-safe 'in' check instead of 'as any' ---
      if (parent.createdBy && typeof parent.createdBy === 'object' && !('name' in parent.createdBy)) {
        await parent.populate("createdBy");
      }
      return parent.createdBy;
    },
  },
};

export default amcResolver;