/**
 * Service: ApiTokenService
 * Chức năng: Quản lý vòng đời ApiToken (CRUD + validate + setPrimary + rotate).
 * Refactor: Thêm strategy validate để dễ mở rộng provider (facebook, zalo,...).
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiToken, ApiTokenDocument } from './schemas/api-token.schema';
import { ApiTokenAudit, ApiTokenAuditDocument } from './schemas/api-token-audit.schema';
import { Fanpage, FanpageDocument } from '../fanpage/schemas/fanpage.schema';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { UpdateApiTokenDto } from './dto/update-api-token.dto';
import { RotateTokenDto, SetPrimaryTokenDto, ValidateTokenDto } from './dto/token-actions.dto';
import { encryptToken, hashToken } from './crypto.util';

// ---------------- Provider Validation Strategies ----------------
// Interface đơn giản cho các strategy
interface TokenValidationResult { status: 'valid'|'invalid'|'expired'; message: string; scopes?: string[]; expireAt?: Date; }
interface ProviderValidator { validate(rawToken: string): Promise<TokenValidationResult>; }

class FacebookValidator implements ProviderValidator {
  // TODO: Inject HttpService nếu muốn gọi Graph API; tạm mock
  async validate(_rawToken: string): Promise<TokenValidationResult> {
    // Giả lập: luôn valid
    return { status: 'valid', message: 'Facebook mock ok', scopes: ['pages_read','pages_manage_metadata'] };
  }
}
class ZaloValidator implements ProviderValidator {
  async validate(_rawToken: string): Promise<TokenValidationResult> {
    return { status: 'valid', message: 'Zalo mock ok' };
  }
}
class OtherValidator implements ProviderValidator {
  async validate(_rawToken: string): Promise<TokenValidationResult> {
    return { status: 'valid', message: 'Other mock ok' };
  }
}

function buildValidator(provider: string): ProviderValidator {
  switch(provider){
    case 'facebook': return new FacebookValidator();
    case 'zalo': return new ZaloValidator();
    default: return new OtherValidator();
  }
}

@Injectable()
export class ApiTokenService {
  constructor(
  @InjectModel(ApiToken.name) private model: Model<ApiTokenDocument>,
  @InjectModel(ApiTokenAudit.name) private auditModel: Model<ApiTokenAuditDocument>,
    @InjectModel(Fanpage.name) private fanpageModel: Model<FanpageDocument>
  ) {}

  async create(dto: CreateApiTokenDto) {
    const tokenHash = hashToken(dto.token);
    const tokenEnc = encryptToken(dto.token);
    const doc = new this.model({ ...dto, token: dto.token, tokenEnc, tokenHash });
    await doc.save();
    await this.audit('create', doc._id, undefined, { _id: doc._id, name: doc.name });
    return doc;
  }
  findAll(filter: any = {}) { return this.model.find(filter).sort({ createdAt: -1 }).lean(); }
  async findOne(id: string) { const doc = await this.model.findById(id).lean(); if (!doc) throw new NotFoundException('Token không tồn tại'); return doc as any; }
  async update(id: string, dto: UpdateApiTokenDto) { const doc = await this.model.findByIdAndUpdate(id, dto, { new: true }).lean(); if (!doc) throw new NotFoundException('Token không tồn tại'); return doc as any; }
  async remove(id: string) { const res = await this.model.findByIdAndDelete(id); if (!res) throw new NotFoundException('Token không tồn tại'); }

  /** Validate token thông qua strategy theo provider */
  async validate(id: string, _dto: ValidateTokenDto) {
    const token = await this.model.findById(id);
    if(!token) throw new NotFoundException('Token không tồn tại');
    const validator = buildValidator(token.provider);
    const result = await validator.validate(token.token);
    token.lastCheckedAt = new Date();
  token.lastCheckStatus = result.status;
  token.lastCheckMessage = result.message;
  if(result.status==='valid') token.consecutiveFail = 0; else token.consecutiveFail = (token.consecutiveFail||0)+1;
    if(result.scopes) token.scopes = result.scopes;
    if(result.expireAt) token.expireAt = result.expireAt;
    await token.save();
    await this.audit('validate', token._id, undefined, { status: token.lastCheckStatus });
    return token.toObject();
  }

  /**
   * Đặt token làm primary cho fanpage (bỏ primary cũ)
   */
  async setPrimary(id: string, dto: SetPrimaryTokenDto) {
    const token = await this.model.findById(id);
    if(!token) throw new NotFoundException('Token không tồn tại');
    if(!token.fanpageId || token.fanpageId.toString() !== dto.fanpageId) {
      throw new BadRequestException('Token không thuộc fanpageId cung cấp');
    }
    await this.model.updateMany({ fanpageId: dto.fanpageId, isPrimary: true }, { $set: { isPrimary: false } });
    token.isPrimary = true;
    await token.save();
    await this.audit('setPrimary', token._id, undefined, { fanpageId: dto.fanpageId });
    return token.toObject();
  }

  /**
   * Rotate: tạo token mới dựa trên token hiện tại, gắn quan hệ rotatedFrom/rotatedTo
   */
  async rotate(id: string, dto: RotateTokenDto) {
    const current = await this.model.findById(id);
    if(!current) throw new NotFoundException('Token không tồn tại');
    if(!dto.newToken?.trim()) throw new BadRequestException('newToken rỗng');
    const newHash = hashToken(dto.newToken.trim());
    const newEnc = encryptToken(dto.newToken.trim());
    const newDoc = new this.model({
      name: current.name + ' (rotated)',
      token: dto.newToken.trim(),
      tokenEnc: newEnc,
      tokenHash: newHash,
      provider: current.provider,
      status: current.status,
      fanpageId: current.fanpageId,
      notes: dto.notes ?? current.notes,
      rotatedFrom: current._id
    });
    await newDoc.save();
    current.rotatedTo = newDoc._id as any;
    await current.save();
    await this.audit('rotate', newDoc._id, { oldId: current._id }, { newId: newDoc._id });
    return { old: current.toObject(), fresh: newDoc.toObject() };
  }

  /**
   * Đồng bộ accessToken có trong collection Fanpage -> ApiToken (chỉ tạo mới nếu chưa tồn tại token cùng fanpageId & provider)
   */
  async syncFromFanpages() {
    const fanpages = await this.fanpageModel.find({ accessToken: { $exists: true, $ne: '' } }).lean();
    const created: any[] = [];
    for(const fp of fanpages){
      const existed = await this.model.findOne({ fanpageId: fp._id, provider: 'facebook', rotatedFrom: { $exists: false } });
      if(existed) continue;
      const tokenHash = hashToken(fp.accessToken);
      const tokenEnc = encryptToken(fp.accessToken);
      const doc = new this.model({
        name: fp.name,
        token: fp.accessToken,
        tokenEnc,
        tokenHash,
        provider: 'facebook',
        status: fp.status || 'active',
        fanpageId: fp._id,
        notes: 'Imported from fanpage.accessToken',
        isPrimary: true
      });
      await doc.save();
      created.push(doc.toObject());
      await this.audit('syncImport', doc._id, undefined, { fanpageId: fp._id });
    }
    return { imported: created.length, items: created };
  }

  /** Audit helper */
  private async audit(action: string, tokenId: any, prev?: any, next?: any, meta?: any){
    try { await this.auditModel.create({ action, tokenId, prev, next, meta }); } catch {}
  }

  /** Resolve token cho chatbot sử dụng (primary trước, fallback nếu degraded/invalid) */
  async resolveForFanpage(fanpageId: string, provider: string = 'facebook') {
    let primary = await this.model.findOne({ fanpageId, provider, isPrimary: true }).lean();
    if(primary && primary.lastCheckStatus === 'valid') return { token: primary, fallback: false };
    // fallback tìm token hợp lệ khác
    const alt = await this.model.find({ fanpageId, provider, status: 'active', lastCheckStatus: 'valid' })
      .sort({ lastCheckedAt: -1 }).limit(1).lean();
    if(alt.length){
      if(primary){
        await this.model.updateOne({ _id: primary._id }, { $set: { degraded: true } });
        await this.audit('fallback', primary._id, undefined, { fallbackTo: alt[0]._id });
      }
      return { token: alt[0], fallback: true };
    }
    return { token: primary || null, fallback: false };
  }
}
