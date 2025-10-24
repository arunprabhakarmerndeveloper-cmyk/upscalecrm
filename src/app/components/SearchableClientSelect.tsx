// components/SearchableClientSelect.tsx
"use client";

import { useState, useEffect } from 'react';
import { useLazyQuery, gql } from '@apollo/client';

const SEARCH_CLIENTS = gql`
  query SearchClients($term: String!) {
    searchClients(term: $term) {
      id
      name
      phone
      email
      addresses {
        tag
        address
      }
    }
  }
`;

export interface ClientSearchResult {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  addresses?: {
      tag: string;
      address: string;
  }[];
}

interface SearchableClientSelectProps {
  onClientSelect: (client: ClientSearchResult) => void;
}

export const SearchableClientSelect = ({ onClientSelect }: SearchableClientSelectProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const [searchClients, { data }] = useLazyQuery(SEARCH_CLIENTS);

  useEffect(() => {
    if (searchTerm.length > 2) {
      searchClients({ variables: { term: searchTerm } });
    } else {
      setResults([]);
    }
  }, [searchTerm, searchClients]);

  useEffect(() => {
    if (data?.searchClients) {
      setResults(data.searchClients);
      setIsOpen(true);
    }
  }, [data]);

  const handleSelect = (client: ClientSearchResult) => {
    onClientSelect(client);
    setSearchTerm(`${client.name} (${client.phone || client.email || ''})`);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#4b5563" }}>Search Existing Client</label>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => searchTerm.length > 2 && setIsOpen(true)}
        placeholder="Search by name, email, or phone..."
        style={{ width: "100%", padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }}
      />
      {isOpen && results.length > 0 && (
        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem', listStyle: 'none', padding: 0, margin: '0.25rem 0', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
          {results.map(client => (
            <li key={client.id} onClick={() => handleSelect(client)} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
              <strong>{client.name}</strong>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{client.phone || client.email}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};