import { gql } from '@apollo/client';

// Products
export const GET_PRODUCTS = gql`
  query GetProducts($type: String) {
    products(type: $type) {
      id
      name
      productId
      description
      price
      type
      createdAt
      updatedAt
    }
  }
`;

// Clients
export const GET_CLIENTS = gql`
  query GetClients {
    clients {
      id
      name
      email
      phone
      createdAt
    }
  }
`;

// AMCs
export const GET_AMCS = gql`
  query GetAMCs {
    amcs {
      id
      startDate
      endDate
      client {
        id
        name
      }
      createdBy {
        id
        name
      }
    }
  }
`;

// Invoices
export const GET_INVOICES = gql`
  query GetInvoices {
    invoices {
      id
      issueDate
      client {
        id
        name
      }
      total
    }
  }
`;

// Quotations
export const GET_QUOTATIONS = gql`
  query GetQuotations {
    quotations {
      id
      createdAt
      client {
        id
        name
      }
      total
    }
  }
`;


// Dashboard Data
export const GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    clients { id }
    quotations {
      id
      quotationId
      status
      totalAmount
      clientInfo { name }
    }
    invoices {
      id
      status
      dueDate
      totalAmount
      amountPaid
      clientInfo { name }
    }
    amcs {
      id
      serviceVisits {
        scheduledDate
        status
      }
    }
  }
`;
