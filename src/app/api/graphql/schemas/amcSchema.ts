const amcSchema = `
  type ProductInstance {
    product: Product!
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

  # --- NEW: Input type for a service visit ---
  input ServiceVisitInput {
      scheduledDate: String!
  }

  input CreateAMCInput {
    clientId: ID!
    productInstances: [ProductInstanceInput!]!
    startDate: String!
    endDate: String!
    contractAmount: Float!
    frequencyPerYear: Int!
    originatingInvoiceId: ID
    serviceVisits: [ServiceVisitInput!]! # --- UPDATED ---
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

