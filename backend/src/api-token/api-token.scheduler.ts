/**
 * Scheduler: ApiTokenScheduler
 * Chạy định kỳ để:
 *  - Revalidate token quá hạn kiểm tra (>=30 phút)
 *  - Đánh dấu cảnh báo sớm token sắp hết hạn (trong 3 ngày)
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiToken, ApiTokenDocument } from './schemas/api-token.schema';
import { ApiTokenService } from './api-token.service';

@Injectable()
export class ApiTokenScheduler {
  private readonly logger = new Logger(ApiTokenScheduler.name);
  constructor(
    @InjectModel(ApiToken.name) private model: Model<ApiTokenDocument>,
    private tokenService: ApiTokenService
  ){}

  // Mỗi 5 phút kiểm tra cần revalidate
  @Cron(CronExpression.EVERY_5_MINUTES)
  async periodicValidate(){
    const cutoff = new Date(Date.now() - 30*60*1000); // 30 phút
    const candidates = await this.model.find({ status: 'active', $or: [ { lastCheckedAt: { $exists: false } }, { lastCheckedAt: { $lt: cutoff } } ] }).limit(50);
    for(const c of candidates){
      try { await this.tokenService.validate(c._id.toString(), { force: true }); } catch(e){ this.logger.warn(`Validate fail ${c._id}: ${(e as any).message}`); }
    }
  }

  // Mỗi giờ đánh dấu cảnh báo sớm
  @Cron(CronExpression.EVERY_HOUR)
  async markExpiringSoon(){
    const soon = new Date(Date.now() + 3*24*60*60*1000); // 3 ngày
    const tokens = await this.model.find({ expireAt: { $exists: true, $ne: null, $lt: soon }, status: 'active' }).limit(100);
    for(const t of tokens){
      if(t.lastCheckMessage && t.lastCheckMessage.includes('[EXPIRING]')) continue;
      t.lastCheckMessage = (t.lastCheckMessage? t.lastCheckMessage + ' ' : '') + '[EXPIRING] Token sắp hết hạn';
      await t.save();
    }
  }
}
