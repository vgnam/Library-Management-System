
import { API_BASE_URL } from '../constants';
import { LoginResponse, SearchResponse, UserRole, BorrowRequest, BorrowStatus, HistoryResponse, CurrentBorrowedResponse, OverdueResponse } from '../types';

class ApiService {
  private token: string | null = localStorage.getItem('token');

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    // Optional: Force reload to clear application state
    // window.location.href = '/login'; 
  }

  getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Robust headers merging
    const headers: Record<string, string> = {};

    // 1. Add Auth token
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // 2. Merge headers from options
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((v, k) => {
          headers[k] = v;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([k, v]) => {
          headers[k] = v;
        });
      } else {
        // Plain object
        Object.assign(headers, options.headers);
      }
    }

    const config: RequestInit = {
      ...options,
      headers, // Use the merged plain object headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle Unauthorized (Token expired/invalid)
    if (response.status === 401) {
      this.logout();
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      let errorMessage = 'API Request Failed';
      
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // Handle Pydantic validation errors (FastAPI default)
          // Format: [{ loc: ['body', 'field'], msg: 'field required', ... }]
          errorMessage = errorData.detail
            .map((err: any) => {
              const location = err.loc ? `(${err.loc.join('.')}) ` : '';
              return `${location}${err.msg}`;
            })
            .join('; ');
        } else if (typeof errorData.detail === 'object') {
          // Convert object detail to string to avoid [object Object]
          try {
             errorMessage = Object.entries(errorData.detail)
              .map(([key, val]) => `${key}: ${val}`)
              .join(', ');
          } catch (e) {
             errorMessage = JSON.stringify(errorData.detail);
          }
        }
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  // --- Auth ---

  async login(username: string, password: string, role: UserRole): Promise<LoginResponse> {
    const endpoint = `/auth/${role}/login`;
    
    // Use URLSearchParams for application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('grant_type', 'password');

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed. Please check credentials.');
    }

    const data = await response.json();
    
    if (data.data && data.data.access_token) {
      return data.data;
    } else if (data.access_token) {
      return data;
    } else {
      console.error("Unexpected login response structure:", data);
      throw new Error("Login successful but no access token received from server.");
    }
  }

  async registerReader(formData: FormData): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/reader/register`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Registration failed');
    }

    return response.json();
  }

  async getMe(): Promise<any> {
    const res = await this.request<any>('/auth/me');
    return res.data ? res.data : res;
  }

  // --- Books ---

  async searchBooks(query: { keyword?: string; page?: number }): Promise<SearchResponse> {
    const params = new URLSearchParams();
    
    // Only append keyword if present, otherwise API returns all/paged
    if (query.keyword) {
      params.append('keyword', query.keyword);
    }
    
    if (query.page) {
      params.append('page', query.page.toString());
    }

    const res = await this.request<any>(`/books/search?${params.toString()}`);
    return res.data || res; 
  }

  // --- Borrowing ---

  async createBorrowRequest(bookIds: string[]): Promise<any> {
    const payload = { 
      book_title_ids: bookIds 
    };

    return this.request(`/books/borrow-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  // Generic fetch for requests with status filtering
  async getBorrowRequests(status?: string): Promise<BorrowRequest[]> {
    let url = `/books/borrow-requests`;
    if (status && status !== 'All') {
      // Backend expects Title Case for Librarian API (e.g., "Pending") based on Enum
      url += `?status=${status}`;
    }
    const res = await this.request<any>(url);
    return res.data || res || [];
  }

  // Kept for backward compatibility if needed, but redirects to generic
  async getPendingRequests(): Promise<BorrowRequest[]> {
    return this.getBorrowRequests(BorrowStatus.PENDING);
  }

  async approveRequest(borrowSlipId: string): Promise<any> {
    return this.request(`/books/borrow-request/${borrowSlipId}/approve`, {
      method: 'PUT',
    });
  }

  async rejectRequest(borrowSlipId: string): Promise<any> {
    return this.request(`/books/borrow-request/${borrowSlipId}/reject`, {
      method: 'PUT',
    });
  }

  async returnRequest(borrowSlipId: string): Promise<any> {
    return this.request(`/books/borrow-request/${borrowSlipId}/return`, {
      method: 'PUT',
    });
  }

  // --- History & Stats ---

  async getBorrowHistory(options: { status?: string; page?: number; pageSize?: number }): Promise<HistoryResponse> {
    const params = new URLSearchParams();
    
    if (options.status && options.status !== 'All') {
      // Backend expects lowercase enum values for history
      params.append('status', options.status.toLowerCase());
    }
    
    if (options.page) {
      params.append('page', options.page.toString());
    }

    if (options.pageSize) {
      params.append('page_size', options.pageSize.toString());
    }

    const res = await this.request<any>(`/history/?${params.toString()}`);
    
    // Handle wrapped data response or direct list
    if (res.data) return res.data;
    
    // Fallback if backend returns generic list (though new structure is object)
    if (Array.isArray(res)) {
       return {
        total: res.length,
        page: options.page || 1,
        page_size: options.pageSize || 10,
        history: res,
        total_pages: 1
      };
    }
    
    return res;
  }

  async getCurrentlyBorrowed(): Promise<CurrentBorrowedResponse> {
    const res = await this.request<any>('/history/current');
    return res.data || res;
  }

  async getOverdueBooks(): Promise<OverdueResponse> {
    const res = await this.request<any>('/history/overdue');
    return res.data || res;
  }
}

export const api = new ApiService();
