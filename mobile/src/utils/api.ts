import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/config';

const TOKEN_KEY = 'zihai_auth_token';

export async function setAuthToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let url = `${API_URL}${path}`;
  if (options.params) {
    const queryParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      queryParams.append(key, String(val));
    });
    url += `?${queryParams.toString()}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Clear token on auth failure
      await setAuthToken(null);
    }
    const errText = await response.text();
    let errJSON;
    try {
      errJSON = JSON.parse(errText);
    } catch {
      errJSON = { error: errText || 'Network request failed' };
    }
    throw new Error(errJSON.error || errJSON.message || 'API request failed');
  }

  // Check if response is empty
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

export const api = {
  get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    return request<T>(path, { method: 'GET', params });
  },

  post<T>(path: string, body?: any): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: any): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: any): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};
