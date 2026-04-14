import { useNavigate } from 'react-router-dom';
import {Header, PageTitle, DropDown, Button, Card, TextBox} from '../../../../components';
import { useSelector, useDispatch } from 'react-redux';

export default function AttemptInformation() {
    const { value, status } = useSelector((state) => state.attempt);
    const navigate = useNavigate();
    const handleBackClick = () => {
        navigate('/attempt');
    };
    const questionTitle: string = value.question_text
    const timeStamp: string = new Date(value.created_at).toLocaleString(); //value.timestamp

    return (
        <div>
            <Header displayUserNavigation = {true}/>
            <div class="flex flex-col justify-center p-4 gap-y-2 items-center">
                <PageTitle text = {questionTitle}/>
                <Card label = "" text = {timeStamp}/>
                <div class="flex justify-center p-4 gap-x-15">
                    <TextBox label = "Submitted Solution" text = {value.submitted_code}/>
                    <TextBox label = "Suggested Solution" text = {value.suggested_solution ?? "N/A"}/>
                </div>
                <Button label = "Back" variant = "outlined" onClick = {handleBackClick}/>
            </div>
        </div>
    );
}