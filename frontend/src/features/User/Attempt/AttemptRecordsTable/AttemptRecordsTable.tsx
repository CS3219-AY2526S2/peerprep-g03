import { useNavigate } from 'react-router-dom';
import { Table, TableProp } from '../../../../components'
import { AllAttemptRecord } from '../../../../models'
import { mockAttemptRecordTableValue } from '../../../../mocks/data'
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttempt } from '../attemptSlice';


const attemptRecordsCols: { id: keyof AllAttemptRecord;
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
    const username:string = value.username

    const handleViewClick = (x:string) => {
        dispatch(fetchAttempt({username: username, timestamp: x}))
        navigate(`/attempt/view/${x}`);
    };

    return (
        <Table
            columns = {attemptRecordsCols}
            rows = { mockAttemptRecordTableValue }
            onView = {handleViewClick}
        />
    );

}