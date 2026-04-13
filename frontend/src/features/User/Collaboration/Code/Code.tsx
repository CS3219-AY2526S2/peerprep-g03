import { useNavigate } from 'react-router-dom'
import { Button } from '../../../../components'
import { useSelector, useDispatch } from 'react-redux'
import { reset } from '../../../../features/User/Collaboration/collaborationSlice'
import { postAttempt } from '../../../../services/Attempts'

import { useEffect, useRef } from 'react'
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

export function Code() {
  const {
    value: collabValue,
  } = useSelector((state: RootState) => state.collaboration)

  const {
    value: authValue,
  } = useSelector((state: RootState) => state.authentication)

  const partner = collabValue.partner ?? ''
  const roomId = collabValue.roomId ?? 'private-room'
  console.log('Current roomId:', roomId) // Debug log for roomId
  console.log('Current collab value:', collabValue) // Debug log for collaboration state
  const question = collabValue.question ?? ''
  const username = authValue.username ?? ''

  const havePartner = !!partner
  const message = havePartner
    ? `Participants: ${partner} and you`
    : 'Private Room'

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null)
  const bindingRef = useRef<MonacoBinding | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const yTextRef = useRef<Y.Text | null>(null)
  const hasInitializedRef = useRef(false)

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
      if (roomId && roomId !== 'private-room') {
        await leaveRoomSession(username, roomId)
      }
    } catch (err) {
      console.error('Failed to leave room session', err)
    } finally {
      cleanupCollabResources()
      dispatch(reset())
      navigate('/start')
    }
  }

  const handleSubmitClick = async () => {
    const timestamp = new Date().toISOString()
    const sharedDocument = getSharedDocument()
    
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

    // Destroy any previous binding before rebinding
    bindingRef.current?.destroy()

    bindingRef.current = new MonacoBinding(
      yTextRef.current!,
      currentModel,
      new Set([editor]),
      providerRef.current!.awareness
    )
  }

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
    <div className="flex flex-col h-screen p-2 py-4">
      <p className="text-right" style={{ color: '#0D3B66' }}>
        {message}
      </p>

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
        <Button label="Quit" onClick={handleQuitClick} />
        <Button label="Submit" onClick={handleSubmitClick} />
      </div>
    </div>
  )
}
