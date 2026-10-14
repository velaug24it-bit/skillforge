import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface HealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
  uptime: number;
  environment: string;
  database: {
    status: string;
    connected: boolean;
    isMemoryServer: boolean;
  };
  codeExecutionService: {
    provider: string;
    configured: boolean;
    status: string;
    endpoint: string | null;
  };
  campusTimezone: string;
}

export const checkHealth = async (): Promise<HealthResponse> => {
  const response = await api.get<HealthResponse>('/health');
  return response.data;
};

export default api;
