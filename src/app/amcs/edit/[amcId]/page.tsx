"use client";

import { useState } from 'react'; // Removed unused 'useEffect'
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter, useParams } from 'next/navigation';

// --- TypeScript Interfaces ---

// Describes the structure of our form's state
interface AmcFormData {
  startDate: string;
  endDate: string;
  contractAmount: number | string; // Can be string during user input
  frequencyPerYear: number | string; // Can be string during user input
}

// Describes the data structure returned by the GET_AMC_FOR_EDIT query
interface AmcForEdit {
  id: string;
  startDate: string | number;
  endDate: string | number;
  contractAmount: number;
  frequencyPerYear: number;
}

interface GetAmcForEditData {
  amc: AmcForEdit;
}

// --- GraphQL Queries ---

const GET_AMC_FOR_EDIT = gql`
  query GetAmcForEdit($id: ID!) {
    amc(id: $id) {
      id
      startDate
      endDate
      contractAmount
      frequencyPerYear
    }
  }
`;

const UPDATE_AMC = gql`
  mutation UpdateAMC($id: ID!, $input: UpdateAMCInput!) {
    updateAMC(id: $id, input: $input) {
      id
    }
  }
`;

export default function EditAmcPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.amcId as string;

  // Apply the AmcFormData interface to the component's state
  const [formData, setFormData] = useState<AmcFormData>({
    startDate: '',
    endDate: '',
    contractAmount: 0,
    frequencyPerYear: 4,
  });

  // Apply the GetAmcForEditData interface to useQuery
  const { loading: queryLoading } = useQuery<GetAmcForEditData>(GET_AMC_FOR_EDIT, {
    variables: { id },
    skip: !id,
    onCompleted: (data) => {
      if (data?.amc) {
        const { amc } = data;
        setFormData({
            // Convert timestamp (string or number) to YYYY-MM-DD for the date input
            startDate: new Date(Number(amc.startDate)).toISOString().split('T')[0],
            endDate: new Date(Number(amc.endDate)).toISOString().split('T')[0],
            contractAmount: amc.contractAmount,
            frequencyPerYear: amc.frequencyPerYear,
        });
      }
    }
  });

  const [updateAMC, { loading: mutationLoading }] = useMutation(UPDATE_AMC, {
    onCompleted: () => router.push(`/amcs/${id}`),
    onError: (error) => alert(`Failed to update AMC: ${error.message}`) // Good practice to add error handling
  });

  // Type the event 'e' for input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputForMutation = {
      ...formData,
      // Ensure numeric fields are sent as numbers, not strings
      contractAmount: parseFloat(String(formData.contractAmount)),
      frequencyPerYear: parseInt(String(formData.frequencyPerYear), 10),
    };
    updateAMC({ variables: { id, input: inputForMutation } });
  };

  if (queryLoading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading AMC data...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '1rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Edit AMC</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <InputField 
          label="Start Date" 
          name="startDate" 
          type="date" 
          value={formData.startDate} 
          onChange={handleChange} 
          required
        />
        <InputField 
          label="End Date" 
          name="endDate" 
          type="date" 
          value={formData.endDate} 
          onChange={handleChange} 
          required
        />
        <InputField 
          label="Contract Amount (AED)" 
          name="contractAmount" 
          type="number" 
          value={formData.contractAmount} 
          onChange={handleChange} 
          required
        />
        <InputField 
          label="Service Frequency (per year)" 
          name="frequencyPerYear" 
          type="number" 
          value={formData.frequencyPerYear} 
          onChange={handleChange} 
          required
        />
        <button 
          type="submit" 
          disabled={mutationLoading}
          style={{ padding: '0.75rem', border: 'none', borderRadius: '0.375rem', backgroundColor: '#2563eb', color: 'white', cursor: 'pointer', opacity: mutationLoading ? 0.6 : 1 }}
        >
          {mutationLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

// --- Typed Helper Component ---

// Define props for the InputField component, extending standard input attributes
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const InputField = ({ label, ...props }: InputFieldProps) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <label style={{ marginBottom: '0.5rem', fontWeight: '500' }}>{label}</label>
    <input 
      {...props} 
      style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} 
    />
  </div>
);