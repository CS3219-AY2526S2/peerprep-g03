import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, TextField, PageTitle, Button, ErrorMessage } from '../../../components';
import { createUserProfile } from '../../../services/Authentication';
import { getValidUsernameError, getValidEmailError, getValidPasswordError, getValidConfirmPasswordError } from '../../../commons'

export default function CreateAccount() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({username: '', email: '', password: '', confirmPassword: ''});
    const [hasTouched, setHasTouched] = useState({username: false, email: false, password: false, confirmPassword: false});
    const isFormIncomplete = !formData.username || !formData.email || !formData.password || !formData.confirmPassword;

    const handleCreateAccountClick = async () => {
        await createUserProfile(formData.username, formData.password, formData.email)
        navigate('/');
    };

    const handleChange = (id, value) => {
        setFormData(prev => ({ ...prev, [id]: value }));
        setHasTouched(prev => ({ ...prev, [id]: true }));
    };

    const allErrorMessage = () => {
        let errorMessage = ""
        if (hasTouched.username) errorMessage += getValidUsernameError(formData.username);
        if (hasTouched.email) errorMessage += getValidEmailError(formData.email);
        if (hasTouched.password) errorMessage += getValidPasswordError(formData.password);
        if (hasTouched.confirmPassword) errorMessage += getValidConfirmPasswordError(formData.confirmPassword, formData.password);
        console.log(errorMessage)
        return errorMessage
    }

    return (
        <div>
            <Header/>
                <div className = "p-12">
                    <PageTitle text = "Create Account"/>
                    <TextField
                        id = "username"
                        label = "Username"
                        value={formData.username}
                        onChange={(e) => handleChange('username', e.target.value)}/>
                    <TextField
                        id = "email"
                        label = "Email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}/>
                    <TextField
                        id = "password"
                        label = "Password"
                        secret = {true}
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}/>
                    <TextField
                        id = "confirm-password"
                        label = "Confirm Password"
                        secret = {true}
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)} />
                    <ErrorMessage text = {allErrorMessage()} />
                    <div className="flex justify-center p-4">
                        <Button label = "Create Account" onClick = {handleCreateAccountClick} disabled = {allErrorMessage() != "" || isFormIncomplete }/>
                    </div>
                </div>
        </div>
    );
}