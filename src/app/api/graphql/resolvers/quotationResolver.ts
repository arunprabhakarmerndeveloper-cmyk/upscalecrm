import { Document, Types } from "mongoose";
import Quotation from "@/models/Quotation";
import Product from "@/models/Product";
import Client from "@/models/Client";
import Invoice from "@/models/Invoice"; // Import Invoice model
import AMC from "@/models/AMC"; // Import AMC model
import { getNextSequenceValue } from "@/models/Counter";
import { GraphQLError } from "graphql";
import { MyContext } from "../route";

// --- TypeScript Interfaces ---
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
  clientId: string;
  billingAddress: string;
  installationAddress: string;
  lineItems: LineItemInput[];
  validUntil?: string;
  commercialTerms?: CommercialTermInput[];
  imageUrls?: string[];
}
interface UpdateQuotationInput {
  lineItems: LineItemInput[];
  validUntil?: string;
  commercialTerms?: CommercialTermInput[];
  reason: string;
  totalAmount: number;
  imageUrls?: string[];
}
interface IQuotationVersion {
  version: number;
  updatedAt: Date;
  updatedBy: Types.ObjectId;
  reason: string;
  lineItems: Types.DocumentArray<{
    product: Types.ObjectId | { name: string };
  }>;
  totalAmount: number;
  commercialTerms: Types.DocumentArray<{ title: string; content: string }>;
}
interface QuotationDocument extends Document {
  _id: Types.ObjectId;
  client?: Types.ObjectId;
  clientInfo: {
    name: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    billingAddress?: string;
    installationAddress?: string;
  };
  lineItems: Types.DocumentArray<{
    product: Types.ObjectId | { name: string };
  }>;
  totalAmount: number;
  editHistory: Types.DocumentArray<IQuotationVersion>;
  commercialTerms: Types.DocumentArray<{ title: string; content: string }>;
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
        .populate("lineItems.product")
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
        const { clientId, billingAddress, installationAddress, lineItems } =
          input;

        const client = await Client.findById(clientId);
        if (!client) throw new GraphQLError("Client not found.");

        const finalClientInfo = {
          name: client.name,
          phone: client.phone,
          email: client.email || "",
          billingAddress: billingAddress,
          installationAddress: installationAddress,
        };

        let totalAmount = 0;
        const processedLineItems = await Promise.all(
          lineItems.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product)
              throw new GraphQLError(
                `Product with ID ${item.productId} not found.`
              );
            const price = item.price ?? product.price;
            const description = item.description ?? product.description;
            totalAmount += price * item.quantity;
            return {
              product: product._id,
              description,
              quantity: item.quantity,
              price,
            };
          })
        );

        const quotationNumber = await getNextSequenceValue("quotation");
        const quotationId = `QUO-${new Date().getFullYear()}-${quotationNumber}`;

        // --- ✅ FIX: Correctly access imageUrls from the `input` object ---
        const newQuotation = new Quotation({
          quotationId,
          client: clientId,
          clientInfo: finalClientInfo,
          lineItems: processedLineItems,
          totalAmount,
          validUntil: input.validUntil,
          commercialTerms: input.commercialTerms,
          imageUrls: input.imageUrls || [],
        });

        await newQuotation.save();
        return newQuotation;
      } catch (error) {
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
        throw new GraphQLError(
          "An unknown error occurred while creating the quotation."
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

        const currentVersion = {
          version: (existingQuotation.editHistory?.length || 0) + 1,
          updatedAt: new Date(),
          updatedBy: context.user._id,
          reason: input.reason,
          lineItems: existingQuotation.lineItems,
          totalAmount: existingQuotation.totalAmount,
          commercialTerms: existingQuotation.commercialTerms,
        };
        existingQuotation.editHistory.push(currentVersion as IQuotationVersion);

        const newProcessedLineItems = await Promise.all(
          input.lineItems.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product)
              throw new GraphQLError(
                `Product with ID ${item.productId} not found.`
              );
            const price = item.price ?? product.price;
            const description = item.description ?? product.description;
            return {
              product: product._id,
              description,
              quantity: item.quantity,
              price,
            };
          })
        );

        existingQuotation.lineItems =
          newProcessedLineItems as unknown as typeof existingQuotation.lineItems;
        existingQuotation.totalAmount = input.totalAmount;
        existingQuotation.validUntil = input.validUntil
          ? new Date(input.validUntil)
          : undefined;
        existingQuotation.commercialTerms = (input.commercialTerms || []).map(
          (term) => ({
            title: term.title,
            content: term.content,
          })
        ) as unknown as typeof existingQuotation.commercialTerms;
        existingQuotation.imageUrls = input.imageUrls || [];

        await existingQuotation.save();
        return existingQuotation;
      } catch (error) {
        if (error instanceof Error) {
          throw new GraphQLError(error.message);
        }
        throw new GraphQLError(
          "An unknown error occurred while updating the quotation."
        );
      }
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
    lineItems: async (parent: QuotationDocument) => {
      if (
        parent.lineItems?.[0]?.product &&
        typeof parent.lineItems[0].product === "object" &&
        !("name" in parent.lineItems[0].product)
      ) {
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
    associatedInvoices: async (parent: QuotationDocument) => {
      return await Invoice.find({ quotation: parent._id });
    },
    associatedAMCs: async (parent: QuotationDocument) => {
      const relatedInvoices = await Invoice.find({
        quotation: parent._id,
      }).select("_id");
      const invoiceIds = relatedInvoices.map((inv) => inv._id);

      if (invoiceIds.length === 0) {
        return [];
      }

      return await AMC.find({ originatingInvoice: { $in: invoiceIds } });
    },
  },
};

export default quotationResolver;
