import React from 'react';
import ApplicationQueue from '../components/ApplicationQueue';
import {
  applicationNoColumn,
  customerColumn,
  productColumn,
  rmAgentColumn,
  escalationColumn,
  actionColumn,
} from '../components/applicationColumns';
import { useCreditApplications } from '../context/CreditApplicationsContext';

const columns = [
  applicationNoColumn,
  customerColumn,
  productColumn,
  rmAgentColumn,
  escalationColumn,
  actionColumn,
];

export default function EscalatedApplications() {
  const { escalated, loading, error, refetch } = useCreditApplications();

  return (
    <ApplicationQueue
      applications={escalated}
      columns={columns}
      title="Applications Forwarded to You"
      dateField="statusUpdatedAt"
      loading={loading}
      error={error}
      onRetry={refetch}
      emptyMessage="No applications are forwarded to you."
    />
  );
}
