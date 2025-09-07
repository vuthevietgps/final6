/**
 * Google Sync Service
 * Tổng hợp dữ liệu Summary1 theo từng đại lý và đồng bộ với Google Sheets
 * - Chạy định kỳ mỗi 10 phút
 * - Hỗ trợ manual payment tracking với tính toán needToPay tự động
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import { TestOrder2, TestOrder2Document } from '../test-order2/schemas/test-order2.schema';
import { Quote, QuoteDocument } from '../quote/schemas/quote.schema';
import { User, UserDocument } from '../user/user.schema';
import { Summary1, Summary1Document } from './schemas/summary1.schema';

import { google, sheets_v4 } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';
// Lưu ý: Để ghi Google Sheets, cần thiết lập credentials thông qua biến môi trường
// GOOGLE_APPLICATION_CREDENTIALS (đường dẫn đến file JSON) hoặc GOOGLE_CREDENTIALS_JSON (nội dung JSON).

@Injectable()
export class GoogleSyncService {
  private readonly logger = new Logger(GoogleSyncService.name);
  // Hàng đợi debounce theo từng đại lý để gộp nhiều thay đổi đơn hàng liên tiếp
  private readonly pendingByAgent = new Map<string, NodeJS.Timeout>();
  // Hàng đợi chỉ đẩy dữ liệu DB Summary1 lên Google (không rebuild)
  private readonly pendingPushOnlyByAgent = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectModel(TestOrder2.name) private readonly orderModel: Model<TestOrder2Document>,
    @InjectModel(Quote.name) private readonly quoteModel: Model<QuoteDocument>,
  @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  @InjectModel(Summary1.name) private readonly summaryModel: Model<Summary1Document>,
  ) {}

  /** Tính dữ liệu Tổng hợp 1 cho một đại lý (agentId) */
  async buildSummaryForAgent(agentId: string): Promise<any[]> {
    // Lấy tất cả đơn hàng của đại lý
    const agentObjectId = new Types.ObjectId(agentId);
    const orders = await this.orderModel
      .find({ agentId: agentObjectId })
      .populate('productId', 'name')
      .populate('agentId', 'fullName email')
      .lean();

    // Lấy quote của agent (bao gồm cả bản ghi legacy không có isActive), sắp xếp mới nhất trước
    // Lọc trạng thái 'Đã duyệt' và hạn sử dụng trong code để bao phủ dữ liệu cũ/méo
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const quotesRaw = await this.quoteModel
      .find({
        $and: [
          { $or: [ { agentId: agentObjectId }, { agentId } ] },
          { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
        ],
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();
    const priceMap = new Map<string, number>();
    const normalizeStatus = (s: any) =>
      String(s ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/\s+/g, '');
    const isApproved = (s: any) => normalizeStatus(s) === 'daduyet';
    let approvedCount = 0;
    for (const q of quotesRaw as any[]) {
      const key = String(q.productId);
      if (!priceMap.has(key)) {
  if (isApproved(q.status)) {
          priceMap.set(key, Number(q.price) || 0);
      approvedCount++;
        }
      }
    }
    this.logger.log(`Summary1 sync: quotes fetched=${quotesRaw.length}, approved+valid used=${approvedCount} for agent ${agentId}`);

    // Chuẩn hóa so sánh trạng thái để tránh lệch hoa/thường hoặc dấu
    const normalize = (s: any) =>
      String(s ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const PRODUCTION_DONE = normalize('Đã trả kết quả');
    const ORDER_DELIVERED = normalize('Giao thành công');

    // Duyệt đơn để tính toán
    const rows: any[] = [];
    for (const o of orders as any[]) {
      const productId = String(o.productId?._id || o.productId);
      const quotePrice = priceMap.get(productId) || 0;
  const mustPay = normalize(o.productionStatus) === PRODUCTION_DONE ? quotePrice * (o.quantity || 0) : 0;
  const paid = normalize(o.orderStatus) === ORDER_DELIVERED ? (o.codAmount || 0) : 0;
  // Thanh toán tay (manualPayment) được trừ thêm vào công thức Cần Thanh Toán
  const manualPayment = Number(o.manualPayment || 0);
  const needToPay = paid - mustPay - manualPayment;
      rows.push({
        orderId: String(o._id),
        productId: o.productId?._id || o.productId,
        product: o.productId?.name || productId,
        customerName: o.customerName,
        quantity: o.quantity || 0,
        productionStatus: o.productionStatus,
        orderStatus: o.orderStatus,
        trackingNumber: o.trackingNumber || '',
        codAmount: o.codAmount || 0,
        quotePrice,
        mustPay,
        paid,
  manualPayment,
        needToPay,
        createdAt: o.createdAt,
      });
    }
    return rows;
  }

  /** Cập nhật Summary1 theo cặp (agentId, productId) khi Báo giá thay đổi, không rebuild toàn bộ */
  async updateSummaryForAgentProduct(agentId: string, productId: string): Promise<number> {
    try {
      const agentObjectId = new Types.ObjectId(agentId);
      const productObjectId = new Types.ObjectId(productId);

      // Tìm báo giá mới nhất ở trạng thái "Đã duyệt" cho cặp agent+product
      const quotes = await this.quoteModel
        .find({ $and: [
          { productId: productObjectId },
          { $or: [ { agentId: agentObjectId }, { agentId } ] },
          { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
        ] })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();
      const normalizeStatus = (s: any) => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '');
      const isApproved = (s: any) => normalizeStatus(s) === 'daduyet';
      let approvedPrice = 0;
      for (const q of quotes as any[]) {
        if (isApproved(q.status)) { approvedPrice = Number(q.price) || 0; break; }
      }

      // Lấy các dòng Summary1 liên quan để cập nhật các cột tính toán
      const rows = await this.summaryModel
        .find({ agentId: agentObjectId, productId: productObjectId })
        .lean();
      if (!rows.length) return 0;

      // Nạp manualPayment từ Summary1 DB để tính toán needToPay
      const orderIds = rows.map((r: any) => r.orderId).filter(Boolean);
      const orders = orderIds.length
        ? await this.orderModel.find({ _id: { $in: orderIds } }).select({ _id: 1, manualPayment: 1, orderStatus: 1, productionStatus: 1, codAmount: 1, quantity: 1 }).lean()
        : [];
      const orderMap = new Map<string, any>(orders.map((o: any) => [String(o._id), o]));

      const norm = (s: any) => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const PRODUCTION_DONE = norm('Đã trả kết quả');
      const ORDER_DELIVERED = norm('Giao thành công');

      const ops = rows.map((r: any) => {
        const quotePrice = approvedPrice;
        const mustPay = norm(r.productionStatus) === PRODUCTION_DONE ? (quotePrice * (r.quantity || 0)) : 0;
        const paid = norm(r.orderStatus) === ORDER_DELIVERED ? (r.codAmount || 0) : 0;
        const ord = orderMap.get(String(r.orderId));
        const manualPayment = Number(ord?.manualPayment || 0);
        const needToPay = paid - mustPay - manualPayment;
        return {
          updateOne: {
            filter: { _id: r._id },
            update: { $set: { quotePrice, mustPay, paid, manualPayment, needToPay } },
          },
        };
      });
      if (ops.length) await this.summaryModel.bulkWrite(ops);
      this.logger.log(`Update Summary1 by quote: agent=${agentId}, product=${productId}, rows=${rows.length}, approvedPrice=${approvedPrice}`);
      return rows.length;
    } catch (e: any) {
      this.logger.error(`updateSummaryForAgentProduct error: ${e?.message || e}`);
      return 0;
    }
  }

  /** Chỉ đẩy dữ liệu Summary1 trong DB lên Google Sheets, không rebuild */
  async pushOnly(agentId: string): Promise<void> {
    await this.writeSummaryFromDbToGoogleSheet(agentId);
  }

  /** Lên lịch chỉ push (không rebuild), debounce theo agent */
  schedulePushOnly(agentId: string, delayMs = 1500) {
    try {
      const key = String(agentId);
      const existing = this.pendingPushOnlyByAgent.get(key);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(() => {
        this.pendingPushOnlyByAgent.delete(key);
        this.pushOnly(key).catch((e) => this.logger.error(`Lỗi push-only agent ${key}: ${e?.message || e}`));
      }, delayMs);
      this.pendingPushOnlyByAgent.set(key, handle);
      this.logger.log(`Đã lên lịch push-only agent ${key} sau ${delayMs}ms`);
    } catch (e: any) {
      this.logger.error(`Không thể lên lịch push-only: ${e?.message || e}`);
    }
  }

  /** Chẩn đoán: lấy price map theo agent */


  /** Lưu dữ liệu Tổng hợp 1 vào DB (upsert theo agentId+orderId) */
  async saveSummaryToDb(agentId: string, rows: any[]): Promise<void> {
    const bulk = this.summaryModel.bulkWrite(
      rows.map((r) => ({
        updateOne: {
          filter: { agentId: new Types.ObjectId(agentId), orderId: new Types.ObjectId(r.orderId) },
          update: {
            $set: {
              agentId: new Types.ObjectId(agentId),
              orderId: new Types.ObjectId(r.orderId),
              productId: r.productId ? new Types.ObjectId(r.productId) : undefined,
              product: r.product,
              customerName: r.customerName,
              quantity: r.quantity,
              productionStatus: r.productionStatus,
              orderStatus: r.orderStatus,
              trackingNumber: r.trackingNumber,
              codAmount: r.codAmount,
              quotePrice: r.quotePrice,
              mustPay: r.mustPay,
              paid: r.paid,
              needToPay: r.needToPay,
              createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
            },
          },
          upsert: true,
        },
      }))
    );
    await bulk;
    // Optionally, remove stale rows for this agent where orderId no longer exists
    const validIds = new Set(rows.map((r) => String(r.orderId)));
    await this.summaryModel.deleteMany({ agentId: new Types.ObjectId(agentId), orderId: { $nin: Array.from(validIds).map(id => new Types.ObjectId(id)) } });
  }

  /** Nạp Summary1 từ DB và ghi lên Google Sheets theo link của đại lý */
  async writeSummaryFromDbToGoogleSheet(agentId: string): Promise<void> {
    const rows = await this.summaryModel
      .find({ agentId: new Types.ObjectId(agentId) })
      .sort({ createdAt: -1 })
      .lean();
    const user = await this.userModel.findById(agentId).lean();
    if (!user) {
      this.logger.warn(`Không tìm thấy user/đại lý: ${agentId}`);
      return;
    }
    const link = (user as any).googleDriveLink;
    if (!link) {
      this.logger.warn(`Đại lý ${agentId} không có Google Drive/Sheet link.`);
      return;
    }

  // Triển khai ghi thực tế bằng Google Sheets API v4.
  // Lấy spreadsheetId từ link (hỗ trợ link dạng https://docs.google.com/spreadsheets/d/<id>/edit)
    try {
      // Chuyển rows thành ma trận giá trị cho Google Sheet (chỉ các cột cần thiết)
      // Lưu ý: KHÔNG ghi header; chỉ ghi dữ liệu từ hàng A3 trở xuống theo yêu cầu
      const header = [
  'date', 'product', 'customerName', 'quantity', 'productionStatus', 'orderStatus',
  'trackingNumber', 'codAmount', 'đặt cọc', 'quotePrice', 'mustPay', 'paid', 'manualPayment', 'needToPay'
      ];
      const fmtDate = (d: any) => {
        try {
          const dt = d instanceof Date ? d : (d ? new Date(d) : null);
          if (!dt || isNaN(dt.getTime())) return '';
          const dd = String(dt.getDate()).padStart(2, '0');
          const mm = String(dt.getMonth() + 1).padStart(2, '0');
          const yyyy = dt.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        } catch { return ''; }
      };
      const values = rows.map((r: any) => [
        fmtDate(r.createdAt),
        r.product || '',
        r.customerName || '',
        r.quantity ?? 0,
        r.productionStatus || '',
        r.orderStatus || '',
        r.trackingNumber || '',
        r.codAmount ?? 0,
        '', // đặt cọc - chưa có trong schema, để trống
        r.quotePrice ?? 0,
        r.mustPay ?? 0,
        r.paid ?? 0,
  r.manualPayment ?? 0,
        r.needToPay ?? 0,
      ]);

      const spreadsheetId = this.extractSpreadsheetId(link);
      if (!spreadsheetId) {
        this.logger.warn(`Không trích xuất được spreadsheetId từ link: ${link}`);
        return;
      }

  const auth = await this.getGoogleAuth();
      if (!auth) {
        this.logger.warn('Thiếu GOOGLE_APPLICATION_CREDENTIALS hoặc GOOGLE_CREDENTIALS_JSON để xác thực Google.');
        return;
      }
      const sheets = google.sheets({ version: 'v4', auth });
  const range = 'Summary1!A3';
  await this.ensureSheetExists(sheets, spreadsheetId, 'Summary1');
      
      // Clear từ hàng A3 trở xuống (giữ nguyên A1-A2)
      const clearRange = 'Summary1!A3:Z';
      await sheets.spreadsheets.values.clear({ spreadsheetId, range: clearRange });
      
      // Update values từ A3
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values },
      });
  this.logger.log(`Đã ghi ${values.length} dòng Summary1 từ A3 (${header.length} cột) vào Google Sheet: ${spreadsheetId}`);
    } catch (err) {
      const anyErr: any = err;
      const detail = anyErr?.response?.data?.error || anyErr?.errors || anyErr?.message || anyErr;
  this.logger.error(`Lỗi ghi Google Sheet Summary1: ${JSON.stringify(detail)}`);
    }
  }

  /** Xây dữ liệu Quotes theo đại lý cho sheet 'Quotes' */
  async buildQuotesRowsForAgent(agentId: string): Promise<any[]> {
    const agentObjectId = new Types.ObjectId(agentId);
    const quotes = await this.quoteModel
      .find({ $or: [ { agentId: agentObjectId }, { agentId } ] })
      .populate('productId', 'name sku price')
      .sort({ createdAt: -1 })
      .lean();
    this.logger.log(`Quotes sync: tìm thấy ${quotes.length} báo giá cho agent ${agentId}`);
    const fmtDate = (d: any) => {
      try {
        const dt = d instanceof Date ? d : (d ? new Date(d) : null);
        if (!dt || isNaN(dt.getTime())) return '';
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yyyy = dt.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      } catch { return ''; }
    };
    return (quotes as any[]).map((q) => ({
      createdAt: fmtDate(q.createdAt),
      product: q.productId?.name || String(q.productId),
      sku: q.productId?.sku || '',
      price: q.price || 0,
      status: q.status,
      expiryDate: fmtDate(q.expiryDate),
      notes: q.notes || '',
    }));
  }

  /** Ghi sheet 'Quotes' cho đại lý */
  async writeQuotesToGoogleSheet(agentId: string, rows: any[]): Promise<void> {
    const user = await this.userModel.findById(agentId).lean();
    if (!user) {
      this.logger.warn(`Không tìm thấy user/đại lý: ${agentId}`);
      return;
    }
    const link = (user as any).googleDriveLink;
    if (!link) {
      this.logger.warn(`Đại lý ${agentId} không có Google Drive/Sheet link.`);
      return;
    }
    try {
      const header = ['date', 'product', 'sku', 'price', 'status', 'expiryDate', 'notes'];
      const values = [header, ...rows.map(r => [r.createdAt, r.product, r.sku, r.price, r.status, r.expiryDate, r.notes])];
      const spreadsheetId = this.extractSpreadsheetId(link);
      if (!spreadsheetId) {
        this.logger.warn(`Không trích xuất được spreadsheetId từ link: ${link}`);
        return;
      }
      const auth = await this.getGoogleAuth();
      if (!auth) {
        this.logger.warn('Thiếu GOOGLE_APPLICATION_CREDENTIALS hoặc GOOGLE_CREDENTIALS_JSON để xác thực Google.');
        return;
      }
      const sheets = google.sheets({ version: 'v4', auth });
      const range = 'Quotes!A1';
      await this.ensureSheetExists(sheets, spreadsheetId, 'Quotes');
      await sheets.spreadsheets.values.clear({ spreadsheetId, range });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values },
      });
  this.logger.log(`Đã ghi ${values.length - 1} dòng Quotes vào Google Sheet: ${spreadsheetId}`);
    } catch (err) {
      const anyErr: any = err;
      const detail = anyErr?.response?.data?.error || anyErr?.errors || anyErr?.message || anyErr;
      this.logger.error(`Lỗi ghi Google Sheet (Quotes): ${JSON.stringify(detail)}`);
    }
  }

  /** Đảm bảo sheet tab tồn tại, nếu chưa có thì tạo */
  private async ensureSheetExists(sheets: sheets_v4.Sheets, spreadsheetId: string, title: string) {
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      const exists = (meta.data.sheets || []).some((s) => s.properties?.title === title);
      if (!exists) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title },
                },
              },
            ],
          },
        });
        this.logger.log(`Đã tạo sheet tab '${title}' trong spreadsheet ${spreadsheetId}`);
      }
    } catch (e) {
      this.logger.warn(`Không thể kiểm tra/tạo sheet '${title}': ${e}`);
    }
  }

  private extractSpreadsheetId(link: string): string | null {
    if (!link) return null;
    const cleaned = decodeURIComponent(String(link)).replace(/\s+/g, ''); // loại bỏ xuống dòng/khoảng trắng
    // Dạng chuẩn: https://docs.google.com/spreadsheets/d/<id>/edit
    let m = cleaned.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m) return m[1];
    // Dạng open?id=<id>
    m = cleaned.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (m) return m[1];
    // Fallback: lấy chuỗi dài giống id nếu có (>= 20 ký tự an toàn)
    m = cleaned.match(/([a-zA-Z0-9-_]{20,})/);
    return m ? m[1] : null;
  }

  private async getGoogleAuth(): Promise<any | null> {
    try {
      const jsonInline = process.env.GOOGLE_CREDENTIALS_JSON;
      if (jsonInline) {
        const credentials = JSON.parse(jsonInline);
        return new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }

      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (credPath) {
        const full = path.resolve(credPath);
        if (fs.existsSync(full)) {
          return new google.auth.GoogleAuth({
            keyFile: full,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          });
        } else {
          this.logger.warn(`GOOGLE_APPLICATION_CREDENTIALS chỉ ra đường dẫn không tồn tại: ${full}`);
        }
      }
      // Fallback local: nếu không có biến môi trường, thử các vị trí tương đối trong repo
      // - ${workspaceRoot}/dongbodulieuweb-8de0c9a12896.json (repo root)
      // - ${workspaceRoot}/backend/dongbodulieuweb-8de0c9a12896.json (backend root)
      // - CWD và __dirname-based để tương thích khi chạy dist hoặc ts-node
      const candidates = [
        // repo root (từ __dirname = backend/src/google-sync -> ../../.. = repo root)
        path.resolve(__dirname, '..', '..', '..', 'dongbodulieuweb-8de0c9a12896.json'),
        // backend root
        path.resolve(__dirname, '..', '..', 'dongbodulieuweb-8de0c9a12896.json'),
        // cwd (khi chạy trong backend/)
        path.resolve(process.cwd(), 'dongbodulieuweb-8de0c9a12896.json'),
        // repo root từ cwd (khi cwd=backend/)
        path.resolve(process.cwd(), '..', 'dongbodulieuweb-8de0c9a12896.json'),
      ];
      for (const c of candidates) {
        try {
          if (fs.existsSync(c)) {
            this.logger.warn(`Sử dụng fallback credentials tại: ${c}`);
            return new google.auth.GoogleAuth({
              keyFile: c,
              scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
          }
        } catch {}
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Trả về thông tin debug việc tìm credentials để dễ chẩn đoán */
  authDebugInfo() {
    const info: any = {
      cwd: process.cwd(),
      __dirname,
      env: {
        has_GOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
        has_GOOGLE_CREDENTIALS_JSON: !!process.env.GOOGLE_CREDENTIALS_JSON,
      },
      resolved: {} as any,
      candidates: [] as any[],
    };
    try {
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (credPath) {
        const full = path.resolve(credPath);
        info.resolved.path = full;
        info.resolved.exists = fs.existsSync(full);
      }
    } catch {}
    const candidates = [
      path.resolve(__dirname, '..', '..', '..', 'dongbodulieuweb-8de0c9a12896.json'),
      path.resolve(__dirname, '..', '..', 'dongbodulieuweb-8de0c9a12896.json'),
      path.resolve(process.cwd(), 'dongbodulieuweb-8de0c9a12896.json'),
      path.resolve(process.cwd(), '..', 'dongbodulieuweb-8de0c9a12896.json'),
    ];
    for (const c of candidates) {
      try {
        info.candidates.push({ path: c, exists: fs.existsSync(c) });
      } catch {
        info.candidates.push({ path: c, exists: false });
      }
    }
    return info;
  }

  /** Test ghi Google Sheets với dữ liệu đơn giản */


  /** Đồng bộ cho một đại lý */
  async syncAgent(agentId: string): Promise<void> {
    this.logger.log(`Bắt đầu đồng bộ agent ${agentId}...`);
  const rows = await this.buildSummaryForAgent(agentId);
  const priceHit = rows.filter(r => (r.quotePrice || 0) > 0).length;
  this.logger.log(`Summary1 sync: rows=${rows.length}, withQuotePrice=${priceHit}, withoutQuotePrice=${rows.length - priceHit}`);
  // Lưu vào DB trước
  await this.saveSummaryToDb(agentId, rows);
  // Ghi ra Google Sheet từ dữ liệu DB (nguồn chuẩn Tổng hợp 1)
  await this.writeSummaryFromDbToGoogleSheet(agentId);
  }

  /** Lên lịch đồng bộ (debounce) sau một khoảng trễ nhỏ khi có thay đổi đơn hàng) */
  scheduleAgentSync(agentId: string, delayMs = 2000) {
    try {
      const key = String(agentId);
      const existing = this.pendingByAgent.get(key);
      if (existing) {
        clearTimeout(existing);
      }
      const handle = setTimeout(() => {
        this.pendingByAgent.delete(key);
        this.syncAgent(key).catch((e) => this.logger.error(`Lỗi đồng bộ agent ${key}: ${e?.message || e}`));
      }, delayMs);
      this.pendingByAgent.set(key, handle);
      this.logger.log(`Đã lên lịch đồng bộ agent ${key} sau ${delayMs}ms`);
    } catch (e: any) {
      this.logger.error(`Không thể lên lịch đồng bộ: ${e?.message || e}`);
    }
  }

  /** Đồng bộ tất cả đại lý có link Google */
  async syncAllAgents(): Promise<void> {
    const agents = await this.userModel.find({ role: { $in: ['internal_agent', 'external_agent'] }, isActive: true }).lean();
    for (const a of agents as any[]) {
      if (a.googleDriveLink) {
        await this.syncAgent(String(a._id));
      }
    }
  }

  /** Lịch chạy mỗi 10 phút - ĐÃ VÔ HIỆU HÓA */
  // @Cron(CronExpression.EVERY_10_MINUTES)
  // async handleCron() {
  //   this.logger.log('Cron: Đồng bộ Google Sheets mỗi 10 phút');
  //   await this.syncAllAgents();
  // }
}
