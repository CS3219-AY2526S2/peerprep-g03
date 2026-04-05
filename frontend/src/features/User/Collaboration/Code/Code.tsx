import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../components';
import { TextField as MuiTextField } from '@mui/material';
import { darkBlue } from '../../../../commons';
import { useSelector, useDispatch } from 'react-redux';
import { reset } from '../../../../features/User/Collaboration/collaborationSlice';
import { postAttempt } from '../../../../services/Attempts';
import { useCompletion } from '@ai-sdk/react';

export function Code() {
    // 1. Separate selection (the bubble) from the active AI session
    const [bubble, setBubble] = useState<{ text: string, x: number, y: number } | null>(null);
    const [isAiOpen, setIsAiOpen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { complete, completion, isLoading, stop, setCompletion, error } = useCompletion({
    // 1. USE THE EXACT SAME STRING AS QUESTIONWITHCHAT
        api: 'http://localhost:3006/api/ai/explain', 
        
        // 2. Add these headers to force the "Streaming" handshake
        headers: {
            'Content-Type': 'application/json',
        },
    });


    const { value: collabValue } = useSelector((state: any) => state.collaboration);
    const { value: authValue } = useSelector((state: any) => state.authentication);

    // 2. Improved selection logic for MuiTextField
    const handleTextareaMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLTextAreaElement;
        
        // If user clicks away or highlights nothing, hide bubble
        if (target.selectionStart === target.selectionEnd) {
            setBubble(null);
            return;
        }

        const selectedText = target.value?.substring(target.selectionStart, target.selectionEnd).trim();

        if (selectedText && selectedText.length > 2) {
            setBubble({
                text: selectedText,
                x: e.nativeEvent.offsetX,
                y: e.nativeEvent.offsetY
            });
        }
    };

    const handleAiClick = async () => {
        if (!bubble || isLoading) return;
        
        setIsAiOpen(true); // Keep the modal open regardless of selection state
        const textToExplain = bubble.text;
        setBubble(null); // Hide the bubble immediately after clicking

        await complete(textToExplain, { 
            body: { context: 'code snippet' } 
        });
    };

    const handleCloseAi = () => {
        setIsAiOpen(false);
        setCompletion('');
        if (isLoading) stop();
    };

    const handleQuitClick = () => { dispatch(reset()); navigate('/start'); };
    const handleSubmitClick = () => {
        postAttempt(new Date().toISOString(), authValue.username, collabValue.partner, collabValue.question, "Sample code");
        dispatch(reset()); navigate('/start');
    };

    return (
        <div ref={containerRef} className="flex flex-col justify-center p-2 py-4 relative">
            <p style={{ color: darkBlue }} className="text-right text-xs mb-1"> 
                {collabValue.partner ? `Participants: ${collabValue.partner} and you` : "Private Room"} 
            </p>

            {/* --- BUBBLE: Only shows when text is highlighted --- */}
            {bubble && !isAiOpen && (
                <button 
                    style={{ position: 'absolute', left: bubble.x, top: bubble.y - 40, zIndex: 100 }}
                    className="bg-blue-600 text-white px-4 py-1 rounded-full shadow-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                    onClick={handleAiClick}
                >
                    Explain Code ✨
                </button>
            )}

            {/* --- TUTOR MODAL: Stays open based on isAiOpen state --- */}
            {(isAiOpen || isLoading || completion) && (
                <div className="fixed bottom-24 right-8 w-80 bg-white border border-gray-200 shadow-2xl rounded-xl z-[110] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="bg-slate-900 px-4 py-2 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`}></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Code Tutor</span>
                        </div>
                        <button className="hover:text-red-400 transition-colors" onClick={handleCloseAi}>✕</button>
                    </div>
                    
                    <div className="p-4 overflow-y-auto max-h-[300px] bg-slate-50">
                        {error && (
                            <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                                {error.message.includes('429') ? "Too many requests. Please wait." : "Connection lost."}
                            </div>
                        )}
                        
                        {completion ? (
                            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-200 shadow-sm">
                                {completion}
                            </div>
                        ) : (
                            isLoading && (
                                <div className="flex flex-col items-center py-6 gap-2">
                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Analyzing Logic</span>
                                </div>
                            )
                        )}
                    </div>
                    <div className="bg-white px-4 py-2 text-[9px] text-slate-400 border-t border-slate-100 flex justify-between">
                        <span>Gemini 2.0 Flash</span>
                        <span>PeerPrep Assistant</span>
                    </div>
                </div>
            )}

            <MuiTextField 
                multiline 
                rows={15} 
                onMouseUp={handleTextareaMouseUp}
                fullWidth
                placeholder="// Highlight code here to ask the tutor..."
                sx={{
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fafafa',
                        fontFamily: 'monospace'
                    }
                }}
            />

            <div className="flex justify-end py-5 gap-x-10">
                <Button label="Quit" onClick={handleQuitClick}/>
                <Button label="Submit" onClick={handleSubmitClick}/>
            </div>
        </div>
    );
}