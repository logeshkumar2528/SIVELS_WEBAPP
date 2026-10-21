import { apiFetch } from '../../../../Core/src/api/apiFetch';
import { API_BASE_URL } from '../../../../Core/src/api/apiConfig';
const API_BASE = API_BASE_URL;

function unwrap(data) {
  if (Array.isArray(data)) return data[0] || null;
  if (Array.isArray(data?.value)) return data.value[0] || null;
  if (Array.isArray(data?.items)) return data.items[0] || null;
  if (Array.isArray(data?.data)) return data.data[0] || null;
  return data || null;
}

function getApplicationId(record) {
  return record?.applicationId || record?.applicationNumber || record?.agentCustomerId || record?.customerId || '';
}

export async function loadApplicationHeader(applicationId) {
  const response = await apiFetch(`${API_BASE}/AgentAddCustomer/${encodeURIComponent(applicationId)}`);
  if (!response.ok) throw new Error(`Failed to load application (${response.status})`);

  const customer = unwrap(await response.json());
  if (!customer) throw new Error('Application was not found');

  let agent = null;
  const agentId = customer.agentId || customer.AgentId;
  if (agentId) {
    const agentResponse = await apiFetch(`${API_BASE}/AgentMaster/${encodeURIComponent(agentId)}`);
    if (agentResponse.ok) agent = unwrap(await agentResponse.json());
  }

  return {
    applicationId: String(getApplicationId(customer) || applicationId),
    agentCustomerId: customer.agentCustomerId || customer.AgentCustomerId || customer.customerId || applicationId,
    agentId: agentId || '',
    customerName: customer.fullName || customer.FullName || customer.customerName || '',
    mobile: customer.mobileNumber || customer.MobileNumber || customer.mobile || '',
    email: customer.email || customer.Email || customer.emailAddress || '',
    agentName: customer.agentName || customer.AgentName || '',
    branch: agent?.branch || agent?.Branch || customer.branch || customer.Branch || '',
    createdDate: customer.createdAt || customer.CreatedAt || customer.createdDate || customer.CreatedDate || '',
    applicationNumber: customer.applicationNumber || customer.ApplicationNumber || '',
    loanType: customer.loanProductName || customer.loanPurposeName || customer.LoanPurposeName || customer.loanType || '',
  };
}

export async function findFirstApplication() {
  const response = await apiFetch(`${API_BASE}/AgentAddCustomer`);
  if (!response.ok) throw new Error(`Failed to load applications (${response.status})`);
  const data = await response.json();
  const records = Array.isArray(data) ? data : (data?.value || data?.items || data?.data || []);
  const record = records[0];
  const id = getApplicationId(record);
  if (!id) throw new Error('No applications are available for field verification');
  return String(id);
}
