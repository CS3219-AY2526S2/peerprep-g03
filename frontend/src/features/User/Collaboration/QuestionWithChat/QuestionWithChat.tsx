import { useState, useEffect } from 'react';
import { TextArea, Card, TextBox, Button } from '../../../../components'
import { Chat } from '../'
import { darkBlue } from '../../../../commons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchQuestion } from '../../../../features/User/Collaboration/collaborationSlice';

export function QuestionWithChat() {
    const [atQuestionPage, setAtQuestionPage] = useState<boolean>(true);
    const dispatch = useDispatch();
    const { value, stateStatus } = useSelector((state) => state.collaboration);

    const questionTopic: string = value.questionTopic
    const questionDifficulty: string = value.questionDifficulty
    const programmingLanguage: string = value.programmingLanguage
    const question: string = value.question
    const questionTitle: string = value.questionTitle

    useEffect(() => {
        if (questionTopic && questionDifficulty && programmingLanguage && stateStatus === 'idle') {
            console.log(value)
            dispatch(fetchQuestion({ questionTopic, questionDifficulty, programmingLanguage }));
            }
        }, [dispatch, questionTopic, questionDifficulty, programmingLanguage, stateStatus]);

    const QuestionTitle = questionTitle

    const handleQuestionClick = () => {
        setAtQuestionPage(true)
    };

    const handleChatClick = () => {
        setAtQuestionPage(false)
    };

    return (
        <div class="flex flex-col justify-center p-1">
            {!atQuestionPage && <Chat/>}

            {atQuestionPage && <p style={{ color: darkBlue }} className= "text-center font-bold"> {QuestionTitle} </p>}
            {atQuestionPage &&  <TextBox height = {355} label = "" text = {question}/>}

            <div class="flex w-full justify-end gap-x-10 p-2">
                <Button label = "Question" variant = {atQuestionPage? "contained" : "outlined"} onClick = {handleQuestionClick}/>
                <Button label = "Chat" variant = {atQuestionPage? "outlined" : "contained"} onClick = {handleChatClick}/>
            </div>
        </div>
    );
}