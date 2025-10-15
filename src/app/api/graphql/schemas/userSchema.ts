// src/app/api/graphql/schemas/userSchema.ts
const userSchema = `
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    isActive: Boolean!
    createdAt: String!
  }

  # This is what we get back after a successful login
  type AuthPayload {
    token: String!
    user: User!
  }

  # Input for creating a new user
  input UserInput {
    name: String!
    email: String!
    password: String!
    role: String! # Can be 'Admin', 'Sales', or 'Technician'
  }

  # Input for logging in
  input LoginInput {
    email: String!
    password: String!
  }

  extend type Query {
    # A query to get the currently logged-in user's details
    me: User
  }

  extend type Mutation {
    # This will be our main user creation mutation
    createUser(input: UserInput!): User!

    # A mutation to log in
    login(input: LoginInput!): AuthPayload!
  }
`;

export default userSchema;