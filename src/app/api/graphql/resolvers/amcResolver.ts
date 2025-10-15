import AMC from "@/models/AMC";
import Client from "@/models/Client";
import { getNextSequenceValue } from "@/models/Counter";
import { GraphQLError } from "graphql";
import { MyContext } from "../route";

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
      // UPDATED: Populate the array of products
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
      { input }: { input: any },
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

      // Short random alphanumeric suffix
      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();

      // New AMC ID: AMC-YYYYMMDD-Sequence-RAND
      const amcId = `AMC-${year}${month}${day}-${amcNumber}-${randomSuffix}`;

      // --- UPDATED to handle multiple products ---
      const productInstances = input.productInstances.map((p: any) => ({
        product: p.productId,
        serialNumber: p.serialNumber,
        purchaseDate: p.purchaseDate,
      }));

      const serviceVisits = input.serviceVisits.map((visit: any) => ({
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
      { id, input }: { id: string; input: any },
      context: MyContext
    ) => {
      if (!context.user || context.user.role !== "Admin") {
        throw new GraphQLError(
          "You are not authorized to perform this action."
        );
      }

      // --- UPDATED to handle multiple products on edit ---
      if (input.productInstances) {
        input.productInstances = input.productInstances.map((p: any) => ({
          product: p.productId,
          serialNumber: p.serialNumber,
          purchaseDate: p.purchaseDate,
        }));
      }

      const updatedAmc = await AMC.findByIdAndUpdate(id, input, { new: true });
      if (!updatedAmc) throw new GraphQLError("AMC not found.");
      return updatedAmc;
    },

    deleteAMC: async (
      _: unknown,
      { id }: { id: string },
      context: MyContext
    ) => {
      if (!context.user || context.user.role !== "Admin") {
        throw new GraphQLError(
          "You are not authorized to perform this action."
        );
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
        status: string;
        completedDate?: string;
      },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const amc = await AMC.findById(amcId);
      if (!amc) throw new GraphQLError("AMC not found.");

      const visit = amc.serviceVisits[visitIndex];
      if (!visit) throw new GraphQLError("Service visit not found.");

      visit.status = status as any;
      visit.completedDate = completedDate ? new Date(completedDate) : undefined;

      await amc.save();
      return amc;
    },
  },
  AMC: {
    // --- UPDATED to handle the array ---
    productInstances: async (parent: any) => {
      if (
        parent.productInstances &&
        parent.productInstances.length > 0 &&
        parent.productInstances[0].product &&
        !parent.productInstances[0].product.name
      ) {
        await parent.populate("productInstances.product");
      }
      return parent.productInstances;
    },
    createdBy: async (parent: any) => {
      if (parent.createdBy && !parent.createdBy.name) {
        await parent.populate("createdBy");
      }
      return parent.createdBy;
    },
  },
};

export default amcResolver;
