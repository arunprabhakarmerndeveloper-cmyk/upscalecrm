import { GraphQLError } from "graphql";
import { Types, Document } from "mongoose";
import Invoice from "@/models/Invoice";
import Quotation from "@/models/Quotation";
import AMC from "@/models/AMC";
import { getNextSequenceValue } from "@/models/Counter";
import { MyContext } from "../route";

// --- TypeScript Interfaces for Resolver Arguments & Mongoose Docs ---

interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentDate?: string | Date;
}

interface InvoiceDocument extends Document {
  totalAmount: number;
  amountPaid: number;
  lineItems: Types.DocumentArray<{
    product: Types.ObjectId | { name: string };
    description?: string;
    quantity: number;
    price: number;
  }>;
}

interface PopulatedAMCDocument extends Document {
  client: Types.ObjectId;
  clientInfo: object;
  contractAmount: number;
  productInstances: {
    product: { name: string };
  }[];
}

// --- Resolver Map ---

const invoiceResolver = {
  Query: {
    invoices: async (_: unknown, __: unknown, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      return await Invoice.find({}).sort({ issueDate: -1 }).populate("client");
    },

    invoice: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      const invoice = await Invoice.findById(id)
        .populate("client")
        .populate("quotation")
        .populate("amc")
        .populate("lineItems.product");

      if (!invoice) throw new GraphQLError("Invoice not found");

      // 🩹 Fix: Safely convert {} → string (avoids “String cannot represent value: {}”)
      const clientInfo = invoice.clientInfo || {};

      return {
        ...invoice.toObject(),
        clientInfo: {
          ...clientInfo,
          billingAddress:
            typeof clientInfo.billingAddress === "object"
              ? "" // convert empty object to empty string
              : clientInfo.billingAddress || "",
          installationAddress:
            typeof clientInfo.installationAddress === "object"
              ? ""
              : clientInfo.installationAddress || "",
        },
      };
    },
  },

  Mutation: {
    createInvoiceFromQuotation: async (
      _: unknown,
      { quotationId, dueDate, installationDate }: { quotationId: string; dueDate?: string; installationDate?: string },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      const quotation = await Quotation.findById(quotationId);
      if (!quotation) throw new GraphQLError("Quotation not found.");
      if (quotation.status !== "Approved") throw new GraphQLError("Invoice can only be created from an Approved quotation.");
      if (!quotation.client) throw new GraphQLError("Quotation must be linked to a formal client record before invoicing.");

      const invoiceNumber = await getNextSequenceValue("invoice");
      const newInvoiceId = `INV-${new Date().getFullYear()}-${invoiceNumber}`;

      const newInvoice = new Invoice({
        invoiceId: newInvoiceId,
        client: quotation.client,
        clientInfo: quotation.clientInfo,
        quotation: quotation._id,
        lineItems: quotation.lineItems,
        totalAmount: quotation.totalAmount,
        termsOfService: quotation.commercialTerms
          ?.map((t) => `${t.title}:\n${t.content}`)
          .join("\n\n"),
        dueDate,
        installationDate,
      });

      await newInvoice.save();
      return newInvoice;
    },

    createInvoiceFromAMC: async (
      _: unknown,
      { amcId, dueDate }: { amcId: string; dueDate?: string },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");

      const amc = (await AMC.findById(amcId).populate(
        "productInstances.product"
      )) as PopulatedAMCDocument | null;

      if (!amc) throw new GraphQLError("AMC not found.");

      const invoiceNumber = await getNextSequenceValue("invoice");
      const newInvoiceId = `INV-${new Date().getFullYear()}-${invoiceNumber}`;

      const productNames = amc.productInstances
        .map((p) => p.product.name)
        .join(", ");

      const newInvoice = new Invoice({
        invoiceId: newInvoiceId,
        client: amc.client,
        clientInfo: amc.clientInfo,
        amc: amc._id,
        lineItems: [
          {
            description: `Annual Maintenance Contract for: ${productNames}`,
            quantity: 1,
            price: amc.contractAmount,
          },
        ],
        totalAmount: amc.contractAmount,
        dueDate,
      });

      await newInvoice.save();
      return newInvoice;
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
      if (invoice.amountPaid >= invoice.totalAmount) {
        invoice.status = "Paid";
        invoice.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      }
      await invoice.save();
      return invoice;
    },
  },

  Invoice: {
    balanceDue: (parent: InvoiceDocument) =>
      parent.totalAmount - parent.amountPaid,

    lineItems: async (parent: InvoiceDocument) => {
      if (
        parent.lineItems &&
        parent.lineItems.length > 0 &&
        parent.lineItems[0].product &&
        !(parent.lineItems[0].product as { name: string }).name
      ) {
        await parent.populate("lineItems.product");
      }
      return parent.lineItems;
    },
  },
};

export default invoiceResolver;
