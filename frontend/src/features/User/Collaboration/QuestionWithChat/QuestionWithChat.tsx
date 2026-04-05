import { useState, useEffect, useRef } from 'react';
import { TextArea, Card, TextBox, Button } from '../../../../components'
import { Chat } from '../'
import { darkBlue } from '../../../../commons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchQuestion } from '../../../../features/User/Collaboration/collaborationSlice';
import { useTextSelection } from '../../hooks/useTextSelection';
import { useCompletion } from '@ai-sdk/react';

export function QuestionWithChat() {
    const [atQuestionPage, setAtQuestionPage] = useState<boolean>(true);
    const dispatch = useDispatch();
    
    // Selectors for Question data
    const { value, stateStatus } = useSelector((state: any) => state.collaboration);
    const { selection, setSelection } = useTextSelection();
    
    // 1. Ref to track this specific component's container
    const questionRef = useRef<HTMLDivElement>(null);

    // 2. Logic to verify selection actually happened inside this box
    const isSelectionInQuestion = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !questionRef.current) return false;
        // Checks if the start of the selection is inside our ref
        return questionRef.current.contains(sel.anchorNode);
    };

    const { complete, completion, isLoading, error, stop, setCompletion } = useCompletion({
        api: 'http://localhost:3006/api/ai/explain',
        onFinish: () => {
            console.log("AI finished generating explanation.");
        },
        onError: (err) => {
            console.error("AI SDK Error:", err);
        }
    });

    const { questionTopic, questionDifficulty, programmingLanguage, question, questionTitle } = value;

    useEffect(() => {
        if (questionTopic && questionDifficulty && programmingLanguage && stateStatus === 'idle') {
            dispatch(fetchQuestion({ questionTopic, questionDifficulty, programmingLanguage }));
        }
    }, [dispatch, questionTopic, questionDifficulty, programmingLanguage, stateStatus]);

    const handleAiClick = async () => {
        if (!selection || isLoading) return;

        await complete(selection.text, {
            body: {
                context: atQuestionPage ? 'question text' : 'code snippet'
            }
        });
    };

    const handleCloseAi = () => {
        setCompletion('');
        setSelection(null);
        if (isLoading) stop();
    };

    return (
        // 3. Attach the ref to the parent div
        <div ref={questionRef} className="flex flex-col justify-center p-1 relative">
            
            {/* --- AI SELECTION BUBBLE --- */}
            {/* 4. Added isSelectionInQuestion() check to prevent bubbles from the Code side appearing here */}
            {selection && isSelectionInQuestion() && !completion && !error && (
                <button 
                    disabled={isLoading}
                    style={{ 
                        position: 'absolute', 
                        left: selection.x, 
                        top: selection.y,
                        zIndex: 100 
                    }}
                    className={`bg-blue-600 text-white px-3 py-1 rounded-full shadow-2xl text-xs font-bold transition-all
                        ${isLoading ? 'opacity-50' : 'hover:scale-110 animate-bounce'}`}
                    onClick={handleAiClick}
                >
                    {isLoading ? "Thinking..." : "Ask Gemini ✨"}
                </button>
            )}

            {/* --- AI EXPLANATION MODAL --- */}
            {(completion || error || isLoading) && (
                <div className="fixed bottom-24 right-8 w-80 bg-white border border-gray-200 shadow-2xl rounded-xl z-[100] flex flex-col overflow-hidden">
                    <div className="bg-blue-50 px-4 py-2 flex justify-between items-center border-b border-blue-100">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-green-500 animate-pulse' : 'bg-blue-400'}`}></div>
                            <span className="text-xs font-bold text-blue-700 tracking-wider uppercase">AI Assistant</span>
                        </div>
                        <button 
                            className="text-gray-400 hover:text-gray-600 text-lg leading-none" 
                            onClick={handleCloseAi}
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="p-4 overflow-y-auto max-h-[300px]">
                        {error && (
                            <div className="bg-red-50 p-3 rounded border border-red-100">
                                <p className="text-xs text-red-600 font-medium">
                                    {error.message.includes('429') ? "Slow down! AI is thinking." : "Failed to connect to AI."}
                                </p>
                            </div>
                        )}

                        {completion && (
                            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap italic">
                                {completion}
                            </div>
                        )}
                        
                        {isLoading && !completion && (
                            <div className="flex justify-center py-4">
                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-gray-50 px-4 py-2 text-[10px] text-gray-400 italic border-t border-gray-100">
                        PeerPrep AI • Tutor Mode
                    </div>
                </div>
            )}

            {/* --- CORE CONTENT --- */}
            {!atQuestionPage && <Chat/>}

            {atQuestionPage && (
                <>
                    <p style={{ color: darkBlue }} className="text-center font-bold mb-2"> 
                        {questionTitle} 
                    </p>
                    <TextBox height={355} label="" text={question}/>
                </>
            )}

            <div className="flex w-full justify-end gap-x-10 p-2 mt-4">
                <Button 
                    label="Question" 
                    variant={atQuestionPage ? "contained" : "outlined"} 
                    onClick={() => setAtQuestionPage(true)}
                />
                <Button 
                    label="Chat" 
                    variant={atQuestionPage ? "outlined" : "contained"} 
                    onClick={() => setAtQuestionPage(false)}
                />
            </div>
        </div>
    );
}