import apiClient from '../../shared/api/apiClient';
import type { 
  AdminUserView, 
  AdminCreateUserInput, 
  AdminUpdateProfileInput, 
  AdminClientView, 
  AdminClientWithSecret, 
  AdminCreateClientInput, 
  AdminUpdateClientInput,
  AdminAuditLog,
  AdminSessionView,
  HealthResponse,
  JwksResponse
} from './admin.types';

/**
 * Admin API Adapter
 * 
 * Centralizes all administrative control endpoints.
 * Note: These endpoints require administrative authorization.
 * The server authorizes persisted roles from the session cookie.
 */

const getAdminHeaders = (adminSub?: string) => {
  void adminSub; // Actor identity comes from the server-side session.
  return {};
};

export const adminApi = {
  // --- Platform / Observability ---
  getHealth: async () => {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  },
  
  getReadiness: async () => {
    const response = await apiClient.get<HealthResponse>('/ready');
    return response.data;
  },

  getMetrics: async () => {
    // Returns Prometheus text format
    const response = await apiClient.get('/metrics');
    return response.data;
  },

  // --- User Management ---
  listUsers: async (adminSub?: string) => {
    const response = await apiClient.get<{ data: AdminUserView[] }>('/api/v1/admin/users', {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  getUser: async (sub: string, adminSub?: string) => {
    const response = await apiClient.get<{ data: AdminUserView }>(`/api/v1/admin/users/${sub}`, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  createUser: async (input: AdminCreateUserInput, adminSub?: string) => {
    const response = await apiClient.post<{ data: AdminUserView }>('/api/v1/admin/users', input, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  updateUserProfile: async (sub: string, input: AdminUpdateProfileInput, adminSub?: string) => {
    const response = await apiClient.patch<{ data: AdminUserView }>(`/api/v1/admin/users/${sub}/profile`, input, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  disableUser: async (sub: string, adminSub?: string) => {
    const response = await apiClient.post<{ data: AdminUserView }>(`/api/v1/admin/users/${sub}/disable`, {}, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  enableUser: async (sub: string, adminSub?: string) => {
    const response = await apiClient.post<{ data: AdminUserView }>(`/api/v1/admin/users/${sub}/enable`, {}, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  markEmailVerified: async (sub: string, adminSub?: string) => {
    const response = await apiClient.post<{ data: AdminUserView }>(`/api/v1/admin/users/${sub}/email-verification/mark-verified`, {}, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  // --- Client Management ---
  listClients: async (adminSub?: string) => {
    const response = await apiClient.get<{ data: AdminClientView[] }>('/api/v1/admin/clients', {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  getClient: async (clientId: string, adminSub?: string) => {
    const response = await apiClient.get<{ data: AdminClientView }>(`/api/v1/admin/clients/${clientId}`, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  createClient: async (input: AdminCreateClientInput, adminSub?: string) => {
    const payload = {
      ...input,
      allowedScopes: input.allowedScopes || ['openid', 'profile', 'email'],
      grantTypes: input.grantTypes || ['authorization_code', 'refresh_token'],
      responseTypes: input.responseTypes || ['code'],
    };
    const response = await apiClient.post<{ data: AdminClientWithSecret }>('/api/v1/admin/clients', payload, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  updateClient: async (clientId: string, input: AdminUpdateClientInput, adminSub?: string) => {
    const response = await apiClient.patch<{ data: AdminClientView }>(`/api/v1/admin/clients/${clientId}`, input, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  disableClient: async (clientId: string, adminSub?: string) => {
    const response = await apiClient.post<{ data: AdminClientView }>(`/api/v1/admin/clients/${clientId}/disable`, {}, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  enableClient: async (clientId: string, adminSub?: string) => {
    const response = await apiClient.patch<{ data: AdminClientView }>(`/api/v1/admin/clients/${clientId}`, { status: 'active' }, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  rotateClientSecret: async (clientId: string, adminSub?: string) => {
    const response = await apiClient.post<{ data: AdminClientWithSecret }>(`/api/v1/admin/clients/${clientId}/rotate-secret`, {}, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  // --- JWKS / Key Rotation ---
  getJwks: async () => {
    const response = await apiClient.get<JwksResponse>('/jwks');
    return response.data;
  },

  // --- Audit Logs ---
  listAuditLogs: async (adminSub?: string) => {
    const response = await apiClient.get<{ data: AdminAuditLog[] }>('/api/v1/admin/audit-logs', {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  // --- Sessions / Token Controls ---
  listSessions: async (adminSub?: string) => {
    const response = await apiClient.get<{ data: AdminSessionView[] }>('/api/v1/admin/sessions', {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  },

  // --- Maintenance ---
  purgeUnverifiedUsers: async (adminSub?: string) => {
    const response = await apiClient.post<{ data: { deletedCount: number } }>('/api/v1/admin/maintenance/purge-unverified-users', {}, {
      headers: getAdminHeaders(adminSub),
    });
    return response.data.data;
  }
};
