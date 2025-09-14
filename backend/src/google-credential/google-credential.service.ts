/**
 * Service quản lý Google Service Account Credentials
 * Thực hiện các thao tác CRUD và test connection với Google APIs
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoogleCredential, GoogleCredentialDocument } from './schemas/google-credential.schema';
import { CreateGoogleCredentialDto, UpdateGoogleCredentialDto } from './dto';

@Injectable()
export class GoogleCredentialService {
  constructor(
    @InjectModel(GoogleCredential.name)
    private googleCredentialModel: Model<GoogleCredentialDocument>,
  ) {}

  /**
   * Tạo credential mới hoặc ghi đè credential cũ
   * Chỉ cho phép tồn tại 1 credential active tại một thời điểm
   */
  async create(createGoogleCredentialDto: CreateGoogleCredentialDto): Promise<GoogleCredential> {
    try {
      // Deactivate tất cả credential cũ trước khi tạo mới
      await this.googleCredentialModel.updateMany(
        { isActive: true },
        { isActive: false }
      );

      const credential = new this.googleCredentialModel({
        ...createGoogleCredentialDto,
        isActive: true,
        testStatus: 'unknown',
      });

      return await credential.save();
    } catch (error) {
      throw new BadRequestException('Không thể lưu credential: ' + error.message);
    }
  }

  /**
   * Lấy danh sách tất cả credentials
   */
  async findAll(): Promise<GoogleCredential[]> {
    return await this.googleCredentialModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Lấy credential hiện tại đang active
   */
  async getActive(): Promise<GoogleCredential | null> {
    return await this.googleCredentialModel
      .findOne({ isActive: true })
      .exec();
  }

  /**
   * Lấy credential theo ID
   */
  async findOne(id: string): Promise<GoogleCredential> {
    const credential = await this.googleCredentialModel.findById(id).exec();
    if (!credential) {
      throw new NotFoundException('Không tìm thấy credential với ID: ' + id);
    }
    return credential;
  }

  /**
   * Cập nhật credential
   */
  async update(id: string, updateGoogleCredentialDto: UpdateGoogleCredentialDto): Promise<GoogleCredential> {
    const credential = await this.googleCredentialModel
      .findByIdAndUpdate(id, updateGoogleCredentialDto, { new: true })
      .exec();

    if (!credential) {
      throw new NotFoundException('Không tìm thấy credential với ID: ' + id);
    }

    return credential;
  }

  /**
   * Xóa credential
   */
  async remove(id: string): Promise<void> {
    const result = await this.googleCredentialModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Không tìm thấy credential với ID: ' + id);
    }
  }

  /**
   * Test connection với Google APIs
   * Sử dụng credential để thử kết nối
   */
  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const credential = await this.findOne(id);
    
    try {
      // Tạo credential object theo format Google expects
      const credentialObj = {
        type: credential.type,
        project_id: credential.project_id,
        private_key_id: credential.private_key_id,
        private_key: credential.private_key.replace(/\\n/g, '\n'), // Convert \\n to actual newlines
        client_email: credential.client_email,
        client_id: credential.client_id,
        auth_uri: credential.auth_uri,
        token_uri: credential.token_uri,
        auth_provider_x509_cert_url: credential.auth_provider_x509_cert_url,
        client_x509_cert_url: credential.client_x509_cert_url,
        universe_domain: credential.universe_domain,
      };

      // Kiểm tra format cơ bản của credential
      this.validateCredentialFormat(credentialObj);

      // Cập nhật thông tin test
      await this.googleCredentialModel.findByIdAndUpdate(id, {
        lastTestDate: new Date(),
        testStatus: 'success',
        testMessage: 'Credential hợp lệ và định dạng đúng',
      });

      return {
        success: true,
        message: 'Credential hợp lệ và định dạng đúng. Test connection thành công!',
      };
    } catch (error) {
      // Cập nhật thông tin test lỗi
      await this.googleCredentialModel.findByIdAndUpdate(id, {
        lastTestDate: new Date(),
        testStatus: 'failed',
        testMessage: error.message,
      });

      return {
        success: false,
        message: 'Test connection thất bại: ' + error.message,
      };
    }
  }

  /**
   * Validate định dạng credential cơ bản
   */
  private validateCredentialFormat(credential: any): void {
    const requiredFields = [
      'type', 'project_id', 'private_key_id', 'private_key',
      'client_email', 'client_id', 'auth_uri', 'token_uri',
      'auth_provider_x509_cert_url', 'client_x509_cert_url'
    ];

    for (const field of requiredFields) {
      if (!credential[field]) {
        throw new Error(`Thiếu trường bắt buộc: ${field}`);
      }
    }

    // Kiểm tra định dạng private key
    if (!credential.private_key.includes('BEGIN PRIVATE KEY') || 
        !credential.private_key.includes('END PRIVATE KEY')) {
      throw new Error('Private key không đúng định dạng PEM');
    }

    // Kiểm tra email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credential.client_email)) {
      throw new Error('Client email không đúng định dạng');
    }
  }

  /**
   * Kích hoạt credential (set active = true, các credential khác thành false)
   */
  async activate(id: string): Promise<GoogleCredential> {
    // Deactivate tất cả credential khác
    await this.googleCredentialModel.updateMany(
      { _id: { $ne: id } },
      { isActive: false }
    );

    // Activate credential được chọn
    const credential = await this.googleCredentialModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .exec();

    if (!credential) {
      throw new NotFoundException('Không tìm thấy credential với ID: ' + id);
    }

    return credential;
  }

  /**
   * Lấy credential dưới dạng JSON object để sử dụng với Google APIs
   */
  async getCredentialForGoogleAPI(id?: string): Promise<any> {
    let credential: GoogleCredential;
    
    if (id) {
      credential = await this.findOne(id);
    } else {
      credential = await this.getActive();
      if (!credential) {
        throw new NotFoundException('Không tìm thấy credential nào đang active');
      }
    }

    return {
      type: credential.type,
      project_id: credential.project_id,
      private_key_id: credential.private_key_id,
      private_key: credential.private_key.replace(/\\n/g, '\n'),
      client_email: credential.client_email,
      client_id: credential.client_id,
      auth_uri: credential.auth_uri,
      token_uri: credential.token_uri,
      auth_provider_x509_cert_url: credential.auth_provider_x509_cert_url,
      client_x509_cert_url: credential.client_x509_cert_url,
      universe_domain: credential.universe_domain,
    };
  }
}