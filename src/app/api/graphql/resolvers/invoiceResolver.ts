import Invoice from "@/models/Invoice";
import Quotation from "@/models/Quotation";
import Client from "@/models/Client";
import AMC from "@/models/AMC"; // <-- NEW: Import the AMC model
import { getNextSequenceValue } from "@/models/Counter";
import { GraphQLError } from "graphql";
import { MyContext } from "../route";

const invoiceResolver = {
  Query: {
    invoices: async (_: unknown, __: unknown, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      return await Invoice.find({}).sort({ issueDate: -1 }).populate("client");
    },
    invoice: async (_: unknown, { id }: { id: string }, context: MyContext) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      return await Invoice.findById(id)
        .populate("client")
        .populate("quotation")
        .populate("amc")
        .populate("lineItems.product");
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
        termsOfService: quotation.commercialTerms?.map(t => `${t.title}:\n${t.content}`).join('\n\n'),
        dueDate,
        installationDate,
      });

      await newInvoice.save();
      return newInvoice;
    },

    // --- NEW: Mutation logic to create an invoice from an AMC ---
    createInvoiceFromAMC: async (
        _: unknown,
        { amcId, dueDate }: { amcId: string; dueDate?: string },
        context: MyContext
    ) => {
        if (!context.user) throw new GraphQLError("Not authenticated");

        const amc = await AMC.findById(amcId).populate('productInstances.product');
        if (!amc) throw new GraphQLError("AMC not found.");

        const invoiceNumber = await getNextSequenceValue("invoice");
        const newInvoiceId = `INV-${new Date().getFullYear()}-${invoiceNumber}`;
        
        const productNames = amc.productInstances.map(p => (p.product as any).name).join(', ');

        const newInvoice = new Invoice({
            invoiceId: newInvoiceId,
            client: amc.client,
            clientInfo: amc.clientInfo,
            amc: amc._id,
            lineItems: [{
                description: `Annual Maintenance Contract for: ${productNames}`,
                quantity: 1,
                price: amc.contractAmount,
            }],
            totalAmount: amc.contractAmount,
            dueDate,
        });

        await newInvoice.save();
        return newInvoice;
    },
    // --- END NEW LOGIC ---

    recordPayment: async (
      _: unknown,
      { input }: { input: any },
      context: MyContext
    ) => {
      if (!context.user) throw new GraphQLError("Not authenticated");
      const { invoiceId, amount, paymentDate } = input;

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) throw new GraphQLError("Invoice not found.");

      invoice.amountPaid += amount;
      if (invoice.amountPaid >= invoice.totalAmount) {
        invoice.status = "Paid";
        invoice.paymentDate = paymentDate || new Date();
      }
      await invoice.save();
      return invoice;
    },
  },
  Invoice: {
    balanceDue: (parent: any) => parent.totalAmount - parent.amountPaid,
    lineItems: async (parent: any) => {
      if (parent.lineItems && parent.lineItems.length > 0 && parent.lineItems[0].product && !parent.lineItems[0].product.name) {
        await parent.populate("lineItems.product");
      }
      return parent.lineItems;
    },
  },
};

export default invoiceResolver;
