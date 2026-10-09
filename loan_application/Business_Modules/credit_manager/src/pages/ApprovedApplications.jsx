import React from 'react';
import ApplicationQueue from '../components/ApplicationQueue';
import {
  applicationNoColumn,
  customerColumn,
  productColumn,
  amountColumn,
  rmAgentColumn,
  statusColumn,
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
  { key: 'approvedDate', header: 'Approved Date', render: (app) => formatDate(app.statusUpdatedAt) },
  statusColumn,
  actionColumn,
];

export default function ApprovedApplications() {
  const { approved, loading, error, refetch } = useCreditApplications();

  return (
    <ApplicationQueue
      applications={approved}
      columns={columns}
      title="Approved Applications"
      dateField="statusUpdatedAt"
      loading={loading}
      error={error}
      onRetry={refetch}
      emptyMessage="No applications have been approved yet."
    />
  );
}
