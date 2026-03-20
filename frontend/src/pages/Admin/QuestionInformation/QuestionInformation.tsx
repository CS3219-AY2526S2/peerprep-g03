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

    // Basic Information
    const questionTitle = value.title;         
    const questionTopic = Array.isArray(value.topic_tags) 
        ? value.topic_tags.join(', ') 
        : value.topic_tags;   
    const questionDifficulty = value.difficulty; 
    const questionDescription = value.description; 
    
    // Normalized Templates (Language, Boilerplate, Solution)
    const templates = value.templates || [];

    return (
        <div>
            <Header/>
            <div className="p-8 whitespace-pre-line">
                <PageTitle text={questionTitle}/>
                
                <div className="flex flex-col justify-center p-4 gap-y-3 items-center">
                    {/* General Question Info */}
                    <Card label="Question Topics:" text={questionTopic}/>
                    <Card label="Difficulty:" text={questionDifficulty}/>
                    <Card label="Description:" text={questionDescription}/>
                    
                    <hr className="w-full my-6 border-gray-300" />
                    
                    <div className="w-full max-w-4xl">
                        <h3 className="text-xl font-bold mb-4 text-center">Language Implementations</h3>
                        
                        {templates.length > 0 ? (
                            templates.map((template: any, index: number) => (
                                <div key={index} className="mb-8 p-6 border rounded-lg bg-gray-50 shadow-sm">
                                    <div className="flex items-center mb-4">
                                        <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold uppercase">
                                            {template.language}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-bold text-gray-600 mb-1">Starter Code (Boilerplate):</p>
                                            <pre className="bg-gray-800 text-gray-100 p-4 rounded overflow-x-auto text-xs font-mono">
                                                {template.starter_code}
                                            </pre>
                                        </div>
                                        
                                        <div>
                                            <p className="text-sm font-bold text-gray-600 mb-1">Language-Specific Solution:</p>
                                            <pre className="bg-slate-900 text-green-400 p-4 rounded overflow-x-auto text-xs font-mono border-l-4 border-green-500">
                                                {template.solution_code}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 italic">No language templates available for this question.</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end p-4">
                    <Button label="Back" variant="outlined" onClick={handleBackClick}/>
                </div>
            </div>
        </div>
    );
}