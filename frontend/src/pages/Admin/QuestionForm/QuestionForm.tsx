import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // Added useParams
import { Header, PageTitle, Button, DropDown, TextArea, TextField, ErrorMessage, convertEnumsToDropDownOption } from '../../../components';
import { getBlankFieldError } from '../../../commons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchQuestionDetail, reset, createNewQuestion, updateExistingQuestion } from '../../../features/Admin/questionSlice'; // Added thunks
import LoadingPages from '../../SupportPages/LoadingPages/LoadingPages.tsx';
import { QuestionTopic, QuestionDifficulty } from '../../../models';

export default function QuestionForm() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { questionId } = useParams(); // Get ID from URL to check if Editing

    const { value, stateStatus } = useSelector((state) => state.question);
    const [formData, setFormData] = useState({
        questionTitle: '',
        questionTopic: '',
        questionDifficulty: '',
        question: '',
        solution: ''
    });

    const [isLoaded, setIsLoaded] = useState(false);
    const isEditMode = Boolean(questionId); // Helper to determine mode

    const [hasTouched, setHasTouched] = useState({
        questionTitle: false,
        questionTopic: false,
        questionDifficulty: false,
        question: false,
        solution: false
    });

    const isFormIncomplete = !formData.questionDifficulty
        || !formData.question
        || !formData.solution
        || !formData.questionTitle
        || !formData.questionTopic;

    // Effect to fetch data if we are in Edit mode
    useEffect(() => {
        if (isEditMode && !isLoaded) {
            dispatch(fetchQuestionDetail(questionId));
        } else if (!isEditMode) {
            // If New mode, ensure form is empty
            setIsLoaded(true);
        }
    }, [dispatch, isEditMode, questionId, isLoaded]);

    // Effect to populate form once data is fetched successfully [cite: 87, 105]
    useEffect(() => {
    if (isEditMode && value && stateStatus === 'succeeded' && !isLoaded) {
        setFormData({
            // value.title is what the DB returns, questionTitle is what the form uses
            questionTitle: value.title || '', 
            questionTopic: Array.isArray(value.topic_tags) ? value.topic_tags[0] : value.topic_tags || '',
            questionDifficulty: value.difficulty || '',
            question: value.description || '', // mapped from 'description' in DB
            solution: value.solution || ''
        });
        setIsLoaded(true);
    }
}, [value, stateStatus, isLoaded, isEditMode]);
    const handleSubmitClick = async () => {
    const payload = {
        id: questionId, // Ensure ID is inside the object for the thunk
        questionTitle: formData.questionTitle,
        questionTopic: formData.questionTopic,
        questionDifficulty: formData.questionDifficulty,
        question: formData.question,
        solution: formData.solution
    };

    if (isEditMode) {
        // Wait for the update to actually finish
        const result = await dispatch(updateExistingQuestion(payload));
        if (updateExistingQuestion.fulfilled.match(result)) {
            dispatch(reset());
            navigate('/question/');
        }
    } else {
        await dispatch(createNewQuestion(payload));
        dispatch(reset());
        navigate('/question/');
    }
    };
    const allErrorMessage = useMemo(() => {
        let msg = "";
        if (hasTouched.questionDifficulty) msg += getBlankFieldError("Question difficulty", formData.questionDifficulty);
        if (hasTouched.questionTopic) msg += getBlankFieldError("Question topic", formData.questionTopic);
        if (hasTouched.questionTitle) msg += getBlankFieldError("Question title", formData.questionTitle);
        if (hasTouched.question) msg += getBlankFieldError("Question", formData.question);
        if (hasTouched.solution) msg += getBlankFieldError("Solution", formData.solution);
        return msg;
    }, [formData, hasTouched]);

    // Show loading only if we are actively fetching for an Edit mode 
    if (isEditMode && (stateStatus === 'loading' || !value || !isLoaded)) {
        return <LoadingPages />;
    }

    const pageTitle = isEditMode ? "Edit Question" : "New Question"; 

    const handleBackClick = () => {
        dispatch(reset());
        navigate('/question/');
    };

    

    const handleChange = (id, value) => {
        setFormData(prev => ({ ...prev, [id]: value }));
        setHasTouched(prev => ({ ...prev, [id]: true }));
    };

    return (
        <div>
            <Header />
            <div className="p-8">
                <PageTitle text={pageTitle} />
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '16px',
                    alignItems: 'center',
                    paddingLeft: '140px'
                }}>
                    <TextField
                        id="questionTitle"
                        label="Title"
                        value={formData.questionTitle}
                        onChange={(e) => handleChange('questionTitle', e.target.value)}
                    />
                    <DropDown
                        id="questionTopic"
                        label="Question Topic"
                        value={formData.questionTopic}
                        onChange={(e) => handleChange('questionTopic', e.target.value)}
                        items={convertEnumsToDropDownOption(QuestionTopic)} />
                    <DropDown
                        id="questionDifficulty"
                        label="Question Difficulty"
                        value={formData.questionDifficulty}
                        onChange={(e) => handleChange('questionDifficulty', e.target.value)}
                        items={convertEnumsToDropDownOption(QuestionDifficulty)} />
                </div>
                <div className="px-7">
                    <TextArea
                        id="question"
                        label="Question"
                        value={formData.question}
                        onChange={(e) => handleChange('question', e.target.value)}
                        rows={5} />
                    <TextArea
                        id="solution"
                        label="Solution"
                        value={formData.solution}
                        onChange={(e) => handleChange('solution', e.target.value)}
                        rows={5} />
                </div>
                <ErrorMessage text={allErrorMessage} />
                <div className="flex justify-center p-4 gap-x-15">
                    <Button label="Back" onClick={handleBackClick} />
                    <Button
                        label="Submit"
                        onClick={handleSubmitClick}
                        disabled={allErrorMessage !== "" || isFormIncomplete || stateStatus === 'loading'}
                    />
                </div>
            </div>
        </div>
    );
}