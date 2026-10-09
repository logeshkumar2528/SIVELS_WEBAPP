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
import { formatDate } from '../utils/formatters';

const columns = [
  applicationNoColumn,
  customerColumn,
  productColumn,
  amountColumn,
  rmAgentColumn,
  { key: 'rejectedDate', header: 'Rejected Date', render: (app) => formatDate(app.statusUpdatedAt) },
  { key: 'reason', header: 'Rejection Reason', render: (app) => app.remarks || '—' },
  actionColumn,
];

export default function RejectedApplications() {
  const { rejected, loading, error, refetch } = useCreditApplications();

  return (
    <ApplicationQueue
      applications={rejected}
      columns={columns}
      title="Rejected Applications"
      dateField="statusUpdatedAt"
      loading={loading}
      error={error}
      onRetry={refetch}
      emptyMessage="No applications have been rejected."
    />
  );
}
