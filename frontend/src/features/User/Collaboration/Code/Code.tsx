import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../components';
import { TextField as MuiTextField } from '@mui/material';
import { darkBlue } from '../../../../commons';
import { useSelector, useDispatch } from 'react-redux';
import { reset } from '../../../../features/User/Collaboration/collaborationSlice';
import { postAttempt } from '../../../../services/Attempts';
import { useCompletion } from '@ai-sdk/react';

import Editor, { OnMount } from '@monaco-editor/react'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import { WebsocketProvider } from 'y-websocket'
import type { editor as MonacoEditorNS } from 'monaco-editor'

import { leaveRoomSession, submitRoomSession } from '../../../../services/Collaboration'


type RootState = {
  collaboration: {
    value: {
      partner?: string
      question?: string
      roomId?: string
    }
    stateStatus: string
  }
  authentication: {
    value: {
      username?: string
    }
    stateStatus: string
  }
}

// Redux state


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

    // Room session state
    const partner = collabValue.partner ?? ''
    const roomId = collabValue.roomId ?? 'private-room'
    const question = collabValue.question ?? ''
    const username = authValue.username ?? ''
    console.log('Current roomId:', roomId) // Debug log for roomId
    console.log('Current collab value:', collabValue) // Debug log for collaboration state

    const havePartner = !!partner
    const message = havePartner
    ? `Participants: ${partner} and you`
    : 'Private Room'

    // Collab state
    const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null)
    const bindingRef = useRef<MonacoBinding | null>(null)
    const providerRef = useRef<WebsocketProvider | null>(null)
    const ydocRef = useRef<Y.Doc | null>(null)
    const yTextRef = useRef<Y.Text | null>(null)
    const hasInitializedRef = useRef(false)

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


    // Collab helpers
    const getSharedDocument = () => {
      return editorRef.current?.getValue() ?? '';
    }

    const cleanupCollabResources = () => {
      bindingRef.current?.destroy()
      bindingRef.current = null

      providerRef.current?.destroy()
      providerRef.current = null

      ydocRef.current?.destroy()
      ydocRef.current = null

      yTextRef.current = null
      hasInitializedRef.current = false
    }
  

const handleQuitClick = async () => {
    try {
        // Only trigger the leave service if it's a real room session
        if (roomId && roomId !== 'private-room' && username) {
            console.log(`User ${username} is leaving room ${roomId}`);
            await leaveRoomSession(username, roomId);
        }
    } catch (err) {
        console.error('Failed to leave room session:', err);
    } finally {
        // ALWAYS clean up resources and redirect, even if the API call fails
        cleanupCollabResources();
        dispatch(reset()); // Clears partner info, roomId, etc. in Redux
        navigate('/start');
    }
};

    const handleSubmitClick = async () => {
      const timestamp = new Date().toISOString()
      const sharedDocument = getSharedDocument()
      
      // is this needed?
      const question: string = collabValue.question;
      const partnerName: string = collabValue.partner;
      const username: string = authValue.username;

      try {
        if (roomId && roomId !== 'private-room') {
          await submitRoomSession(username, roomId, sharedDocument)
        }
        await postAttempt(timestamp, username, partner, question, sharedDocument) // via teammates's code
      } catch (err) {
        console.error('Failed to submit session', err)
      } finally {
        cleanupCollabResources()
        dispatch(reset())
        navigate('/start')

        // Destroy Yjs connections and bindings immediately to prevent further edits after submission
        // Delete room
        // Remove redux dispatch(reset());
        // Save attempt to collab database with status 'submitted'

        // Auto exit partner's room too?
        // where is the post attempt

      }
    }

    const handleEditorDidMount: OnMount = (editor, monaco) => {
      editorRef.current = editor

      const currentModel = editor.getModel()
      if (!currentModel) {
        console.error('Monaco model is missing')
        return
      }

      // Yjs setup
      // Create Yjs objects once for this mounted page
      if (!hasInitializedRef.current) {
        const ydoc = new Y.Doc()
        const provider = new WebsocketProvider('ws://localhost:3004', roomId, ydoc)
        const yText = ydoc.getText('monaco')

        provider.on('status', (event: { status: string }) => {
          console.log(`WebSocket status: ${event.status}, room: ${roomId}`)
        })

        provider.on('connection-error', (err: unknown) => {
          console.error('WebSocket connection error:', err)
        })

        ydocRef.current = ydoc
        providerRef.current = provider
        yTextRef.current = yText
        hasInitializedRef.current = true
      }

      // MonacoBinding
      // Destroy any previous binding before rebinding
      bindingRef.current?.destroy()

      bindingRef.current = new MonacoBinding(
        yTextRef.current!,
        currentModel,
        new Set([editor]),
        providerRef.current!.awareness
      )

      // ===== (AI selection) =====
      editor.onMouseUp(() => {
        const selection = editor.getSelection()

        if (!selection || selection.isEmpty()) {
          setBubble(null)
          return
        }

        const model = editor.getModel()
        if (!model) return

        const selectedText = model.getValueInRange(selection).trim()

        if (selectedText.length > 2) {
          const position = editor.getScrolledVisiblePosition(
            selection.getEndPosition()
          )

          if (position) {
            setBubble({
              text: selectedText,
              x: position.left,
              y: position.top
            })
          }
        }
      })
    }
    useEffect(() => {
    const handleTabClose = () => {
        // Standard cleanup for the current user
        if (roomId && roomId !== 'private-room' && username) {
            const url = `http://localhost:3002/api/room-session/leave`;
            
            // Using fetch with keepalive is the most reliable way to send a request 
            // during a page unload (better than standard axios here)
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: username, roomId }),
                keepalive: true
            });
        }
    };

    window.addEventListener('beforeunload', handleTabClose);
    return () => {
        window.removeEventListener('beforeunload', handleTabClose);
    };
}, [roomId, username]);
    useEffect(() => {
      return () => {
        bindingRef.current?.destroy()
        bindingRef.current = null

        providerRef.current?.destroy()
        providerRef.current = null

        ydocRef.current?.destroy()
        ydocRef.current = null

        yTextRef.current = null
        hasInitializedRef.current = false
      }
    }, [])

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

            <div className="rounded-lg overflow-hidden border border-black">
              <Editor
                height="350px"
                defaultLanguage="javascript"
                theme="vs"
                onMount={handleEditorDidMount}
                options={{
                  automaticLayout: true,
                  lineNumbersMinChars: 2,
                  lineDecorationsWidth: 0,
                }}
              />
            </div>

            <div className="flex justify-end py-5 gap-x-10">
                <Button label="Quit" onClick={handleQuitClick}/>
                <Button label="Submit" onClick={handleSubmitClick}/>
            </div>
        </div>
    );
}

