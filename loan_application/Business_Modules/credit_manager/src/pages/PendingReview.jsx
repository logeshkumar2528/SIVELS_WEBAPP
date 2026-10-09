import React from 'react';
import ApplicationQueue from '../components/ApplicationQueue';
import {
  applicationNoColumn,
  customerColumn,
  productColumn,
  amountColumn,
  rmAgentColumn,
  actionColumn,
} from '../components/applicationColumns';
import { useCreditApplications } from '../context/CreditApplicationsContext';
import { daysSince, formatDate } from '../utils/formatters';

function formatDays(value) {
  const days = daysSince(value);
  if (days == null) return '—';
  return `${days} ${days === 1 ? 'Day' : 'Days'}`;
}

const columns = [
  applicationNoColumn,
  customerColumn,
  productColumn,
  amountColumn,
  rmAgentColumn,
  { key: 'receivedDate', header: 'Received Date', render: (app) => formatDate(app.statusUpdatedAt) },
  {
    key: 'daysPending',
    header: 'Days in Pending',
    render: (app) => <span className="cm-days-pill">{formatDays(app.statusUpdatedAt)}</span>,
  },
  actionColumn,
];

export default function PendingReview() {
  const { pending, loading, error, refetch } = useCreditApplications();

  return (
    <ApplicationQueue
      applications={pending}
      columns={columns}
      title="Credit Review Queue"
      dateField="statusUpdatedAt"
      loading={loading}
      error={error}
      onRetry={refetch}
      emptyMessage="No applications are pending review."
    />
  );
}
