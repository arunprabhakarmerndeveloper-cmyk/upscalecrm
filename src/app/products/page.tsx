"use client";

import { useQuery, useMutation, gql } from '@apollo/client';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

const GET_PRODUCTS = gql`
  query GetProducts {
    products { id name type price }
  }
`;

const DELETE_PRODUCT = gql`
    mutation DeleteProduct($id: ID!) {
        deleteProduct(id: $id) { id }
    }
`;

export default function ProductsListPage() {
  const { loading: authLoading } = useAuth();
  const { loading: dataLoading, error, data, refetch } = useQuery(GET_PRODUCTS);
  
  const [deleteProduct] = useMutation(DELETE_PRODUCT, {
      onCompleted: () => {
          alert('Product deleted successfully.');
          refetch();
      },
      onError: (err) => alert(`Error deleting product: ${err.message}`),
      refetchQueries: ['GetProducts', 'GetDashboardData']
  });

  const handleDelete = (id: string, name: string) => {
      if(window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
          deleteProduct({ variables: { id } });
      }
  };

  if (authLoading || dataLoading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading products...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center' }}>Error: {error.message}</div>;

  return (
    <div style={{ maxWidth: '1024px', margin: 'auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Products & Services</h1>
        <Link href="/products/new" style={buttonStyle}>
          + Add New
        </Link>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={tableHeaderStyle}>Name</th>
                <th style={tableHeaderStyle}>Type</th>
                <th style={{...tableHeaderStyle, textAlign: 'right' }}>Price (AED)</th>
                <th style={{...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.products.length > 0 ? (
                data.products.map((p: any, index: number) => (
                  <tr key={p.id} style={{ borderTop: index > 0 ? '1px solid #e5e7eb' : 'none' }}>
                    <td style={tableCellStyle}>{p.name}</td>
                    <td style={{...tableCellStyle, textTransform: 'capitalize'}}>{p.type}</td>
                    <td style={{...tableCellStyle, textAlign: 'right', fontWeight: '500' }}>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(p.price)}</td>
                    <td style={{...tableCellStyle, textAlign: 'center'}}>
                      <div style={{display: 'flex', justifyContent: 'center', gap: '0.5rem'}}>
                        <Link href={`/products/edit/${p.id}`} style={actionButtonStyle}>Edit</Link>
                        <button onClick={() => handleDelete(p.id, p.name)} style={{...actionButtonStyle, color: '#ef4444', border: '1px solid #fecaca'}}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No products or services found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Styles ---
const buttonStyle: React.CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '0.375rem', textDecoration: 'none', border: 'none', cursor: 'pointer' };
const actionButtonStyle: React.CSSProperties = { backgroundColor: '#fff', color: '#374151', fontWeight: '500', padding: '0.4rem 0.8rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', cursor: 'pointer', textDecoration: 'none', fontSize: '0.875rem' };
const tableHeaderStyle: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1.5rem', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tableCellStyle: React.CSSProperties = { padding: '1rem 1.5rem', color: '#374151', verticalAlign: 'middle', whiteSpace: 'nowrap' };

