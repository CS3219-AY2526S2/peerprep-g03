const ROOM_SESSION_BASE_URL = 'http://localhost:3002/api/room-session';

export type SessionUserStatus = 'active' | 'submitted' | 'left' | 'disconnected';

export type StartRoomSessionResponse = {
  roomId: string;
  questionId?: string;
  status?: string;
  partner?: string | null;
  userStatus?: SessionUserStatus;
  reused?: boolean;
};

export type GetRejoinableRoomSessionResponse = {
  roomId: string;
  matchId?: string;
  questionId?: string;
  status?: string;
  partner?: string | null;
  userStatus?: SessionUserStatus;
  isStale?: boolean;
} | null;

export type ReconnectRoomSessionResponse = {
  roomId?: string;
  questionId?: string;
  status?: string;
  partner?: string | null;
  success?: boolean;
  session?: {
    roomId: string;
    matchId?: string;
    questionId?: string;
    status?: string;
  } | null;
  message?: string;
};

export type LeaveRoomSessionResponse = {
  roomId?: string;
  status?: string;
  success?: boolean;
  message?: string;
  session?: {
    roomId: string;
    matchId?: string;
    questionId?: string;
    status?: string;
  } | null;
};

export type DisconnectRoomSessionResponse = {
  roomId?: string;
  status?: string;
  success?: boolean;
  message?: string;
  session?: {
    roomId: string;
    matchId?: string;
    questionId?: string;
    status?: string;
  } | null;
};

export type SubmitRoomSessionResponse = {
  success?: boolean;
  message?: string;
  status?: string;
  session?: {
    roomId: string;
    matchId?: string;
    questionId?: string;
    status?: string;
  } | null;
};

async function handleJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Request failed');
  }

  return data as T;
}

export async function getRejoinableRoomSession(userId: string) {
  const response = await fetch(`${ROOM_SESSION_BASE_URL}/rejoinable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  return handleJsonResponse<GetRejoinableRoomSessionResponse>(response);
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

export async function disconnectRoomSession(userId: string, roomId: string) {
  const response = await fetch(`${ROOM_SESSION_BASE_URL}/disconnect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, roomId }),
  });

  return handleJsonResponse<DisconnectRoomSessionResponse>(response);
}

export async function submitRoomSession(userId: string, roomId: string, code: string) {
  const response = await fetch(`${ROOM_SESSION_BASE_URL}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, roomId, code }),
  });

  return handleJsonResponse<SubmitRoomSessionResponse>(response);
}