/**
 * BS Simulator - DeckBuilderScene Component
 * Canvas WebP 300x420 (0.6 quality) Compression & IndexedDB integration.
 * Supports Main Deck (1-100), EX / Contract / Token Deck, JSON Export/Import, Custom Back Art.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CardData, DeckData, DeckItem } from '../types';
import { dbService } from '../services/db';
import {
  Upload,
  FileText,
  RotateCcw,
  ArrowLeft,
  Plus,
  Minus,
  Download,
  Image as ImageIcon,
} from 'lucide-react';

interface DeckBuilderSceneProps {
  onBackToTitle: () => void;
  onDeckSelected?: (deck: DeckData) => void;
}

export const DeckBuilderScene: React.FC<DeckBuilderSceneProps> = ({ onBackToTitle }) => {
  const [deckName, setDeckName] = useState<string>('新規デッキ');
  const [cardPool, setCardPool] = useState<Record<string, CardData>>({});
  const [mainDeck, setMainDeck] = useState<Record<string, number>>({});
  const [exDeck, setExDeck] = useState<Record<string, number>>({});
  const [targetCardForBack, setTargetCardForBack] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const backImageInputRef = useRef<HTMLInputElement>(null);

  // 初期化: IndexedDB から保存済みカードをロード
  useEffect(() => {
    loadPool();
  }, []);

  const loadPool = async () => {
    try {
      const cards = await dbService.loadCards();
      const poolMap: Record<string, CardData> = {};
      cards.forEach((c) => {
        poolMap[c.id] = c;
      });
      setCardPool(poolMap);
    } catch (err) {
      console.error('Failed to load card pool:', err);
    }
  };

  // 画像一括追加 & 300x420 WebP (品質0.6) 自動圧縮
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      const newPool = { ...cardPool };
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const webpDataUrl = await dbService.compressImage(file);
        const cardId = `card_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const cardName = file.name.replace(/\.[^/.]+$/, '');

        const newCard: CardData = {
          id: cardId,
          name: cardName,
          dataUrl: webpDataUrl,
          backDataUrl: null,
        };

        await dbService.saveCard(newCard);
        newPool[cardId] = newCard;
      }
      setCardPool(newPool);
    } catch (err) {
      console.error('File compression error:', err);
      alert('画像の圧縮・保存中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 裏面画像追加
  const triggerBackUpload = (cardId: string) => {
    setTargetCardForBack(cardId);
    backImageInputRef.current?.click();
  };

  const handleBackImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetCardForBack) return;

    setIsProcessing(true);
    try {
      const webpBackUrl = await dbService.compressImage(file);
      const card = cardPool[targetCardForBack];
      if (card) {
        const updatedCard = { ...card, backDataUrl: webpBackUrl };
        await dbService.saveCard(updatedCard);
        setCardPool((prev) => ({ ...prev, [targetCardForBack]: updatedCard }));
      }
    } catch (err) {
      console.error('Back image compression failed:', err);
      alert('裏面画像の登録に失敗しました');
    } finally {
      setIsProcessing(false);
      setTargetCardForBack(null);
      if (backImageInputRef.current) backImageInputRef.current.value = '';
    }
  };

  // カードをデッキに追加
  const addCard = (cardId: string, type: 'main' | 'ex') => {
    if (type === 'main') {
      const currentTotal = Object.values(mainDeck).reduce((a, b) => a + b, 0);
      if (currentTotal >= 100) {
        alert('メインデッキの最大枚数は100枚です。');
        return;
      }
      setMainDeck((prev) => ({ ...prev, [cardId]: (prev[cardId] || 0) + 1 }));
    } else {
      setExDeck((prev) => ({ ...prev, [cardId]: (prev[cardId] || 0) + 1 }));
    }
  };

  // デッキ枚数変更
  const changeCount = (cardId: string, type: 'main' | 'ex', delta: number) => {
    const target = type === 'main' ? mainDeck : exDeck;
    const current = target[cardId] || 0;
    const next = current + delta;

    if (type === 'main' && delta > 0) {
      const currentTotal = Object.values(mainDeck).reduce((a, b) => a + b, 0);
      if (currentTotal >= 100) {
        alert('メインデッキの最大枚数は100枚です。');
        return;
      }
    }

    if (type === 'main') {
      if (next <= 0) {
        const copy = { ...mainDeck };
        delete copy[cardId];
        setMainDeck(copy);
      } else {
        setMainDeck({ ...mainDeck, [cardId]: next });
      }
    } else {
      if (next <= 0) {
        const copy = { ...exDeck };
        delete copy[cardId];
        setExDeck(copy);
      } else {
        setExDeck({ ...exDeck, [cardId]: next });
      }
    }
  };

  // デッキJSONエクスポート
  const exportDeck = () => {
    const mainTotal = Object.values(mainDeck).reduce((a, b) => a + b, 0);
    if (mainTotal < 1 || mainTotal > 100) {
      alert(`メインデッキは1〜100枚にしてください。（現在: ${mainTotal}枚）`);
      return;
    }

    const cards: DeckItem[] = [];
    Object.entries(mainDeck).forEach(([id, count]) => {
      const card = cardPool[id];
      if (!card) return;
      for (let i = 0; i < count; i++) {
        cards.push({
          id: `${id}_m_${i}`,
          templateId: id,
          name: card.name,
          dataUrl: card.dataUrl,
          backDataUrl: card.backDataUrl,
        });
      }
    });

    const exCards: DeckItem[] = [];
    Object.entries(exDeck).forEach(([id, count]) => {
      const card = cardPool[id];
      if (!card) return;
      for (let i = 0; i < count; i++) {
        exCards.push({
          id: `${id}_ex_${i}`,
          templateId: id,
          name: card.name,
          dataUrl: card.dataUrl,
          backDataUrl: card.backDataUrl,
        });
      }
    });

    const deckData: DeckData = {
      name: deckName || '無題デッキ',
      cards,
      exCards,
    };

    const blob = new Blob([JSON.stringify(deckData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckName || 'deck'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // デッキJSONインポート
  const importDeck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (json.name) setDeckName(json.name);

        const newPool = { ...cardPool };
        const newMain: Record<string, number> = {};
        const newEx: Record<string, number> = {};

        // カードプールへの自動補填
        if (Array.isArray(json.cards)) {
          for (const c of json.cards) {
            const templateId = c.templateId || `card_${Date.now()}_${Math.random()}`;
            if (!newPool[templateId] && c.dataUrl) {
              const cardItem: CardData = {
                id: templateId,
                name: c.name || 'カード',
                dataUrl: c.dataUrl,
                backDataUrl: c.backDataUrl || null,
              };
              await dbService.saveCard(cardItem);
              newPool[templateId] = cardItem;
            }
            newMain[templateId] = (newMain[templateId] || 0) + 1;
          }
        }

        if (Array.isArray(json.exCards)) {
          for (const c of json.exCards) {
            const templateId = c.templateId || `card_${Date.now()}_${Math.random()}`;
            if (!newPool[templateId] && c.dataUrl) {
              const cardItem: CardData = {
                id: templateId,
                name: c.name || 'カード',
                dataUrl: c.dataUrl,
                backDataUrl: c.backDataUrl || null,
              };
              await dbService.saveCard(cardItem);
              newPool[templateId] = cardItem;
            }
            newEx[templateId] = (newEx[templateId] || 0) + 1;
          }
        }

        setCardPool(newPool);
        setMainDeck(newMain);
        setExDeck(newEx);
        alert(`デッキ「${json.name || '読み込みデッキ'}」を取り込みました！`);
      } catch (err) {
        console.error('Import deck failed:', err);
        alert('デッキJSONの読み込みに失敗しました。');
      } finally {
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const clearDatabase = async () => {
    if (confirm('登録されたすべての画像とデッキ設定をリセットしますか？')) {
      await dbService.clearDatabase();
      setCardPool({});
      setMainDeck({});
      setExDeck({});
    }
  };

  const mainTotal = Object.values(mainDeck).reduce((a, b) => a + b, 0);
  const exTotal = Object.values(exDeck).reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
      }}
    >
      {/* 隠しインプット */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
      <input
        type="file"
        ref={importInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={importDeck}
      />
      <input
        type="file"
        ref={backImageInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleBackImageUpload}
      />

      {/* ヘッダーツールバー */}
      <header
        style={{
          padding: '12px 20px',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBackToTitle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#334155',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            タイトルへ
          </button>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#38bdf8' }}>
            BS デッキメーカー V3.1
          </h2>
          {isProcessing && (
            <span style={{ fontSize: '12px', color: '#f59e0b' }}>
              処理中... (WebP自動圧縮)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <Upload size={16} />
            画像一括追加
          </button>

          <button
            onClick={() => importInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#7c3aed',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <FileText size={16} />
            JSON読込
          </button>

          <button
            onClick={clearDatabase}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <RotateCcw size={16} />
            リセット
          </button>
        </div>
      </header>

      {/* デッキビルダー本体ペイン */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左側: カードプール */}
        <div
          style={{
            flex: 2,
            padding: '16px',
            overflowY: 'auto',
            borderRight: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#e2e8f0' }}>
              カードプール ({Object.keys(cardPool).length} 枚)
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              ※画像はHTML5 Canvasで自動300x420 WebP圧縮されIndexedDBに保存されます
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '12px',
            }}
          >
            {Object.values(cardPool).map((card) => {
              const hasBack = !!card.backDataUrl;
              return (
                <div
                  key={card.id}
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    padding: '8px',
                    border: '1px solid #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <img
                    src={card.dataUrl}
                    alt={card.name}
                    style={{
                      width: '100%',
                      aspectRatio: '5 / 7',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      backgroundColor: '#0f172a',
                    }}
                  />
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textAlign: 'center',
                      color: '#cbd5e1',
                    }}
                    title={card.name}
                  >
                    {card.name}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => addCard(card.id, 'main')}
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      +メイン
                    </button>
                    <button
                      onClick={() => addCard(card.id, 'ex')}
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        backgroundColor: '#8b5cf6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      +EX
                    </button>
                  </div>
                  <button
                    onClick={() => triggerBackUpload(card.id)}
                    style={{
                      width: '100%',
                      padding: '3px 0',
                      fontSize: '10px',
                      backgroundColor: hasBack ? '#15803d' : '#475569',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <ImageIcon size={10} />
                    {hasBack ? '裏面変更 (有)' : '裏面追加'}
                  </button>
                </div>
              );
            })}
          </div>
          {Object.keys(cardPool).length === 0 && (
            <div
              style={{
                height: '300px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                gap: '12px',
              }}
            >
              <Upload size={36} />
              <div>カード画像が登録されていません。「画像一括追加」または「JSON読込」を行ってください。</div>
            </div>
          )}
        </div>

        {/* 右側: デッキ構成ペイン */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#111827',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
          }}
        >
          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              デッキ名
            </label>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="デッキ名を入力"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#1e293b',
                color: '#fff',
                border: '1px solid #475569',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* メインデッキセクション */}
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '35vh',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              <span style={{ color: '#38bdf8' }}>メインデッキ (山札)</span>
              <span style={{ color: mainTotal > 100 ? '#ef4444' : '#94a3b8' }}>
                {mainTotal} / 100 枚
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(mainDeck).map(([id, count]) => {
                const card = cardPool[id];
                if (!card) return null;
                return (
                  <DeckRow
                    key={id}
                    card={card}
                    count={count}
                    onIncrease={() => changeCount(id, 'main', 1)}
                    onDecrease={() => changeCount(id, 'main', -1)}
                  />
                );
              })}
            </div>
          </div>

          {/* EXデッキセクション */}
          <div
            style={{
              backgroundColor: '#1e1b4b',
              border: '1px solid #6b21a8',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '30vh',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              <span style={{ color: '#c084fc' }}>EX / 契約・トークン枠</span>
              <span style={{ color: '#d8b4fe' }}>{exTotal} 枚</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(exDeck).map(([id, count]) => {
                const card = cardPool[id];
                if (!card) return null;
                return (
                  <DeckRow
                    key={id}
                    card={card}
                    count={count}
                    onIncrease={() => changeCount(id, 'ex', 1)}
                    onDecrease={() => changeCount(id, 'ex', -1)}
                  />
                );
              })}
            </div>
          </div>

          {/* デッキ出力ボタン */}
          <button
            onClick={exportDeck}
            style={{
              marginTop: 'auto',
              backgroundColor: '#16a34a',
              color: '#fff',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.4)',
            }}
          >
            <Download size={18} />
            対戦用デッキJSONを出力
          </button>
        </div>
      </div>
    </div>
  );
};

interface DeckRowProps {
  card: CardData;
  count: number;
  onIncrease: () => void;
  onDecrease: () => void;
}

const DeckRow: React.FC<DeckRowProps> = ({ card, count, onIncrease, onDecrease }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 8px',
        backgroundColor: '#0f172a',
        borderRadius: '4px',
        border: '1px solid #334155',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
        <img
          src={card.dataUrl}
          alt={card.name}
          style={{ width: '24px', height: '34px', objectFit: 'cover', borderRadius: '3px' }}
        />
        <span
          style={{
            fontSize: '12px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: '#e2e8f0',
          }}
        >
          {card.name}
          {card.backDataUrl && (
            <span style={{ color: '#22c55e', fontSize: '10px', marginLeft: '4px' }}>
              [裏有]
            </span>
          )}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={onDecrease}
          style={{
            backgroundColor: '#334155',
            color: '#fff',
            border: 'none',
            width: '22px',
            height: '22px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Minus size={12} />
        </button>
        <span style={{ fontSize: '12px', fontWeight: 'bold', width: '16px', textAlign: 'center' }}>
          {count}
        </span>
        <button
          onClick={onIncrease}
          style={{
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            width: '22px',
            height: '22px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
};
