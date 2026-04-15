import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../components';
import { darkBlue } from '../../../../commons';
import { useSelector, useDispatch } from 'react-redux';
import { reset } from '../../../../features/User/Collaboration/collaborationSlice';
//import { postAttempt } from '../../../../services/Attempts';
import { useCompletion } from '@ai-sdk/react';

import Editor, { OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { WebsocketProvider } from 'y-websocket';
import { CustomYjsWsProvider } from '../../../../services/Collaboration/customYjsWs';
import type { editor as MonacoEditorNS } from 'monaco-editor';

import {
  disconnectRoomSession,
  submitRoomSession,
} from '../../../../services/Collaboration';

export function Code() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    value: collabValue,
  } = useSelector((state: any) => state.collaboration);

  const {
    value: authValue,
  } = useSelector((state: any) => state.authentication);

  // retrieve question id, question title, question description, starter code from collab state
  const partner = collabValue.partner ?? '';
  const roomId = collabValue.roomId ?? 'private-room';
  const questionId = collabValue.questionId ?? '';
  const questionTitle = collabValue.questionTitle ?? '';
  const questionDescription = collabValue.questionDescription ?? '';
  const programmingLanguage = collabValue.programmingLanguage ?? '';
  const questionStarterCode = collabValue.questionStarterCode ?? '';
  const questionDifficulty = collabValue.questionDifficulty ?? '';
  const username = authValue.username ?? '';

  const havePartner = !!partner;
  const message = havePartner
    ? `Participants: ${partner} and you`
    : 'Private Room';

  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  //const providerRef = useRef<WebsocketProvider | null>(null);
  const providerRef = useRef<CustomYjsWsProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const hasInitializedRef = useRef(false);

  const [bubble, setBubble] = useState<{ text: string; x: number; y: number } | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);

  const [pos, setPos] = useState({
    x: window.innerWidth - 450,
    y: window.innerHeight - 600,
  });

  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const { complete, completion, isLoading, stop, setCompletion, error } = useCompletion({
    api: 'http://localhost:3006/api/ai/explain',
    headers: { 'Content-Type': 'application/json' },
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;

        setPos({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y,
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
    }, [pos.x, pos.y]);

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

    const getSharedDocument = () => {
        return editorRef.current?.getValue() ?? '';
    };

    const cleanupCollabResources = () => {
        bindingRef.current?.destroy();
        bindingRef.current = null;

        providerRef.current?.destroy();
        providerRef.current = null;

        ydocRef.current?.destroy();
        ydocRef.current = null;

        yTextRef.current = null;
        hasInitializedRef.current = false;
    };

    const handleQuitClick = async () => {
        try {
            if (roomId && roomId !== 'private-room' && username) {
                await disconnectRoomSession(username, roomId);
            }
        } catch (err) {
            console.error('Failed to disconnect room session:', err);
        } finally {
            cleanupCollabResources();
            navigate('/start');
        }
    };

    const handleSubmitClick = async () => {
      //const timestamp = new Date().toISOString()
      const sharedDocument = getSharedDocument()
      
      // is this needed?
      const questionId: string = collabValue.questionId;
      const partnerName: string = collabValue.partner;
      const username: string = authValue.username;
    //   console.log(collabValue)
    //   console.log(questionId, "desc" ,questionDescription, "title" ,questionTitle);

      try {
        if (roomId && roomId !== 'private-room') {
          await submitRoomSession(username, roomId, sharedDocument)
        }

        // // 1. GET question details
        // const res = await fetch(`http://localhost:3003/questions/${questionId}`, {
        // headers: {
        //     Authorization: `Bearer ${authValue.token}`
        // }
        // });

        // const question = await res.json();
        // console.log(question);

        // const template = question.templates?.[0];

        await fetch("http://localhost:3004/records", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user1_username: username.toLowerCase(),
                user2_username: partnerName.toLowerCase(),
                question_text: questionTitle,
                submitted_code: sharedDocument,

                // FROM QUESTION SERVICE (MOCKED DATA)
                // suggested_solution: template?.solution_code || "No solution",
                // programming_language: question.programmingLanguage || "no language",
                // question_topic: question.topic_tags?.[0] || "no topic",
                // difficulty: question.difficulty || "no difficulty,"
                suggested_solution: "Hello world!", //template?.solution_code || "No solution",
                programming_language: programmingLanguage || "no language",
                question_topic: questionDescription || "no topic",
                difficulty: questionDifficulty || "no difficulty",

            }),
        });

        } catch (err) {
            console.error('Failed to submit session', err)
        } finally {
            cleanupCollabResources()
            dispatch(reset())
            localStorage.removeItem('collabSession');
            navigate('/start')
        }

            // Destroy Yjs connections and bindings immediately to prevent further edits after submission
            // Delete room
            // Remove redux dispatch(reset());
            // Save attempt to collab database with status 'submitted'

            // Auto exit partner's room too?
            // where is the post attempt

        };

    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor;

        const currentModel = editor.getModel();
        if (!currentModel) {
        console.error('Monaco model is missing');
        return;
        }

    // if (!hasInitializedRef.current) {
    //   const ydoc = new Y.Doc();
    //   const provider = new WebsocketProvider('ws://localhost:3012', roomId, ydoc);
    //   const yText = ydoc.getText('monaco');

    //   provider.on('status', (event: { status: string }) => {
    //     console.log(`WebSocket status: ${event.status}, room: ${roomId}`);
    //   });

    //   provider.on('connection-error', (err: unknown) => {
    //     console.error('WebSocket connection error:', err);
    //   });

    //   ydocRef.current = ydoc;
    //   providerRef.current = provider;
    //   yTextRef.current = yText;
    //   hasInitializedRef.current = true;
    // }

    if (!hasInitializedRef.current) {
      const ydoc = new Y.Doc();
      // const provider = new CustomYjsWsProvider({
      //   url: 'ws://localhost:3012',
      //   roomId,
      //   ydoc,
      // });
      const provider = new CustomYjsWsProvider({
        url: 'ws://localhost:3012',
        roomId,
        ydoc,
        token: authValue.JWToken,
        username,
      });

      provider.onStatus((status) => {
        console.log(`WebSocket status: ${status}, room: ${roomId}`);
      });

      const yText = ydoc.getText('monaco');
      // Only set starter code if document is empty
      // if (yText.length === 0 && questionStarterCode?.trim().length > 0) {
      //   yText.insert(0, questionStarterCode);
      // }

      ydocRef.current = ydoc;
      providerRef.current = provider;
      yTextRef.current = yText;
      hasInitializedRef.current = true;
    }

    bindingRef.current?.destroy();

    // bindingRef.current = new MonacoBinding(
    //   yTextRef.current!,
    //   currentModel,
    //   new Set([editor]),
    //   providerRef.current!.awareness
    // );
    bindingRef.current = new MonacoBinding(
      yTextRef.current!,
      currentModel,
      new Set([editor]),
      providerRef.current!.awareness
    );

    editor.onMouseUp(() => {
      const selection = editor.getSelection();

      if (!selection || selection.isEmpty()) {
        setBubble(null);
        return;
      }

      const model = editor.getModel();
      if (!model) return;

      const selectedText = model.getValueInRange(selection).trim();

      if (selectedText.length > 2) {
        const position = editor.getScrolledVisiblePosition(selection.getEndPosition());

        if (position) {
          setBubble({
            text: selectedText,
            x: position.left,
            y: position.top,
          });
        }
      }
    });

  //   const updateCursor = () => {
  //     const selection = editor.getSelection();

  //     if (!selection) {
  //       providerRef.current?.updateLocalCursor(null);
  //       return;
  //     }

  //     providerRef.current?.updateLocalCursor({
  //       anchorLine: selection.startLineNumber,
  //       anchorColumn: selection.startColumn,
  //       headLine: selection.endLineNumber,
  //       headColumn: selection.endColumn,
  //     });
  //   };

  //   editor.onDidChangeCursorSelection(() => {
  //     updateCursor();
  //   });

  //   // initialize once
  //   updateCursor();

    let isUpdatingSelection = false;

    editor.onDidChangeCursorSelection(() => {
      if (isUpdatingSelection) return;

      const selection = editor.getSelection();
      if (!selection) return;

      isUpdatingSelection = true;

      providerRef.current?.awareness.setLocalStateField('selection', {
        start: {
          lineNumber: selection.startLineNumber,
          column: selection.startColumn,
        },
        end: {
          lineNumber: selection.endLineNumber,
          column: selection.endColumn,
        },
      });

      queueMicrotask(() => {
        isUpdatingSelection = false;
      });

      
    });
  };

  const mapLanguage = (lang: string) => {
    switch (lang?.toLowerCase()) {
      case 'python':
        return 'python';
      case 'java':
        return 'java';
      case 'c++':
      case 'cpp':
        return 'cpp';
      case 'c':
        return 'c';
      case 'javascript':
      case 'js':
        return 'javascript';
      case 'typescript':
      case 'ts':
        return 'typescript';
      default:
        return 'plaintext';
    }
  };

  useEffect(() => {
    const handleTabClose = () => {
      if (roomId && roomId !== 'private-room' && username) {
        fetch(`http://localhost:3002/api/room-session/disconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: username, roomId }),
          keepalive: true,
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
      cleanupCollabResources();
    };
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col justify-center p-2 py-4 relative">
      <p style={{ color: darkBlue }} className="text-right text-xs mb-1">
        {message}
      </p>

      {bubble && !isAiOpen && (
        <button
          style={{ position: 'absolute', left: bubble.x, top: bubble.y - 40, zIndex: 100 }}
          className="bg-blue-600 text-white px-4 py-1 rounded-full shadow-xl text-xs font-bold hover:bg-blue-700 transition-colors"
          onClick={handleAiClick}
        >
          Explain Code ✨
        </button>
      )}

      {(isAiOpen || isLoading || completion) && (
        <div
          style={{
            position: 'fixed',
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            width: '400px',
            zIndex: 150,
          }}
          className="bg-white border border-gray-200 shadow-2xl rounded-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <div
            onMouseDown={handleMouseDown}
            className="bg-slate-900 px-4 py-3 flex justify-between items-center text-white cursor-move active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2 pointer-events-none">
              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">
                Code Tutor
              </span>
            </div>
            <button className="hover:text-red-400 p-1" onClick={handleCloseAi}>
              ✕
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[500px] bg-slate-50">
            {error && (
              <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                {error.message}
              </div>
            )}

            {completion ? (
              <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-200 shadow-sm">
                {completion}
              </div>
            ) : isLoading && (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Analyzing Logic...
                </span>
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
        <p className="text-xs text-gray-500 mb-1">
          Language: {programmingLanguage}
        </p>
        <Editor
          
          height="350px"
          defaultlanguage="javascript"
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
        <Button label="Quit" onClick={handleQuitClick} />
        <Button label="Submit" onClick={handleSubmitClick} />
      </div>
    </div>
  );
}