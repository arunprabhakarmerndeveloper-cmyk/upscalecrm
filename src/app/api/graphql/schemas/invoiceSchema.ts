const invoiceSchema = `
  # The LineItem and ClientInfo types are already defined and will be merged.

  type Invoice {
    id: ID!
    invoiceId: String!
    client: Client!
    clientInfo: ClientInfo!
    quotation: Quotation
    amc: AMC # --- NEW: Link to an AMC ---
    status: String!
    issueDate: String!
    dueDate: String
    installationDate: String
    lineItems: [LineItem!]!
    totalAmount: Float!
    amountPaid: Float!
    balanceDue: Float! # A calculated field
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
    
    # --- NEW: Mutation to create an invoice directly from an AMC ---
    createInvoiceFromAMC(amcId: ID!, dueDate: String): Invoice!

    recordPayment(input: RecordPaymentInput!): Invoice!
  }
`;

export default invoiceSchema;
