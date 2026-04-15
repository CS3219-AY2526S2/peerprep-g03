import { useNavigate } from 'react-router-dom';
import { Table } from '../../../components'
import { QuestionRecords } from '../../../models'
import { useDispatch, useSelector } from 'react-redux';
import { fetchQuestionDetail, fetchAllQuestions, deleteExistingQuestion } from '../questionSlice';
import { useEffect, useState } from 'react';

const questionRecordsCols: { id: string; label: string; minWidth?: number; hidden?: boolean }[] = [
    { id: 'id', label: 'ID', hidden: true },
    { id: 'title', label: 'Title', minWidth: 100 }, 
    { id: 'topic_tags', label: 'Topic', minWidth: 150 },
    { id: 'difficulty', label: 'Difficulty', minWidth: 100 },
];

export function QuestionRecordsTable() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // MUI uses 0-based indexing for pages
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const questions = useSelector((state: any) => state.question.list as QuestionRecords[]);
    const status = useSelector((state: any) => state.question.stateStatus);
    const { totalCount } = useSelector((state: any) => state.question.pagination || { totalCount: 0 });

    useEffect(() => {
        // Only fetch if not already loading to prevent loops
        if (status !== 'loading') {
            // Convert MUI 0-index to Backend 1-index
            dispatch(fetchAllQuestions({ username: "admin_user", page: page + 1, limit: 10 })); 
        }
    }, [dispatch, page]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (newRowsPerPage: number) => {
        setRowsPerPage(newRowsPerPage);
        // Note: Backend is fixed at 10, so local rowsPerPage only affects frontend display density
    };

    const handleViewClick = (x: string) => {
        dispatch(fetchQuestionDetail(x));
        navigate(`/question/view/${x}`);
    };

    const handleEditClick = (x: string) => {
        dispatch(fetchQuestionDetail(x));
        navigate(`/question/edit/${x}`);
    };

    const handleDeleteClick = async (id: string) => {
        if (window.confirm("Are you sure?")) {
            const resultAction = await dispatch(deleteExistingQuestion(id));
            if (deleteExistingQuestion.fulfilled.match(resultAction)) {
                dispatch(fetchAllQuestions({ username: "admin_user", page: page + 1, limit: 10 }));
            } else {
                alert("Delete failed: " + resultAction.payload);
            }
        }
    };

    return (
        <Table
            columns={questionRecordsCols}
            rows={questions || []}
            totalCount={totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            onView={handleViewClick}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
        />
    );
}