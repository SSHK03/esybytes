const API_BASE_URL = 'http://localhost:3000/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Create a fetch-based API object similar to axios
export const api = {
  defaults: {
    headers: {
      common: {} as Record<string, string>,
    },
  },
  
  get: async <T>(endpoint: string): Promise<{ data: T }> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...api.defaults.headers.common,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, errorData.error || 'Request failed');
    }

    const data = await response.json();
    return { data };
  },

  post: async <T>(endpoint: string, data?: any): Promise<{ data: T }> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...api.defaults.headers.common,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, errorData.error || 'Request failed');
    }

    const responseData = await response.json();
    return { data: responseData };
  },

  put: async <T>(endpoint: string, data?: any): Promise<{ data: T }> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...api.defaults.headers.common,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, errorData.error || 'Request failed');
    }

    const responseData = await response.json();
    return { data: responseData };
  },

  delete: async <T>(endpoint: string): Promise<{ data: T }> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...api.defaults.headers.common,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, errorData.error || 'Request failed');
    }

    const data = await response.json();
    return { data };
  },
};

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...api.defaults.headers.common,
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, errorData.error || 'Request failed');
  }

  return response.json();
}

// Customer API
export const customerApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    return apiRequest(`/customers?${searchParams.toString()}`);
  },

  getById: (id: string) => apiRequest(`/customers/${id}`),

  create: (data: any) => apiRequest('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => apiRequest(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => apiRequest(`/customers/${id}`, {
    method: 'DELETE',
  }),
};

// Item API
export const itemApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    return apiRequest(`/items?${searchParams.toString()}`);
  },

  getById: (id: string) => apiRequest(`/items/${id}`),

  create: (data: any) => apiRequest('/items', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => apiRequest(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => apiRequest(`/items/${id}`, {
    method: 'DELETE',
  }),

  importExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return fetch(`${API_BASE_URL}/import/items-excel`, {
      method: 'POST',
      body: formData,
    }).then(response => {
      if (!response.ok) {
        throw new Error('Import failed');
      }
      return response.json();
    });
  },
};

// Sales Order API
export const salesOrderApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    return apiRequest(`/sales-orders?${searchParams.toString()}`);
  },

  getById: (id: string) => apiRequest(`/sales-orders/${id}`),

  create: (data: any) => apiRequest('/sales-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => apiRequest(`/sales-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => apiRequest(`/sales-orders/${id}`, {
    method: 'DELETE',
  }),
};

// Invoice API
export const invoiceApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    return apiRequest(`/invoices?${searchParams.toString()}`);
  },

  getById: (id: string) => apiRequest(`/invoices/${id}`),

  create: (data: any) => apiRequest('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => apiRequest(`/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => apiRequest(`/invoices/${id}`, {
    method: 'DELETE',
  }),

  downloadPDF: (id: string) => {
    return fetch(`${API_BASE_URL}/invoices/${id}/pdf`).then(response => {
      if (!response.ok) {
        throw new Error('PDF generation failed');
      }
      return response.blob();
    });
  },
};

export { ApiError };


