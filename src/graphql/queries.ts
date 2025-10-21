import { gql } from '@apollo/client';


// AMCs
export const GET_AMCS = gql`
  query GetAMCs {
    amcs {
      id
      amcId
      status
      clientInfo { name phone email }
      productInstances { product { name } }
      startDate
      endDate
    }
  }
`;

// Clients
export const GET_CLIENTS = gql`
  query GetClients {
    clients {
      id
      name
      phone
      email
    }
  }
`;

// Invoices
export const GET_INVOICES = gql`
  query GetInvoices {
    invoices {
      id
      invoiceId
      status
      totalAmount
      dueDate
      issueDate
      clientInfo {
        name
        phone
        email
      }
    }
  }
`;

// Products
export const GET_PRODUCTS = gql`
  query GetProducts {
    products { id name productId description type price }
  }
`;

// Quotations
export const GET_QUOTATIONS = gql`
  query GetQuotations {
    quotations {
      id
      quotationId
      status
      totalAmount
      clientInfo {
        name
        phone # Added phone
        email # Added email
      }
      createdAt
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
