// startRoomSession(userId, matchId)
// reconnectRoomSession(userId, roomId)
// leaveRoomSession(userId, roomId)
// submitRoomSession(userId, roomId, code)

import axios from 'axios';
const ROOM_SESSION_BASE_URL = 'http://localhost:3002/api/room-session'; // match service is on port 3003, websocket is on 3002

type StartRoomSessionResponse = {
  roomId: string;
  questionId?: string;
  status?: string;
};

type ReconnectRoomSessionResponse = {
  roomId: string;
  questionId?: string;
  status?: string;
  success?: boolean;
};

type LeaveRoomSessionResponse = {
  success?: boolean;
  message?: string;
};

type SubmitRoomSessionResponse = {
  success?: boolean;
  message?: string;
};


async function handleJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Request failed');
  }

  return data as T;
}

export async function startRoomSession(userId: string, matchId: string) {
  const response = await fetch(`${ROOM_SESSION_BASE_URL}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, matchId }),
  });

  return handleJsonResponse<StartRoomSessionResponse>(response);
}

export async function reconnectRoomSession(userId: string, roomId: string) {
  const response = await fetch(`${ROOM_SESSION_BASE_URL}/reconnect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, roomId }),
  });

  return handleJsonResponse<ReconnectRoomSessionResponse>(response);
}

export async function leaveRoomSession(userId: string, roomId: string) {
  const response = await fetch(`${ROOM_SESSION_BASE_URL}/leave`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, roomId }),
  });

  return handleJsonResponse<LeaveRoomSessionResponse>(response);
}

export async function submitRoomSession(userId: string, partnerId: string, question: string, roomId: string, code: string) {
  const response = await fetch(`${ROOM_SESSION_BASE_URL}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, partnerId, question,roomId, code }),
  });

  return handleJsonResponse<SubmitRoomSessionResponse>(response);
}