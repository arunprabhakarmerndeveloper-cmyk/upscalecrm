import { GraphQLError } from "graphql";
import { Types, Document } from "mongoose";
import Invoice, { ILineItem, IClientInfo, IInvoice } from "@/models/Invoice"; // Using our updated interfaces
import Quotation from "@/models/Quotation";
import AMC, { IAMC, IAMCProduct } from "@/models/AMC";
import { IProduct } from "@/models/Product";
import Client from "@/models/Client";
import User, { IUser } from "@/models/User"; // Added User import
import { getNextSequenceValue } from "@/models/Counter";
import { MyContext } from "../route";

// --- TypeScript Interfaces for Resolver Arguments ---

// Input for adding a new client directly during invoice creation
interface NewClientForInvoiceInput {
  name: string;
  phone: string;
  email?: string;
}

// Updated CreateInvoiceInput to match Schema
interface CreateInvoiceInput {
  clientId?: string; // Optional
  newClient?: NewClientForInvoiceInput; // Added
  billingAddress: string; // Added
  installationAddress: string; // Added
  issueDate: string;
  dueDate?: string;
  installationDate?: string;
  lineItems: ILineItem[];
  taxPercentage?: number;
  termsOfService?: string;
}

interface UpdateInvoiceInput {
  clientInfo?: IClientInfo;
  issueDate?: string;
  dueDate?: string;
  installationDate?: string;
  lineItems?: ILineItem[];
  taxPercentage?: number;
  termsOfService?: string;
}

interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentDate?: string | Date;
}

// Defined a specific type for the populated AMC document
interface PopulatedAMCProductInstance extends IAMCProduct {
  product: IProduct;
}

interface PopulatedAMCDocument extends IAMC {
  productInstances: PopulatedAMCProductInstance[];
}

// Stronger type for Mongoose Invoice document
interface InvoiceDocument extends IInvoice, Document {
  lineItems: Types.DocumentArray<ILineItem>;
}

// Stronger type for parent in 'createdBy' resolver
interface ParentWithCreatedBy {
  createdBy: IUser | Types.ObjectId;
}

type WithTypename<T> = T & { __typename?: string };

// --- Resolver Map ---

