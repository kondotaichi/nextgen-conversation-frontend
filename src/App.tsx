import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface CustomSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

function App() {
  const [transcript, setTranscript] = useState('');
  const [popupText, setPopupText] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<CustomSpeechRecognition | null>(null);
  let debounceTimer: NodeJS.Timeout | null = null;

  useEffect(() => {
    if (!SpeechRecognition) {
      alert('このブラウザは音声認識をサポートしていません。');
      return;
    }

    const recognition: CustomSpeechRecognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    recognition.onresult = async (event: any) => {
      const currentTranscript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');

      setTranscript(currentTranscript);

      // 確定結果が得られたら即時解析を実行
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal && currentTranscript.trim().length > 0) {
        analyzeSpeech(currentTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('音声認識エラー:', event.error);
    };

    recognition.onend = () => {
      if (isListening) recognition.start();
    };

    if (isListening) recognition.start();

    return () => {
      recognition.stop();
    };
  }, [isListening]);

  const analyzeSpeech = async (text: string) => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/analyze', { text });
      const { corrected_text, explanation } = response.data;

      // corrected_textやexplanationが異なる場合や補足説明が含まれていればポップアップを表示
      if (
        corrected_text.trim() !== text.trim() ||
        (explanation && explanation !== '補足説明なし')
      ) {
        setPopupText(`修正: ${corrected_text}\n補足: ${explanation}`);
        setTimeout(() => setPopupText(null), 10000); // 10秒表示
      }
    } catch (error) {
      console.error('API通信エラー:', error);
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🎙️ 次世代対談システム (リアルタイム検知＆修正)</h1>
      <button
        onClick={() => setIsListening((prev) => !prev)}
        style={{
          padding: '0.8rem 1.6rem',
          backgroundColor: isListening ? '#f56565' : '#48bb78',
          color: '#fff',
          fontSize: '1rem',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          marginTop: '1rem',
        }}
      >
        {isListening ? '⏹️ 音声認識停止' : '🎤 音声認識開始'}
      </button>

      <div
        style={{
          marginTop: '1.5rem',
          fontSize: '1.2rem',
          border: '1px solid #ccc',
          padding: '1rem',
          width: '80%',
          margin: '1.5rem auto',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9',
          minHeight: '100px',
          textAlign: 'left',
          whiteSpace: 'pre-wrap',
        }}
      >
        <strong>リアルタイム音声入力:</strong>
        <p>{transcript || '音声入力がここに表示されます。'}</p>
      </div>

      {popupText && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            textAlign: 'center',
            padding: '2rem',
            whiteSpace: 'pre-line',
            zIndex: 1000,
          }}
        >
          {popupText}
        </div>
      )}
    </div>
  );
}

export default App;
