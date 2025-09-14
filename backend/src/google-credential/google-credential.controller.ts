/**
 * Controller xử lý các API requests cho Google Service Account Credentials
 * Cung cấp endpoints để quản lý credential và test connection
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpException,
  Put,
} from '@nestjs/common';
import { GoogleCredentialService } from './google-credential.service';
import { CreateGoogleCredentialDto, UpdateGoogleCredentialDto } from './dto';

@Controller('google-credential')
export class GoogleCredentialController {
  constructor(private readonly googleCredentialService: GoogleCredentialService) {}

  /**
   * Tạo credential mới
   * POST /google-credential
   */
  @Post()
  async create(@Body() createGoogleCredentialDto: CreateGoogleCredentialDto) {
    try {
      const result = await this.googleCredentialService.create(createGoogleCredentialDto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Tạo Google credential thành công',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Lỗi khi tạo credential',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Lấy danh sách tất cả credentials
   * GET /google-credential
   */
  @Get()
  async findAll() {
    try {
      const result = await this.googleCredentialService.findAll();
      return {
        statusCode: HttpStatus.OK,
        message: 'Lấy danh sách credentials thành công',
        data: result,
        total: result.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lỗi khi lấy danh sách credentials',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lấy credential hiện tại đang active
   * GET /google-credential/active
   */
  @Get('active')
  async getActive() {
    try {
      const result = await this.googleCredentialService.getActive();
      return {
        statusCode: HttpStatus.OK,
        message: result ? 'Lấy active credential thành công' : 'Không có credential nào đang active',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lỗi khi lấy active credential',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test connection với credential
   * POST /google-credential/:id/test
   */
  @Post(':id/test')
  async testConnection(@Param('id') id: string) {
    try {
      const result = await this.googleCredentialService.testConnection(id);
      return {
        statusCode: result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
        message: result.message,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lỗi khi test connection',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Kích hoạt credential
   * PUT /google-credential/:id/activate
   */
  @Put(':id/activate')
  async activate(@Param('id') id: string) {
    try {
      const result = await this.googleCredentialService.activate(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Kích hoạt credential thành công',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Lỗi khi kích hoạt credential',
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Lấy credential theo ID
   * GET /google-credential/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.googleCredentialService.findOne(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Lấy credential thành công',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Lỗi khi lấy credential',
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Cập nhật credential
   * PATCH /google-credential/:id
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateGoogleCredentialDto: UpdateGoogleCredentialDto) {
    try {
      const result = await this.googleCredentialService.update(id, updateGoogleCredentialDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Cập nhật credential thành công',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Lỗi khi cập nhật credential',
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Xóa credential
   * DELETE /google-credential/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.googleCredentialService.remove(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Xóa credential thành công',
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Lỗi khi xóa credential',
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Lấy credential dưới dạng JSON để sử dụng cho Google API
   * GET /google-credential/api-format (active credential)
   * GET /google-credential/api-format/:id (specific credential)
   */
  @Get('api-format')
  async getActiveForAPI() {
    try {
      const result = await this.googleCredentialService.getCredentialForGoogleAPI();
      return {
        statusCode: HttpStatus.OK,
        message: 'Lấy credential cho Google API thành công',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Lỗi khi lấy credential cho API',
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get('api-format/:id')
  async getSpecificForAPI(@Param('id') id: string) {
    try {
      const result = await this.googleCredentialService.getCredentialForGoogleAPI(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Lấy credential cho Google API thành công',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Lỗi khi lấy credential cho API',
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}