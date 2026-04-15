import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, PageTitle, Button, Card } from '../../../components';
import { useSelector, useDispatch } from 'react-redux';

import {
  initialiseCollab,
  reset,
  setRoomId,
} from '../../../features/User/Collaboration/collaborationSlice';

import {
  deleteMatch,
  pollMatchStatus,
  getPartner,
  startRoomSession,
  reconnectRoomSession,
  leaveRoomSession,
  getRejoinableRoomSession,
} from '../../../services/Collaboration';

const statusMessage = {
  UNEXPECTED_ERROR: () => 'Unexpected Error. Click "Back".',
  FINDING_PARTNER: () => 'Waiting for partner.',
  NO_PARTNER_FOUND: () => 'No partner found.\nClick "Continue" to try it yourself.',
  PARTNER_FOUND: (partnerName?: string) =>
    partnerName
      ? `Partner found - ${partnerName}.\nClick "Continue" to join your partner.`
      : 'Partner found.\nClick "Continue" to proceed.',
  EXISTING_SESSION: (partnerName?: string) =>
    partnerName
      ? `Unfinished session found with ${partnerName}.\nYou must complete this session before starting a new one.`
      : 'An unfinished session was found.\nYou must complete this session before starting a new one.',
  OPTIONAL_REJOIN: (partnerName?: string) =>
    partnerName
      ? `You have an active session with ${partnerName}.\nYou can rejoin them or find a new match.`
      : 'You have an active session.\nYou can rejoin it or find a new match.',
} as const;

