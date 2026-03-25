import { Header, PageTitle, Table, Card} from '../../../../components';
import { AttemptRecordsTable } from '../../../../features';

export default function AttemptDashboard() {
    const haveAttempt: boolean = true
    return (
        <div>
            <Header displayUserNavigation = {true}/>
            <div class="flex flex-col justify-center p-3 gap-y-2 items-center">
                <PageTitle text = "Attempts"/>
                {!haveAttempt ? (
                    <Card text = "No attempts recorded yet." />
                    ) :(<AttemptRecordsTable/>) }
            </div>
        </div>
    );
}