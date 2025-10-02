import { Body, Controller, Get, Post, Query, Req, Res, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessage } from './schemas/chat-message.schema';
import { Conversation } from './schemas/conversation.schema';
import { ChatMessageService } from './chat-message.service';
import { Fanpage, FanpageDocument } from '../fanpage/schemas/fanpage.schema';
import { OpenAIConfigService } from '../openai-config/openai-config.service';
import { VisionAIService } from '../product/vision-ai.service';
import fetch from 'node-fetch';

interface WebhookParams {
  fanpage: any;
  pageId: string;
  senderPsid: string;
  lastUserMessage: string;
  savedInboundId?: string;
  hasProductIntent?: boolean;
}

interface MessagingEvent {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    attachments?: any[];
    to?: { id: string };
  };
  postback?: {
    payload?: string;
  };
}

/**
 * Facebook Messenger Webhook Controller
 * 
 * Handles:
 * - GET: Webhook verification for Facebook
 * - POST: Receives messages and triggers AI auto-reply
 * 
 * Features:
 * - Automatic AI response based on fanpage configuration
 * - Message persistence to database
 * - Conversation state management
 */
@Controller('webhook/messenger')
export class MessengerWebhookController {
  private readonly logger = new Logger(MessengerWebhookController.name);
  private readonly isDebugMode = process.env.CHAT_WEBHOOK_DEBUG === '1';

  constructor(
    private readonly chatService: ChatMessageService,
    @InjectModel(Fanpage.name) private fanpageModel: Model<FanpageDocument>,
    private readonly openaiConfig: OpenAIConfigService,
    private readonly visionAIService: VisionAIService,
  ) {}

  /**
   * Webhook verification endpoint for Facebook
   */
  @Get()
  async verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expectedToken = process.env.MESSENGER_VERIFY_TOKEN || 
                         process.env.FB_VERIFY_TOKEN || 
                         'dev-verify-token';
    
    if (mode === 'subscribe' && token === expectedToken) {
      this.logger.log('Webhook verification successful');
      return res.status(200).send(challenge);
    }
    
