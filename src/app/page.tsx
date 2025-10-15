"use client";

import { useAuth } from "@/lib/AuthContext";
import { gql, useQuery } from "@apollo/client";
import Link from "next/link";
import { useEffect, useMemo, useState, ReactNode } from "react";

// --- TypeScript Interfaces ---

interface DashboardQuotation {
  id: string;
  quotationId: string;
  status: string;
  totalAmount: number;
  clientInfo: { name: string };
}

interface DashboardInvoice {
  id: string;
  status: string;
  dueDate: string | number;
  totalAmount: number;
  amountPaid: number;
  clientInfo: { name: string | null };
}

interface DashboardServiceVisit {
  scheduledDate: string | number;
  status: string;
}

interface DashboardAmc {
  id: string;
  serviceVisits: DashboardServiceVisit[];
}

// The main data interface for the entire query
interface GetDashboardData {
  clients: { id: string }[];
  quotations: DashboardQuotation[];
  invoices: DashboardInvoice[];
  amcs: DashboardAmc[];
}

// --- GraphQL Query ---

const GET_DASHBOARD_DATA = gql`
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

// A custom hook for responsive design (unchanged)
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      if (media.matches !== matches) setMatches(media.matches);
      const listener = () => setMatches(media.matches);
      window.addEventListener("resize", listener);
      return () => window.removeEventListener("resize", listener);
    }
  }, [matches, query]);
  return matches;
};

// --- Main Dashboard Component ---
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  // Apply the GetDashboardData interface for a fully typed `data` object
  const { loading: dataLoading, error, data, refetch } = useQuery<GetDashboardData>(GET_DASHBOARD_DATA, {
    skip: !user,
  });

  useEffect(() => {
    if (user) refetch();
  }, [user, refetch]);

  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const stats = useMemo(() => {
    if (!data) return null;

    const pendingQuotations = data.quotations.filter(q => q.status === 'Sent').length;
    
    const overdueInvoices = data.invoices.filter(inv => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const dueDate = new Date(Number(inv.dueDate));
        return inv.status !== 'Paid' && dueDate < today;
    }).length;
    
    const upcomingServices = data.amcs.reduce((count, amc) => {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        const upcoming = amc.serviceVisits.filter(visit => {
            const scheduledDate = new Date(Number(visit.scheduledDate));
            return visit.status === 'Scheduled' && scheduledDate >= today && scheduledDate <= thirtyDaysFromNow;
        }).length;
        return count + upcoming;
    }, 0);

    return {
      totalClients: data.clients.length,
      pendingQuotations,
      overdueInvoices,
      upcomingServices,
    };
  }, [data]);

  if (dataLoading && user) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading Dashboard Data...</div>;
  if (error) return <div style={{ textAlign: 'center', marginTop: '5rem', color: '#ef4444' }}>Error loading data: {error.message}</div>;

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1f2937' }}>
        Welcome back, {user?.name}!
      </h1>
      <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
        Here's a summary of your business activity.
      </p>

      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <StatCard title="Total Clients" value={stats?.totalClients} icon={<UsersIcon />} />
        <StatCard title="Pending Quotations" value={stats?.pendingQuotations} icon={<DocumentTextIcon />} />
        <StatCard title="Overdue Invoices" value={stats?.overdueInvoices} icon={<ExclamationIcon />} color="#ef4444" />
        <StatCard title="Upcoming Services" value={stats?.upcomingServices} icon={<CalendarIcon />} />
      </div>
      
      <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : 'repeat(1, 1fr)', gap: '2rem' }}>
          <RecentQuotations quotations={data?.quotations.slice(0, 5)} />
          <RecentInvoices invoices={data?.invoices} />
      </div>
    </div>
  );
}

// --- Typed Sub-components ---

interface StatCardProps {
  title: string;
  value: number | undefined | null;
  icon: ReactNode;
  color?: string;
}
const StatCard = ({ title, value, icon, color = '#3b82f6' }: StatCardProps) => (
  <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ backgroundColor: color, color: '#fff', borderRadius: '50%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    <div>
      <p style={{ color: '#6b7280', fontWeight: '500' }}>{title}</p>
      <p style={{ fontSize: '2.25rem', fontWeight: '700', color: '#111827' }}>{value ?? '0'}</p>
    </div>
  </div>
);

interface RecentQuotationsProps {
  quotations: DashboardQuotation[] | undefined;
}
const RecentQuotations = ({ quotations }: RecentQuotationsProps) => (
    <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Recent Quotations</h2>
            <Link href="/quotations" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none', fontSize: '0.875rem' }}>View All &rarr;</Link>
        </div>
        <div style={{ padding: '0 1.5rem' }}>
          {quotations && quotations.length > 0 ? quotations.map((q, index) => (
              <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderTop: index > 0 ? '1px solid #f3f4f6' : 'none' }}>
                  <div>
                      <p style={{ fontWeight: '500' }}>{q.clientInfo.name}</p>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{q.quotationId}</p>
                  </div>
                  <StatusBadge status={q.status} />
              </div>
          )) : <p style={{ padding: '1rem 0', color: '#6b7280' }}>No recent quotations found.</p>}
        </div>
    </div>
);

interface RecentInvoicesProps {
  invoices: DashboardInvoice[] | undefined;
}
const RecentInvoices = ({ invoices }: RecentInvoicesProps) => {
    const recentOverdue = useMemo(() => invoices?.filter(inv => {
        const today = new Date(); today.setHours(0,0,0,0);
        const dueDate = new Date(Number(inv.dueDate));
        return inv.status !== 'Paid' && dueDate < today;
    }).slice(0, 5), [invoices]);

    return (
        <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Recent Overdue Invoices</h2>
                <Link href="/invoices" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none', fontSize: '0.875rem' }}>View All &rarr;</Link>
            </div>
            <div style={{ padding: '0 1.5rem' }}>
              {recentOverdue && recentOverdue.length > 0 ? recentOverdue.map((inv, index) => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderTop: index > 0 ? '1px solid #f3f4f6' : 'none' }}>
                      <div>
                          <p style={{ fontWeight: '500' }}>{inv.clientInfo?.name || 'N/A'}</p>
                          <p style={{ fontSize: '0.875rem', color: '#ef4444' }}>Due: {new Date(Number(inv.dueDate)).toLocaleDateString()}</p>
                      </div>
                      <span style={{ fontWeight: '500' }}>{new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(inv.totalAmount - inv.amountPaid)}</span>
                  </div>
              )) : <p style={{ padding: '1rem 0', color: '#6b7280' }}>No overdue invoices found.</p>}
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const statusStyles: Record<string, React.CSSProperties> = { Draft: { background: '#f3f4f6', color: '#4b5563' }, Sent: { background: '#dbeafe', color: '#1d4ed8' }, Approved: { background: '#d1fae5', color: '#065f46' }, Rejected: { background: '#fee2e2', color: '#991b1b' } };
    const style = statusStyles[status] || statusStyles['Draft'];
    return ( <span style={{ ...style, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}>{status}</span> );
};

// --- SVG Icon Components (unchanged) ---
const UsersIcon = () => <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197" /></svg>;
const DocumentTextIcon = () => <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ExclamationIcon = () => <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const CalendarIcon = () => <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;