export default function WaitingRoom() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [partnerStatus, setPartnerStatus] = useState<string>(statusMessage.FINDING_PARTNER());
  const [isMatched, setIsMatched] = useState(false);

  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [isOptionalRejoin, setIsOptionalRejoin] = useState(false);

  const { value: collabValue } = useSelector((state: any) => state.collaboration);
  const { value: authValue } = useSelector((state: any) => state.authentication);

  const questionTopic: string = collabValue.questionTopic;
  const questionDifficulty: string = collabValue.questionDifficulty;
  const programmingLanguage: string = collabValue.programmingLanguage;
  const username: string = authValue.username;

  const runMatchmakingSequence = async (signal: AbortSignal) => {
    try {
      setHasExistingSession(false);
      setIsOptionalRejoin(false);
      setIsMatched(false);
      setPartnerStatus(statusMessage.FINDING_PARTNER());

      await getPartner(username, questionTopic, questionDifficulty, programmingLanguage);

      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 5000);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });

      const result = await pollMatchStatus(username, signal);

      if (result.status === 'matched') {
        dispatch(
          initialiseCollab({
            partner: result.partnerId,
            matchId: result.matchId,
          })
        );

        setPartnerStatus(statusMessage.PARTNER_FOUND(result.partnerId));
        setIsMatched(true);
      } else if (result.status === 'expired') {
        setPartnerStatus(statusMessage.NO_PARTNER_FOUND());
        setIsMatched(true);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setPartnerStatus(statusMessage.NO_PARTNER_FOUND());
        setIsMatched(true);
      }
    }
  };

  useEffect(() => {
    const handleTabClose = () => {
      navigator.sendBeacon(`http://localhost:3003/api/match/exit-tab/${username}`);
    };

    window.addEventListener('pagehide', handleTabClose);
    return () => window.removeEventListener('pagehide', handleTabClose);
  }, [username]);

  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const checkSessionAndInitialize = async () => {
      try {
        const existingSession = await getRejoinableRoomSession(username);

        if (existingSession?.roomId && existingSession.status === 'active') {
          setHasExistingSession(true);
          setIsOptionalRejoin(!!existingSession.isStale);
          setIsMatched(true);

          dispatch(
            initialiseCollab({
              roomId: existingSession.roomId,
              partner: existingSession.partner ?? null,
              matchId: existingSession.matchId ?? null,
              isStale: !!existingSession.isStale,
            })
          );

          localStorage.setItem(
            'collabSession',
            JSON.stringify({
              username: authValue.username,
              role: authValue.role,
              roomId: existingSession.roomId,
              partner: existingSession.partner ?? null,
              question: collabValue.question,
            })
          );

          if (existingSession.isStale) {
            setPartnerStatus(statusMessage.OPTIONAL_REJOIN(existingSession.partner ?? undefined));
          } else {
            setPartnerStatus(statusMessage.EXISTING_SESSION(existingSession.partner ?? undefined));
          }

          return;
        }

        await runMatchmakingSequence(abortController.signal);
      } catch (err) {
        await runMatchmakingSequence(abortController.signal);
      }
    };

    if (username) {
      checkSessionAndInitialize();
    }

    return () => abortController.abort();
  }, [username]);

  const handleContinueClick = async () => {
    try {
      let finalRoomId = collabValue.roomId;

      if (!finalRoomId) {
        const matchId = collabValue.matchId;
        if (!matchId) {
          console.error('No matchId available');
          return;
        }

        const session = await startRoomSession(username, matchId);
        finalRoomId = session.roomId;

        dispatch(setRoomId(finalRoomId));
        localStorage.setItem(
          'collabSession',
          JSON.stringify({
            username: authValue.username,
            role: authValue.role,
            roomId: finalRoomId,
            partner: collabValue.partner,
            question: collabValue.question,
          })
        );
      }

      if (finalRoomId) {
        dispatch(setRoomId(finalRoomId));
        await deleteMatch(username);
        navigate('/collaboration');
      }
    } catch (err) {
      console.error('Failed to start room session', err);
    }
  };

  const handleRejoinClick = async () => {
    try {
      let finalRoomId = collabValue.roomId;
      let partner = collabValue.partner;

      if (!finalRoomId) {
        const existingSession = await getRejoinableRoomSession(username);
        if (!existingSession?.roomId) {
          console.error('No rejoinable session found');
          return;
        }

        finalRoomId = existingSession.roomId;
        partner = existingSession.partner ?? partner;
      }

      const session = await reconnectRoomSession(username, finalRoomId);

      if (!session.success) {
        console.error(session.message || 'Failed to reconnect');
        return;
      }

      dispatch(
        initialiseCollab({
          roomId: finalRoomId,
          partner: session.partner ?? partner ?? null,
          isStale: false,
        })
      );

      localStorage.setItem(
        'collabSession',
        JSON.stringify({
          username: authValue.username,
          role: authValue.role,
          roomId: finalRoomId,
          partner: session.partner ?? partner ?? null,
          question: collabValue.question,
        })
      );

      navigate('/collaboration');
    } catch (err) {
      console.error('Failed to rejoin room session', err);
    }
  };

  const handleIgnoreSession = async () => {
    try {
      let roomId = collabValue.roomId;

      if (!roomId) {
        const existingSession = await getRejoinableRoomSession(username);
        roomId = existingSession?.roomId;
      }

      if (roomId) {
        await leaveRoomSession(username, roomId);
      }
    } catch (err) {
      console.error('Failed to leave existing session', err);
    } finally {
      setHasExistingSession(false);
      setIsOptionalRejoin(false);
      setIsMatched(false);

      dispatch(
        initialiseCollab({
          roomId: null,
          partner: null,
          matchId: null,
          isStale: false,
        })
      );

      localStorage.removeItem('collabSession');

      if (abortControllerRef.current) {
        runMatchmakingSequence(abortControllerRef.current.signal);
      }
    }
  };

  const handleBackClick = async () => {
    abortControllerRef.current?.abort();

    try {
      await deleteMatch(username);
      dispatch(reset());
      navigate('/start');
    } catch (err) {
      console.error('Failed to cancel match', err);
    }
  };

  return (
    <div>
      <Header />
      <div className="p-5 whitespace-pre-line">
        <PageTitle text={hasExistingSession ? 'Action Required' : 'Waiting Room'} />

        <div className="flex flex-col justify-center p-4 gap-y-3 items-center">
          {hasExistingSession && (
            <div
              className={`p-6 rounded-2xl text-center mb-4 max-w-md border-2 animate-in fade-in zoom-in duration-300 ${
                isOptionalRejoin ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
              }`}
            >
              <span className="text-4xl mb-2 block">{isOptionalRejoin ? 'ℹ️' : '⚠️'}</span>
              <p className={`${isOptionalRejoin ? 'text-blue-900' : 'text-orange-900'} font-bold text-lg`}>
                {isOptionalRejoin ? 'Session Status Update' : 'Unfinished Task'}
              </p>
              <p className={`${isOptionalRejoin ? 'text-blue-700' : 'text-orange-700'} text-sm mt-2`}>
                {isOptionalRejoin
                  ? 'Your previous session timed out. You can rejoin it or ignore it and find a new match.'
                  : 'You cannot start a new match until you rejoin this unfinished session.'}
              </p>

              {isOptionalRejoin && (
                <div className="mt-4 flex gap-2 justify-center">
                  <Button label="Rejoin" onClick={handleRejoinClick} />
                  <Button label="Ignore & Find New" onClick={handleIgnoreSession} />
                </div>
              )}
            </div>
          )}

          {!hasExistingSession && (
            <>
              <Card label="Question Type:" text={questionTopic} />
              <Card label="Question Difficulty:" text={questionDifficulty} />
              <Card label="Programming Language:" text={programmingLanguage} />
            </>
          )}

          <Card label="Status" text={partnerStatus} />

          <div className="flex justify-center p-4 gap-x-15">
            <Button label="Back" onClick={handleBackClick} />
            <Button
              label={hasExistingSession ? 'Rejoin & Finish' : 'Continue'}
              onClick={hasExistingSession ? handleRejoinClick : handleContinueClick}
              disabled={
                !hasExistingSession &&
                (!isMatched ||
                  partnerStatus === statusMessage.UNEXPECTED_ERROR() ||
                  partnerStatus === statusMessage.FINDING_PARTNER())
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}