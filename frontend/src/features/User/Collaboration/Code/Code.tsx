import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../components';
import { TextField as MuiTextField } from '@mui/material';
import { darkBlue } from '../../../../commons';
import { useSelector, useDispatch } from 'react-redux';
import { reset } from '../../../../features/User/Collaboration/collaborationSlice';
import { postAttempt } from '../../../../services/Attempts';
import { useCompletion } from '@ai-sdk/react';

export function Code() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);

    // --- RESTORED: Full Redux Selectors from Old Version ---
    const {
        value: collabValue,
        stateStatus: collabStatus 
    } = useSelector((state: any) => state.collaboration);

    const {
        value: authValue,
        stateStatus: authStatus 
    } = useSelector((state: any) => state.authentication);

    // --- AI TUTOR STATE ---
    const [bubble, setBubble] = useState<{ text: string, x: number, y: number } | null>(null);
    const [isAiOpen, setIsAiOpen] = useState(false);

    // --- NEW: DRAGGING STATE ---
    const [pos, setPos] = useState({ x: window.innerWidth - 450, y: window.innerHeight - 600 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const { complete, completion, isLoading, stop, setCompletion, error } = useCompletion({
        api: 'http://localhost:3006/api/ai/explain', 
        headers: { 'Content-Type': 'application/json' },
    });

    // --- DRAGGING HANDLERS ---
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
    }, []);

    const partner: string = collabValue.partner;
    const havePartner: boolean = !!partner;
    const message: string = havePartner ? "Participants: " + partner + " and you" : "Private Room";

    const handleTextareaMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLTextAreaElement;
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
        setIsAiOpen(true);
        const textToExplain = bubble.text;
        setBubble(null);
        await complete(textToExplain, { body: { context: 'code snippet' } });
    };

    const handleCloseAi = () => {
        setIsAiOpen(false);
        setCompletion('');
        if (isLoading) stop();
    };

    const handleQuitClick = () => {
        dispatch(reset());
        navigate('/start');
    };

    const handleSubmitClick = () => {
        const question: string = collabValue.question;
        const partnerName: string = collabValue.partner;
        const timestamp = new Date().toISOString();
        const username: string = authValue.username;

        postAttempt(timestamp, username, partnerName, question, "Sample code");
        dispatch(reset());
        navigate('/start');
    };

    return (
        <div ref={containerRef} className="flex flex-col justify-center p-2 py-4 relative">
            <p style={{ color: darkBlue }} className="text-right text-xs mb-1"> {message} </p>

            {/* --- AI SELECTION BUBBLE --- */}
            {bubble && !isAiOpen && (
                <button 
                    style={{ position: 'absolute', left: bubble.x, top: bubble.y - 40, zIndex: 100 }}
                    className="bg-blue-600 text-white px-4 py-1 rounded-full shadow-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                    onClick={handleAiClick}
                >
                    Explain Code ✨
                </button>
            )}

            {/* --- DRAGGABLE AI TUTOR MODAL --- */}
            {(isAiOpen || isLoading || completion) && (
                <div 
                    style={{ 
                        position: 'fixed', 
                        left: `${pos.x}px`, 
                        top: `${pos.y}px`, 
                        width: '400px', 
                        zIndex: 150 
                    }}
                    className="bg-white border border-gray-200 shadow-2xl rounded-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    {/* HEADER: DRAG HANDLE */}
                    <div 
                        onMouseDown={handleMouseDown}
                        className="bg-slate-900 px-4 py-3 flex justify-between items-center text-white cursor-move active:cursor-grabbing select-none"
                    >
                        <div className="flex items-center gap-2 pointer-events-none">
                            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`}></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">Code Tutor </span>
                        </div>
                        <button className="hover:text-red-400 p-1" onClick={handleCloseAi}>✕</button>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[500px] bg-slate-50">
                        {error && <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">{error.message}</div>}
                        {completion ? (
                            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-200 shadow-sm">
                                {completion}
                            </div>
                        ) : isLoading && (
                            <div className="flex flex-col items-center py-8 gap-3">
                                <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Analyzing Logic...</span>
                            </div>
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