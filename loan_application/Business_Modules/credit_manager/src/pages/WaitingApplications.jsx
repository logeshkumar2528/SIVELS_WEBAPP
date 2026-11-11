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

export default function WaitingApplications() {
  const { waiting, loading, error, refetch } = useCreditApplications();

  return (
    <ApplicationQueue
      applications={waiting}
      columns={columns}
      title="Escalated Approvals Waiting for Another Role"
      dateField="statusUpdatedAt"
      loading={loading}
      error={error}
      onRetry={refetch}
      emptyMessage="No escalated approvals are waiting for another role."
    />
  );
}
