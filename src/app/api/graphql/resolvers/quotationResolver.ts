import { Document, Types } from "mongoose";
import Quotation, { IQuotationVersion } from "@/models/Quotation"; // Import IQuotationVersion
import Client, { IClient } from "@/models/Client";
import Invoice from "@/models/Invoice";
import AMC from "@/models/AMC";
import { getNextSequenceValue } from "@/models/Counter";
import { GraphQLError } from "graphql";
import { MyContext } from "../route";

// --- TypeScript Interfaces ---
interface IClientInfo {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  installationAddress?: string;
}
interface ILineItem {
  productName: string;
  description: string;
  quantity: number;
  price: number;
}
interface ICommercialTerm {
  title: string;
  content: string;
}
interface NewClientInput {
  name: string;
  phone: string;
  email?: string;
}
interface CreateQuotationInput {
  clientId?: string;
  newClient?: NewClientInput;
  billingAddress: string;
  installationAddress: string;
  lineItems: ILineItem[];
  validUntil?: string;
  commercialTerms?: ICommercialTerm[];
  imageUrls?: string[];
  taxPercentage?: number;
}
interface UpdateQuotationInput {
  clientInfo?: IClientInfo;
  lineItems: ILineItem[];
  validUntil?: string | null;
  commercialTerms?: ICommercialTerm[];
  reason: string;
  totalAmount: number;
  taxPercentage?: number; 
  grandTotal?: number;
  imageUrls?: string[];
}
interface QuotationDocument extends Document {
  _id: Types.ObjectId;
  client?: Types.ObjectId;
  clientInfo: IClientInfo;
  lineItems: Types.DocumentArray<ILineItem>;
  totalAmount: number;
  taxPercentage?: number; 
  grandTotal?: number; 
  editHistory: Types.DocumentArray<IQuotationVersion>;
  commercialTerms: Types.DocumentArray<ICommercialTerm>;
  status: string;
  validUntil?: Date;
  imageUrls?: string[];
}

