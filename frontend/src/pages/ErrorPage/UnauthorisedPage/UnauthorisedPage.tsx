import { useNavigate } from 'react-router-dom';
import { Header, PageTitle, Button} from '../../../components';
import { useSelector } from 'react-redux';

export default function UnauthorisedPage() {
    const navigate = useNavigate();
    const { value, status } = useSelector((state) => state.authentication);
    const isAdmin = value.role == "Admin"
    const isLoggedIn = value.username != ""

    const handleUnauthorisedClick = () => {
        if (!isLoggedIn) {
            navigate('/');
        }
        else if (isAdmin) {
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
                <PageTitle text = "Unauthorised Access"/>
                <div className ="flex justify-center p-4">
                    <Button label = "Return" variant = "outlined" onClick = {handleUnauthorisedClick}/>
                </div>
            </div>
        </div>
    );
}