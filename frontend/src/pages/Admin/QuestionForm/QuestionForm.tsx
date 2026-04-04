import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header, PageTitle, Button, DropDown, TextArea, TextField, ErrorMessage, convertEnumsToDropDownOption } from '../../../components';
import { getBlankFieldError } from '../../../commons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchQuestionDetail, reset, createNewQuestion, updateExistingQuestion } from '../../../features/Admin/questionSlice';
import LoadingPages from '../../SupportPages/LoadingPages/LoadingPages.tsx';
import { QuestionTopic, QuestionDifficulty } from '../../../models';

// Define the template structure
interface LanguageTemplate {
    language: string;
    starter_code: string;
    solution_code: string; 
}

export default function QuestionForm() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { questionId } = useParams();

    const { value, stateStatus, serverError } = useSelector((state: any) => state.question);
   
    const [formData, setFormData] = useState({
        questionTitle: '',
        questionTopic: [] as string[],
        questionDifficulty: '',
        question: '',
        templates: [] as LanguageTemplate[] // New field for normalized design
    });

    const [isLoaded, setIsLoaded] = useState(false);
    const isEditMode = Boolean(questionId);

    const [hasTouched, setHasTouched] = useState({
        questionTitle: false,
        questionTopic: false,
        questionDifficulty: false,
        question: false,
        templates: false,
    });

    const isFormIncomplete = !formData.questionDifficulty
        || !formData.question
        || !formData.questionTitle
        || formData.questionTopic.length === 0
        || formData.templates.length === 0 // Must have at least one template
        || formData.templates.some(t => !t.language || !t.starter_code || !t.solution_code); // All fields in all templates must be filled

    useEffect(() => {
        if (isEditMode && !isLoaded) {
            dispatch(fetchQuestionDetail(questionId));
        } else if (!isEditMode) {
            setIsLoaded(true);
        }
    }, [dispatch, isEditMode, questionId, isLoaded]);

    useEffect(() => {
        if (isEditMode && value && stateStatus === 'succeeded' && !isLoaded) {
            setFormData({
                questionTitle: value.title || '',
                questionTopic: Array.isArray(value.topic_tags) ? value.topic_tags : [],
                questionDifficulty: value.difficulty || '',
                question: value.description || '',
               
                templates: Array.isArray(value.templates) ? value.templates : []
            });
            setIsLoaded(true);
        }
    }, [value, stateStatus, isLoaded, isEditMode]);

    const handleAddTemplate = () => {
        setFormData(prev => ({
            ...prev,
            templates: [...prev.templates, { language: '', starter_code: '', solution_code: '' }]
        }));
        setHasTouched(prev => ({ ...prev, templates: true })); // Mark as touched
    };
    const handleRemoveTemplate = (index: number) => {
        setFormData(prev => ({
            ...prev,
            templates: prev.templates.filter((_, i) => i !== index)
        }));
    };

    const handleTemplateChange = (index: number, field: keyof LanguageTemplate, val: string) => {
        const updatedTemplates = [...formData.templates];
        updatedTemplates[index] = { ...updatedTemplates[index], [field]: val };
        setFormData(prev => ({ ...prev, templates: updatedTemplates }));

        if (field === 'language' && serverError?.toLowerCase().includes('language')) {
            dispatch(reset());
        }
    };

    const handleSubmitClick = async () => {
        const payload = {
            id: questionId,
            questionTitle: formData.questionTitle,
            questionTopic: formData.questionTopic,
            questionDifficulty: formData.questionDifficulty,
            question: formData.question,
            templates: formData.templates 
        };

        let result;
        if (isEditMode) {
            result = await dispatch(updateExistingQuestion(payload));
        } else {
            result = await dispatch(createNewQuestion(payload));
        }

        if (updateExistingQuestion.fulfilled.match(result) || createNewQuestion.fulfilled.match(result)) {
            dispatch(reset());
            navigate('/question/');
        }
    };

    const allErrorMessage = useMemo(() => {
        let msg = "";
        if (serverError?.includes("Permission Denied") || serverError?.includes("access required")) {
            return "User doesn't have access to edit/create/delete question.";
        }
        if (hasTouched.questionDifficulty) msg += getBlankFieldError("Question difficulty", formData.questionDifficulty);
        if (hasTouched.questionTopic && formData.questionTopic.length === 0) msg += "Please select at least one topic. ";
        if (hasTouched.questionTitle) msg += getBlankFieldError("Question title", formData.questionTitle);
        if (hasTouched.question) msg += getBlankFieldError("Question", formData.question);
        
        
        // Validation for templates
        if (hasTouched.templates || isEditMode) {
            if (formData.templates.length === 0) {
                msg += (msg ? " | " : "") + "Please add at least one language template.";
            } else {
                formData.templates.forEach((t, i) => {
                    if (!t.language || !t.starter_code || !t.solution_code) {
                        msg += (msg ? " | " : "") + `Template ${i + 1} is incomplete.`;
                    }
                });
            }
        }

        const languages = formData.templates.map(t => t.language).filter(l => l !== '');
        const hasDuplicateLang = new Set(languages).size !== languages.length;
        if (hasDuplicateLang) {
            msg += (msg ? " | " : "") + "Multiple templates found for the same language.";
        }

    
        if (serverError) {
            // If the server returns a specific message, append it
            msg += (msg ? " | " : "") + serverError;
        }
        return msg;
    }, [formData, hasTouched, serverError]);

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
        if (id === 'questionTitle' && serverError?.toLowerCase().includes('title')) {
            dispatch(reset()); 
        }
    };

    const handleTopicToggle = (topic: string) => {
        setFormData(prev => {
            const currentTopics = prev.questionTopic;
            const newTopics = currentTopics.includes(topic)
                ? currentTopics.filter(t => t !== topic)
                : [...currentTopics, topic];
            return { ...prev, questionTopic: newTopics };
        });
        setHasTouched(prev => ({ ...prev, questionTopic: true }));
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
                    alignItems: 'start',
                    paddingLeft: '140px'
                }}>
                    <TextField
                        id="questionTitle"
                        label="Title"
                        value={formData.questionTitle}
                        onChange={(e) => handleChange('questionTitle', e.target.value)}
                    />
                    <div className="flex flex-col">
                        <label className="text-sm font-bold mb-1">Question Topics</label>
                        <div className="border rounded-lg p-2 bg-white overflow-y-auto" style={{ height: '120px', width: '250px' }}>
                            {Object.values(QuestionTopic).map((topic) => (
                                <div key={topic} className="flex items-center gap-2 p-1 hover:bg-gray-50">
                                    <input 
                                        type="checkbox" 
                                        id={`topic-${topic}`}
                                        checked={formData.questionTopic.includes(topic)}
                                        onChange={() => handleTopicToggle(topic)}
                                    />
                                    <label htmlFor={`topic-${topic}`} className="text-sm cursor-pointer">{topic}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <DropDown
                        id="questionDifficulty"
                        label="Question Difficulty"
                        value={formData.questionDifficulty}
                        onChange={(e) => handleChange('questionDifficulty', e.target.value)}
                        items={convertEnumsToDropDownOption(QuestionDifficulty)} />
                </div>

                <div className="px-7 mt-4">
                    <TextArea
                        id="question"
                        label="Question Description"
                        value={formData.question}
                        onChange={(e) => handleChange('question', e.target.value)}
                        rows={5} />
                    
                    <div className="flex items-center gap-4 mt-6 mb-2">
                        <h3 className="font-bold text-lg">Language Starter Templates</h3>
                        {/* Visual cue for the user */}
                        {formData.templates.length === 0 && (
                            <span className="text-red-500 text-sm font-medium">
                                (Please add at least 1 template for a question)
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Add boilerplate code for specific languages.</p>
                    
                    {formData.templates.map((template, index) => (
                        <div key={index} className="border p-4 rounded-lg bg-gray-50 mb-4 relative">
                            <div className="flex gap-4 mb-4">
                                <div style={{ width: '200px' }}>
                                    <DropDown
                                        id={`lang-${index}`}
                                        label="Language"
                                        value={template.language}
                                        onChange={(e) => handleTemplateChange(index, 'language', e.target.value)}
                                        items={[
                                            { label: 'Python', value: 'python' },
                                            { label: 'C++', value: 'cpp' },
                                            { label: 'Java', value: 'java' }
                                    
                                        ]}
                                    />
                                </div>
                                <Button 
                                    label="Remove" 
                                    onClick={() => handleRemoveTemplate(index)} 
                                    className="bg-red-500 text-white mt-6"
                                />
                            </div>
                            <TextArea
                                id={`code-${index}`}
                                label="Starter Code Boilerplate"
                                value={template.starter_code}
                                onChange={(e) => handleTemplateChange(index, 'starter_code', e.target.value)}
                                rows={4}
                            />
                            <TextArea
                                id={`sol-${index}`}
                                label="Solution Code"
                                value={template.solution_code}
                                onChange={(e) => handleTemplateChange(index, 'solution_code', e.target.value)}
                                rows={6}
                                className="border-green-100"
                            />
                        </div>
                    ))}
                    
                    <Button disabled={formData.templates.length >= 3} label="+ Add Language Template" onClick={handleAddTemplate} />
                    {formData.templates.length >= 3 && (
                        <p className="text-xs text-orange-600 mt-1">Maximum of 3 languages reached.</p>
                    )}
                    
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