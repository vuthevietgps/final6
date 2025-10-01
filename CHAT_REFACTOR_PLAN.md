/**
 * CHAT MESSAGE REFACTORING PLAN
 * 
 * CURRENT ISSUES:
 * 1. Too many unnecessary CRUD endpoints for individual messages
 * 2. Database bloat potential with high message volume
 * 3. Redundant data storage (both messages and conversation summaries)
 * 4. Complex maintenance with dual data models
 * 
 * PROPOSED SOLUTION:
 * 1. Keep Conversation-level management (aggregate data)
 * 2. Remove individual ChatMessage CRUD endpoints
 * 3. Keep only essential message operations:
 *    - Send message (outbound)
 *    - AI generation
 *    - Webhook processing (inbound)
 *    - Order extraction from conversation
 * 4. Simplify ChatMessage to be append-only for analysis
 * 
 * ENDPOINTS TO REMOVE:
 * - GET /chat-messages (list individual messages)
 * - GET /chat-messages/:id (get single message)
 * - PATCH /chat-messages/:id (update message)
 * - DELETE /chat-messages/:id (delete message)
 * - POST /chat-messages (manual message creation)
 * 
 * ENDPOINTS TO KEEP:
 * - GET /chat-messages/conversations/list/all (conversation list)
 * - GET /chat-messages/conversations/:fanpageId/:senderPsid (conversation details)
 * - POST /chat-messages/send (send reply to customer)
 * - POST /chat-messages/send/ai (AI generation)
 * - GET /chat-messages/conversations/:fanpageId/:senderPsid/extract-order
 * - PATCH /chat-messages/conversations/:fanpageId/:senderPsid/resolve
 * - PATCH /chat-messages/conversations/:fanpageId/:senderPsid/auto-ai
 * 
 * DATABASE OPTIMIZATION:
 * 1. ChatMessage: Append-only, indexed for analytics
 * 2. Conversation: Main working data with aggregates
 * 3. Consider TTL for old ChatMessage documents
 * 4. Keep recent messages (last 50) embedded in Conversation
 * 
 * UI CHANGES:
 * 1. Remove individual message management UI
 * 2. Focus on conversation-level operations
 * 3. Simplified message display (read-only in conversation modal)
 * 4. Remove message editing/deleting features
 */

// Implementation phases:
// Phase 1: Remove unused endpoints and UI
// Phase 2: Optimize data structure
// Phase 3: Add analytics if needed