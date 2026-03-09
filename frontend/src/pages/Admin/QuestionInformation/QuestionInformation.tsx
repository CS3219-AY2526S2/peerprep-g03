import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; 
import { Header, PageTitle, Button, Card } from '../../../components';
import { useSelector, useDispatch } from 'react-redux';
import { fetchQuestionDetail, reset } from '../../../features/Admin/questionSlice';
import LoadingPages from '../../SupportPages/LoadingPages/LoadingPages.tsx';

export default function QuestionInformation() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { questionId } = useParams(); 

    const { value, stateStatus } = useSelector((state: any) => state.question);

    useEffect(() => {
    // Only fetch if we have an ID and the current ID in state doesn't match
    if (questionId && String(value?.id) !== String(questionId)) {
        dispatch(fetchQuestionDetail(questionId));
    }
    }, [dispatch, questionId, value?.id]);

    const handleBackClick = () => {
        dispatch(reset());
        navigate('/question');
    };

    
    if (stateStatus === 'loading' || !value) {
        return <LoadingPages />;
    }

    // Mapping fields to backend schema: title, description/stem, complexity 
    const questionTitle = value.title;         
    const questionTopic = Array.isArray(value.topic_tags) 
    ? value.topic_tags.join(', ') 
    : value.topic_tags;   
    const questionDifficulty = value.difficulty; 
    const questionDescription = value.description; 
    const questionSolution = value.solution;     
    return (
        <div>
            <Header/>
            <div className="p-8 whitespace-pre-line">
                <PageTitle text={questionTitle}/>
                <div className="flex flex-col justify-center p-4 gap-y-3 items-center">
                    
                    <Card label="Question Type:" text={questionTopic}/>
                    <Card label="Question Difficulty:" text={questionDifficulty}/>
                    <Card label="Question:" text={questionDescription}/>
                    <Card label="Solution:" text={questionSolution}/>
                </div>
                <div className="flex justify-end p-4">
                    <Button label="Back" variant="outlined" onClick={handleBackClick}/>
                </div>
            </div>
        </div>
    );
}