"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useLazyQuery, gql } from '@apollo/client';

const SEARCH_PRODUCTS = gql`
  query SearchProducts($term: String!) {
    searchProducts(term: $term) {
      id
      name
      description
      price
    }
  }
`;

export interface ProductSearchResult {
  id: string;
  name: string;
  description?: string;
  price: number;
}

// The props interface MUST include 'value'
export interface SearchableProductSelectProps {
  value?: string; // Changed to optional to support create/edit
  onProductSelect: (product: ProductSearchResult) => void;
}

export const SearchableProductSelect = ({ value = '', onProductSelect }: SearchableProductSelectProps) => {
  const [term, setSearchTerm] = useState(value);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [search, { data, loading }] = useLazyQuery(SEARCH_PRODUCTS);

  // This hook syncs the internal state when the 'value' prop from the parent changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    if (newSearchTerm.length > 1) {
      search({ variables: { term: newSearchTerm } });
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
    }
  };

  const handleSelect = (product: ProductSearchResult) => {
    onProductSelect(product);
    setSearchTerm(product.name);
    setDropdownOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={term}
        onChange={handleInputChange}
        placeholder="Search for a product..."
        style={{ width: '100%', padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
      />
      {isDropdownOpen && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          backgroundColor: 'white', border: '1px solid #e5e7eb',
          borderRadius: '0.5rem', marginTop: '0.25rem', zIndex: 10,
          maxHeight: '200px', overflowY: 'auto', listStyle: 'none', padding: 0
        }}>
          {loading && <li style={{ padding: '0.5rem 1rem', color: '#6b7280' }}>Searching...</li>}
          {data?.searchProducts.map((product: ProductSearchResult) => (
            <li
              key={product.id}
              onClick={() => handleSelect(product)}
              style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
            >
              <div style={{ fontWeight: 600 }}>{product.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(product.price)}
              </div>
            </li>
          ))}
          {!loading && data?.searchProducts.length === 0 && (
            <li style={{ padding: '0.5rem 1rem', color: '#6b7280' }}>No products found.</li>
          )}
        </ul>
      )}
    </div>
  );
};