/**
 * BS Simulator - PeerJS P2P Networking Service
 * WebRTC DataChannel (No Server-Side Storage)
 */

import Peer, { DataConnection } from 'peerjs';
import { P2PMessage } from '../types';

const ROOM_PREFIX = 'bs-room-v1-';

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

class P2PService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';

  private onDataCallback: ((data: P2PMessage) => void) | null = null;
  private onStatusChangeCallback: ((status: ConnectionStatus, message?: string) => void) | null = null;
  private onLogCallback: ((msg: string) => void) | null = null;

  getStatus(): ConnectionStatus {
    return this.status;
  }

  setCallbacks(
    onData: (data: P2PMessage) => void,
    onStatusChange: (status: ConnectionStatus, message?: string) => void,
    onLog?: (msg: string) => void
  ) {
    this.onDataCallback = onData;
    this.onStatusChangeCallback = onStatusChange;
    this.onLogCallback = onLog || null;
  }

  private log(message: string) {
    console.log(`[P2P] ${message}`);
    this.onLogCallback?.(message);
  }

  private setStatus(status: ConnectionStatus, message?: string) {
    this.status = status;
    this.onStatusChangeCallback?.(status, message);
  }

  /**
   * ホストとして4桁の部屋番号で部屋を開設
   */
  createRoom(roomCode: string): Promise<string> {
    this.disconnect();
    this.setStatus('CONNECTING', `部屋(${roomCode})を開設中...`);

    return new Promise((resolve, reject) => {
      try {
        const fullPeerId = `${ROOM_PREFIX}${roomCode}`;
        this.peer = new Peer(fullPeerId);

        this.peer.on('open', (id) => {
          this.log(`Peer開設成功: ID=${id}`);
          this.setStatus('CONNECTING', '相手の参加を待機しています...');
          resolve(roomCode);
        });

        this.peer.on('connection', (connection) => {
          this.log('ゲストからの接続要求を受信');
          this.conn = connection;
          this.setupDataConnection();
        });

        this.peer.on('error', (err) => {
          this.log(`Peerエラー: ${err.type} - ${err.message}`);
          this.setStatus('ERROR', `エラー: ${err.type}`);
          reject(err);
        });
      } catch (err) {
        this.setStatus('ERROR', 'Peer初期化エラー');
        reject(err);
      }
    });
  }

  /**
   * ゲストとしてホストの4桁部屋番号に参加
   */
  joinRoom(roomCode: string): Promise<void> {
    this.disconnect();
    this.setStatus('CONNECTING', `部屋(${roomCode})に接続中...`);

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer();

        this.peer.on('open', () => {
          const targetPeerId = `${ROOM_PREFIX}${roomCode}`;
          this.log(`ホスト(${targetPeerId})へ接続試行中...`);
          this.conn = this.peer!.connect(targetPeerId, {
            reliable: true,
          });

          this.setupDataConnection();
          resolve();
        });

        this.peer.on('error', (err) => {
          this.log(`Peer接続エラー: ${err.type}`);
          this.setStatus('ERROR', `接続エラー: 部屋が見つからないか切断されました`);
          reject(err);
        });
      } catch (err) {
        this.setStatus('ERROR', 'Peer参加エラー');
        reject(err);
      }
    });
  }

  private setupDataConnection() {
    if (!this.conn) return;

    this.conn.on('open', () => {
      this.log('P2P DataChannel 確立！');
      this.setStatus('CONNECTED', '対戦相手と接続されました');
    });

    this.conn.on('data', (data) => {
      try {
        const msg = data as P2PMessage;
        this.onDataCallback?.(msg);
      } catch (e) {
        console.error('Invalid P2P message format:', e);
      }
    });

    this.conn.on('close', () => {
      this.log('接続が切断されました');
      this.setStatus('DISCONNECTED', '対戦相手が切断しました');
    });

    this.conn.on('error', (err) => {
      this.log(`DataChannel エラー: ${err}`);
      this.setStatus('ERROR', '通信エラーが発生しました');
    });
  }

  /**
   * コマンドパケットを送信
   */
  sendCommand(command: P2PMessage): boolean {
    if (this.conn && this.conn.open) {
      this.conn.send(command);
      return true;
    }
    return false;
  }

  /**
   * 切断
   */
  disconnect() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.setStatus('DISCONNECTED', '切断済み');
  }
}

export const p2pService = new P2PService();
