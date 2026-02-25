import { useNavigate } from 'react-router-dom';
import { Header, PageTitle, DropDown, Avatar, Card, Button, convertEnumsToDropDownOption } from '../../../components';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../../features/Authentication/authenticationSlice';
import { ProficiencyLevel } from '../../../models';

export default function UserProfile() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { value, status } = useSelector((state) => state.authentication);
    const role: string = value.role
    const email: string = value.email
    const userProficiency: string = value.proficiency
    const userName: string = value.username

    const handleLogOutClick = () => {
        dispatch(logout());
        navigate('/');
    };

    const handleSaveProfileClick = () => {
        /*
            To do later
        */
    };

    return (
        <div>
            <Header displayUserNavigation = {true}/>
            <div className = "p-12">
                <PageTitle text = {`${role} Profile`}/>
                <div class="flex flex-col justify-center p-4 gap-y-3 items-center">
                    <Avatar username = {userName} size = {120} />
                    <Card label = "" text = {userName}/>
                    <Card label = "Email" text = {email}/>
                    {value.role == "User" &&
                        <div>
                        <DropDown
                            id = "proficiencyLevel"
                            label = "Proficiency Level"
                            items = {convertEnumsToDropDownOption(ProficiencyLevel)}
                            value = {userProficiency} />
                            <div class="flex flex-col justify-center items-center">
                                <Button label = "Save Profile" variant = "outlined" onClick = {handleSaveProfileClick}/>
                            </div>
                        </div>
                    }
                    <div class="mb-3"/>
                    <Button label = "Log out" onClick = {handleLogOutClick} />
                </div>
            </div>
        </div>
    );
}