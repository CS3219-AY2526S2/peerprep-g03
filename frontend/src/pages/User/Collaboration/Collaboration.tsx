import { Header } from '../../../components';
import { QuestionWithChat, Code } from '../../../features';

export default function Collaboration() {
    return (
        <div>
            <Header/>
            <div className = "flex justify-center p-2 gap-x-2 h-full">
                <div className="flex-1">
                    <QuestionWithChat />
                </div>
                <div className="flex-1">
                    <Code />
                </div>
            </div>
        </div>
    );
}