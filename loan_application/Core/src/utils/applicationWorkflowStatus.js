const EMPTY_WORKFLOW_STATUS = Object.freeze({
  workflowStatusCode: null,
  workflowStatusName: null,
  legacyStatus: null,
  departmentName: null,
  pendingWithRole: null,
  statusUpdatedAt: null,
  lastTransitionAt: null,
  operationsStatus: null,
  assignedStaffId: null,
  assignedEmployeeCode: null,
  assignedEmployeeName: null,
  reason: null,
  hasDetailedWorkflowStatus: false,
});

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasValue(value) {
  return value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');
}

function firstValue(sources, keys) {
  for (const source of sources) {
    if (!isObject(source)) continue;
    for (const key of keys) {
      if (hasValue(source[key])) return source[key];
    }
  }
  return null;
}

function normalizeText(value) {
  if (!hasValue(value)) return null;
  return typeof value === 'string' ? value.trim() : String(value);
}

function getNestedObjects(record) {
  if (!isObject(record)) return [];

  const applicationStatus = isObject(record.applicationStatus)
    ? record.applicationStatus
    : isObject(record.ApplicationStatus)
      ? record.ApplicationStatus
      : null;

  const nestedWorkflow = [
    record.workflow,
    record.Workflow,
    applicationStatus?.workflow,
    applicationStatus?.Workflow,
  ].filter(isObject);

  const wrappedRecords = [record.value, record.Value, record.data, record.Data, record.result, record.Result]
    .filter(isObject);

  return {
    workflowSources: nestedWorkflow,
    applicationStatus,
    wrappedRecords,
  };
}

/**
 * Extracts backend-controlled workflow information without creating a frontend
 * status machine or inferring detailed states from legacy numeric values.
 */
export function extractWorkflowStatus(record) {
  if (!isObject(record)) return { ...EMPTY_WORKFLOW_STATUS };

  const { workflowSources, applicationStatus, wrappedRecords } = getNestedObjects(record);
  const sources = [
    ...workflowSources,
    applicationStatus,
    record,
    ...wrappedRecords,
  ];

  const workflowStatusCode = normalizeText(firstValue(sources, [
    'workflowStatusCode',
    'WorkflowStatusCode',
  ]));
  const workflowStatusName = normalizeText(firstValue(sources, [
    'workflowStatusName',
    'WorkflowStatusName',
  ]));

  return {
    workflowStatusCode,
    workflowStatusName,
    legacyStatus: firstValue(sources, [
      'legacyStatus',
      'LegacyStatus',
      'status',
      'Status',
    ]),
    departmentName: normalizeText(firstValue(sources, ['departmentName', 'DepartmentName'])),
    pendingWithRole: normalizeText(firstValue(sources, ['pendingWithRole', 'PendingWithRole'])),
    statusUpdatedAt: firstValue(sources, ['statusUpdatedAt', 'StatusUpdatedAt']),
    lastTransitionAt: firstValue(sources, ['lastTransitionAt', 'LastTransitionAt']),
    operationsStatus: normalizeText(firstValue(sources, ['operationsStatus', 'OperationsStatus'])),
    assignedStaffId: firstValue(sources, ['assignedStaffId', 'AssignedStaffId']),
    assignedEmployeeCode: normalizeText(firstValue(sources, ['assignedEmployeeCode', 'AssignedEmployeeCode'])),
    assignedEmployeeName: normalizeText(firstValue(sources, ['assignedEmployeeName', 'AssignedEmployeeName'])),
    reason: normalizeText(firstValue(sources, ['reason', 'Reason'])),
    hasDetailedWorkflowStatus: Boolean(workflowStatusCode || workflowStatusName),
  };
}

// Compatibility-friendly alias for callers that prefer a normalization name.
export const normalizeWorkflowStatus = extractWorkflowStatus;

export function emptyWorkflowStatus() {
  return { ...EMPTY_WORKFLOW_STATUS };
}
