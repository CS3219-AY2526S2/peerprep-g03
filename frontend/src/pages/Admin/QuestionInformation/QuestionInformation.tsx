import { useNavigate } from 'react-router-dom';
import {Header, PageTitle, Button, Card} from '../../../components';
import { useSelector, useDispatch } from 'react-redux';
import { reset } from '../../../features/Admin/questionSlice';

export default function QuestionInformation() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { value, status } = useSelector((state) => state.question);

    const questionTitle: string = value.questionTitle
    const questionType: string = value.questionTopic
    const questionDifficulty: string = value.questionDifficulty
    const question: string = value.question
    const solution: string = value.solution

    const handleBackClick = () => {
        dispatch(reset());
        navigate('/question');
    };

    return (
        <div>
            <Header/>
            <div className = "p-8 whitespace-pre-line">
                <PageTitle text = {questionTitle}/>
                <div class="flex flex-col justify-center p-4 gap-y-3 items-center">
                    <Card label = "Question Type:" text = {questionType}/>
                    <Card label = "Question Difficulty:" text = {questionDifficulty}/>
                    <Card label = "Question:" text = {question}/>
                    <Card label = "Solution:" text = {solution}/>
                </div>
                <div class="flex justify-end p-4">
                    <Button label = "Back" variant = "outlined" onClick = {handleBackClick}/>
                </div>
            </div>
        </div>
    );
}