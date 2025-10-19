const invoiceSchema = `
  # --- FIX: Explicitly define ClientInfo with simple string addresses ---
  # This ensures consistency when schemas are merged.
  type ClientInfo {
    name: String!
    phone: String!
    email: String
    billingAddress: String
    installationAddress: String
  }

  type Invoice {
    id: ID!
    invoiceId: String!
    client: Client!
    clientInfo: ClientInfo!
    quotation: Quotation
    amc: AMC
    status: String!
    issueDate: String!
    dueDate: String
    installationDate: String
    lineItems: [LineItem!]!
    totalAmount: Float!
    amountPaid: Float!
    balanceDue: Float!
    paymentDate: String
    termsOfService: String
    createdAt: String!
  }

  input RecordPaymentInput {
    invoiceId: ID!
    amount: Float!
    paymentDate: String
  }

  extend type Query {
    invoices: [Invoice!]
    invoice(id: ID!): Invoice
  }

  extend type Mutation {
    createInvoiceFromQuotation(quotationId: ID!, dueDate: String, installationDate: String): Invoice!
    createInvoiceFromAMC(amcId: ID!, dueDate: String): Invoice!
    recordPayment(input: RecordPaymentInput!): Invoice!
  }
`;

export default invoiceSchema;
