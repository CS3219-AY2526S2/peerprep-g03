import { useEffect } from 'react'; // 1. Add this import
import { useNavigate } from 'react-router-dom';
import { Header, PageTitle, Card, Button } from '../../../components';
import { QuestionRecordsTable } from '../../../features';
import { useSelector, useDispatch } from 'react-redux';
import { reset, fetchAllQuestions } from '../../../features/Admin/questionSlice'; // 2. Import fetchAllQuestions
import LoadingPages from '../../SupportPages/LoadingPages/LoadingPages.tsx';

export default function QuestionDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

  
    useEffect(() => {
        dispatch(fetchAllQuestions("admin") as any); 
    }, [dispatch]);

    const { list, stateStatus } = useSelector((state: any) => state.question);
    
    const haveQuestion: boolean = list && list.length > 0;

    const handleNewQuestionClick = () => {
        dispatch(reset());
        navigate('/question/new');
    };

    // Show loading only if we are in loading state and have no data yet
    if (stateStatus === 'loading' && !haveQuestion) {
        return <LoadingPages />;
    }

    return (
        <div>
            <Header/>
            <PageTitle text="Questions"/>
            <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex justify-end mb-4 mr-5">
                    <Button label="New Question" onClick={handleNewQuestionClick} />
                </div>

                <div className="flex flex-col items-center">
                    {!haveQuestion && stateStatus === 'succeeded' ? (
                        <Card text="No questions found in the database." />
                    ) : (
                        <div className="w-full">
                            <QuestionRecordsTable />
                        </div>
                    )}
                    {stateStatus === 'failed' && <p className="text-red-500">Error loading questions.</p>}
                </div>
            </div>
        </div>
    );
}