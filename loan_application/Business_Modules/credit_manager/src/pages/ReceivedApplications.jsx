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

const columns = [
  applicationNoColumn,
  customerColumn,
  productColumn,
  amountColumn,
  rmAgentColumn,
  statusColumn,
  actionColumn,
];

export default function ReceivedApplications() {
  const { applications, loading, error, refetch } = useCreditApplications();

  return (
    <ApplicationQueue
      applications={applications}
      columns={columns}
      title="Applications Received from Back Office"
      showStatusFilter
      loading={loading}
      error={error}
      onRetry={refetch}
      emptyMessage="No applications have been sent to the Credit Manager yet."
    />
  );
}
