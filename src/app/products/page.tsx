"use client";

import { useQuery, useMutation, gql } from '@apollo/client';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useState, useMemo, ChangeEvent, CSSProperties } from 'react';
import { GET_PRODUCTS } from "@/graphql/queries";

// --- TypeScript Interfaces ---

interface ProductListItem {
  id: string;
  name: string;
  productId: string | null;
  description: string | null;
  type: 'product' | 'service';
  price: number;
}

interface GetProductsData {
  products: ProductListItem[];
}

// --- GraphQL Queries & Mutations ---

const DELETE_PRODUCT = gql`
    mutation DeleteProduct($id: ID!) {
        deleteProduct(id: $id) { id }
    }
`;

export default function ProductsListPage() {
  const { loading: authLoading } = useAuth();
  const { loading: dataLoading, error, data, refetch } = useQuery<GetProductsData>(GET_PRODUCTS);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);


  const [deleteProduct, { loading: deleteLoading }] = useMutation(DELETE_PRODUCT, {
      onCompleted: () => {
          setConfirmModalOpen(false);
          setSuccessModalOpen(true);
          refetch();
      },
      onError: (err) => alert(`Error deleting product: ${err.message}`),
      refetchQueries: ['GetProducts', 'GetDashboardData'] 
  });

  const handleDeleteClick = (id: string, name: string) => {
      setProductToDelete({ id, name });
      setConfirmModalOpen(true);
  };

  const confirmDelete = () => {
      if (productToDelete) {
          deleteProduct({ variables: { id: productToDelete.id } });
      }
  };

  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    if (!searchTerm) return data.products;

    const lowercasedTerm = searchTerm.toLowerCase();
    return data.products.filter(p => 
      p.name.toLowerCase().includes(lowercasedTerm) ||
      p.type.toLowerCase().includes(lowercasedTerm) ||
      (p.productId && p.productId.toLowerCase().includes(lowercasedTerm))
    );
  }, [data, searchTerm]);

  if (authLoading || dataLoading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading products...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center' }}>Error: {error.message}</div>;

  return (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(80vh)', // Adjust this value based on your main header/footer height
        maxWidth: '1400px',
        margin: 'auto',
    }}>
      {/* --- Modals --- */}
      {isConfirmModalOpen && productToDelete && (
        <ConfirmationModal
            title="Delete Product"
            message={`Are you sure you want to delete "${productToDelete.name}"? This action cannot be undone.`}
            onConfirm={confirmDelete}
            onCancel={() => setConfirmModalOpen(false)}
            loading={deleteLoading}
        />
      )}
      {isSuccessModalOpen && (
          <SuccessModal
              message="Product deleted successfully!"
              onClose={() => setSuccessModalOpen(false)}
          />
      )}

      {/* --- Non-scrolling Header Section --- */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Products & Services</h1>
          <Link href="/products/new" style={buttonStyle}>
            + Add New
          </Link>
        </div>
        <div style={{ margin: '1rem 0', maxWidth: '400px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input 
              type="text"
              placeholder="Search by name, type, or Product ID..."
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  fontSize: '1rem',
                  outline: 'none',
                  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
              }}
          />
        </div>
      </div>

      {/* --- Scrollable Table Container --- */}
      <div style={{ flexGrow: 1, overflow: 'hidden', backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <div style={{ height: '100%', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#2563eb' }}>
                  <tr>
                    <th style={tableHeaderStyle}>Name</th>
                    <th style={tableHeaderStyle}>Product ID</th>
                    <th style={tableHeaderStyle}>Type</th>
                    <th style={{...tableHeaderStyle, textAlign: 'right' }}>Price (AED)</th>
                    <th style={{...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
                  </tr>
              </thead>
              <tbody>
                  {filteredProducts.length > 0 ? (
                      filteredProducts.map((p) => (
                          <tr key={p.id} style={tableRowStyle}>
                              <td style={tableCellStyle}>
                                <div>
                                    <p style={{ fontWeight: '600' }}>{p.name}</p>
                                    {p.description && <p style={{ fontSize: '0.875rem', color: '#6b7280', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.description}</p>}
                                </div>
                              </td>
                              <td style={tableCellStyle}>{p.productId || 'N/A'}</td>
                              <td style={{...tableCellStyle, textTransform: 'capitalize'}}>{p.type}</td>
                              <td style={{...tableCellStyle, textAlign: 'right', fontWeight: '500' }}>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(p.price)}</td>
                              <td style={{...tableCellStyle, textAlign: 'center'}}>
                                <div style={{display: 'flex', justifyContent: 'center', gap: '0.5rem'}}>
                                  <Link href={`/products/edit/${p.id}`} style={actionButtonStyle}>Edit</Link>
                                  <button onClick={() => handleDeleteClick(p.id, p.name)} style={{...actionButtonStyle, color: '#ef4444', border: '1px solid #fecaca'}}>Delete</button>
                                </div>
                              </td>
                          </tr>
                      ))
                  ) : (
                      <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                              No products found matching your search.
                          </td>
                      </tr>
                  )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

// --- NEW Modal Components ---

const SuccessModal = ({ message, onClose }: { message: string, onClose: () => void }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ margin: '0 auto 1rem auto', width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#d1fae5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg style={{ width: '24px', height: '24px', color: '#065f46' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Success</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{message}</p>
            <button onClick={onClose} style={{...buttonStyle, backgroundColor: '#10b981', color: 'white', width: '100%' }}>OK</button>
        </div>
    </div>
);

const ConfirmationModal = ({ title, message, onConfirm, onCancel, loading }: { title: string, message: string, onConfirm: () => void, onCancel: () => void, loading: boolean }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>{title}</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button onClick={onCancel} disabled={loading} style={{...buttonStyle, backgroundColor: '#e5e7eb', color: '#374151'}}>Cancel</button>
                <button onClick={onConfirm} disabled={loading} style={{...buttonStyle, backgroundColor: '#ef4444', color: 'white', opacity: loading ? 0.6 : 1 }}>
                    {loading ? 'Deleting...' : 'Confirm Delete'}
                </button>
            </div>
        </div>
    </div>
);

// --- Styles ---
const buttonStyle: CSSProperties = { backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '0.375rem', textDecoration: 'none', border: 'none', cursor: 'pointer' };
const actionButtonStyle: CSSProperties = { backgroundColor: '#fff', color: '#374151', fontWeight: '500', padding: '0.4rem 0.8rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', cursor: 'pointer', textDecoration: 'none', fontSize: '0.875rem' };
const tableHeaderStyle: CSSProperties = { textAlign: 'left', padding: '1rem 1.5rem', color: '#ffffff', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' };
const tableCellStyle: CSSProperties = { padding: '1rem 1.5rem', color: '#374151', verticalAlign: 'top' };
const tableRowStyle: CSSProperties = { borderTop: '1px solid #f3f4f6' };

