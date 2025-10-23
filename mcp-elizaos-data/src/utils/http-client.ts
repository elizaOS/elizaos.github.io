import axios, { AxiosResponse } from "axios";

export const BASE_URL = "https://elizaos.github.io/data";

export const httpClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "User-Agent": "mcp-elizaos-data/1.0.0",
  },
});

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function fetchData<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const response: AxiosResponse<T> = await httpClient.get(endpoint);
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error(`Error fetching ${endpoint}:`, error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || "Unknown error",
    };
  }
}

export async function checkEndpointExists(endpoint: string): Promise<boolean> {
  try {
    await httpClient.head(endpoint);
    return true;
  } catch {
    return false;
  }
}