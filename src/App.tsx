/**
 * BS Simulator - App Component
 * Scene Routing, P2P Orchestration, and Store Binding.
 */

import React, { useEffect, useState } from 'react';
import { AppScene, DeckData, HandshakeDeckCommand, P2PMessage, PlayerId } from './types';
import { p2pService, ConnectionStatus } from './services/p2p';
import { useGameStore } from './store/gameStore';
import { TitleScene } from './components/TitleScene';
import { DeckBuilderScene } from './components/DeckBuilderScene';
import { LobbyScene } from './components/LobbyScene';
import { MatchingScene } from './components/MatchingScene';
import { InGameScene } from './components/InGameScene';

export const App: React.FC = () => {
  const [scene, setScene] = useState<AppScene>('TITLE');
  const [roomCode, setRoomCode] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [canEnterGame, setCanEnterGame] = useState<boolean>(false);

  const initStore = useGameStore((s) => s.initStore);
  const applyP2PMessage = useGameStore((s) => s.applyP2PMessage);
  const setupInGame = useGameStore((s) => s.setupInGame);
  const myDeck = useGameStore((s) => s.myDeck);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  useEffect(() => {
    // P2P サービスコールバック設定
    p2pService.setCallbacks(
      (data: P2PMessage) => {
        applyP2PMessage(data);

        // ハンドシェイク受信時に対戦開始可能フラグON
        if (data.type === 'HANDSHAKE_DECK') {
          addLog(`相手のデッキ「${data.deckName}」を受信完了！`);
          setStatusMessage('対戦準備完了！インゲームへ進めます');
          setCanEnterGame(true);
        }
      },
      (status, message) => {
        setConnectionStatus(status);
        if (message) setStatusMessage(message);

        if (status === 'CONNECTED') {
          addLog('P2P接続成功！デッキハンドシェイクを送信中...');
          // 接続確立時にデッキ情報を送信
          const defaultDeck: DeckData = {
            name: 'サンプルデッキ',
            cards: Array.from({ length: 40 }, (_, i) => ({
              id: `m_c_${i}`,
              templateId: `c_${i}`,
              name: `カード${i + 1}`,
              dataUrl: '',
              backDataUrl: null,
            })),
            exCards: [
              {
                id: 'ex_1',
                templateId: 'ex_1',
                name: '契約スピリット',
                dataUrl: '',
                backDataUrl: null,
              },
            ],
          };

          const localDeck = myDeck || defaultDeck;
          const handshakeCmd: HandshakeDeckCommand = {
            type: 'HANDSHAKE_DECK',
            senderId: isHost ? '1P' : '2P',
            deckName: localDeck.name,
            timestamp: Date.now(),
          };
          p2pService.sendCommand(handshakeCmd);
        }
      },
      (log) => addLog(log)
    );
  }, [applyP2PMessage, myDeck, isHost]);

  // ホスト部屋開設
  const handleHostCreate = async (code: string) => {
    setIsHost(true);
    setRoomCode(code);
    setLogs([]);
    setCanEnterGame(false);
    setScene('MATCHING');

    const pid: PlayerId = '1P';
    initStore(pid, (cmd) => p2pService.sendCommand(cmd));

    try {
      await p2pService.createRoom(code);
    } catch (e) {
      console.error(e);
    }
  };

  // ゲスト部屋参加
  const handleGuestJoin = async (code: string) => {
    setIsHost(false);
    setRoomCode(code);
    setLogs([]);
    setCanEnterGame(false);
    setScene('MATCHING');

    const pid: PlayerId = '2P';
    initStore(pid, (cmd) => p2pService.sendCommand(cmd));

    try {
      await p2pService.joinRoom(code);
    } catch (e) {
      console.error(e);
    }
  };

  // インゲーム開始
  const handleEnterGame = () => {
    setupInGame();
    setScene('INGAME');
  };

  const handleStartSolo = () => {
    initStore('1P', () => undefined);
    setupInGame();
    setScene('INGAME');
  };

  // 切断・終了
  const handleDisconnect = () => {
    p2pService.disconnect();
    setCanEnterGame(false);
    setScene('LOBBY');
  };

  const handleQuitToTitle = () => {
    p2pService.disconnect();
    setCanEnterGame(false);
    setScene('TITLE');
  };

  return (
    <>
      {scene === 'TITLE' && (
        <TitleScene
          onGoDeckBuilder={() => setScene('DECK_BUILDER')}
          onGoLobby={() => setScene('LOBBY')}
          onStartSolo={handleStartSolo}
        />
      )}

      {scene === 'DECK_BUILDER' && (
        <DeckBuilderScene onBackToTitle={() => setScene('TITLE')} />
      )}

      {scene === 'LOBBY' && (
        <LobbyScene
          onBackToTitle={() => setScene('TITLE')}
          onHostCreate={handleHostCreate}
          onGuestJoin={handleGuestJoin}
        />
      )}

      {scene === 'MATCHING' && (
        <MatchingScene
          roomCode={roomCode}
          isHost={isHost}
          status={connectionStatus}
          statusMessage={statusMessage}
          logs={logs}
          canEnterGame={canEnterGame}
          onEnterGame={handleEnterGame}
          onDisconnect={handleDisconnect}
        />
      )}

      {scene === 'INGAME' && (
        <InGameScene onQuit={handleQuitToTitle} />
      )}
    </>
  );
};
