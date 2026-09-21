export interface AuthLogData {
  event: string;
  email?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  details?: any;
}

export interface SecurityLogData {
  event: string;
  userId?: string;
  email?: string;
  ip?: string;
  endpoint?: string;
  details?: any;
}

export interface ErrorLogData {
  event: string;
  error: any;
  userId?: string;
  email?: string;
  endpoint?: string;
  ip?: string;
  details?: any;
}
