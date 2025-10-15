"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter, useParams } from 'next/navigation';

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

  const [formData, setFormData] = useState({ startDate: '', endDate: '', contractAmount: 0, frequencyPerYear: 4 });

  const { loading: queryLoading } = useQuery(GET_AMC_FOR_EDIT, {
    variables: { id },
    skip: !id,
    onCompleted: (data) => {
      if (data.amc) {
        const { amc } = data;
        setFormData({
            startDate: new Date(amc.startDate).toISOString().split('T')[0],
            endDate: new Date(amc.endDate).toISOString().split('T')[0],
            contractAmount: amc.contractAmount,
            frequencyPerYear: amc.frequencyPerYear,
        });
      }
    }
  });

  const [updateAMC, { loading: mutationLoading }] = useMutation(UPDATE_AMC, {
    onCompleted: () => router.push(`/amcs/${id}`),
  });

  const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAMC({ variables: { id, input: { ...formData, contractAmount: parseFloat(formData.contractAmount.toString()), frequencyPerYear: parseInt(formData.frequencyPerYear.toString()) } } });
  };

  if (queryLoading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto' }}>
      <h1>Edit AMC</h1>
      <form onSubmit={handleSubmit}>
        <InputField label="Start Date" name="startDate" type="date" value={formData.startDate} onChange={handleChange} />
        <InputField label="End Date" name="endDate" type="date" value={formData.endDate} onChange={handleChange} />
        <InputField label="Contract Amount" name="contractAmount" type="number" value={formData.contractAmount} onChange={handleChange} />
        <InputField label="Frequency" name="frequencyPerYear" type="number" value={formData.frequencyPerYear} onChange={handleChange} />
        <button type="submit" disabled={mutationLoading}>{mutationLoading ? 'Saving...' : 'Save Changes'}</button>
      </form>
    </div>
  );
}

// --- Helper Components ---
const InputField = ({ label, ...props }: any) => (<div><label>{label}</label><input {...props} /></div>);
