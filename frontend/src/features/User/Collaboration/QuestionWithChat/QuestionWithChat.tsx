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
    
    const { value, stateStatus } = useSelector((state: any) => state.collaboration);
    const { selection, setSelection } = useTextSelection();
    const questionRef = useRef<HTMLDivElement>(null);

    // --- DRAGGING LOGIC ---
    // Start the modal at a default position (bottom right-ish)
    const [pos, setPos] = useState({ x: window.innerWidth - 450, y: window.innerHeight - 600 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            setPos({
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y
            });
        };

        const handleMouseUp = () => {
            isDragging.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []); // Only run once to set up listeners

    // --- AI LOGIC ---
    const isSelectionInQuestion = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !questionRef.current) return false;
        return questionRef.current.contains(sel.anchorNode);
    };

    const { complete, completion, isLoading, error, stop, setCompletion } = useCompletion({
        api: 'http://localhost:3006/api/ai/explain',
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
            body: { context: atQuestionPage ? 'question text' : 'code snippet' }
        });
    };

    const handleCloseAi = () => {
        setCompletion('');
        setSelection(null);
        if (isLoading) stop();
    };

    return (
        <div ref={questionRef} className="flex flex-col justify-center p-1 relative">
            
            {/* --- AI SELECTION BUBBLE --- */}
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

            {/* --- DRAGGABLE AI EXPLANATION MODAL --- */}
            {(completion || error || isLoading) && (
                <div 
                    style={{ 
                        position: 'fixed', 
                        left: `${pos.x}px`, 
                        top: `${pos.y}px`, 
                        width: '400px', // Wider window as requested
                        zIndex: 150 
                    }}
                    className="bg-white border border-gray-200 shadow-2xl rounded-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    {/* HEADER: Acts as the drag handle */}
                    <div 
                        onMouseDown={handleMouseDown}
                        className="bg-blue-50 px-4 py-3 flex justify-between items-center border-b border-blue-100 cursor-move active:cursor-grabbing select-none"
                    >
                        <div className="flex items-center gap-2 pointer-events-none">
                            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-green-500 animate-pulse' : 'bg-blue-400'}`}></div>
                            <span className="text-xs font-bold text-blue-700 tracking-wider uppercase">AI Assistant </span>
                        </div>
                        <button 
                            className="text-gray-400 hover:text-gray-600 text-lg leading-none" 
                            onClick={handleCloseAi}
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="p-5 overflow-y-auto max-h-[500px]">
                        {error && (
                            <div className="bg-red-50 p-3 rounded border border-red-100">
                                <p className="text-xs text-red-600 font-medium">
                                    {error.message.includes('429') ? "Slow down! AI is thinking." : "Failed to connect to AI."}
                                </p>
                            </div>
                        )}

                        {completion && (
                            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap italic bg-slate-50 p-3 rounded border border-slate-100">
                                {completion}
                            </div>
                        )}
                        
                        {isLoading && !completion && (
                            <div className="flex flex-col items-center py-8 gap-3">
                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Consulting Gemini...</span>
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