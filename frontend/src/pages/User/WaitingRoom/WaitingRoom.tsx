import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, PageTitle, Button, Card, Dialog } from '../../../components';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPartner, reset, resetStatus, setPartner } from '../../../features/User/Collaboration/collaborationSlice';
import { deleteMatch, pollMatchStatus, getPartner }from '../../../services/Collaboration';

const statusMessage = {
    UNEXPECTED_ERROR : () => 'Unexpected Error. Click "Back".',
    FINDING_PARTNER : () => 'Waiting for partner.',
    NO_PARTNER_FOUND : () => 'No partner found. \n Click "Continue" to try it yourself. ',
    PARTNER_FOUND : (partnerName: string ) => `Partner found - ${partnerName}. \n Click "Continue" to join your partner. `
} as const;

export default function WaitingRoom() {
    const [partnerStatus, setPartnerStatus] = useState<string>(statusMessage.FINDING_PARTNER());
    const [isMatched, setIsMatched] = useState(false);
    const [isPageDuplicate, setIsPageDuplicate] = useState(false);

      useEffect(() => {

        const channel = new BroadcastChannel('page_checker_channel');
        const currentUrl = window.location.href;


        channel.postMessage({ type: 'PING_ROUTE', url: currentUrl });

        channel.onmessage = (event) => {
          const { type, url } = event.data;

          if (type === 'PING_ROUTE' && url === currentUrl) {
            channel.postMessage({ type: 'PONG_ROUTE', url: currentUrl });
          }

          if (type === 'PONG_ROUTE' && url === currentUrl) {
            setIsPageDuplicate(true);
          }
        };

        return () => channel.close();
      }, []);
    const {
        value: collabValue,
        stateStatus: collabStatus
    } = useSelector((state) => state.collaboration);

    const {
        value: authValue,
        stateStatus: authStatus
    } = useSelector((state) => state.authentication);

    const questionTopic: string = collabValue.questionTopic
    const questionDifficulty: string = collabValue.questionDifficulty
    const programmingLanguage: string = collabValue.programmingLanguage
    const partner: string = collabValue.partner
    const username: string = authValue.username
    const abortControllerRef = useRef<AbortController | null>(null);

    const dispatch = useDispatch();
    useEffect(() => {
      const handleTabClose = () => {

          navigator.sendBeacon(`http://localhost:3050/api/match/exit-tab/${username}`);
        };


        window.addEventListener('pagehide', handleTabClose);

        return () => {
          window.removeEventListener('pagehide', handleTabClose);
        };
      }, []);

/*
    useEffect(() => {
            const startPolling = async () => {
                // Create the "off switch"
                abortControllerRef.current = new AbortController();

                try {
                    // Pass the signal to your service
                    const result = await pollMatchStatus(username, abortControllerRef.current.signal);

                    if (result.status === "matched") {
                        // Logic to handle success (e.g., dispatch an action or navigate)
                        console.log("Matched!", result);
                    }
                } catch (err: any) {
                    if (err.name === 'AbortError') {
                        console.log("Polling aborted safely.");
                    } else {
                        console.error("Matchmaking error:", err);
                    }
                }
            };

            // Start polling immediately when the user enters the room
            startPolling();

            // CLEANUP: If user leaves page or closes tab, stop the network requests
            return () => {
                abortControllerRef.current?.abort();
            };
        }, []); // Empty array = run once on mount
    */
    useEffect(() => {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const startSequence = async () => {
            try {
                // 1. Send the initial request to join the queue
                // (Assuming fetchPartner is a thunk or you call the service directly)
                setPartnerStatus(statusMessage.FINDING_PARTNER());
                // await dispatch(fetchPartner({ username, questionTopic, questionDifficulty, programmingLanguage })).unwrap();
                await getPartner(username, questionTopic, questionDifficulty, programmingLanguage)
                console.log("Initial request sent. Waiting 5 seconds...");

                // 2. Delay for 5 seconds
                // We check signal.aborted to ensure we don't wait if user already clicked 'Back'
                await new Promise((resolve, reject) => {
                    const timer = setTimeout(resolve, 5000);
                    abortController.signal.addEventListener('abort', () => {
                        clearTimeout(timer);
                        reject(new DOMException("Aborted", "AbortError"));
                    });
                });

                // 3. Start Polling
                console.log("Starting poll...");
                const result = await pollMatchStatus(username, abortController.signal);

                if (result.status === "matched") {
                    console.log("Partner found", result)
                    dispatch(setPartner(result.partnerId));
                    setPartnerStatus(statusMessage.PARTNER_FOUND(result.partnerId));
                    setIsMatched(true);

                    // Handle success here
                }

                if (result.status === "expired") {
                    setPartnerStatus(statusMessage.NO_PARTNER_FOUND());
                // Handle timeout here
                }
            } catch (err: any) {
                setPartnerStatus(statusMessage.NO_PARTNER_FOUND());
                if (err.name === 'AbortError') {
                    console.log("Sequence cancelled by user.");
                } else {
                    console.error("Matchmaking sequence failed:", err);
                }
            }
        };

        startSequence();

        return () => {
            abortController.abort();
        };
    }, [dispatch, username, questionTopic, questionDifficulty, programmingLanguage]);


        const handleBackClick = async () => {
            // 5. Stop polling immediately
            abortControllerRef.current?.abort();

            try {
                await deleteMatch(username);
                navigate('/start');
                dispatch(reset());

            } catch (err) {
                console.error("Failed to cancel match", err);
            }
        };
/*
    useEffect(() => {
        if (questionTopic && questionDifficulty && programmingLanguage && collabStatus === 'idle' && !partner) {
            dispatch(fetchPartner({ username, questionTopic, questionDifficulty, programmingLanguage }));
        }
    }, [dispatch, username, questionTopic, questionDifficulty, programmingLanguage, collabStatus, partner]);

    if (collabStatus === 'loading' || collabStatus === 'idle'  ) {
        partnerStatus = statusMessage.FINDING_PARTNER();
    } else if (collabStatus === 'succeeded' && partner) {
        partnerStatus = statusMessage.PARTNER_FOUND(partner);
    } else if (collabStatus === 'failed' || (collabStatus === 'succeeded' && !partner)) {
        partnerStatus = statusMessage.NO_PARTNER_FOUND();
    } else {
        partnerStatus = statusMessage.UNEXPECTED_ERROR();
    }
*/

    const navigate = useNavigate();
    const handleContinueClick = async () => {
        // Add dispatch to inialise partner here for state.collabboration
        await deleteMatch(username);
        navigate(`/collaboration`);
    };


    return (
        <div>
            <Header/>
            <Dialog
                title = "Duplicate Matching Request Detected"
                content = "To prevent duplicates, only one request can be processed per session. Please close this tab and continue in your original window"
                canExit = {isPageDuplicate}
                isVisible = {isPageDuplicate}/>
            <div className = "p-5 whitespace-pre-line">
                <PageTitle text = "Waiting Room"/>
                <div class="flex flex-col justify-center p-4 gap-y-3 items-center">
                    <Card label = "Question Type:" text = {questionTopic}/>
                    <Card label = "Question Difficulty:" text = {questionDifficulty}/>
                    <Card label = "Programming Language:" text = {programmingLanguage}/>
                    <Card label = "Status" text = {partnerStatus}/>
                    <div class="flex justify-center p-4 gap-x-15">
                        <Button label = "Back" onClick = {handleBackClick}/>
                        <Button label = "Continue"onClick = {handleContinueClick}
                            disabled={partnerStatus == statusMessage.UNEXPECTED_ERROR() || partnerStatus == statusMessage.FINDING_PARTNER()}/>
                    </div>
                </div>
            </div>
        </div>
    );
}
