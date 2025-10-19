const amcSchema = `
  # This ClientInfoInput is used when creating a client on the fly, not needed for this AMC form
  input ClientInfoInput {
    name: String!
    phone: String!
    email: String
    billingAddress: String
    installationAddress: String
  }

  type ProductInstance {
    # --- ✅ FIX: Product is now nullable ---
    # This prevents a server crash if a product has been deleted.
    product: Product
    serialNumber: String
    purchaseDate: String
  }

  type ServiceVisit {
    scheduledDate: String!
    completedDate: String
    status: String!
    notes: String
  }

  type AMC {
    id: ID!
    amcId: String!
    client: Client!
    clientInfo: ClientInfo!
    productInstances: [ProductInstance!]!
    startDate: String!
    endDate: String!
    contractAmount: Float!
    frequencyPerYear: Int!
    serviceVisits: [ServiceVisit!]!
    status: String!
    createdBy: User
    createdAt: String!
    originatingInvoice: Invoice
  }

  input ProductInstanceInput {
    productId: ID!
    serialNumber: String
    purchaseDate: String
  }

  input ServiceVisitInput {
    scheduledDate: String!
  }

  # This input now correctly defines the data sent from the frontend form
  input CreateAMCInput {
    clientId: ID!
    productInstances: [ProductInstanceInput!]!
    startDate: String!
    endDate: String!
    contractAmount: Float!
    frequencyPerYear: Int!
    originatingInvoiceId: ID
    serviceVisits: [ServiceVisitInput!]!
    billingAddress: String!
    installationAddress: String!
  }

  input UpdateAMCInput {
    startDate: String
    endDate: String
    contractAmount: Float
    frequencyPerYear: Int
    status: String
    productInstances: [ProductInstanceInput!]
  }

  extend type Query {
    amcs: [AMC!]
    amc(id: ID!): AMC
  }

  extend type Mutation {
    createAMC(input: CreateAMCInput!): AMC!
    updateAMC(id: ID!, input: UpdateAMCInput!): AMC!
    deleteAMC(id: ID!): AMC
    updateAmcServiceStatus(amcId: ID!, visitIndex: Int!, status: String!, completedDate: String): AMC
  }
`;

export default amcSchema;

