import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, PageTitle, DropDown, Button, ErrorMessage, convertEnumsToDropDownOption, Dialog } from '../../../components';
import { getBlankFieldError } from '../../../commons'
import { useDispatch } from 'react-redux';
import { initialise } from '../../../features/User/Collaboration/collaborationSlice';
import { QuestionTopic, ProgrammingLanguage, QuestionDifficultyMatching } from '../../../models';
import { getQuestionUser } from '../../../services/Questions';
import { startRoomSession } from 'services/Collaboration';
export default function QuestionSetting() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        questionDifficulty: null,
        programmingLanguage: null,
        questionTopic:null});

    const [hasTouched, setHasTouched] = useState({
        questionDifficulty: false,
        programmingLanguage: false,
        questionTopic:false});

    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const isFormIncomplete = !formData.questionDifficulty || !formData.programmingLanguage || !formData.questionTopic;

    const saveSetting = async () => {
        try {
            setIsLoading(true);
            const questionData = await getQuestionUser(formData.questionTopic, formData.questionDifficulty, formData.programmingLanguage)
            dispatch(initialise({
                    questionTopic: formData.questionTopic,
                    questionDifficulty: formData.questionDifficulty,
                    programmingLanguage: formData.programmingLanguage,
                    questionTitle: questionData.title,
                    question: questionData.description,
                    }))
            setIsLoading(false);
            return true;
        } catch (e) {
            setIsLoading(false);
            if (e.response && e.response.status === 404) {
                  setIsDialogOpen(true)
            }
            console.error("Fetch failed:", e);
            return false;
        }
    }

    const resetQuestionSettings = () => {
        setFormData({questionDifficulty: null, programmingLanguage: null, questionTopic:null})
        setHasTouched({questionDifficulty: false, programmingLanguage: false, questionTopic:false})
        setIsDialogOpen(false);
    }

    const allErrorMessage = () => {
        let errorMessage = ""
        if (hasTouched.questionDifficulty) errorMessage += getBlankFieldError("Question difficulty", formData.questionDifficulty);
        if (hasTouched.questionTopic) errorMessage += getBlankFieldError("Question topic", formData.questionTopic);
        if (hasTouched.programmingLanguage) errorMessage += getBlankFieldError("Programming Language", formData.programmingLanguage);
        return errorMessage
    }


    const handleChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, [id]: value }));
        setHasTouched(prev => ({ ...prev, [id]: true }));
    };

    const handleJustMeClick = async () => {
        const success = await saveSetting();
        if (success) {
            navigate(`/collaboration`);
        }
    };

    const handleFindFriendClick = async () => {
        const success = await saveSetting();
        if (success) {
            navigate(`/waiting-room`);
        }
    };


    return (
        <div>
            <Header displayUserNavigation = {true}/>
            <Dialog title = "Change your question settings"
                content = "Currently, we do not have questions available to fit the following question requirements. Please modify your question settings."
                canExit = {true}
                isVisible = {isDialogOpen}
                haveButton = {true}
                buttonWords = "OK"
                buttonActions = {resetQuestionSettings}/>
            <div className = "p-12">
                <PageTitle text = "Start Practicing"/>
                <div class="flex flex-col justify-center p-4 gap-y-3 items-center">
                    <DropDown id = "programmingLanguage" label = "Programming Language" value={formData.programmingLanguage} items = {convertEnumsToDropDownOption(ProgrammingLanguage)} onChange={(e) => handleChange('programmingLanguage', e)}/>
                    <DropDown id = "questionTopic" label = "Question Topic" items = {convertEnumsToDropDownOption(QuestionTopic)} value={formData.questionTopic} onChange={(e) => handleChange('questionTopic', e)} />
                    <DropDown id = "questionDifficulty" label = "Question Difficulty"  value={formData.questionDifficulty} items = {convertEnumsToDropDownOption(QuestionDifficultyMatching)} onChange={(e) => handleChange('questionDifficulty', e)}/>
                    <ErrorMessage text = {allErrorMessage()} />
                    <div class="flex justify-center p-4 gap-x-15">
                        <Button label = {isLoading ? "Loading...": "Just Me"} onClick = {handleJustMeClick} disabled = {allErrorMessage() != "" || isFormIncomplete ||isLoading }/>
                        <Button label = {isLoading ? "Loading..." : "Find a Friend"} onClick = {handleFindFriendClick} disabled = {allErrorMessage() != "" || isFormIncomplete || isLoading} />
                    </div>
                </div>
            </div>
        </div>
    );
}