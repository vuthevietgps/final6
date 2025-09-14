/**
 * Interface cho Google Service Account Credential trong Angular
 */

export interface GoogleCredential {
  _id?: string;
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
  isActive?: boolean;
  description?: string;
  lastTestDate?: Date;
  testStatus?: 'success' | 'failed' | 'unknown';
  testMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateGoogleCredentialDto {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url: string;
  universe_domain?: string;
  isActive?: boolean;
  description?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}