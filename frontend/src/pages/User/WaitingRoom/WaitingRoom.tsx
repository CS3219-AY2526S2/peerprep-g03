import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, PageTitle, Button, Card } from '../../../components';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPartner, reset, resetStatus } from '../../../features/User/Collaboration/collaborationSlice';

const statusMessage = {
    UNEXPECTED_ERROR : () => 'Unexpected Error. Click "Back".',
    FINDING_PARTNER : () => 'Waiting for partner.',
    NO_PARTNER_FOUND : () => 'No partner found. \n Click "Continue" to try it yourself. ',
    PARTNER_FOUND : (partnerName: string ) => `Partner found - ${partnerName}. \n Click "Continue" to join your partner. `
} as const;

export default function WaitingRoom() {
    const { value, stateStatus } = useSelector((state) => state.collaboration);

    const questionTopic: string = value.questionTopic
    const questionDifficulty: string = value.questionDifficulty
    const programmingLanguage: string = value.programmingLanguage
    const partner: string = value.partner

    let partnerStatus: string
    const dispatch = useDispatch();


    useEffect(() => {
        console.log(stateStatus)
        if (questionTopic && questionDifficulty && programmingLanguage && stateStatus === 'idle' && !partner) {
            dispatch(fetchPartner({ questionTopic, questionDifficulty, programmingLanguage }));
        }
    }, [dispatch, questionTopic, questionDifficulty, programmingLanguage, stateStatus, partner]);

    if (stateStatus === 'loading' || stateStatus === 'idle'  ) {
        partnerStatus = statusMessage.FINDING_PARTNER();
    } else if (stateStatus === 'succeeded' && partner) {
        partnerStatus = statusMessage.PARTNER_FOUND(partner);
    } else if (stateStatus === 'failed' || (stateStatus === 'succeeded' && !partner)) {
        partnerStatus = statusMessage.NO_PARTNER_FOUND();
    } else {
        partnerStatus = statusMessage.UNEXPECTED_ERROR();
    }

    const navigate = useNavigate();
    const handleContinueClick = () => {
        dispatch(resetStatus())
        navigate(`/collaboration`);
    };

    const handleBackClick = () => {
        dispatch(reset());
        navigate('/start');
    };

    return (
        <div>
            <Header/>
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
                            disabled={stateStatus === 'loading' || stateStatus === 'idle'}/>
                    </div>
                </div>
            </div>
        </div>
    );
}