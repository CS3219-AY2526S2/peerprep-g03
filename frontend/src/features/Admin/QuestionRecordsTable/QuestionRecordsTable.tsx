import { useNavigate } from 'react-router-dom';
import { Table, TableProp } from '../../../components'
import { QuestionRecords } from '../../../models'

import { useDispatch, useSelector } from 'react-redux';
import { fetchQuestionDetail, fetchAllQuestions, deleteExistingQuestion } from '../questionSlice';
import { useEffect } from 'react';
const questionRecordsCols: { id: string; label: string; minWidth?: number; hidden?: boolean }[] = [
    { id: 'id', label: 'ID', hidden: true },
    { id: 'title', label: 'Title', minWidth: 100 }, 
    { id: 'topic_tags', label: 'Topic', minWidth: 150 },
    { id: 'difficulty', label: 'Difficulty', minWidth: 100 },
];

export function QuestionRecordsTable() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const questions = useSelector((state: any) => state.question.list as QuestionRecords[]);
    const status = useSelector((state: any) => state.question.stateStatus);
    useEffect(() => {
 
        dispatch(fetchAllQuestions("admin_user")); 
    }, [dispatch]);
    const handleViewClick = (x:string) => {
        dispatch(fetchQuestionDetail(x))
        navigate(`/question/view/${x}`);
    };

    const handleEditClick = (x:string) => {
        dispatch(fetchQuestionDetail(x))
        navigate(`/question/edit/${x}`);
    };
    const handleDeleteClick = async (id: string) => {
    if (window.confirm("Are you sure?")) {
        // Unwraps the result so we only refresh on success
        const resultAction = await dispatch(deleteExistingQuestion(id));
        
        if (deleteExistingQuestion.fulfilled.match(resultAction)) {
            dispatch(fetchAllQuestions("admin_user"));
        } else {
            alert("Delete failed: " + resultAction.payload);
        }
    }
};
    return (
        <Table
            columns = {questionRecordsCols}
            rows={questions || []}
            onView = {handleViewClick}
            onEdit = {handleEditClick}
            onDelete= {handleDeleteClick}
        />
    );
}