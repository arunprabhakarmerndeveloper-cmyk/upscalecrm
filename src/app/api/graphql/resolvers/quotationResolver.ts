import { Document, Types } from 'mongoose';
import Quotation from "@/models/Quotation";
import Product from "@/models/Product";
import Client from "@/models/Client";
import { getNextSequenceValue } from "@/models/Counter";
import { GraphQLError } from "graphql";
import { MyContext } from "../route";

// --- TypeScript Interfaces ---

// For mutation inputs
interface ClientInfoInput {
  name: string;
  phone: string;
  email?: string;
}

interface LineItemInput {
  productId: string;
  quantity: number;
  price?: number;
  description?: string;
}

interface CommercialTermInput {
  title: string;
  content: string;
}

interface CreateQuotationInput {
  clientId?: string;
  clientInfo?: ClientInfoInput;
  lineItems: LineItemInput[];
  validUntil?: string;
  commercialTerms?: CommercialTermInput[];
}

interface UpdateQuotationInput {
  lineItems: LineItemInput[];
  validUntil?: string;
  commercialTerms?: CommercialTermInput[];
  reason: string;
}

// For Mongoose Documents
interface QuotationDocument extends Document {
  _id: Types.ObjectId;
  client?: Types.ObjectId;
  clientInfo: any; // Mongoose Mixed type
  lineItems: any; // Mongoose sub-document array
  totalAmount: number;
  editHistory: any; // Mongoose sub-document array
  commercialTerms: any; // Mongoose sub-document array
  status: string;
  validUntil?: Date;
}

// --- Resolver Map ---

const quotationResolver = {
  Query: {
    quotations: async (_: unknown, __: unknown, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      return await Quotation.find({}).sort({ createdAt: -1 }).populate("client");
    },
    quotation: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      return await Quotation.findById(id)
        .populate("client")
        .populate("lineItems.product")
        .populate({ path: "editHistory", populate: { path: "updatedBy" } });
    },
  },
  Mutation: {
    createQuotation: async (_: unknown, { input }: { input: CreateQuotationInput }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const { clientId, clientInfo, lineItems } = input;
      if (!clientId && !clientInfo) throw new GraphQLError("Either clientId or clientInfo must be provided.");

      let finalClientInfo = clientInfo;
      if (clientId) {
        const client = await Client.findById(clientId);
        if (!client) throw new GraphQLError("Existing client not found.");
        finalClientInfo = client.toObject();
      }

      let totalAmount = 0;
      const processedLineItems = await Promise.all(
        lineItems.map(async (item) => {
          const product = await Product.findById(item.productId);
          if (!product) throw new GraphQLError(`Product with ID ${item.productId} not found.`);
          const price = item.price ?? product.price;
          const description = item.description ?? product.description;
          totalAmount += price * item.quantity;
          return { product: product._id, description, quantity: item.quantity, price };
        })
      );

      const quotationNumber = await getNextSequenceValue("quotation");
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const quotationId = `QUO-${year}${month}${day}-${quotationNumber}-${randomSuffix}`;

      const newQuotation = new Quotation({
        ...input,
        client: clientId || undefined,
        clientInfo: finalClientInfo,
        lineItems: processedLineItems,
        totalAmount,
        quotationId,
      });

      await newQuotation.save();
      return newQuotation;
    },

    updateQuotationStatus: async (_: unknown, { id, status }: { id: string; status: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const updatedQuotation = await Quotation.findByIdAndUpdate(id, { status }, { new: true });
      if (!updatedQuotation) throw new GraphQLError("Quotation not found.");
      return updatedQuotation;
    },

    updateQuotation: async (_: unknown, { id, input }: { id: string; input: UpdateQuotationInput }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const existingQuotation = await Quotation.findById(id) as QuotationDocument | null;
      if (!existingQuotation) throw new GraphQLError("Quotation not found.");

      const currentVersion = {
        version: (existingQuotation.editHistory?.length || 0) + 1,
        updatedAt: new Date(),
        updatedBy: context.user._id,
        reason: input.reason,
        lineItems: existingQuotation.lineItems,
        totalAmount: existingQuotation.totalAmount,
        commercialTerms: existingQuotation.commercialTerms,
      };
      existingQuotation.editHistory.push(currentVersion);

      let newTotalAmount = 0;
      const newProcessedLineItems = await Promise.all(
        input.lineItems.map(async (item) => {
          const product = await Product.findById(item.productId);
          if (!product) throw new GraphQLError(`Product with ID ${item.productId} not found.`);
          const price = item.price ?? product.price;
          const description = item.description ?? product.description;
          newTotalAmount += price * item.quantity;
          return { product: product._id, description, quantity: item.quantity, price };
        })
      );

      existingQuotation.lineItems = newProcessedLineItems;
      existingQuotation.totalAmount = newTotalAmount;
      existingQuotation.validUntil = input.validUntil ? new Date(input.validUntil) : undefined;
      existingQuotation.commercialTerms = input.commercialTerms;

      await existingQuotation.save();
      return existingQuotation;
    },

    approveQuotation: async (_: unknown, { quotationId }: { quotationId: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const quotation = await Quotation.findById(quotationId) as QuotationDocument | null;
      if (!quotation) throw new GraphQLError("Quotation not found.");

      if (!quotation.client) {
        const existingClient = await Client.findOne({
          $or: [{ phone: quotation.clientInfo.phone }, { email: quotation.clientInfo.email }],
        });
        if (existingClient) {
          quotation.client = existingClient._id;
        } else {
          const newClient = new Client({
            name: quotation.clientInfo.name,
            contactPerson: quotation.clientInfo.contactPerson,
            phone: quotation.clientInfo.phone,
            email: quotation.clientInfo.email,
            billingAddress: quotation.clientInfo.billingAddress,
            installationAddress: quotation.clientInfo.installationAddress,
          });
          await newClient.save();
          quotation.client = newClient._id;
        }
      }

      quotation.status = "Approved";
      await quotation.save();
      return quotation.populate("client");
    },
  },
  Quotation: {
    lineItems: async (parent: QuotationDocument) => {
      if (parent.lineItems && parent.lineItems[0] && !(parent.lineItems[0].product as { name: string }).name) {
        await parent.populate("lineItems.product");
      }
      return parent.lineItems;
    },
    editHistory: async (parent: QuotationDocument) => {
      if (parent.editHistory && parent.editHistory.length > 0) {
        await parent.populate({
          path: "editHistory",
          populate: [{ path: "updatedBy" }, { path: "lineItems.product" }],
        });
      }
      return parent.editHistory;
    },
  },
};

export default quotationResolver;