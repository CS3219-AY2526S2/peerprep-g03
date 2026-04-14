import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, PageTitle, Button, Card } from '../../../components';
import { useSelector, useDispatch } from 'react-redux';

import { initialise, reset, setRoomId } from '../../../features/User/Collaboration/collaborationSlice';
import { deleteMatch, pollMatchStatus, getPartner } from '../../../services/Collaboration';
import { startRoomSession } from '../../../services/Collaboration';


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

    const {
        value: collabValue,
    } = useSelector((state: any) => state.collaboration);

    const {
        value: authValue,
    } = useSelector((state: any) => state.authentication);

    const questionTopic: string = collabValue.questionTopic;
    const questionDifficulty: string = collabValue.questionDifficulty;
    const programmingLanguage: string = collabValue.programmingLanguage;
    const username: string = authValue.username;

    useEffect(() => {
        const handleTabClose = () => {
            navigator.sendBeacon(`http://localhost:3003/api/match/exit-tab/${username}`);
        };
        window.addEventListener('pagehide', handleTabClose);
        return () => {
            window.removeEventListener('pagehide', handleTabClose);
        };
    }, [username]);

    useEffect(() => {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const startSequence = async () => {
            try {
                // 1. ENHANCEMENT: Check for existing collaboration rooms
                const checkSession = await startRoomSession(username, "REJOIN_CHECK");
                
                if (checkSession && checkSession.roomId && checkSession.status === 'active') {
                    // Lock is optional if user submitted OR if session is stale (>30 mins)
                    const isLockLifted = !!checkSession.hasSubmitted || !!checkSession.isStale;

                    setHasExistingSession(true);
                    setHasUserSubmittedExisting(isLockLifted);

                    dispatch(initialise({
                        roomId: checkSession.roomId,
                        partner: checkSession.partner,
                        isStale: checkSession.isStale // Optional: store for UI context
                    }));

                    if (isLockLifted) {
                        // OPTIONAL: Inform them but let matchmaking continue in background
                        setPartnerStatus(statusMessage.OPTIONAL_REJOIN(checkSession.partner || 'your partner'));
                    } else {
                        // MANDATORY: Block matchmaking and exit sequence
                        setIsMatched(true);
                        setPartnerStatus(statusMessage.EXISTING_SESSION(checkSession.partner || 'your partner'));
                        return; 
                    }
                }

                // 2. Normal Matchmaking Sequence
                setPartnerStatus(statusMessage.FINDING_PARTNER());
                await getPartner(username, questionTopic, questionDifficulty, programmingLanguage);

                // Delay for 5 seconds
                await new Promise((resolve, reject) => {
                    const timer = setTimeout(resolve, 5000);
                    abortController.signal.addEventListener('abort', () => {
                        clearTimeout(timer);
                        reject(new DOMException("Aborted", "AbortError"));
                    });
                });

                // Start Polling
                const result = await pollMatchStatus(username, abortController.signal);

                if (result.status === "matched") {
                    dispatch(initialise({
                        partner: result.partnerId,
                        matchId: result.matchId,
                    }));
                    setPartnerStatus(statusMessage.PARTNER_FOUND(result.partnerId));
                    setIsMatched(true);
                }

                if (result.status === "expired") {
                    setPartnerStatus(statusMessage.NO_PARTNER_FOUND());
                }
                
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    console.log("Sequence cancelled.");
                } else {
                    setPartnerStatus(statusMessage.NO_PARTNER_FOUND());
                }
            }
        };

        if (username) startSequence();

        return () => {
            abortController.abort();
        };
    }, [dispatch, username, questionTopic, questionDifficulty, programmingLanguage]);


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

    const handleContinueClick = async () => {
        try {
            let finalRoomId = collabValue.roomId;

            if (!hasExistingSession || (partnerStatus.includes("Partner found"))) {
                const matchId = collabValue.matchId;
                if (!matchId) return;
                const session = await startRoomSession(username, matchId);
                finalRoomId = session.roomId;
            }

            dispatch(setRoomId(finalRoomId));
            await deleteMatch(username);
            navigate(`/collaboration`);
        } catch (err) {
            console.error('Failed to start room session', err);
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
                                    ? collabValue.isStale 
                                        ? "Your previous session has timed out (30+ mins). You can rejoin or find a new match."
                                        : "You've submitted your code, but you can still go back to help your partner."
                                    : "You cannot start a new match while your previous partner is still in the room. Please rejoin and submit your work."}
                             </p>
                             {hasUserSubmittedExisting && (
                                <div className="mt-4 flex gap-2 justify-center">
                                    <Button label="Rejoin Previous" variant="outlined" onClick={handleContinueClick} />
                                    <Button label="Ignore & Find New" onClick={() => setHasExistingSession(false)} />
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
                        {!hasUserSubmittedExisting && (
                            <Button 
                                label={hasExistingSession ? "Rejoin & Finish" : "Continue"} 
                                onClick={handleContinueClick}
                                disabled={partnerStatus === statusMessage.UNEXPECTED_ERROR() || partnerStatus === statusMessage.FINDING_PARTNER()}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}