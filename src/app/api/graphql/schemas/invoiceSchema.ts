const invoiceSchema = `
  # Using the same input types as Quotations for consistency
  type ClientInfo {
    name: String!
    phone: String
    email: String
    billingAddress: String
    installationAddress: String
  }

  type LineItem {
    productName: String!
    description: String
    quantity: Int!
    price: Float!
  }

  type Invoice {
    id: ID!
    invoiceId: String!
    client: Client # Now potentially null if created manually first
    clientInfo: ClientInfo!
    quotation: Quotation
    amc: AMC
    status: String!
    issueDate: String!
    dueDate: String
    installationDate: String
    lineItems: [LineItem!]!
    totalAmount: Float! # Subtotal
    taxPercentage: Float!
    grandTotal: Float!  # Final Total
    amountPaid: Float!
    balanceDue: Float!
    paymentDate: String
    termsOfService: String
    createdAt: String!
    createdBy: User
  }

  # --- Inputs for Mutations ---

  input ClientInfoInput {
    name: String!
    phone: String
    email: String
    billingAddress: String
    installationAddress: String
  }

  input LineItemInput {
    productName: String!
    description: String
    quantity: Int!
    price: Float!
  }

  # Input for adding a new client directly during invoice creation
  input NewClientForInvoiceInput {
    name: String!
    phone: String! # Make phone required for new client
    email: String
  }

  input CreateInvoiceInput {
    clientId: ID # Made optional
    newClient: NewClientForInvoiceInput # Added
    billingAddress: String! # Added
    installationAddress: String! # Added
    issueDate: String!
    dueDate: String
    installationDate: String
    lineItems: [LineItemInput!]!
    taxPercentage: Float
    termsOfService: String
  }

  input UpdateInvoiceInput {
    clientInfo: ClientInfoInput # Keep clientInfo update separate for simplicity
    issueDate: String
    dueDate: String
    installationDate: String
    lineItems: [LineItemInput!]
    taxPercentage: Float
    termsOfService: String
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
    createInvoice(input: CreateInvoiceInput!): Invoice!
    updateInvoice(id: ID!, input: UpdateInvoiceInput!): Invoice!
    createInvoiceFromQuotation(quotationId: ID!, dueDate: String, installationDate: String): Invoice!
    createInvoiceFromAMC(amcId: ID!, dueDate: String): Invoice!
    updateInvoiceStatus(id: ID!, status: String!): Invoice!
    recordPayment(input: RecordPaymentInput!): Invoice!
    createAmcFromInvoice(invoiceId: ID!, startDate: String!, endDate: String!, frequencyPerYear: Int!, contractAmount: Float!, commercialTerms: String): AMC!
  }
`;

export default invoiceSchema;
