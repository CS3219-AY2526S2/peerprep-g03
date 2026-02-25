import { useNavigate } from 'react-router-dom';
import { Table, TableProp } from '../../../components'
import { QuestionRecords } from '../../../models'
import { mockMultipleQuestionRecords } from '../../../mocks/data'
import { useDispatch } from 'react-redux';
import { fetchQuestionDetail } from '../questionSlice';

const questionRecordsCols: { id: keyof QuestionRecords; label: string; minWidth?: number; hidden?:boolean }[] = [
    { id: 'id', label: 'ID', hidden: true },
    { id: 'questionTitle', label: 'Title', minWidth: 100},
    { id: 'questionTopic', label: 'Topic', minWidth: 150 },
    { id: 'questionDifficulty', label: 'Difficulty', minWidth: 100},
];

export function QuestionRecordsTable() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleViewClick = (x:string) => {
        dispatch(fetchQuestionDetail(x))
        navigate(`/question/view/${x}`);
    };

    const handleEditClick = (x:string) => {
        dispatch(fetchQuestionDetail(x))
        navigate(`/question/edit/${x}`);
    };
    const handleDeleteClick = () => {
        /*
        to do later
        */
    };
    return (
        <Table
            columns = {questionRecordsCols}
            rows = {mockMultipleQuestionRecords}
            onView = {handleViewClick}
            onEdit = {handleEditClick}
            onDelete= {(x:string) => {}}
        />
    );
}