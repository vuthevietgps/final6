/**
 * File: quote.controller.ts
 * Mục đích: Định nghĩa REST API cho "Báo giá đại lý" (CRUD, thống kê),
 *   nhận/validate payload, và gọi service xử lý nghiệp vụ.
 */
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ValidationPipe } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Controller('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  create(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) createQuoteDto: CreateQuoteDto,
  ) {
    // Chuẩn hóa expiryDate: nếu là chuỗi dd/MM/yyyy thì chuyển ISO; nếu rỗng ('') thì bỏ để dùng default schema
    if (createQuoteDto.expiryDate != null) {
      const raw = String(createQuoteDto.expiryDate).trim();
      if (!raw) {
        delete (createQuoteDto as any).expiryDate;
      } else if (/\d{2}\/\d{2}\/\d{4}/.test(raw)) {
        const [d, m, y] = raw.split('/').map((v) => parseInt(v, 10));
        (createQuoteDto as any).expiryDate = new Date(y, m - 1, d).toISOString();
      }
    }
    return this.quoteService.create(createQuoteDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.quoteService.findAll(query);
  }

  @Get('stats/summary')
  getStats() {
    return this.quoteService.getStats();
  }

  // Diagnostics: trả thông tin collection và thống kê quote để kiểm tra nhanh
  @Get('diagnostics')
  diagnostics() {
    return this.quoteService.diagnostics();
  }

  @Get('migrate-names')
  async migrateNames() {
    return this.quoteService.migrateProductAndAgentNames();
  }

  @Get('agent/:agentId')
  findByAgent(@Param('agentId') agentId: string) {
    return this.quoteService.findByAgent(agentId);
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.quoteService.findByProduct(productId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quoteService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) updateQuoteDto: UpdateQuoteDto,
  ) {
    // Chuẩn hóa expiryDate tương tự create
    if ((updateQuoteDto as any).expiryDate !== undefined) {
      const raw = String(updateQuoteDto.expiryDate ?? '').trim();
      if (!raw) {
        // Cho phép xóa ngày: bỏ field để không cast chuỗi rỗng thành Date lỗi
        delete (updateQuoteDto as any).expiryDate;
      } else if (/\d{2}\/\d{2}\/\d{4}/.test(raw)) {
        const [d, m, y] = raw.split('/').map((v) => parseInt(v, 10));
        (updateQuoteDto as any).expiryDate = new Date(y, m - 1, d).toISOString();
      }
    }
    return this.quoteService.update(id, updateQuoteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quoteService.remove(id);
  }
}
