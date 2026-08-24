# WebRTC Audio Call Feature — Implementation Guide

> **Stack:** React + TypeScript + Supabase (Realtime + Database)  
> **No third-party SDKs required.** Uses 100% native browser WebRTC APIs.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & Infrastructure](#2-prerequisites--infrastructure)
3. [Database Changes](#3-database-changes)
4. [Signaling Service](#4-signaling-service)
5. [Core Hook: useWebRTCCall.ts](#5-core-hook-usewebrtccallts)
6. [UI Component: CallOverlay.tsx](#6-ui-component-calloverlaytsxx)
7. [Integrating Into MessagingModule.tsx](#7-integrating-into-messagingmoduletsx)
8. [Self-Hosted TURN Server (coturn)](#8-self-hosted-turn-server-coturn)
9. [Security Considerations](#9-security-considerations)
10. [Testing Checklist](#10-testing-checklist)
11. [Known Limitations](#11-known-limitations)

---

## 1. Architecture Overview

```
+------------------------------------------------------------------+
|                       SIGNALING LAYER                            |
|               (Supabase Realtime Broadcast)                      |
|  offer / answer / ice-candidate / call-request / call-end        |
+-----------------------------+------------------------------------+
                              |  (only during handshake, ~3s)
             +----------------+----------------+
             v                                 v
    +------------------+             +------------------+
    |  Employee A      |             |  Employee B      |
    |  (Caller)        |<-----------?|  (Receiver)      |
    |  RTCPeerConn     |             |  RTCPeerConn     |
    +------------------+             +------------------+
             |                                 |
             +------------ P2P Audio ----------+
                      (Direct, no server)
```

### Signal Flow

| Step | Who | Action | Via |
|------|-----|--------|-----|
| 1 | Caller | Sends `call-request` with their name | Supabase Realtime |
| 2 | Receiver | Shows incoming call UI | — |
| 3 | Receiver | Accepts ? Sends `call-accepted` | Supabase Realtime |
| 4 | Caller | Creates RTCPeerConnection, sends `offer` (SDP) | Supabase Realtime |
| 5 | Receiver | Receives offer, sends `answer` (SDP) | Supabase Realtime |
| 6 | Both | Exchange `ice-candidate` packets | Supabase Realtime |
| 7 | Both | **P2P audio stream established** | **Direct (WebRTC)** |
| 8 | Either | Hangs up ? Sends `call-end` | Supabase Realtime |

---

## 2. Prerequisites & Infrastructure

### STUN Server
A STUN server helps peers discover their public IP address. Use Google's free public STUN — no account needed:

```ts
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
```

### TURN Server (Optional but Recommended)
Required for users behind strict corporate firewalls (~10-15% of cases). See Section 8 for self-hosting with coturn.

---

## 3. Database Changes

```sql
-- In your Supabase SQL Editor
CREATE TABLE HRMS_call_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id    UUID NOT NULL REFERENCES HRMS_chat_channels(id) ON DELETE CASCADE,
  caller_id     TEXT NOT NULL,
  receiver_id   TEXT NOT NULL,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  duration_secs INT,
  status        TEXT CHECK (status IN ('missed', 'completed', 'rejected')) DEFAULT 'missed',
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE HRMS_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own call logs"
  ON HRMS_call_logs FOR SELECT
  USING (caller_id = auth.uid()::text OR receiver_id = auth.uid()::text);
```

---

## 4. Signaling Service

Create: `src/lib/services/call-signal-service.ts`

```ts
import { supabase } from '../supabase-client';

export type SignalPayload =
  | { type: 'call-request'; callerName: string; callerId: string }
  | { type: 'call-accepted' }
  | { type: 'call-rejected' }
  | { type: 'call-end' }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit };

export function createSignalingChannel(channelId: string) {
  return supabase.channel(`webrtc:${channelId}`, {
    config: { broadcast: { self: false } }
  });
}

export async function sendSignal(
  channel: ReturnType<typeof createSignalingChannel>,
  payload: SignalPayload
) {
  await channel.send({ type: 'broadcast', event: 'signal', payload });
}
```

---

## 5. Core Hook: useWebRTCCall.ts

Create: `src/hooks/useWebRTCCall.ts`

```ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createSignalingChannel, sendSignal, SignalPayload } from '../lib/services/call-signal-service';

export type CallStatus =
  | 'idle'
  | 'ringing_out'
  | 'ringing_in'
  | 'connecting'
  | 'active'
  | 'ended';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add self-hosted TURN here — see Section 8
];

export function useWebRTCCall(
  channelId: string | null,
  currentUserId: string,
  currentUserName: string,
) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [incomingCallerName, setIncomingCallerName] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const signalingChannelRef = useRef<RealtimeChannel | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setCallDuration(0);
    callStartTimeRef.current = null;
    setCallStatus('idle');
    setIncomingCallerName(null);
    setIsMuted(false);
  }, []);

  const startTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    durationTimerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current!) / 1000));
    }, 1000);
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.ontrack = (event) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = event.streams[0];
      setCallStatus('active');
      startTimer();
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannelRef.current) {
        sendSignal(signalingChannelRef.current, {
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        cleanup();
      }
    };

    return pc;
  }, [cleanup, startTimer]);

  const startCall = useCallback(async () => {
    if (!channelId || !signalingChannelRef.current) return;
    setCallStatus('ringing_out');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    const pc = createPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pcRef.current = pc;
    await sendSignal(signalingChannelRef.current, {
      type: 'call-request',
      callerId: currentUserId,
      callerName: currentUserName,
    });
  }, [channelId, currentUserId, currentUserName, createPeerConnection]);

  const acceptCall = useCallback(async () => {
    if (!signalingChannelRef.current) return;
    setCallStatus('connecting');
    await sendSignal(signalingChannelRef.current, { type: 'call-accepted' });
  }, []);

  const rejectCall = useCallback(async () => {
    if (!signalingChannelRef.current) return;
    await sendSignal(signalingChannelRef.current, { type: 'call-rejected' });
    cleanup();
  }, [cleanup]);

  const hangUp = useCallback(async () => {
    if (signalingChannelRef.current) {
      await sendSignal(signalingChannelRef.current, { type: 'call-end' });
    }
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsMuted(prev => !prev);
  }, []);

  const handleSignal = useCallback(async (payload: SignalPayload) => {
    switch (payload.type) {
      case 'call-request': {
        if (payload.callerId === currentUserId) break;
        setIncomingCallerName(payload.callerName);
        setCallStatus('ringing_in');
        break;
      }
      case 'call-accepted': {
        if (!pcRef.current || !signalingChannelRef.current) break;
        setCallStatus('connecting');
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        await sendSignal(signalingChannelRef.current, { type: 'offer', sdp: offer });
        break;
      }
      case 'call-rejected': {
        cleanup();
        break;
      }
      case 'offer': {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        const pc = createPeerConnection();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pcRef.current = pc;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (signalingChannelRef.current) {
          await sendSignal(signalingChannelRef.current, { type: 'answer', sdp: answer });
        }
        break;
      }
      case 'answer': {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        break;
      }
      case 'ice-candidate': {
        if (pcRef.current?.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
        break;
      }
      case 'call-end': {
        cleanup();
        break;
      }
    }
  }, [currentUserId, cleanup, createPeerConnection]);

  useEffect(() => {
    if (!channelId) return;
    const channel = createSignalingChannel(channelId);
    channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
      handleSignal(payload as SignalPayload);
    });
    channel.subscribe();
    signalingChannelRef.current = channel;
    return () => {
      channel.unsubscribe();
      signalingChannelRef.current = null;
    };
  }, [channelId, handleSignal]);

  return { callStatus, incomingCallerName, isMuted, callDuration, startCall, acceptCall, rejectCall, hangUp, toggleMute };
}
```

---

## 6. UI Component: CallOverlay.tsx

Create: `src/components/CallOverlay.tsx`

```tsx
import React from 'react';
import { Phone, PhoneOff, PhoneMissed, Mic, MicOff } from 'lucide-react';
import { CallStatus } from '../hooks/useWebRTCCall';

interface CallOverlayProps {
  status: CallStatus;
  remotePartyName: string;
  isMuted: boolean;
  callDuration: number;
  onAccept: () => void;
  onReject: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CallOverlay({ status, remotePartyName, isMuted, callDuration, onAccept, onReject, onHangUp, onToggleMute }: CallOverlayProps) {
  if (status === 'idle' || status === 'ended') return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 text-white rounded-[32px] p-8 w-80 flex flex-col items-center gap-6 shadow-2xl">

        <div className="w-20 h-20 rounded-full bg-teal-600/30 border-2 border-teal-500 flex items-center justify-center text-3xl font-bold">
          {remotePartyName.charAt(0).toUpperCase()}
        </div>

        <div className="text-center">
          <p className="text-lg font-bold">{remotePartyName}</p>
          <p className="text-slate-400 text-sm mt-1">
            {status === 'ringing_out' && 'Calling...'}
            {status === 'ringing_in' && 'Incoming Audio Call'}
            {status === 'connecting' && 'Connecting...'}
            {status === 'active' && formatDuration(callDuration)}
          </p>
        </div>

        <div className="flex items-center gap-6">
          {status === 'active' && (
            <button onClick={onToggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-amber-500' : 'bg-slate-700 hover:bg-slate-600'}`}>
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
          {status === 'ringing_in' && (
            <button onClick={onAccept} className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg transition-all active:scale-95">
              <Phone className="w-6 h-6" />
            </button>
          )}
          <button onClick={status === 'ringing_in' ? onReject : onHangUp} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all active:scale-95">
            {status === 'ringing_in' ? <PhoneMissed className="w-6 h-6" /> : <PhoneOff className="w-6 h-6" />}
          </button>
        </div>

      </div>
    </div>
  );
}
```

---

## 7. Integrating Into MessagingModule.tsx

### Step 1 — Add imports

```tsx
import { useWebRTCCall } from '../hooks/useWebRTCCall';
import CallOverlay from './CallOverlay';
import { Phone } from 'lucide-react';
```

### Step 2 — Initialize the hook inside the component

```tsx
const {
  callStatus, incomingCallerName, isMuted, callDuration,
  startCall, acceptCall, rejectCall, hangUp, toggleMute,
} = useWebRTCCall(channelId, currentUser.id, currentUser.name);
```

### Step 3 — Add call button in the chat header

```tsx
{selectedUser && selectedUser !== 'group' && (
  <button
    onClick={startCall}
    disabled={callStatus !== 'idle'}
    className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-50 text-teal-600 hover:bg-teal-100 disabled:opacity-40 transition-all"
    title="Start Audio Call"
  >
    <Phone className="w-4 h-4" />
  </button>
)}
```

### Step 4 — Render the overlay (before closing tag)

```tsx
<CallOverlay
  status={callStatus}
  remotePartyName={
    callStatus === 'ringing_in'
      ? (incomingCallerName ?? 'Unknown')
      : (selectedUser !== 'group' && selectedUser ? selectedUser.name : '')
  }
  isMuted={isMuted}
  callDuration={callDuration}
  onAccept={acceptCall}
  onReject={rejectCall}
  onHangUp={hangUp}
  onToggleMute={toggleMute}
/>
```

---

## 8. Self-Hosted TURN Server (coturn)

> **Required if any employees are on home networks or corporate VPNs.**

### Install on Ubuntu VPS

```bash
sudo apt update && sudo apt install coturn -y
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
sudo nano /etc/turnserver.conf
```

### coturn config

```conf
listening-port=3478
tls-listening-port=5349
external-ip=YOUR_VPS_PUBLIC_IP
server-name=turn.yourdomain.com
realm=yourdomain.com
use-auth-secret
static-auth-secret=REPLACE_WITH_A_STRONG_SECRET_KEY
log-file=/var/log/turnserver.log
fingerprint
```

```bash
sudo systemctl enable coturn && sudo systemctl start coturn
```

### Add TURN to ICE config in useWebRTCCall.ts

```ts
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:turn.yourdomain.com:3478',
    username: 'webrtc',
    credential: 'YOUR_STRONG_SECRET_KEY',
  },
];
```

---

## 9. Security Considerations

| Risk | Mitigation |
|------|-----------|
| Eavesdropping on audio | WebRTC encrypts all media with DTLS-SRTP by default |
| Unauthorized calls | Signaling is scoped to the private 1-on-1 `channelId` in Supabase |
| Microphone access | Browser enforces user permission prompt via `getUserMedia()` |
| TURN server abuse | Use `static-auth-secret`, rotate periodically |
| Signal channel flooding | Supabase Realtime has built-in rate limiting |

---

## 10. Testing Checklist

- [ ] Call button appears only in 1-on-1 chats, not group chat
- [ ] Receiver sees incoming call overlay with caller name
- [ ] Accepting connects audio within ~3 seconds
- [ ] Rejecting dismisses overlay on both sides
- [ ] Either party can hang up cleanly
- [ ] Mute button silences outgoing audio without dropping the call
- [ ] Duration timer counts up correctly
- [ ] Two browser tabs on same PC (basic smoke test)
- [ ] Two devices on same network
- [ ] Two devices on different networks (requires TURN)
- [ ] Closing the browser tab mid-call ends call for the other party

---

## 11. Known Limitations

| Limitation | Notes |
|-----------|-------|
| No group calls | WebRTC mesh for >2 users needs an SFU (e.g. mediasoup). Out of scope for v1. |
| No call recording | Requires server-side media processing — complex to add |
| Safari iOS quirks | iOS requires user gesture to play audio. The accept button satisfies this requirement. |
| No push notifications | If the app tab is closed, the signal is missed. Needs PWA Service Worker + Push API. |
| Missed call history | The `HRMS_call_logs` table supports this — write a record on `call-request`, update on `call-end`. |
