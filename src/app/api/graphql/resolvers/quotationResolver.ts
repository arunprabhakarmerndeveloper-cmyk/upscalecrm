import Quotation from "@/models/Quotation";
import Product from "@/models/Product";
import Client from "@/models/Client";
import { getNextSequenceValue } from "@/models/Counter";
import { GraphQLError } from "graphql";
import { MyContext } from "../route";

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
      // Deeply populate all related data for the detail page
      return await Quotation.findById(id)
        .populate("client")
        .populate("lineItems.product")
        .populate({ path: "editHistory", populate: { path: "updatedBy" } });
    },
  },
  Mutation: {
    createQuotation: async (
      _: unknown,
      { input }: { input: any },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      const { clientId, clientInfo, lineItems } = input;
      if (!clientId && !clientInfo) {
        throw new GraphQLError(
          "Either clientId or clientInfo must be provided."
        );
      }

      let finalClientInfo = clientInfo;
      if (clientId) {
        const client = await Client.findById(clientId);
        if (!client) throw new GraphQLError("Existing client not found.");
        finalClientInfo = client.toObject();
      }

      let totalAmount = 0;
      const processedLineItems = await Promise.all(
        lineItems.map(async (item: any) => {
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
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      // Short random alphanumeric suffix
      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();

      // New quotation ID: QUO-YYYYMMDD-Sequence-RAND
      const quotationId = `QUO-${year}${month}${day}-${quotationNumber}-${randomSuffix}`;

      const newQuotation = new Quotation({
        ...input, // This will now correctly pass 'commercialTerms' and 'validUntil'
        client: clientId || undefined,
        clientInfo: finalClientInfo,
        lineItems: processedLineItems,
        totalAmount,
        quotationId,
      });

      await newQuotation.save();
      return newQuotation;
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
      { id, input }: { id: string; input: any },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      const existingQuotation = await Quotation.findById(id);
      if (!existingQuotation) throw new GraphQLError("Quotation not found.");

      const currentVersion = {
        version: (existingQuotation.editHistory?.length || 0) + 1,
        updatedAt: new Date(),
        updatedBy: context.user._id,
        reason: input.reason,
        lineItems: existingQuotation.lineItems,
        totalAmount: existingQuotation.totalAmount,
        commercialTerms: existingQuotation.commercialTerms, // Archive old terms
      };
      existingQuotation.editHistory.push(currentVersion as any);

      let newTotalAmount = 0;
      const newProcessedLineItems = await Promise.all(
        input.lineItems.map(async (item: any) => {
          const product = await Product.findById(item.productId);
          if (!product)
            throw new GraphQLError(
              `Product with ID ${item.productId} not found.`
            );

          const price = item.price ?? product.price;
          const description = item.description ?? product.description;
          newTotalAmount += price * item.quantity;

          return {
            product: product._id,
            description,
            quantity: item.quantity,
            price,
          };
        })
      );

      existingQuotation.lineItems = newProcessedLineItems as any;
      existingQuotation.totalAmount = newTotalAmount;
      existingQuotation.validUntil = input.validUntil;
      existingQuotation.commercialTerms = input.commercialTerms;

      await existingQuotation.save();
      return existingQuotation;
    },

    // --- NEW: The logic for our "Approve" workflow ---
    approveQuotation: async (
      _: unknown,
      { quotationId }: { quotationId: string },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      const quotation = await Quotation.findById(quotationId);
      if (!quotation) throw new GraphQLError("Quotation not found.");

      // If the quotation is for a new lead (no client link yet)
      if (!quotation.client) {
        // 1. Check if a client with this phone/email already exists to prevent duplicates
        const existingClient = await Client.findOne({
          $or: [
            { phone: quotation.clientInfo.phone },
            { email: quotation.clientInfo.email },
          ],
        });
        if (existingClient) {
          // If client exists, link to it instead of creating a new one
          quotation.client = existingClient._id;
        } else {
          // 2. Create a new client from the quotation's info
          const newClient = new Client({
            name: quotation.clientInfo.name,
            contactPerson: quotation.clientInfo.contactPerson,
            phone: quotation.clientInfo.phone,
            email: quotation.clientInfo.email,
            billingAddress: quotation.clientInfo.billingAddress,
            installationAddress: quotation.clientInfo.installationAddress,
          });
          await newClient.save();

          // 3. Link the new client to the quotation
          quotation.client = newClient._id;
        }
      }

      // 4. Update the quotation status to "Approved"
      quotation.status = "Approved";
      await quotation.save();

      // 5. Return the fully updated quotation, populated for the UI
      return quotation.populate("client");
    },
  },
  Quotation: {
    lineItems: async (parent: any) => {
      if (
        parent.lineItems &&
        parent.lineItems[0] &&
        !parent.lineItems[0].product.name
      ) {
        await parent.populate("lineItems.product");
      }
      return parent.lineItems;
    },
    editHistory: async (parent: any) => {
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
