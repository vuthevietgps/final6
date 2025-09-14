/**
 * DTO để cập nhật Google Service Account Credential
 */

import { PartialType } from '@nestjs/mapped-types';
import { CreateGoogleCredentialDto } from './create-google-credential.dto';

export class UpdateGoogleCredentialDto extends PartialType(CreateGoogleCredentialDto) {}