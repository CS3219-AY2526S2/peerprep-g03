import { useNavigate } from 'react-router-dom';
import { Table, TableProp } from '../../../../components'
import { AllAttemptRecord } from '../../../../models'
//import { mockAttemptRecordTableValue } from '../../../../mocks/data'
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttempt } from '../attemptSlice';
import { useEffect, useState } from 'react';


const attemptRecordsCols: { 
    id: keyof AllAttemptRecord;
    label: string; minWidth?:
    number; hidden?:boolean,
    defaultValue?:
    AllAttemptRecord[keyof AllAttemptRecord] }[] = [
        { id: 'id', label: 'Time', minWidth: 100},
        { id: 'username', label: 'User Name', hidden: true },
        { id: 'questionTitle', label: 'Title', minWidth: 100},
        { id: 'questionTopic', label: 'Topic', minWidth: 150 },
        { id: 'questionDifficulty', label: 'Difficulty', minWidth: 60},
        { id: 'collaborator', label: 'Collaborate With', minWidth: 60, defaultValue: "None"},
];

export function AttemptRecordsTable() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { value, status } = useSelector((state) => state.authentication);
    // const username:string = value.username

    // const handleViewClick = (x:string) => {
    //     dispatch(fetchAttempt({username: username, timestamp: x}))
    //     navigate(`/attempt/view/${x}`);
    // };

    const userId = value?.id || 1; // fallback for now
    const username: string = value?.username || "user1";
    console.log("AUTH VALUE:", value);
    console.log("USED USER ID:", userId);

    const [rows, setRows] = useState<AllAttemptRecord[]>([]);

    const handleViewClick = (id: string) => {
        const numericId = Number(id);

        dispatch(fetchAttempt(numericId));
        navigate(`/attempt/view/${id}`);
    };
    // const handleViewClick = (x: string) => {
    //     dispatch(fetchAttempt({ username: username, timestamp: x }));
    //     navigate(`/attempt/view/${x}`);
    // };

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                const res = await fetch(`http://localhost:3004/records?user_id=${userId}`);
                const data = await res.json();

                // map backend → frontend format
                const mapped: AllAttemptRecord[] = data.map((r: any) => ({
                    id: r.id,
                    username: r.user1_id === userId ? r.user1_username : r.user2_username,
                    questionTitle: r.question_text,
                    questionTopic: r.question_topic,
                    questionDifficulty: r.difficulty,
                    collaborator: r.user1_id === userId ? r.user2_username : r.user1_username,
                }));

                setRows(mapped);
            } catch (err) {
                console.error("Failed to fetch records:", err);
            }
        };

        fetchRecords();
    }, [userId]);

    return (
        <Table
            columns = {attemptRecordsCols}
            rows = { rows }
            onView = { handleViewClick }
        />
    );

}