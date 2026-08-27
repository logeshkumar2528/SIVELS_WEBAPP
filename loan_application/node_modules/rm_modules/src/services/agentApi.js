const API_BASE_URL = 'http://localhost:5118/api';

export const agentApi = {
  createAgent: async (agentData) => {
    const response = await fetch(`${API_BASE_URL}/AgentMaster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentData),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw error;
    }
    return response.json();
  },

  uploadAadhaar: async (agentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/AgentMaster/${agentId}/upload-aadhaar`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw error;
    }
    return response.json();
  },

  uploadProfileImage: async (agentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/AgentMaster/${agentId}/upload-profile-image`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw error;
    }
    return response.json();
  },

  getAgents: async () => {
    const response = await fetch(`${API_BASE_URL}/AgentMaster`);
    if (!response.ok) {
      throw new Error('Failed to fetch agents');
    }
    return response.json();
  },

  getAgentById: async (agentId) => {
    const response = await fetch(`${API_BASE_URL}/AgentMaster/${agentId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch agent details');
    }
    return response.json();
  },

  updateAgent: async (agentId, agentData) => {
    const response = await fetch(`${API_BASE_URL}/AgentMaster/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentData),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw error;
    }
    // PUT usually returns 200 or 204
    return response.text().then(text => text ? JSON.parse(text) : {});
  },

  deleteAgent: async (agentId) => {
    const response = await fetch(`${API_BASE_URL}/AgentMaster/${agentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete agent');
    }
    return response.text().then(text => text ? JSON.parse(text) : {});
  },
};
