const API_BASE =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export interface ServiceTypes {
  types: string[];
  pricing: Record<string, number>;
}

export interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  bio?: string;
  services_offered?: string;
  is_provider: boolean;
  avg_rating?: number;
  review_count: number;
  created_at: string;
}

export interface Job {
  id: number;
  customer_id: number;
  provider_id?: number;
  title: string;
  description: string;
  service_type: string;
  urgency: string;
  address: string;
  status: string;
  lead_price: number;
  customer_name?: string;
  customer_phone?: string;
  created_at: string;
  claimed_at?: string;
  completed_at?: string;
}

export interface ProviderListing {
  id: number;
  provider_id: number;
  title: string;
  description: string;
  service_type: string;
  service_area: string;
  lead_price: number;
  status: string;
  provider_name?: string;
  provider_bio?: string;
  provider_phone?: string;
  avg_rating?: number;
  review_count: number;
  contact_unlocked: boolean;
  created_at: string;
}

export interface PaymentConfig {
  stripe_enabled: boolean;
  demo_mode: boolean;
  stripe_mode: 'demo' | 'test' | 'live';
  publishable_key?: string;
  webhook_configured?: boolean;
}

export interface PaymentCheckoutRequest {
  payment_type: 'job_lead' | 'provider_lead';
  job_id?: number;
  provider_listing_id?: number;
  provider_id?: number;
  customer_id?: number;
}

export interface PaymentCheckout {
  payment_id: number;
  payment_type: string;
  amount: number;
  currency: string;
  demo_mode: boolean;
  client_secret?: string;
  checkout_url?: string;
  title: string;
  service_type: string;
}

export interface PaymentConfirmResult {
  payment_id: number;
  payment_type: string;
  status: string;
  job?: Job;
  listing?: ProviderListing;
}

export interface Review {
  id: number;
  job_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  comment?: string;
  reviewer_name?: string;
  created_at: string;
}

export interface Appeal {
  id: number;
  job_id?: number;
  reporter_id: number;
  subject: string;
  reason: string;
  details: string;
  status: string;
  resolution?: string;
  reporter_name?: string;
  created_at: string;
}

export const api = {
  getServiceTypes: () => request<ServiceTypes>('/service-types/'),

  getUser: (id: number) => request<User>(`/users/${id}`),
  getUserByPhone: (phone: string) => request<User>(`/users/by-phone/${encodeURIComponent(phone)}`),
  createUser: (data: {
    name: string;
    phone: string;
    email?: string;
    is_provider?: boolean;
    bio?: string;
    services_offered?: string;
    address?: string;
  }) => request<User>('/users/', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: Partial<User>) =>
    request<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  postJob: (data: {
    name: string;
    phone: string;
    email?: string;
    service_type: string;
    urgency: string;
    description: string;
    address?: string;
  }) => request<Job>('/jobs/post', { method: 'POST', body: JSON.stringify(data) }),

  getOpenJobs: () => request<Job[]>('/jobs/open/'),
  getProviderJobs: (providerId: number) => request<Job[]>(`/jobs/provider/${providerId}`),
  getCustomerJobs: (customerId: number) => request<Job[]>(`/jobs/customer/${customerId}`),
  claimJob: (jobId: number, providerId: number) =>
    request<Job>(`/jobs/${jobId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ provider_id: providerId }),
    }),

  getProviderListings: (customerId?: number) =>
    request<ProviderListing[]>(
      customerId ? `/provider-listings/?customer_id=${customerId}` : '/provider-listings/'
    ),
  getMyListings: (providerId: number) =>
    request<ProviderListing[]>(`/provider-listings/provider/${providerId}`),
  createProviderListing: (data: {
    provider_id: number;
    title: string;
    description: string;
    service_type: string;
    service_area?: string;
  }) =>
    request<ProviderListing>('/provider-listings/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProviderListing: (
    listingId: number,
    data: Partial<{ title: string; description: string; service_type: string; service_area: string; status: string }>
  ) =>
    request<ProviderListing>(`/provider-listings/${listingId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getPaymentConfig: () => request<PaymentConfig>('/payments/config'),
  createPaymentCheckout: (data: PaymentCheckoutRequest) =>
    request<PaymentCheckout>('/payments/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  confirmPayment: (paymentId: number, paymentIntentId?: string) =>
    request<PaymentConfirmResult>(`/payments/${paymentId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ payment_intent_id: paymentIntentId }),
    }),
  confirmCheckoutSession: (sessionId: string) =>
    request<PaymentConfirmResult>('/payments/checkout-session/confirm', {
      method: 'POST',
      body: JSON.stringify({ checkout_session_id: sessionId }),
    }),
  completeJob: (jobId: number) =>
    request<Job>(`/jobs/${jobId}/complete`, { method: 'PUT' }),

  createReview: (data: {
    job_id: number;
    reviewer_id: number;
    reviewee_id: number;
    rating: number;
    comment?: string;
  }) => request<Review>('/reviews/', { method: 'POST', body: JSON.stringify(data) }),
  getUserReviews: (userId: number) => request<Review[]>(`/reviews/user/${userId}`),

  createAppeal: (data: {
    reporter_id: number;
    subject: string;
    reason: string;
    details: string;
    job_id?: number;
  }) => request<Appeal>('/appeals/', { method: 'POST', body: JSON.stringify(data) }),
  getAppeals: () => request<Appeal[]>('/appeals/'),
};