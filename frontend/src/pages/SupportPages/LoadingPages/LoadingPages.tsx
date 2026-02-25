import {Header, PageTitle, Button} from '../../../components';

export default function LoadingPages() {
    return (
        <div>
            <Header/>
            <div className = "p-22">
                <PageTitle text = "Loading..."/>
            </div>
        </div>
    );
}