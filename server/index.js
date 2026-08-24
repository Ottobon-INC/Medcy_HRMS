import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for development, restrict in production
    methods: ["GET", "POST"]
  }
});

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Supabase credentials missing! Chat saving will fail.");
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins a specific channel
  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    console.log(`User ${socket.id} joined channel ${channelId}`);
  });

  // User sends a message
  socket.on('send_message', async (data) => {
    const { channel_id, sender_id, text, attachment_url, attachment_type, attachment_name } = data;
    console.log(`Message received in channel ${channel_id}: ${text || '[Attachment]'}`);

    const newMessage = {
      channel_id,
      sender_id,
      text: text || null,
      attachment_url: attachment_url || null,
      attachment_type: attachment_type || null,
      attachment_name: attachment_name || null,
      created_at: new Date().toISOString()
    };

    // Broadcast message to everyone in the channel immediately (optimistic UI)
    io.to(channel_id).emit('receive_message', newMessage);

    // Save message to Supabase
    if (supabase) {
      try {
        const { error } = await supabase
          .from('HRMS_chat_messages')
          .insert([newMessage]);
          
        if (error) {
          console.error("Error saving message to Supabase:", error.message);
        }
      } catch (err) {
        console.error("Exception saving message to Supabase:", err);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 9590;
httpServer.listen(PORT, () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
});
