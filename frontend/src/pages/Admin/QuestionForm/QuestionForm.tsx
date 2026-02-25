import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, PageTitle, Button, DropDown, TextArea, TextField, ErrorMessage, convertEnumsToDropDownOption } from '../../../components';
import { getBlankFieldError} from '../../../commons'
import { useSelector, useDispatch } from 'react-redux';
import { fetchQuestionDetail, reset } from '../../../features/Admin/questionSlice';
import LoadingPages from '../../SupportPages/LoadingPages/LoadingPages.tsx';
import { QuestionTopic, QuestionDifficulty } from '../../../models';

export default function QuestionForm() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { value, stateStatus } = useSelector((state) => state.question);
    const [formData, setFormData] = useState({
        questionTitle: '',
        questionTopic: '',
        questionDifficulty: '',
        question: '',
        solution:''
    });

    const [isLoaded, setIsLoaded] = useState(false);

    const [hasTouched, setHasTouched] = useState({
        questionTitle: false,
        questionTopic: false,
        questionDifficulty: false,
        question: false,
        solution : false
    });

    const isFormIncomplete = !formData.questionDifficulty
    || !formData.question
    || !formData.solution
    || !formData.questionTitle
    || !formData.questionTopic;

    useEffect(() => {
        if (value && stateStatus === 'succeeded'&& !isLoaded) {
            setFormData({
                questionTitle: value.questionTitle || '',
                questionTopic: value.questionTopic || '',
                questionDifficulty: value.questionDifficulty || '',
                question: value.question || '',
                solution: value.solution || ''
            });
            setIsLoaded(true)
        }
    }, [value, stateStatus,isLoaded]);



    const allErrorMessage = useMemo(() => {
        let msg = "";
        if (hasTouched.questionDifficulty) msg += getBlankFieldError("Question difficulty", formData.questionDifficulty);
        if (hasTouched.questionTopic) msg += getBlankFieldError("Question topic", formData.questionTopic);
        if (hasTouched.questionTitle) msg += getBlankFieldError("Question title", formData.questionTitle);
        if (hasTouched.question) msg += getBlankFieldError("Question", formData.question);
        if (hasTouched.solution) msg += getBlankFieldError("Solution", formData.solution);
        return msg;
    }, [formData, hasTouched]);

    if (stateStatus === 'loading' || !value) {
        return <LoadingPages/>;
    }

    const pageTitle = "Question Form"

    const handleBackClick = () => {
        dispatch(reset());
        navigate('/question/');
    };

    const handleSubmitClick = () => {
        dispatch(reset());
        navigate('/question/');
    };

    const handleChange = (id, value) => {
        setFormData(prev => ({ ...prev, [id]: value }));
        setHasTouched(prev => ({ ...prev, [id]: true }));
    };

    return (
        <div>
            <Header/>
            <div className = "p-8">
                <PageTitle text = {pageTitle}/>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '16px',
                    alignItems: 'center',
                    paddingLeft: '140px'
                }}>
                <TextField
                    id = "questionTitle"
                    label = "Title"
                    value={formData.questionTitle}
                    onChange={(e) => handleChange('questionTitle', e.target.value)}
                />
                <DropDown
                    id = "questionTopic"
                    label = "Question Topic"
                    value = {formData.questionTopic}
                    onChange={(e) => handleChange('questionTopic', e.target.value)}
                    items = {convertEnumsToDropDownOption(QuestionTopic)} />
                <DropDown
                    id = "questionDifficulty"
                    label = "Question Difficulty"
                    value = {formData.questionDifficulty}
                    onChange={(e) => handleChange('questionDifficulty', e.target.value)}
                    items = {convertEnumsToDropDownOption(QuestionDifficulty)} />
                </div>
                <div class="px-7">
                    <TextArea
                        id = "question"
                        label = "Question"
                        value = {formData.question}
                        onChange={(e) => handleChange('question', e.target.value)}
                        rows = {5}/>
                    <TextArea
                        id = "solution"
                        label = "Solution"
                        value = {formData.solution}
                        onChange={(e) => handleChange('solution', e.target.value)}
                        rows = {5}/>
                </div>
                <ErrorMessage text = {allErrorMessage} />
                <div class="flex justify-center p-4 gap-x-15">
                    <Button label = "Back" onClick = {handleBackClick}/>
                    <Button label = "Submit" onClick = {handleSubmitClick} disabled = {allErrorMessage != "" || isFormIncomplete }/>
                </div>
            </div>
        </div>
    );
}