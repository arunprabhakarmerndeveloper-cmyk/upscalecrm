import { GraphQLError } from "graphql";
import { Types } from "mongoose";
import AMC from "@/models/AMC"; // Assuming this is your Mongoose model
import Client from "@/models/Client";
import { getNextSequenceValue } from "@/models/Counter";
import { MyContext } from "../route";

// --- TypeScript Interfaces for Resolver Arguments ---

// Describes the structure of a single product instance in the input
interface ProductInstanceInput {
  productId: string;
  serialNumber?: string;
  purchaseDate?: string;
}

// Describes the structure of a single service visit in the input
interface ServiceVisitInput {
  scheduledDate: string;
}

// Describes the input for the createAMC mutation
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

// Describes the input for the updateAMC mutation (all fields are optional)
type UpdateAMCInput = Partial<CreateAMCInput>;

// Describes the status values for a service visit
type ServiceVisitStatus = 'Scheduled' | 'Completed' | 'Cancelled';

// A basic representation of a Mongoose document for typing the `parent` argument
// This should ideally be expanded or imported from your model definitions
interface AMCDocument extends Document {
  productInstances: Types.DocumentArray<{
    product: Types.ObjectId | { name: string };
    serialNumber?: string;
    purchaseDate?: Date;
  }>;
  createdBy: Types.ObjectId | { name: string };
  // Add other fields from your AMC schema as needed
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
        status: 'Scheduled' // Ensure status is always set correctly on creation
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
    },

    updateAMC: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateAMCInput },
      context: MyContext
    ) => {
      if (!context.user || context.user.role !== "Admin") {
        throw new GraphQLError("You are not authorized to perform this action.");
      }

      const updatePayload: { [key: string]: any } = { ...input };

      if (updatePayload.productInstances) {
        updatePayload.productInstances = updatePayload.productInstances.map((p: ProductInstanceInput) => ({
          product: p.productId,
          serialNumber: p.serialNumber,
          purchaseDate: p.purchaseDate,
        }));
      }

      const updatedAmc = await AMC.findByIdAndUpdate(id, updatePayload, { new: true });
      if (!updatedAmc) throw new GraphQLError("AMC not found.");
      return updatedAmc;
    },

    deleteAMC: async (
      _: unknown,
      { id }: { id: string },
      context: MyContext
    ) => {
      if (!context.user || context.user.role !== "Admin") {
        throw new GraphQLError("You are not authorized to perform this action.");
      }
      const deletedAmc = await AMC.findByIdAndDelete(id);
      if (!deletedAmc) throw new GraphQLError("AMC not found.");
      return deletedAmc;
    },

    updateAmcServiceStatus: async (
      _: unknown,
      {
        amcId,
        visitIndex,
        status,
        completedDate,
      }: {
        amcId: string;
        visitIndex: number;
        status: ServiceVisitStatus; // Use the specific type
        completedDate?: string;
      },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const amc = await AMC.findById(amcId);
      if (!amc) throw new GraphQLError("AMC not found.");

      const visit = amc.serviceVisits[visitIndex];
      if (!visit) throw new GraphQLError("Service visit not found.");

      // No 'as any' needed because 'status' is already the correct type
      visit.status = status;
      visit.completedDate = completedDate ? new Date(completedDate) : undefined;

      await amc.save();
      return amc;
    },
  },
  AMC: {
    // Type the parent argument for chained resolvers
    productInstances: async (parent: AMCDocument) => {
      // This is a check to see if the sub-document needs to be populated
      if (
        parent.productInstances &&
        parent.productInstances.length > 0 &&
        parent.productInstances[0].product &&
        !(parent.productInstances[0].product as any).name
      ) {
        await parent.populate("productInstances.product");
      }
      return parent.productInstances;
    },
    createdBy: async (parent: AMCDocument) => {
      if (parent.createdBy && !(parent.createdBy as any).name) {
        await parent.populate("createdBy");
      }
      return parent.createdBy;
    },
  },
};

export default amcResolver;