import { useNavigate } from 'react-router-dom';
import { TextArea, Card, Button} from '../../../../components'
import { TextField as MuiTextField} from '@mui/material';
import { darkBlue } from '../../../../commons';
import { useSelector, useDispatch } from 'react-redux';
import { reset } from '../../../../features/User/Collaboration/collaborationSlice';
import { postAttempt } from '../../../../services/Attempts'

export function Code() {
    const {
        value: collabValue,
        stateStatus: collabStatus
    } = useSelector((state) => state.collaboration);

    const {
        value: authValue,
        stateStatus: authStatus
    } = useSelector((state) => state.authentication);

    const partner: string = collabValue.partner

    const havePartner : boolean = !!partner
    const message: string = havePartner ? "Participants: " + partner + " and you": "Private Room"
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleQuitClick = () => {
        dispatch(reset())
        navigate('/start');
    };

    const handleSubmitClick = () => {
        const question: string = collabValue.question
        const partner: string = collabValue.partner
        const timestamp = new Date().toISOString();
        const username: string = authValue.username
        postAttempt(timestamp, username, partner, question, "Sample code")
        dispatch(reset())
        navigate('/start');
    };

    return (
        <div class="flex flex-col justify-center p-2 py-4">
            <p style={{ color: darkBlue }} className= "text-right"> {message} </p>
            <MuiTextField multiline rows = {15}/>
            <div class="flex justify-end py-5 gap-x-10">
                <Button label = "Quit" onClick = {handleQuitClick}/>
                <Button label = "Submit" onClick = {handleSubmitClick}/>
            </div>
            </div>
    );
}