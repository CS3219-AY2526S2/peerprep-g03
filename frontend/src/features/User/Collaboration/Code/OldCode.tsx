import { useNavigate } from 'react-router-dom';
import { TextArea, Card, Button} from '../../../../components'
import { TextField as MuiTextField} from '@mui/material';
import { darkBlue } from '../../../../commons';
import { useSelector, useDispatch } from 'react-redux';
import { reset } from '../collaborationSlice';
import { postAttempt } from '../../../../services/Attempts'

import { useState, useRef, useEffect} from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import * as Y from "yjs"
import { MonacoBinding } from "y-monaco"
import { WebsocketProvider } from "y-websocket";
import http from "http";
import { WebSocketServer } from "ws";

import { setupWSConnection } from "y-websocket/bin/utils.js";
import { createClient } from 'redis';

import { debounce } from "lodash";
import * as monaco from "monaco-editor";
import { WebrtcProvider } from "y-webrtc"


export function OldCode() {
    type RootState = {
    collaboration: any
    authentication: any
    }

    const {
        value: collabValue,
        stateStatus: collabStatus
    } = useSelector((state: RootState) => state.collaboration);

    const {
        value: authValue,
        stateStatus: authStatus
    } = useSelector((state: RootState) => state.authentication);

    const partner: string = collabValue.partner

    const havePartner : boolean = !!partner
    const message: string = havePartner ? "Participants: " + partner + " and you": "Private Room"
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleQuitClick = () => {
        dispatch(reset())
        navigate('/start');
    };

    const handleSubmitClick = () => {
        const question: string = collabValue.question
        const partner: string = collabValue.partner
        const timestamp = new Date().toISOString();
        const username: string = authValue.username
        postAttempt(timestamp, username, partner, question, "Sample code")
        dispatch(reset())
        navigate('/start');
    };

    // YJS + Monaco + WebRTC setup
/*
    const editorRef = useRef(null);

    // Editor value -> YJS Text value (A text value shared by multiple people)
    // One person deletes text -> Deletes from the overall shared text value
    // Handled by YJS

    // Initialize YJS, tell it to listen to our Monaco instance for changes.

    function handleEditorDidMount(editor, monaco) {
        editorRef.current = editor;
        // Initialize YJS
        const doc = new Y.Doc(); // a collection of shared objects -> Text
        // Connect to peers (or start connection) with WebRTC
        const provider = new WebrtcProvider("test-room", doc); // room1, room2
        const type = doc.getText("monaco"); // doc { "monaco": "what our IDE is showing" }
        // Bind YJS to Monaco 
        const binding = new MonacoBinding(type, editorRef.current.getModel(), new Set([editorRef.current]), provider.awareness);
        console.log(provider.awareness);                
    }
        
    */

    // YJS + Monaco + WebSocket setup
    


    const darkBlue = '#0D3B66'

    const editorRef = useRef<any>(null);           // NEW per mount
    const bindingRef = useRef<MonacoBinding | null>(null);  // NEW per mount

    // THESE 3 are SHARED - create ONCE per browser tab
    const ydocRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const yTextRef = useRef<Y.Text | null>(null);



    const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
        editorRef.current = editor

        // NEW model per editor mount
    
        // Dispose the default model Monaco creates on mount
        const oldModel = editor.getModel()
        

        // FIXED URI - same for all browsers in same room
        const roomName = 'room-1'
        const modelUri = monacoInstance.Uri.parse(`inmemory://collab/${roomName}`);
        //monacoInstance.Uri.parse(`inmemory://collab/${crypto.randomUUID()}`)
        const uniqueModel = monacoInstance.editor.createModel("", "javascript", modelUri);

        
        editor.setModel(uniqueModel)
        oldModel?.dispose() // dispose AFTER setting new model

        const model = editor.getModel()
        console.log('model === uniqueModel?', model === uniqueModel); // Should be true

        if (!model) {
            console.error("Model missing")
            return
        }
        console.log("Model URI:", model?.uri.toString())
        console.log("Model ID:", model?.id)


        // REUSE Yjs objects or create ONCE
        if (!ydocRef.current) {
            // 1. Create YJS document
            ydocRef.current = new Y.Doc();
            // 2. Connect to WebSocket server
            providerRef.current = new WebsocketProvider('ws://localhost:1234', 'room-1', ydocRef.current);
            // 3. Get Y.Text type
            yTextRef.current = ydocRef.current.getText('monaco');
            
            //setupObservers(yTextRef.current);  // ONE observer per tab
        }

        /*
        // 1. Create YJS document
        const ydoc = new Y.Doc()
        ydocRef.current = ydoc


        // 2. Connect to WebSocket server

        const wsServer = 'ws://localhost:1234'
        //'ws://demos.yjs.dev/ws',
        

        const provider = new WebsocketProvider(
            wsServer,
            roomName,
            ydoc
        )
        providerRef.current = provider


        provider.on('status', (event: any) => {
            console.log(`WebSocket ${event.status} -> server: ${wsServer}, room: ${roomName}`)
        })

        // 3. Get Y.Text type
        const yText = ydoc.getText('monaco')
*/
        // 4. Bind Monaco editor to YJS document

         // CRITICAL: Log BEFORE binding
        //console.log('BEFORE binding - yText:', yText.toString());
        //console.log('BEFORE binding - editor:', editor.getValue());

        // NEW binding for this editor/model
        bindingRef.current?.destroy();
        bindingRef.current = new MonacoBinding(
            yTextRef.current!,      // SHARED yText
            model,                  // NEW model  
            new Set([editor]),      // NEW editor
            providerRef.current!.awareness  // SHARED awareness
        );

        ydocRef.current!.on("update", () => {
        console.log("Doc update received")
        })


            
        yTextRef.current!.observe(() => {
        console.log("YText changed:", yTextRef.current!.toString())
        })

        // Replace your sync event with this:
        let syncAttempts = 0;
        const maxSyncAttempts = 10;

        const checkRealSync = () => {
            syncAttempts++;
            console.log('🔄 Sync attempt', syncAttempts, 'yText length:', yTextRef.current!.length);
            
            if (yTextRef.current!.length > 0 || syncAttempts > maxSyncAttempts) {
                console.log('✅ REAL SYNC CONFIRMED');
                // Safe to bind Monaco now
                bindingRef.current = new MonacoBinding(yTextRef.current!, model, new Set([editor]), providerRef.current!.awareness);
            } else {
                setTimeout(checkRealSync, 200);
            }
        };

        providerRef.current!.on('sync', checkRealSync);

        /*
        provider.on('status', ({ status }) => {
            if (status === 'connected') {
                // Wait for initial sync
                setTimeout(() => {
                    bindingRef.current = new MonacoBinding(yText, model, new Set([editor]), provider.awareness);
                    console.log('✅ Bound after sync');
                }, 500);
            }
        });
        */
        /*
        bindingRef.current = new MonacoBinding(
            yText,
            uniqueModel,
            new Set([editor]),
            provider.awareness
        )
            */

        //most recent
        /*
        // CRITICAL: Log AFTER binding  
        console.log('AFTER binding - yText:', yTextRef.current!.toString());
        console.log('AFTER binding - editor:', editor.getValue());


        // should be same
        console.log('YDoc instance', ydocRef.current!);
        console.log('clientID', ydocRef.current!.clientID);
        console.log('room', roomName);
        console.log('type name', yTextRef.current!.toString());


        // 5. Log awareness changes (optional)
        providerRef.current!.awareness.on('change', () => {
        console.log('Users in room:', providerRef.current!.awareness.getStates())
        })

        providerRef.current!.awareness.setLocalStateField('user', {
            name: 'Alice', 
            color: '#ff0000'
        })

        ydocRef.current!.on('update', () => {
            console.log("YJS update received")
        })
        
        yTextRef.current!.observe((event) => {
            console.log("yText observer fired, delta:", event.changes.delta)
            console.log("yText content:", yTextRef.current!.toString())
            console.log("Editor content:", editor.getValue())
        })
            */

    }
/*
     // 6. Cleanup on unmount
    useEffect(() => {
        return () => {

            // Only cleanup if actually leaving the page
            if (window.location.pathname.includes('/code')) return;

            console.log("Cleaning up YJS")

            bindingRef.current?.destroy()
            providerRef.current?.destroy()
            ydocRef.current?.destroy()
            editorRef.current?.getModel()?.dispose() // add this
        }
    }, [])
    */


    return (
        <div className="flex flex-col h-screen p-2 py-4">
            <p style={{ color: darkBlue }} className= "text-right"> {message} </p>
            <div className="rounded-lg overflow-hidden order border-black border-1">
                <Editor
                    height="350px"
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
                <Button label = "Quit" onClick = {handleQuitClick}/>
                <Button label = "Submit" onClick = {handleSubmitClick}/>
            </div>
            </div>
    );
}

