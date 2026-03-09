import { useNavigate } from 'react-router-dom';
import { IconButton } from '@mui/material';
import { Avatar, Button } from '../';
import { useSelector } from 'react-redux';

// two types of header, one enable navigation and the other do not enable navigation to other pages
export interface HeaderProps {
    displayUserNavigation?: boolean;
}

export function Header({displayUserNavigation = false}: HeaderProps) {
    const navigate = useNavigate();
    const { value, status } = useSelector((state) => state.authentication);
    const username: string = value.username
    const isAdmin: boolean = value.role == "Admin"
    const logOut: boolean = value.username == ""
    const handleViewClick = () => {
        navigate(`/profile`);
    };

    const handlePracticeNowClick = () => {
        navigate(`/start`);
    };

    const handlePastAttemptsClick = () => {
        navigate(`/attempt/`);
    };

    const handleQuestionDashboardClick = () => {
        navigate(`/question`);
    };
    return (
        <div className="flex justify-between items-center p-4 outline-black-900 outline-2">
            <h1 className = "font-mono text-4xl font-extrabold text-black-900"> PeerPrep </h1>
            {!isAdmin && displayUserNavigation && <Button label = "Practice Now" variant = "text" onClick = {handlePracticeNowClick}/>}
            {!isAdmin && displayUserNavigation && <Button label = "Past Attempts" variant = "text" onClick = {handlePastAttemptsClick}/>}
            {isAdmin && displayUserNavigation && <Button label = "Question Dashboard" variant = "text" onClick = {handleQuestionDashboardClick}/>}
            {!logOut &&
                <IconButton onClick = {handleViewClick}>
                    <Avatar username = {username}/>
                </IconButton>
            }
        </div>
    );
};