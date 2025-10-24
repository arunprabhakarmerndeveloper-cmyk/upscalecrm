import { GraphQLError } from "graphql";
import { Types, Document, UpdateQuery } from "mongoose";
import AMC, { IAMC } from "@/models/AMC";
import Client, { IClient } from "@/models/Client";
import { getNextSequenceValue } from "@/models/Counter";
import { MyContext } from "../route";

// --- TypeScript Interfaces for Resolver Arguments ---

interface AMCProductInput {
  productName: string;
  description?: string;
  quantity?: number;
  price?: number;
  serialNumber?: string;
  purchaseDate?: string;
}
interface ClientInfoInput {
  name: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  installationAddress?: string;
}

interface ServiceVisitInput {
  scheduledDate: string;
}

interface NewClientForAMCInput {
  name: string;
  phone?: string;
  email?: string;
}

interface CreateAMCInput {
  clientId?: string;
  newClient?: NewClientForAMCInput;
  productInstances: AMCProductInput[];
  startDate: string;
  endDate: string;
  contractAmount: number;
  taxPercentage?: number;
  frequencyPerYear: number;
  serviceVisits: ServiceVisitInput[];
  originatingInvoiceId?: string;
  billingAddress: string;
  installationAddress: string;
  commercialTerms?: string;
}

interface UpdateAMCInput {
  clientInfo?: ClientInfoInput; // ADDED
  startDate?: string;
  endDate?: string;
  contractAmount?: number;
  taxPercentage?: number;
  frequencyPerYear?: number;
  status?: string;
  productInstances?: AMCProductInput[];
  commercialTerms?: string;
  serviceVisits?: ServiceVisitInput[]; // ADDED
}

type WithTypename<T> = T & { __typename?: string };
type ServiceVisitStatus = "Scheduled" | "Completed" | "Cancelled";

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
        const { clientId, newClient, billingAddress, installationAddress } =
          input;
        let clientObjectId: Types.ObjectId | null = null;
        let amcClientInfo;

        if (newClient) {
          amcClientInfo = {
            name: newClient.name,
            phone: newClient.phone,
            email: newClient.email || "",
            billingAddress,
            installationAddress,
          };
        } else if (clientId) {
          const clientDocument: (IClient & Document) | null =
            await Client.findById(clientId).exec();
          if (!clientDocument) {
            throw new GraphQLError("Existing client not found.");
          }
          clientObjectId = clientDocument._id as Types.ObjectId;
          amcClientInfo = {
            name: clientDocument.name,
            phone: clientDocument.phone,
            email: clientDocument.email || "",
            billingAddress,
            installationAddress,
          };
        } else {
          throw new GraphQLError(
            "Either clientId or newClient data must be provided."
          );
        }

        // 1. Get the unique sequential number to guarantee uniqueness
        const amcNumber = await getNextSequenceValue("amc");

        // 2. Get the date components
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");

        // 3. Generate a 5-digit random prefix to obscure the sequence
        const randomPrefix = Math.floor(
          10000 + Math.random() * 90000
        ).toString();

        // 4. Combine all parts into the final ID
        const amcId = `AMC-${year}${month}${day}-${randomPrefix}${amcNumber}`;

        const productInstances = input.productInstances.map((p) => ({
          productName: p.productName,
          description: p.description,
          quantity: p.quantity,
          price: p.price,
          serialNumber: p.serialNumber,
          purchaseDate: p.purchaseDate ? new Date(p.purchaseDate) : undefined,
        }));

        const serviceVisits = input.serviceVisits.map((visit) => ({
          ...visit,
          status: "Scheduled" as const,
          scheduledDate: new Date(visit.scheduledDate),
        }));

        const newAmc = new AMC({
          amcId,
          client: clientObjectId,
          clientInfo: amcClientInfo,
          productInstances,
          serviceVisits,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          contractAmount: input.contractAmount,
          taxPercentage: input.taxPercentage,
          frequencyPerYear: input.frequencyPerYear,
          commercialTerms: input.commercialTerms,
          originatingInvoice: input.originatingInvoiceId,
          status: "Active",
          createdBy: context.user._id as Types.ObjectId,
        });

        await newAmc.save();
        return await newAmc.populate([
          "client",
          "createdBy",
          "originatingInvoice",
        ]);
      } catch (error) {
        if (error instanceof Error) throw new GraphQLError(error.message);
        throw new GraphQLError(
          "An unknown error occurred during AMC creation."
        );
      }
    },
    updateAMC: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateAMCInput },
      context: MyContext
    ) => {
      if (!context.user || context.user.role !== "Admin") {
        throw new GraphQLError(
          "You are not authorized to perform this action."
        );
      }

      // Create an update object, but don't spread the whole input yet
      const updateData: UpdateQuery<IAMC> = { ...input };

      // Safely handle the clientInfo object to remove __typename
      if (input.clientInfo) {
        const { __typename: _typename, ...cleanClientInfo } =
          input.clientInfo as WithTypename<ClientInfoInput>;
        updateData.clientInfo = cleanClientInfo;
      }

      // Convert product date strings to Date objects
      if (input.productInstances) {
        updateData.productInstances = input.productInstances.map((p) => ({
          productName: p.productName,
          description: p.description,
          quantity: p.quantity,
          price: p.price,
          serialNumber: p.serialNumber,
          purchaseDate: p.purchaseDate ? new Date(p.purchaseDate) : undefined,
        }));
      }

      // ADDED: Convert service visit date strings to Date objects and reset status
      if (input.serviceVisits) {
        updateData.serviceVisits = input.serviceVisits.map((visit) => ({
          scheduledDate: new Date(visit.scheduledDate),
          status: "Scheduled", // Always reset visit status when schedule is updated
        }));
      }

      // Use $set for a safer update operation
      const updatedAmc = await AMC.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );
      if (!updatedAmc) {
        throw new GraphQLError("AMC not found.");
      }

      return await updatedAmc.populate([
        "client",
        "createdBy",
        "originatingInvoice",
      ]);
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
        status: ServiceVisitStatus;
        completedDate?: string;
      },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const amc = await AMC.findById(amcId);
      if (!amc) throw new GraphQLError("AMC not found.");

      const visit = amc.serviceVisits[visitIndex];
      if (!visit) throw new GraphQLError("Service visit not found.");

      visit.status = status;
      if (status === "Completed") {
        visit.completedDate = completedDate
          ? new Date(completedDate)
          : new Date();
      } else {
        visit.completedDate = undefined;
      }

      await amc.save();
      return await amc.populate(["client", "createdBy", "originatingInvoice"]);
    },
  },
  // REMOVED: The chained AMC resolver is no longer needed
};

export default amcResolver;
