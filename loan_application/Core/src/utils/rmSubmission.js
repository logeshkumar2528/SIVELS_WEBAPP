import { extractWorkflowStatus } from './applicationWorkflowStatus';

export const RM_VERIFICATION_PENDING = 'RM_VERIFICATION_PENDING';

/**
 * Performs the explicit customer-to-RM submission and confirms the persisted
 * workflow state. The PUT response is intentionally not treated as the source
 * of truth because the supported backend contract returns 204 No Content.
 */
export async function submitCustomerToRm({ customerService, customerId }) {
  if (!customerService || !customerId) {
    throw new Error('A customer service and customer ID are required for RM submission.');
  }

  await customerService.updateCustomer(customerId, { status: 1 });

  let confirmedRecord;
  try {
    confirmedRecord = await customerService.getCustomerById(customerId);
  } catch (error) {
    const confirmationError = new Error(
      'RM submission completed, but the persisted workflow could not be confirmed. Please refresh and recheck before retrying.'
    );
    confirmationError.cause = error;
    confirmationError.code = 'RM_SUBMISSION_CONFIRMATION_UNAVAILABLE';
    throw confirmationError;
  }

  const confirmedStatus = extractWorkflowStatus(confirmedRecord);
  const isConfirmed =
    confirmedStatus.workflowStatusCode === RM_VERIFICATION_PENDING &&
    Number(confirmedStatus.legacyStatus) === 1;

  if (!isConfirmed) {
    const confirmationError = new Error(
      'The server did not confirm the RM Verification Pending status. Please refresh and retry from the customer submission flow.'
    );
    confirmationError.code = 'RM_SUBMISSION_NOT_CONFIRMED';
    confirmationError.status = confirmedStatus;
    throw confirmationError;
  }

  return confirmedStatus;
}