const invoiceResolver = {
  Query: {
    invoices: async (_: unknown, __: unknown, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      return await Invoice.find({})
        .sort({ issueDate: -1 })
        .populate("client")
        .populate("createdBy");
    },

    invoice: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const invoice = await Invoice.findById(id)
        .populate("client")
        .populate("quotation")
        .populate("amc")
        .populate("createdBy");

      if (!invoice) throw new GraphQLError("Invoice not found");
      return invoice;
    },
  },

  Mutation: {
    createInvoice: async (
      _: unknown,
      { input }: { input: CreateInvoiceInput },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      // Destructure all expected fields, including new ones
      const {
        clientId,
        newClient,
        billingAddress,
        installationAddress,
        lineItems,
        taxPercentage = 0,
        ...rest
      } = input;

      let finalClientInfo: IClientInfo;
      let clientObjectId: Types.ObjectId | null = null; // Use null for clarity

      // Logic adapted from createQuotation
      if (clientId) {
        const client = await Client.findById(clientId);
        if (!client) throw new GraphQLError("Selected client not found.");
        clientObjectId = client._id as Types.ObjectId;
        finalClientInfo = {
          name: client.name,
          phone: client.phone, // Use client's phone as default, can be overridden by input if needed
          email: client.email, // Use client's email as default
          billingAddress: billingAddress, // Always use the address from the input form
          installationAddress: installationAddress, // Always use the address from the input form
        };
      } else if (newClient) {
        if (!newClient.name || !newClient.phone) {
          throw new GraphQLError("New client name and phone are required.");
        }
        finalClientInfo = {
          name: newClient.name,
          phone: newClient.phone,
          email: newClient.email,
          billingAddress: billingAddress, // Use address from the input form
          installationAddress: installationAddress, // Use address from the input form
        };
        // clientObjectId remains null because we are not creating a full Client record here
      } else {
        throw new GraphQLError(
          "Either clientId or newClient details must be provided."
        );
      }

      const totalAmount = lineItems.reduce(
        (acc: number, item: ILineItem) => acc + item.price * item.quantity,
        0
      );
      const grandTotal = totalAmount + (totalAmount * taxPercentage) / 100;

      const invoiceNumber = await getNextSequenceValue("invoice");
      const invoiceId = `INV-${new Date().getFullYear()}-${invoiceNumber}`;

      // Ensure context.user._id is treated as ObjectId
      const createdById = context.user._id as Types.ObjectId; // Explicit cast

      const newInvoice = new Invoice({
        ...rest, // includes issueDate, dueDate, installationDate, termsOfService
        invoiceId,
        client: clientObjectId, // Assign ObjectId if existing client, null otherwise
        clientInfo: finalClientInfo, // The prepared client snapshot
        lineItems,
        totalAmount,
        taxPercentage,
        grandTotal,
        createdBy: createdById, // Use the casted ID
        status: "Draft", // Default status for new invoices
      });

      await newInvoice.save();
      // Populate based on whether clientObjectId exists
      const populated = await newInvoice.populate(
        clientObjectId ? "client createdBy" : "createdBy"
      );
      return populated;
    },

    updateInvoice: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateInvoiceInput },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      // Use the strongly-typed InvoiceDocument
      const invoice = (await Invoice.findById(id)) as InvoiceDocument | null;
      if (!invoice) throw new GraphQLError("Invoice not found.");
      if (invoice.status !== "Draft") {
        throw new GraphQLError("Only draft invoices can be edited.");
      }

      // FIX: Exclude __typename from nested objects
      if (input.clientInfo) {
    // FIX: Rename __typename to _typename
    const { __typename: _typename, ...cleanClientInfo } =
      input.clientInfo as WithTypename<IClientInfo>;
    input.clientInfo = cleanClientInfo;
  }
  if (input.lineItems) {
    input.lineItems = input.lineItems.map((item) => {
      // FIX: Rename __typename to _typename
      const { __typename: _typename, ...cleanItem } = item as WithTypename<ILineItem>;
      return cleanItem;
    });
  }
      // Update fields provided in the input
      Object.assign(invoice, input);

      // Recalculate totals if lineItems or taxPercentage are changed
      if (input.lineItems || input.taxPercentage !== undefined) {
        // Safely get the array for calculation
        const itemsForCalc: ILineItem[] =
          typeof invoice.lineItems.toObject === "function"
            ? invoice.lineItems.toObject()
            : (invoice.lineItems as ILineItem[]);

        invoice.totalAmount = itemsForCalc.reduce(
          (acc: number, item: ILineItem) => acc + item.price * item.quantity,
          0
        );
        invoice.grandTotal =
          invoice.totalAmount +
          (invoice.totalAmount * invoice.taxPercentage) / 100;
      }

      await invoice.save();
      return invoice.populate("client createdBy");
    },

    createInvoiceFromQuotation: async (
      _: unknown,
      {
        quotationId,
        dueDate,
        installationDate,
      }: { quotationId: string; dueDate?: string; installationDate?: string },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      const quotation = await Quotation.findById(quotationId);
      if (!quotation) throw new GraphQLError("Quotation not found.");
      if (quotation.status !== "Approved")
        throw new GraphQLError(
          "Invoice can only be created from an Approved quotation."
        );
      if (!quotation.client)
        throw new GraphQLError(
          "Quotation must be linked to a client before invoicing."
        );

      // Ensure context.user._id is treated as ObjectId
      const createdById = context.user._id as Types.ObjectId; // Explicit cast

      const invoiceNumber = await getNextSequenceValue("invoice");
      const newInvoiceId = `INV-${new Date().getFullYear()}-${invoiceNumber}`;

      const newInvoice = new Invoice({
        invoiceId: newInvoiceId,
        client: quotation.client,
        clientInfo: quotation.clientInfo,
        quotation: quotation._id,
        lineItems: quotation.lineItems,
        totalAmount: quotation.totalAmount,
        taxPercentage: quotation.taxPercentage,
        grandTotal: quotation.grandTotal,
        termsOfService: quotation.commercialTerms
          ?.map((t) => `${t.title}:\n${t.content}`)
          .join("\n\n"),
        dueDate,
        installationDate,
        createdBy: createdById, // Use casted ID
      });

      await newInvoice.save();
      return newInvoice.populate("client createdBy");
    },

    createInvoiceFromAMC: async (
      _: unknown,
      { amcId, dueDate }: { amcId: string; dueDate?: string },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      const amc = (await AMC.findById(amcId).populate(
        "productInstances.product"
      )) as PopulatedAMCDocument | null; // Using our specific type

      if (!amc) throw new GraphQLError("AMC not found.");
      if (!amc.client)
        throw new GraphQLError("AMC must be linked to a client.");

      // Ensure context.user._id is treated as ObjectId
      const createdById = context.user._id as Types.ObjectId; // Explicit cast

      const invoiceNumber = await getNextSequenceValue("invoice");
      const newInvoiceId = `INV-${new Date().getFullYear()}-${invoiceNumber}`;

      // Use the specific type for 'p'
      const productNames = amc.productInstances
        .map((p: PopulatedAMCProductInstance) => p.product.name)
        .join(", ");

      const totalAmount = amc.contractAmount;
      const taxPercentage = 0; // Assuming 0 tax for AMC, can be changed
      const grandTotal = totalAmount + (totalAmount * taxPercentage) / 100;

      const newInvoice = new Invoice({
        invoiceId: newInvoiceId,
        client: amc.client,
        clientInfo: amc.clientInfo,
        amc: amc._id,
        lineItems: [
          {
            productName: "Annual Maintenance Contract",
            description: `AMC for: ${productNames}`,
            quantity: 1,
            price: amc.contractAmount,
          },
        ],
        totalAmount: totalAmount,
        taxPercentage: taxPercentage,
        grandTotal: grandTotal,
        dueDate,
        createdBy: createdById, // Use casted ID
      });

      await newInvoice.save();
      return newInvoice.populate("client createdBy");
    },

    updateInvoiceStatus: async (
      _: unknown,
      { id, status }: { id: string; status: string },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const updatedInvoice = await Invoice.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      if (!updatedInvoice) throw new GraphQLError("Invoice not found.");
      return updatedInvoice.populate("client createdBy");
    },

    recordPayment: async (
      _: unknown,
      { input }: { input: RecordPaymentInput },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const { invoiceId, amount, paymentDate } = input;

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) throw new GraphQLError("Invoice not found.");

      invoice.amountPaid += amount;
      // Ensure grandTotal is treated as a number for comparison
      if (invoice.amountPaid >= (invoice.grandTotal as number)) {
        invoice.status = "Paid";
        invoice.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      }
      await invoice.save();
      return invoice.populate("client createdBy");
    },

    createAmcFromInvoice: async (
      _: unknown,
      {
        invoiceId,
        startDate,
        endDate,
        frequencyPerYear,
        contractAmount,
        commercialTerms,
      }: {
        invoiceId: string;
        startDate: string;
        endDate: string;
        frequencyPerYear: number;
        contractAmount: number;
        commercialTerms?: string;
      },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      try {
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
          throw new GraphQLError("Originating invoice not found.");
        } // Generate a new AMC ID

        const amcNumber = await getNextSequenceValue("amc");
        const amcId = `AMC-${new Date().getFullYear()}-${amcNumber}`; // Automatically generate service visits

        const start = new Date(startDate);
        const end = new Date(endDate);
        const durationMs = end.getTime() - start.getTime();
        const serviceVisits = [];
        if (durationMs >= 0 && frequencyPerYear > 0) {
          // Use Math.max(1, ...) to avoid division by zero if frequency is 1
          const intervalMs = durationMs / Math.max(1, frequencyPerYear - 1);
          for (let i = 0; i < frequencyPerYear; i++) {
            // Handle single-visit case (intervalMs will be Infinity, so 0 * Infinity is NaN)
            const visitDate =
              frequencyPerYear === 1
                ? start
                : new Date(start.getTime() + i * intervalMs);
            serviceVisits.push({
              scheduledDate: visitDate,
              status: "Scheduled" as const,
            });
          }
        } // Create product instances from invoice line items

        const productInstances = invoice.lineItems.map((item) => ({
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          serialNumber: "", // Default to empty
          purchaseDate: invoice.installationDate || invoice.issueDate,
        }));

        const newAmc = new AMC({
          amcId,
          client: invoice.client, // Link the same client
          clientInfo: invoice.clientInfo, // Copy the client snapshot
          productInstances,
          startDate: start,
          endDate: end,
          contractAmount,
          frequencyPerYear,
          serviceVisits,
          status: "Active",
          createdBy: context.user._id as Types.ObjectId,
          originatingInvoice: invoice._id,
          commercialTerms,
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
  },

  Invoice: {
    balanceDue: (parent: { grandTotal: number; amountPaid: number }) =>
      parent.grandTotal - parent.amountPaid,

    // The createdBy resolver ensures the User object is returned
    createdBy: async (
      parent: ParentWithCreatedBy,
      _: unknown,
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      if (!parent.createdBy) return null;

      // Check if createdBy is already populated (it's an object with 'name')
      // or just an ObjectId.
      if (typeof parent.createdBy === "object" && "name" in parent.createdBy) {
        return parent.createdBy as IUser;
      }

      // If it's not populated, it must be an ObjectId
      try {
        // Ensure parent.createdBy is treated as ObjectId for the query
        const userId = parent.createdBy as Types.ObjectId;
        const user = await User.findById(userId);
        return user;
      } catch (error) {
        console.error("Error fetching user for createdBy:", error);
        return null; // Return null if user not found or error
      }
    },
  },
};

export default invoiceResolver;
