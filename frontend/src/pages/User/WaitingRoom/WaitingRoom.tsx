import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, PageTitle, Button, Card } from '../../../components';
import { useSelector, useDispatch } from 'react-redux';

import { initialiseCollab, reset, setRoomId } from '../../../features/User/Collaboration/collaborationSlice';
import { deleteMatch, pollMatchStatus, getPartner } from '../../../services/Collaboration';
import { startRoomSession, reconnectRoomSession, leaveRoomSession } from '../../../services/Collaboration';
import { Room } from '@mui/icons-material';

const statusMessage = {
    UNEXPECTED_ERROR: () => 'Unexpected Error. Click "Back".',
    FINDING_PARTNER: () => 'Waiting for partner.',
    NO_PARTNER_FOUND: () => 'No partner found. \n Click "Continue" to try it yourself. ',
    PARTNER_FOUND: (partnerName: string) => `Partner found - ${partnerName}. \n Click "Continue" to join your partner. `,
    EXISTING_SESSION: (partnerName: string) => `Unfinished session found with ${partnerName}. \n You must complete this session before starting a new one.`,
    OPTIONAL_REJOIN: (partnerName: string) => `You have an active session with ${partnerName}. \n You can rejoin them or find a new match.`
} as const;

export default function WaitingRoom() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const abortControllerRef = useRef<AbortController | null>(null);

    const [partnerStatus, setPartnerStatus] = useState<string>(statusMessage.FINDING_PARTNER());
    const [isMatched, setIsMatched] = useState(false);
    
    // ENHANCEMENT STATES
    const [hasExistingSession, setHasExistingSession] = useState(false);
    const [hasUserSubmittedExisting, setHasUserSubmittedExisting] = useState(false);

    const { value: collabValue } = useSelector((state: any) => state.collaboration);
    const { value: authValue } = useSelector((state: any) => state.authentication);

    const questionTopic: string = collabValue.questionTopic;
    const questionDifficulty: string = collabValue.questionDifficulty;
    const programmingLanguage: string = collabValue.programmingLanguage;
    const username: string = authValue.username;

    // --- ENHANCEMENT: Standalone Matchmaking Logic ---
    const runMatchmakingSequence = async (signal: AbortSignal) => {
        try {
            setPartnerStatus(statusMessage.FINDING_PARTNER());
            await getPartner(username, questionTopic, questionDifficulty, programmingLanguage);

            await new Promise((resolve, reject) => {
                const timer = setTimeout(resolve, 5000);
                signal.addEventListener('abort', () => {
                    clearTimeout(timer);
                    reject(new DOMException("Aborted", "AbortError"));
                });
            });

            const result = await pollMatchStatus(username, signal);
            if (result.status === "matched") {
                dispatch(initialiseCollab({ partner: result.partnerId, matchId: result.matchId }));
                setPartnerStatus(statusMessage.PARTNER_FOUND(result.partnerId));
                setIsMatched(true);
            } else if (result.status === "expired") {
                setPartnerStatus(statusMessage.NO_PARTNER_FOUND());
                setIsMatched(true);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') setPartnerStatus(statusMessage.NO_PARTNER_FOUND());
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
                // 1. GATEKEEPER: Check for existing rooms
                const checkSession = await startRoomSession(username, "REJOIN_CHECK");
                
                if (checkSession && checkSession.roomId && checkSession.status === 'active') {
                    const isSubmittedSession = checkSession.userStatus === 'submitted';
                    const isLockLifted = !!checkSession.isStale;

                    if (isSubmittedSession) {
                        dispatch(initialiseCollab({
                            roomId: null,
                            partner: null,
                            matchId: null,
                            isStale: false,
                        }));
                        runMatchmakingSequence(abortController.signal);
                        return;
                    }

                    setHasExistingSession(true);
                    setHasUserSubmittedExisting(isLockLifted);

                    dispatch(initialiseCollab({
                        roomId: checkSession.roomId,
                        partner: checkSession.partner,
                        isStale: checkSession.isStale 
                    }));

                    if (!isLockLifted) {
                        setIsMatched(true);
                        setPartnerStatus(statusMessage.EXISTING_SESSION(checkSession.partner || 'Missing Partner Info'));
                    } else {
                        // Soft Lock: DO NOT call matchmaking automatically
                        setPartnerStatus(statusMessage.OPTIONAL_REJOIN(checkSession.partner || 'Missing Partner Info'));
                    }
                } else {
                    // No existing session: Proceed to normal matchmaking
                    runMatchmakingSequence(abortController.signal);
                }
            } catch (err) {
                runMatchmakingSequence(abortController.signal);
            }
        };

        if (username) checkSessionAndInitialize();
        return () => abortController.abort();
    }, [username]); // Dependencies trimmed to avoid re-triggering on collabValue changes



    const handleContinueClick = async () => {
        try {
            let finalRoomId = collabValue.roomId;
            if (!finalRoomId || partnerStatus.includes("Partner found")) {
                const matchId = collabValue.matchId;
                if (matchId) {
                    const session = await startRoomSession(username, matchId);
                    finalRoomId = session.roomId;

                    
                    dispatch(setRoomId(session.roomId));
                    localStorage.setItem(
                        'collabSession',
                        JSON.stringify({
                        username: authValue.username,
                        role: authValue.role,
                        roomId: session.roomId,
                        partner: collabValue.partner,
                        question: collabValue.question,
                        })
                    ) 

                    const savedSession = localStorage.getItem('collabSession');
                    console.log('Saved session in localStorage:', savedSession);

                }
            }
            if (finalRoomId) {
                dispatch(setRoomId(finalRoomId));
                await deleteMatch(username);
                navigate(`/collaboration`);
            }
        } catch (err) {
            console.error('Failed to start room session', err);
        }
    };

    const handleRejoinClick = async () => {

        //existing room
        try {
            let finalRoomId = collabValue.roomId;
            console.log('Attempting to rejoin session with roomId:', finalRoomId, 'partnerstatus: ', partnerStatus);
            
            if (!finalRoomId) {
                // No existing room
                console.log('No active session found, attempting to start new session with matchId:', collabValue.matchId);
                
                if (partnerStatus.includes("Partner found")) {
                    console.warn('Partner found but no active session. This may indicate a stale session or an error in session management.');
                }

                const matchId = collabValue.matchId;
                if (!matchId) {
                    console.error('No matchId available for reconnect');
                    return;
                }
                
                handleContinueClick();
                return;

                //const matchId = collabValue.matchId;
                if (matchId) {
                    const session = await reconnectRoomSession(username, matchId);
                    finalRoomId = session.roomId;

                    
                    dispatch(setRoomId(session.roomId));
                    localStorage.setItem(
                        'collabSession',
                        JSON.stringify({
                        username: authValue.username,
                        role: authValue.role,
                        roomId: session.roomId,
                        partner: collabValue.partner,
                        question: collabValue.question,
                        })
                    ) 

                    const savedSession = localStorage.getItem('collabSession');
                    console.log('Saved session in localStorage:', savedSession);

                }
            } 
            
            // if (finalRoomId) {

            const session = await reconnectRoomSession(username, finalRoomId);
            finalRoomId = session.roomId;
            console.log('Existing session found with roomId:', finalRoomId);

            dispatch(initialiseCollab({
                roomId: finalRoomId,
                partner: session.partner ?? collabValue.partner,
            }));

            localStorage.setItem(
                'collabSession',
                JSON.stringify({
                    username: authValue.username,
                    role: authValue.role,
                    roomId: finalRoomId,
                    partner: session.partner ?? collabValue.partner,
                    question: collabValue.question,
                })
            );

            navigate(`/collaboration`);
        } catch (err) {
            console.error('Failed to start room session', err);
        }
    };


    const handleIgnoreSession = async () => {
        try {
            if (collabValue.roomId) {
                await leaveRoomSession(username, collabValue.roomId);
            }
        } catch (err) {
            console.error('Failed to leave existing session', err);
        } finally {
            setHasExistingSession(false);
            setHasUserSubmittedExisting(false);
            setIsMatched(false);

            dispatch(initialiseCollab({
                roomId: null,
                partner: null,
                matchId: null,
                isStale: false,
            }));

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
            console.error("Failed to cancel match", err);
        }
    };

    return (
        <div>
            <Header />
            <div className="p-5 whitespace-pre-line">
                <PageTitle text={hasExistingSession && !hasUserSubmittedExisting ? "Action Required" : "Waiting Room"} />
                <div className="flex flex-col justify-center p-4 gap-y-3 items-center">
                    
                    {hasExistingSession && (
                        <div className={`p-6 rounded-2xl text-center mb-4 max-w-md border-2 animate-in fade-in zoom-in duration-300 
                            ${hasUserSubmittedExisting ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                             <span className="text-4xl mb-2 block">{hasUserSubmittedExisting ? 'ℹ️' : '⚠️'}</span>
                             <p className={`${hasUserSubmittedExisting ? 'text-blue-900' : 'text-orange-900'} font-bold text-lg`}>
                                {hasUserSubmittedExisting ? 'Session Status Update' : 'Unfinished Task'}
                             </p>
                             <p className={`${hasUserSubmittedExisting ? 'text-blue-700' : 'text-orange-700'} text-sm mt-2`}>
                                {hasUserSubmittedExisting 
                                    ? "Your previous session has timed out (30+ mins). You can rejoin or find a new match."
                                    : "You cannot start a new match. Please rejoin and submit your work."}
                             </p>
                             {hasUserSubmittedExisting && (
                                <div className="mt-4 flex gap-2 justify-center">
                                    <Button label="Rejoin Previous" variant="outlined" onClick={handleRejoinClick} />
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
                        {(!hasUserSubmittedExisting || !hasExistingSession) && (
                            <Button 
                                label={hasExistingSession ? "Rejoin & Finish" : "Continue"} 
                                onClick={hasExistingSession ? handleRejoinClick : handleContinueClick}
                                disabled={!isMatched || partnerStatus === statusMessage.UNEXPECTED_ERROR() || partnerStatus === statusMessage.FINDING_PARTNER()}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