    this.logger.warn('Webhook verification failed', { mode, token });
    return res.status(403).send('Verification failed');
  }

  /**
   * Webhook event receiver for Facebook Messenger
   */
  @Post()
  async receive(
    @Body() body: any, 
    @Res() res: Response, 
    @Req() req: Request
  ) {
    if (body.object !== 'page') {
      return res.status(400).json({ message: 'Unsupported object type' });
    }

    try {
      await this.processWebhookEntries(body.entry || []);
      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      this.logger.error('Webhook processing failed', error.stack);
      return res.status(500).json({ 
        message: 'Webhook processing error', 
        error: error.message 
      });
    }
  }

  /**
   * Process webhook entries from Facebook
   */
  private async processWebhookEntries(entries: any[]): Promise<void> {
    for (const entry of entries) {
      const pageId = entry.id;
      const fanpage = await this.getFanpage(pageId);
      
      for (const messagingEvent of entry.messaging || []) {
        await this.processMessagingEvent(messagingEvent, fanpage, pageId);
      }
    }
  }

  /**
   * Get or update fanpage information
   */
  private async getFanpage(pageId: string): Promise<any> {
    let fanpage = await this.fanpageModel.findOne({ pageId }).lean();
    
    if (fanpage && !fanpage.subscribedWebhook) {
      await this.fanpageModel.updateOne(
        { _id: fanpage._id }, 
        { 
          $set: { 
            subscribedWebhook: true, 
            connectedAt: fanpage.connectedAt || new Date() 
          } 
        }
      );
      fanpage = await this.fanpageModel.findOne({ pageId }).lean();
    }
    
    return fanpage;
  }

  /**
   * Process individual messaging events
   */
  private async processMessagingEvent(
    messagingEvent: MessagingEvent, 
    fanpage: any, 
    pageId: string
  ): Promise<void> {
    const senderPsid = messagingEvent.sender?.id;
    const recipientId = messagingEvent.recipient?.id;
    const timestamp = messagingEvent.timestamp ? 
      new Date(messagingEvent.timestamp) : new Date();

    if (!senderPsid || !recipientId) return;

    if (messagingEvent.message) {
      await this.handleTextMessage(
        messagingEvent.message, 
        fanpage, 
        pageId, 
        senderPsid, 
        timestamp
      );
    } else if (messagingEvent.postback) {
      await this.handlePostback(
        messagingEvent.postback, 
        fanpage, 
        pageId, 
        senderPsid, 
        timestamp
      );
    }
  }

  /**
   * Handle text messages
   */
  private async handleTextMessage(
    message: any, 
    fanpage: any, 
    pageId: string, 
    senderPsid: string, 
    timestamp: Date
  ): Promise<void> {
    const isInbound = senderPsid !== pageId;
    const content = message.text || (message.attachments ? '[Attachment]' : '[Empty]');

    // Try to extract Ad Group ID from referral or message context
    let adGroupId: string | undefined;
    
    // Check if there's a referral with ad group info (from Facebook Ads)
    if (message.referral?.ref) {
      const ref = message.referral.ref;
      // Facebook ads often use format like: ad_<adgroupid> or adset_<adgroupid>
      const adGroupMatch = ref.match(/(?:ad_|adset_|adgroup_)(\d+)/i);
      if (adGroupMatch) {
        adGroupId = adGroupMatch[1];
      }
    }

    // Check message metadata or quick_reply payload for ad group info
    if (!adGroupId && message.quick_reply?.payload) {
      const payload = message.quick_reply.payload;
      const adGroupMatch = payload.match(/adgroup[_:](\d+)/i);
      if (adGroupMatch) {
        adGroupId = adGroupMatch[1];
      }
    }

    const savedMessage = await this.chatService.create({
      fanpageId: fanpage?._id?.toString() || pageId,
      senderPsid: isInbound ? senderPsid : (message.to?.id || senderPsid),
      content,
      direction: isInbound ? 'in' : 'out',
      raw: message,
      receivedAt: timestamp as any,
      awaitingHuman: isInbound,
      adGroupId: adGroupId || undefined, // Add detected ad group ID
    });

    if (this.isDebugMode) {
      this.logger.debug('Message processed', {
        pageId,
        isInbound,
        senderPsid,
        contentSnippet: content.slice(0, 80)
      });
    }

    if (isInbound) {
      // Check for product-related keywords and trigger smart product matching
      const productKeywords = ['sản phẩm', 'hàng', 'mua', 'bán', 'giá', 'ảnh', 'hình', 'catalog', 'danh sách'];
      const hasProductIntent = productKeywords.some(keyword => 
        content.toLowerCase().includes(keyword)
      );

      this.triggerAutoAiReply({
        fanpage,
        pageId,
        senderPsid,
        lastUserMessage: content,
        savedInboundId: (savedMessage as any)._id?.toString(),
        hasProductIntent
      });
    }
  }

  /**
   * Handle postback events
   */
  private async handlePostback(
    postback: any, 
    fanpage: any, 
    pageId: string, 
    senderPsid: string, 
    timestamp: Date
  ): Promise<void> {
    const payload = postback.payload || '[Postback]';

    await this.chatService.create({
      fanpageId: fanpage?._id?.toString() || pageId,
      senderPsid,
      content: '[POSTBACK] ' + payload,
      direction: 'in',
      raw: postback,
      receivedAt: timestamp as any,
      awaitingHuman: true,
    });

    if (this.isDebugMode) {
      this.logger.debug('Postback processed', { pageId, senderPsid, payload });
    }

    this.triggerAutoAiReply({
      fanpage,
      pageId,
      senderPsid,
      lastUserMessage: payload
    });
  }

  /**
   * Trigger auto AI reply safely (non-blocking)
   */
  private triggerAutoAiReply(params: WebhookParams): void {
    this.autoAiReplySafe(params).catch(error => {
      if (this.isDebugMode) {
        this.logger.error('Auto AI reply failed', error.message);
      }
    });
  }

  /**
   * Auto AI Reply Service - Optimized and clean version with Smart Product Matching
   */
  private async autoAiReplySafe(params: WebhookParams): Promise<void> {
    try {
      const { fanpage, pageId, senderPsid, lastUserMessage, hasProductIntent } = params;
      
      if (this.isDebugMode) {
        this.logger.debug('Auto AI reply started', {
          pageId,
          senderPsid,
          messageSnippet: lastUserMessage.slice(0, 50)
        });
      }

      // Get fanpage if not provided
      const fp = fanpage || await this.fanpageModel.findOne({ pageId }).lean();
      if (!fp || !fp.aiEnabled) {
        if (this.isDebugMode) {
          this.logger.debug('AI disabled or fanpage not found', { pageId });
        }
        return;
      }

      // Check if AI already replied to latest inbound message
      const convData = await this.chatService.getConversation(fp._id.toString(), senderPsid);
      const recentMessages = convData.messages.slice(0, 10);

      const lastInbound = recentMessages.find(m => m.direction === 'in');
      const hasAiReplyToLastInbound = lastInbound && recentMessages.some(m => 
        m.direction === 'out' && 
        m.isAI && 
        (m as any).createdAt && 
        (lastInbound as any).createdAt &&
        new Date((m as any).createdAt).getTime() > new Date((lastInbound as any).createdAt).getTime()
      );

      if (hasAiReplyToLastInbound) {
        if (this.isDebugMode) {
          this.logger.debug('AI already replied to latest inbound');
        }
        return;
      }

      // Check conversation-level AI settings
      const conversation = await this.chatService.listConversations({ 
        fanpageId: fp._id.toString(), 
        senderPsid 
      });
      const convItem = Array.isArray(conversation.items) ? 
        conversation.items.find(c => c.senderPsid === senderPsid) : null;
      
      if (convItem && convItem.autoAiEnabled === false) {
        return;
      }

      // Check if fanpage has content for AI
      const description = fp.description || '';
      const greetingScript = fp.greetingScript || '';
      if (!description && !greetingScript) {
        return;
      }

      // Get OpenAI configuration
      let config: any = null;
      if (fp.openAIConfigId) {
        try {
          config = await this.openaiConfig.findOne(fp.openAIConfigId.toString());
        } catch (error) {
          this.logger.warn('OpenAI config not found for fanpage', fp.openAIConfigId);
        }
      }

      if (!config) {
        config = await this.openaiConfig.pickConfig({ 
          fanpageId: fp._id.toString() 
        });
      }

      if (!config || !config.apiKey || config.apiKey === 'placeholder-key') {
        if (this.isDebugMode) {
          this.logger.debug('No valid OpenAI config found');
        }
        return;
      }

      if (this.isDebugMode) {
        this.logger.debug('OpenAI config loaded', {
          configName: config.name,
          model: config.model
        });
      }

      // Smart Product Matching if user has product intent
      let productRecommendations = [];
      if (hasProductIntent) {
        try {
          productRecommendations = await this.visionAIService.findSimilarProducts(
            lastUserMessage,
            fp._id.toString(),
            3 // Limit to 3 recommendations
          );
          
          if (this.isDebugMode) {
            this.logger.debug('Product recommendations found', {
              count: productRecommendations.length,
              products: productRecommendations.map(r => r.product.name)
            });
          }
        } catch (error) {
          this.logger.warn('Product matching failed', error.message);
        }
      }

      // Generate AI response with product context
      const aiResponse = await this.generateAiResponse(
        fp, 
        senderPsid, 
        lastUserMessage, 
        config, 
        productRecommendations
      );
      if (!aiResponse) {
        if (this.isDebugMode) {
          this.logger.debug('AI response generation failed');
        }
        return;
      }

      // Send response via Facebook API
      const success = await this.sendFacebookMessage(fp, senderPsid, aiResponse, config.model);
      
      if (success && params.savedInboundId) {
        try {
          await (this.chatService as any).update(params.savedInboundId, { 
            awaitingHuman: false 
          });
        } catch (error) {
          this.logger.warn('Failed to update inbound message', error.message);
        }
      }

      if (this.isDebugMode) {
        this.logger.debug('AI response sent successfully', {
          senderPsid,
          responseSnippet: aiResponse.slice(0, 60)
        });
      }
    } catch (error) {
      this.logger.error('Auto AI reply error', error.stack);
    }
  }

  /**
   * Generate AI response using OpenAI API
   */
  private async generateAiResponse(
    fanpage: any,
    senderPsid: string,
    lastUserMessage: string,
    config: any,
    productRecommendations: any[] = []
  ): Promise<string | null> {
    try {
      // Get recent conversation history
      const convData = await this.chatService.getConversation(fanpage._id.toString(), senderPsid);
      const recentMessages = convData.messages.slice(0, 10).reverse();

      // Build system prompt with product recommendations
      let systemPrompt = `Bạn là trợ lý AI thân thiện của fanpage "${fanpage.name}". `;
      
      if (fanpage.description) {
        systemPrompt += `Thông tin kinh doanh: ${fanpage.description.slice(0, 400)}. `;
      }
      
      if (fanpage.greetingScript) {
        systemPrompt += `Lời chào: "${fanpage.greetingScript.slice(0, 200)}". `;
      }

      // Add product recommendations if available
      if (productRecommendations.length > 0) {
        systemPrompt += `\n\nSẢN PHẨM GỢI Ý phù hợp với yêu cầu:\n`;
        productRecommendations.forEach((rec, index) => {
          const product = rec.product;
          const price = product.importPrice ? `${product.importPrice.toLocaleString()}đ` : 'Liên hệ';
          systemPrompt += `${index + 1}. ${product.name} - ${price}`;
          if (product.aiDescription) {
            systemPrompt += ` (${product.aiDescription.slice(0, 50)}...)`;
          }
          systemPrompt += `\n`;
        });
        systemPrompt += `Hãy giới thiệu những sản phẩm này một cách tự nhiên và hấp dẫn.\n`;
      }
      
      systemPrompt += `Hãy trả lời ngắn gọn (1-2 câu), thân thiện bằng tiếng Việt dựa trên lịch sử hội thoại. `;
      systemPrompt += `Nếu cần tư vấn chi tiết, nói: "Mình đã ghi nhận, nhân viên sẽ hỗ trợ chi tiết sớm!". `;
      systemPrompt += `Không bịa thông tin không có.`;

      // Prepare messages for OpenAI
      const promptMessages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map(m => ({
          role: m.direction === 'in' ? 'user' : 'assistant',
          content: m.content
        })),
        { role: 'user', content: lastUserMessage }
      ];

      // Call OpenAI API
      const model = config.model || 'gpt-4o-mini';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: promptMessages,
          temperature: config.temperature ?? 0.7,
          max_tokens: Math.min(160, config.maxTokens || 200)
        })
      });

      const responseData: any = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error?.message || 'OpenAI API error');
      }

      const aiText = (responseData.choices?.[0]?.message?.content || '').trim();
      return aiText || null;
    } catch (error) {
      if (this.isDebugMode) {
        this.logger.error('AI response generation failed', error.message);
      }
      return null;
    }
  }

  /**
   * Send message to Facebook Messenger API
   */
  private async sendFacebookMessage(
    fanpage: any,
    senderPsid: string,
    message: string,
    aiModel: string
  ): Promise<boolean> {
    try {
      const graphVersion = process.env.FB_GRAPH_VERSION || 'v23.0';
      const accessToken = fanpage.accessToken;
      
      if (!accessToken) {
        this.logger.warn('No access token for fanpage', { fanpageId: fanpage._id });
        return false;
      }

      const url = `https://graph.facebook.com/${graphVersion}/me/messages?access_token=${encodeURIComponent(accessToken)}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: senderPsid },
          message: { text: message }
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(`Facebook API error: ${JSON.stringify(responseData)}`);
      }

      // Save outbound AI message to database
      await this.chatService.create({
        fanpageId: fanpage._id.toString(),
        senderPsid,
        content: message,
        direction: 'out',
        isAI: true,
        aiModelUsed: aiModel,
        raw: responseData,
        receivedAt: new Date() as any,
        awaitingHuman: false,
      } as any);

      return true;
    } catch (error) {
      if (this.isDebugMode) {
        this.logger.error('Facebook message send failed', error.message);
      }
      return false;
    }
  }


}
