/**
 * Module quản lý Google Service Account Credentials
 * Tích hợp MongoDB schema và cung cấp services cho ứng dụng
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GoogleCredentialService } from './google-credential.service';
import { GoogleCredentialController } from './google-credential.controller';
import { GoogleCredential, GoogleCredentialSchema } from './schemas/google-credential.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GoogleCredential.name, schema: GoogleCredentialSchema }
    ])
  ],
  controllers: [GoogleCredentialController],
  providers: [GoogleCredentialService],
  exports: [GoogleCredentialService], // Export để các module khác có thể sử dụng
})
export class GoogleCredentialModule {}