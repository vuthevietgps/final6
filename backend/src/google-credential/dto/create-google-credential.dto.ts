/**
 * DTO để tạo mới Google Service Account Credential
 */

import { IsString, IsOptional, IsBoolean, IsUrl, IsEmail } from 'class-validator';

export class CreateGoogleCredentialDto {
  @IsString()
  type: string = 'service_account';

  @IsString()
  project_id: string;

  @IsString()
  private_key_id: string;

  @IsString()
  private_key: string;

  @IsEmail()
  client_email: string;

  @IsString()
  client_id: string;

  @IsUrl()
  @IsOptional()
  auth_uri?: string = 'https://accounts.google.com/o/oauth2/auth';

  @IsUrl()
  @IsOptional()
  token_uri?: string = 'https://oauth2.googleapis.com/token';

  @IsUrl()
  @IsOptional()
  auth_provider_x509_cert_url?: string = 'https://www.googleapis.com/oauth2/v1/certs';

  @IsUrl()
  client_x509_cert_url: string;

  @IsString()
  @IsOptional()
  universe_domain?: string = 'googleapis.com';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsString()
  @IsOptional()
  description?: string;
}