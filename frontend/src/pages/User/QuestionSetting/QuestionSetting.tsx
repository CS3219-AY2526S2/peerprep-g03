import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, PageTitle, DropDown, Button, ErrorMessage, convertEnumsToDropDownOption } from '../../../components';
import { getBlankFieldError } from '../../../commons'
import { useDispatch } from 'react-redux';
import { initialise } from '../../../features/User/Collaboration/collaborationSlice';
import { QuestionTopic, ProgrammingLanguage, QuestionDifficultyMatching } from '../../../models';

export default function QuestionSetting() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        questionDifficulty: null,
        programmingLanguage: null,
        questionTopic:null});

    const [hasTouched, setHasTouched] = useState({
        questionDifficulty: false,
        programmingLanguage: false,
        questionTopic:false});

    const isFormIncomplete = !formData.questionDifficulty || !formData.programmingLanguage || !formData.questionTopic;

    const saveSetting = () => {dispatch(initialise({
        questionTopic: formData.questionTopic,
        questionDifficulty: formData.questionDifficulty,
        programmingLanguage: formData.programmingLanguage}))
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

    const handleJustMeClick = () => {
        saveSetting()
        navigate(`/collaboration`);
    };

    const handleFindFriendClick = () => {
        saveSetting()
        navigate('/waiting-room');
    };


    return (
        <div>
            <Header displayUserNavigation = {true}/>
            <div className = "p-12">
                <PageTitle text = "Start Practicing"/>
                <div class="flex flex-col justify-center p-4 gap-y-3 items-center">
                    <DropDown id = "programmingLanguage" label = "Programming Language" value={formData.programmingLanguage} items = {convertEnumsToDropDownOption(ProgrammingLanguage)} onChange={(e) => handleChange('programmingLanguage', e)}/>
                    <DropDown id = "questionTopic" label = "Question Topic" items = {convertEnumsToDropDownOption(QuestionTopic)} value={formData.questionTopic} onChange={(e) => handleChange('questionTopic', e)} />
                    <DropDown id = "questionDifficulty" label = "Question Difficulty"  value={formData.questionDifficulty} items = {convertEnumsToDropDownOption(QuestionDifficultyMatching)} onChange={(e) => handleChange('questionDifficulty', e)}/>
                    <ErrorMessage text = {allErrorMessage()} />
                    <div class="flex justify-center p-4 gap-x-15">
                        <Button label = "Just Me" onClick = {handleJustMeClick} disabled = {allErrorMessage() != "" || isFormIncomplete }/>
                        <Button label = "Find a Friend" onClick = {handleFindFriendClick} disabled = {allErrorMessage() != "" || isFormIncomplete }/>
                    </div>
                </div>
            </div>
        </div>
    );
}