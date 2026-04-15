// import * as Y from 'yjs';

// type CustomProviderOptions = {
//   url: string;
//   roomId: string;
//   ydoc: Y.Doc;
// };

// export class CustomYjsWsProvider {
//   private ws: WebSocket | null = null;
//   private readonly url: string;
//   private readonly roomId: string;
//   private readonly ydoc: Y.Doc;
//   private isSynced = false;
//   private suppressOutgoing = false;

//   constructor({ url, roomId, ydoc }: CustomProviderOptions) {
//     this.url = url;
//     this.roomId = roomId;
//     this.ydoc = ydoc;
//     this.connect();
//   }

//   private encodeBase64(update: Uint8Array): string {
//     let binary = '';
//     update.forEach((byte) => {
//       binary += String.fromCharCode(byte);
//     });
//     return btoa(binary);
//   }

//   private decodeBase64(base64: string): Uint8Array {
//     const binary = atob(base64);
//     const bytes = new Uint8Array(binary.length);
//     for (let i = 0; i < binary.length; i += 1) {
//       bytes[i] = binary.charCodeAt(i);
//     }
//     return bytes;
//   }

//   private connect() {
//     this.ws = new WebSocket(this.url);

//     this.ws.onopen = () => {
//       this.ws?.send(
//         JSON.stringify({
//           type: 'join',
//           roomId: this.roomId,
//         })
//       );
//     };

//     this.ws.onmessage = (event) => {
//       const msg = JSON.parse(event.data);

//       if (msg.type === 'sync') {
//         const update = this.decodeBase64(msg.update);
//         this.suppressOutgoing = true;
//         Y.applyUpdate(this.ydoc, update);
//         this.suppressOutgoing = false;
//         this.isSynced = true;
//         return;
//       }

//       if (msg.type === 'update') {
//         const update = this.decodeBase64(msg.update);
//         this.suppressOutgoing = true;
//         Y.applyUpdate(this.ydoc, update);
//         this.suppressOutgoing = false;
//         return;
//       }
//     };

//     this.ydoc.on('update', this.handleLocalUpdate);
//   }

//   private handleLocalUpdate = (update: Uint8Array) => {
//     if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
//     if (!this.isSynced) return;
//     if (this.suppressOutgoing) return;

//     this.ws.send(
//       JSON.stringify({
//         type: 'update',
//         roomId: this.roomId,
//         update: this.encodeBase64(update),
//       })
//     );
//   };

//   destroy() {
//     this.ydoc.off('update', this.handleLocalUpdate);
//     this.ws?.close();
//     this.ws = null;
//   }
// }

import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';

type CustomProviderOptions = {
  url: string;
  roomId: string;
  ydoc: Y.Doc;
  token?: string;
  username?: string;
};

type StatusHandler = (status: 'connecting' | 'connected' | 'disconnected') => void;

export class CustomYjsWsProvider {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly roomId: string;
  private readonly ydoc: Y.Doc;
  private readonly token?: string;
  private readonly username?: string;
  private isSynced = false;
  private suppressOutgoing = false;
  private statusHandlers = new Set<StatusHandler>();

  public readonly awareness: Awareness;

  constructor({ url, roomId, ydoc, token, username }: CustomProviderOptions) {
    this.url = url;
    this.roomId = roomId;
    this.ydoc = ydoc;
    this.token = token;
    this.username = username;

    this.awareness = new Awareness(ydoc);
    this.awareness.setLocalStateField('user', {
      name: username || 'Anonymous',
      color: this.getColorForName(username || 'Anonymous'),
    });

    this.awareness.on('update', this.handleAwarenessUpdate);

    this.connect();
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private emitStatus(status: 'connecting' | 'connected' | 'disconnected') {
    for (const handler of this.statusHandlers) {
      handler(status);
    }
  }

  private getColorForName(name: string) {
    const colors = [
      '#2563eb',
      '#dc2626',
      '#059669',
      '#7c3aed',
      '#ea580c',
      '#0891b2',
      '#be123c',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return colors[hash % colors.length];
  }

  private encodeBase64(update: Uint8Array): string {
    return btoa(String.fromCharCode(...update));
  }

  private decodeBase64(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  }

  private connect() {
    this.emitStatus('connecting');
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.ws?.send(
        JSON.stringify({
          type: 'join',
          roomId: this.roomId,
          token: this.token,
          username: this.username,
        })
      );
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'sync') {
        const update = this.decodeBase64(msg.update);
        this.suppressOutgoing = true;
        Y.applyUpdate(this.ydoc, update);
        this.suppressOutgoing = false;
        this.isSynced = true;
        return;
      }

      if (msg.type === 'joined') {
        this.emitStatus('connected');

        // after join, publish our current awareness state
        const changedClients = [this.awareness.clientID];
        const update = encodeAwarenessUpdate(this.awareness, changedClients);

        this.ws?.send(
          JSON.stringify({
            type: 'awareness',
            roomId: this.roomId,
            update: this.encodeBase64(update),
          })
        );
        return;
      }

      if (msg.type === 'update') {
        const update = this.decodeBase64(msg.update);
        this.suppressOutgoing = true;
        Y.applyUpdate(this.ydoc, update);
        this.suppressOutgoing = false;
        return;
      }

      if (msg.type === 'awareness') {
        const awarenessUpdate = this.decodeBase64(msg.update);
        applyAwarenessUpdate(this.awareness, awarenessUpdate, this);
        return;
      }

      if (msg.type === 'error') {
        console.error('WebSocket error:', msg.message);
        return;
      }
    };

    this.ws.onclose = () => {
      this.emitStatus('disconnected');
      // mark local awareness offline
      this.awareness.setLocalState(null);
      console.log('WebSocket closed');
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket connection error:', err);
    };

    this.ydoc.on('update', this.handleLocalDocUpdate);
  }

  private handleLocalDocUpdate = (update: Uint8Array) => {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.isSynced) return;
    if (this.suppressOutgoing) return;

    this.ws.send(
      JSON.stringify({
        type: 'update',
        roomId: this.roomId,
        update: this.encodeBase64(update),
      })
    );
  };

  private handleAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === this) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const changedClients = added.concat(updated, removed);
    const awarenessUpdate = encodeAwarenessUpdate(this.awareness, changedClients);

    this.ws.send(
      JSON.stringify({
        type: 'awareness',
        roomId: this.roomId,
        update: this.encodeBase64(awarenessUpdate),
      })
    );
  };

//   updateLocalCursor(selection: {
//     anchorLine: number;
//     anchorColumn: number;
//     headLine: number;
//     headColumn: number;
//   } | null) {
//     if (!selection) {
//       this.awareness.setLocalStateField('cursor', null);
//       return;
//     }

//     this.awareness.setLocalStateField('cursor', selection);
//   }

  destroy() {
    this.awareness.setLocalState(null);
    this.awareness.off('update', this.handleAwarenessUpdate);
    this.ydoc.off('update', this.handleLocalDocUpdate);
    this.ws?.close();
    this.ws = null;
  }
}