import * as Y from 'yjs';

type CustomProviderOptions = {
  url: string;
  roomId: string;
  ydoc: Y.Doc;
};

export class CustomYjsWsProvider {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly roomId: string;
  private readonly ydoc: Y.Doc;
  private isSynced = false;
  private suppressOutgoing = false;

  constructor({ url, roomId, ydoc }: CustomProviderOptions) {
    this.url = url;
    this.roomId = roomId;
    this.ydoc = ydoc;
    this.connect();
  }

  private encodeBase64(update: Uint8Array): string {
    let binary = '';
    update.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  private decodeBase64(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.ws?.send(
        JSON.stringify({
          type: 'join',
          roomId: this.roomId,
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

      if (msg.type === 'update') {
        const update = this.decodeBase64(msg.update);
        this.suppressOutgoing = true;
        Y.applyUpdate(this.ydoc, update);
        this.suppressOutgoing = false;
        return;
      }
    };

    this.ydoc.on('update', this.handleLocalUpdate);
  }

  private handleLocalUpdate = (update: Uint8Array) => {
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

  destroy() {
    this.ydoc.off('update', this.handleLocalUpdate);
    this.ws?.close();
    this.ws = null;
  }
}