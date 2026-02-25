import { useNavigate } from 'react-router-dom';
import {Header, PageTitle, Table, Card, Button} from '../../../components';
import { QuestionRecordsTable } from '../../../features';
import { useSelector, useDispatch } from 'react-redux';
import { reset } from '../../../features/Admin/questionSlice';

export default function QuestionDashboard() {
    const haveQuestion: boolean = true
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleNewQuestionClick = () => {
        dispatch(reset());
        navigate('/question/new');
    };

    return (
        <div>
            <Header/>
            <PageTitle text = "Questions"/>

            <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex justify-end mb-4 mr-5">
                    <Button label="New Question" onClick={handleNewQuestionClick} />
                </div>

                <div className="flex flex-col items-center">
                    {!haveQuestion ? (
                        <Card text="No questions yet." />
                    ) : (
                        <div className="w-full">
                            <QuestionRecordsTable />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}