// --- Resolver Map ---
const quotationResolver = {
  Query: {
    quotations: async (_: unknown, __: unknown, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      return await Quotation.find({})
        .sort({ createdAt: -1 })
        .populate("client");
    },
    quotation: async (
      _: unknown,
      { id }: { id: string },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      return await Quotation.findById(id)
        .populate("client")
        .populate({ path: "editHistory", populate: { path: "updatedBy" } });
    },
  },

  Mutation: {
    createQuotation: async (
      _: unknown,
      { input }: { input: CreateQuotationInput },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      try {
        const { clientId, newClient, billingAddress, installationAddress, lineItems, taxPercentage = 0 } = input;

        let client: IClient | null = null;
        let finalClientInfo: IClientInfo;

        if (newClient) {
          finalClientInfo = {
            name: newClient.name,
            phone: newClient.phone,
            email: newClient.email || "",
            billingAddress,
            installationAddress,
          };
        } else if (clientId) {
          client = await Client.findById(clientId);
          if (!client) throw new GraphQLError("Client not found.");
          finalClientInfo = {
            name: client.name,
            phone: client.phone || undefined,
            email: client.email || "",
            billingAddress,
            installationAddress,
          };
        } else {
          throw new GraphQLError(
            "Either a clientId or newClient data must be provided."
          );
        }

        const totalAmount = lineItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const grandTotal = totalAmount + (totalAmount * taxPercentage / 100);
        const quotationNumber = await getNextSequenceValue("quotation");
        const quotationId = `QUO-${new Date().getFullYear()}-${quotationNumber}`;

        const newQuotation = new Quotation({
          quotationId,
          client: client ? client._id : null,
          clientInfo: finalClientInfo,
          lineItems,
          totalAmount,
          taxPercentage,
          grandTotal, 
          validUntil: input.validUntil,
          commercialTerms: input.commercialTerms,
          imageUrls: input.imageUrls || [],
          status: "Draft",
          createdBy: context.user._id,
        });

        await newQuotation.save();
        return newQuotation;
      } catch (error) {
        if (error instanceof Error) throw new GraphQLError(error.message);
        throw new GraphQLError(
          "An unknown error occurred while creating the quotation."
        );
      }
    },

    updateQuotation: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateQuotationInput },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      try {
        const existingQuotation = (await Quotation.findById(
          id
        )) as QuotationDocument | null;
        if (!existingQuotation) throw new GraphQLError("Quotation not found.");

        const tax = input.taxPercentage ?? existingQuotation.taxPercentage ?? 0;
        const grandTotal = input.grandTotal ?? input.totalAmount + (input.totalAmount * tax / 100);

        // FIX 1: Create a strongly-typed version object
        const currentVersion: IQuotationVersion = {
          version: (existingQuotation.editHistory?.length || 0) + 1,
          updatedAt: new Date(),
          updatedBy: context.user._id,
          reason: input.reason,
          clientInfo: existingQuotation.clientInfo,
          lineItems: existingQuotation.lineItems.toObject(), 
          totalAmount: existingQuotation.totalAmount,
          taxPercentage: existingQuotation.taxPercentage, 
          grandTotal: existingQuotation.grandTotal ?? existingQuotation.totalAmount + (existingQuotation.taxPercentage ?? 0)/100,
          validUntil: existingQuotation.validUntil as Date,
          commercialTerms: existingQuotation.commercialTerms.toObject(),
          imageUrls: existingQuotation.imageUrls,
        };
        existingQuotation.editHistory.push(currentVersion);

        if (input.clientInfo) existingQuotation.clientInfo = input.clientInfo;

        existingQuotation.lineItems =
          input.lineItems as Types.DocumentArray<ILineItem>;
        existingQuotation.totalAmount = input.totalAmount;
        existingQuotation.taxPercentage = tax;  
        existingQuotation.grandTotal = grandTotal;
        existingQuotation.validUntil = input.validUntil
          ? new Date(input.validUntil)
          : undefined;
        existingQuotation.commercialTerms =
          (input.commercialTerms as Types.DocumentArray<ICommercialTerm>) ||
          new Types.DocumentArray([]);
        existingQuotation.imageUrls = input.imageUrls || [];
        existingQuotation.status = "Draft";

        await existingQuotation.save();
        return existingQuotation;
      } catch (error) {
        if (error instanceof Error) throw new GraphQLError(error.message);
        throw new GraphQLError(
          "An unknown error occurred while updating the quotation."
        );
      }
    },
    updateQuotationStatus: async (
      _: unknown,
      { id, status }: { id: string; status: string },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const updatedQuotation = await Quotation.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      if (!updatedQuotation) throw new GraphQLError("Quotation not found.");
      return updatedQuotation;
    },
    approveQuotation: async (
      _: unknown,
      { quotationId }: { quotationId: string },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const quotation = (await Quotation.findById(
        quotationId
      )) as QuotationDocument | null;
      if (!quotation) throw new GraphQLError("Quotation not found.");

      if (!quotation.client) {
        const existingClient = await Client.findOne({
          $or: [
            { phone: quotation.clientInfo.phone },
            { email: quotation.clientInfo.email },
          ],
        });
        if (existingClient) {
          quotation.client = existingClient._id as Types.ObjectId;
        } else {
          const addresses = [];
          if (quotation.clientInfo.billingAddress) {
            addresses.push({
              tag: "Billing",
              address: quotation.clientInfo.billingAddress,
            });
          }
          if (
            quotation.clientInfo.installationAddress &&
            quotation.clientInfo.installationAddress !==
              quotation.clientInfo.billingAddress
          ) {
            addresses.push({
              tag: "Installation",
              address: quotation.clientInfo.installationAddress,
            });
          }

          const newClient = new Client({
            name: quotation.clientInfo.name,
            contactPerson: quotation.clientInfo.contactPerson,
            phone: quotation.clientInfo.phone,
            email: quotation.clientInfo.email,
            addresses: addresses,
          });
          await newClient.save();
          quotation.client = newClient._id as Types.ObjectId;
        }
      }

      quotation.status = "Approved";
      await quotation.save();
      return quotation.populate("client");
    },
  },
  Quotation: {
    editHistory: async (parent: QuotationDocument) => {
      // We only need to populate the user who made the update
      if (parent.editHistory && parent.editHistory.length > 0) {
        await parent.populate({ path: "editHistory.updatedBy" });
      }
      return parent.editHistory;
    },
    associatedInvoices: async (parent: QuotationDocument) =>
      await Invoice.find({ quotation: parent._id }),
    associatedAMCs: async (parent: QuotationDocument) => {
      const relatedInvoices = await Invoice.find({
        quotation: parent._id,
      }).select("_id");
      const invoiceIds = relatedInvoices.map((inv) => inv._id);
      if (invoiceIds.length === 0) return [];
      return await AMC.find({ originatingInvoice: { $in: invoiceIds } });
    },
  },
};

export default quotationResolver;
