-- ====================================================================
-- 02. MESSAGING & CHAT SYSTEM SCHEMA (MEDCY HEALTH TECH)
-- Modules: Chat Channels, Chat Messages, Attachments
-- ====================================================================

CREATE TABLE IF NOT EXISTS "HRMS_chat_channels" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "name"          VARCHAR(255),
    "type"          VARCHAR(50) DEFAULT 'direct' CHECK ("type" IN ('direct', 'group')),
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "HRMS_chat_messages" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "channel_id"    UUID NOT NULL REFERENCES "HRMS_chat_channels"("id") ON DELETE CASCADE,
    "sender_id"     VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "text"          TEXT,
    "attachment_url" VARCHAR(255),
    "attachment_type" VARCHAR(50),
    "attachment_name" VARCHAR(255),
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON "HRMS_chat_messages"("channel_id");
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON "HRMS_chat_messages"("sender_id");
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON "HRMS_chat_messages"("created_at" ASC);
