// startRoomSession(userId, matchId)
// reconnectRoomSession(userId, roomId)
// disconnectRoomSession(userId, roomId)
// leaveRoomSession(userId, roomId)
// submitRoomSession(userId, roomId, code)

const ROOM_SESSION_BASE_URL = 'http://localhost:3002/api/room-session'; // match service is on port 3003, websocket is on 3002

type SessionUserStatus = 'active' | 'submitted' | 'left' | 'disconnected';

type StartRoomSessionResponse = {
  roomId: string;
  questionId?: string;
  status?: string;
  partner?: string;
  userStatus?: SessionUserStatus;
  isStale?: boolean;
  reconnected?: boolean;
  reused?: boolean;
};

type ReconnectRoomSessionResponse = {
  roomId: string;
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

type LeaveRoomSessionResponse = {
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

type DisconnectRoomSessionResponse = {
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
