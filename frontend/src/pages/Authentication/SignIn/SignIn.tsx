import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, TextField, PageTitle, Button, ErrorMessage} from '../../../components';
import { getUserProfile } from '../../../services/Authentication';
import { useDispatch } from 'react-redux';
import { initialise } from '../../../features/Authentication/authenticationSlice';
import { getValidUsernameError, getValidPasswordError} from '../../../commons'

export default function SignIn() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [formData, setFormData] = useState({username: '', password: ''});
    const [hasTouched, setHasTouched] = useState({username: false, password: false});
    const isFormIncomplete = !formData.username || !formData.password;

    const handleChange = (id, value) => {
        setFormData(prev => ({ ...prev, [id]: value }));
        setHasTouched(prev => ({ ...prev, [id]: true }));
    };

    const allErrorMessage = () => {
        let errorMessage = ""
        if (hasTouched.username) errorMessage += getValidUsernameError(formData.username);
        if (hasTouched.password) errorMessage += getValidPasswordError(formData.password);


        return errorMessage
    }

    const handleCreateAccountClick = () => {
        navigate('/create-account');
    };

    const handleSignInClick = async() => {

        const response = await getUserProfile(formData.username, formData.password)

        if (response.status != "200") {
            // put error message
        }

        dispatch(
            initialise({
                username: response.username,
                role: response.role,
                email: response.email,
                proficiency: response.proficiency,
                JWToken: response.JWToken
            }))

        const isAdmin = response.role == "Admin"
        if (isAdmin) {
            navigate('/question');
        }
        else {
            navigate('/start');
        }
    };

    return (
        <div>
            <Header/>
            <div className = "p-22">
                <PageTitle text = "Sign In"/>
                <TextField id = "username" label = "Username" value={formData.username} onChange={(e) => handleChange('username', e.target.value)}/>
                <TextField id = "password" label = "Password" secret = {true} value={formData.password} onChange={(e) => handleChange('password', e.target.value)}/>
                <ErrorMessage text = {allErrorMessage()} />
                <div className="flex justify-center p-4 gap-x-15">
                    <Button label = "Sign In" onClick = {handleSignInClick} disabled = {allErrorMessage() != "" || isFormIncomplete }/>
                    <Button label = "Create Account" onClick = {handleCreateAccountClick}/>
                </div>
            </div>
        </div>
    );
}