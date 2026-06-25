import { useState } from 'react';

export default function VoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('');

  const startRecording = async () => {
    try {
      setStatus('Recording... Speak now');
      setIsRecording(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');

        setStatus('Sending to Grok Voice...');
        
        try {
          const res = await fetch('http://localhost:8000/voice/stt', {
            method: 'POST',
            body: formData,
          });
          
          const data = await res.json();
          setTranscript(data.transcript || 'No transcript received');
          setStatus('Done!');
        } catch (err) {
          setStatus('Error: ' + err.message);
        }
        
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      
      // Auto-stop after 8 seconds for better UX
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
      }, 8000);

    } catch (err) {
      setStatus('Microphone access denied or not available');
      setIsRecording(false);
    }
  };

  return (
    <div style={{ margin: '20px 0', textAlign: 'center' }}>
      <button
        onClick={startRecording}
        disabled={isRecording}
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          background: isRecording ? '#ff4444' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          cursor: isRecording ? 'not-allowed' : 'pointer',
        }}
      >
        🎤 {isRecording ? 'Recording...' : 'Speak to Grok'}
      </button>
      
      <p style={{ marginTop: '10px', color: '#666' }}>{status}</p>
      
      {transcript && (
        <div style={{ marginTop: '15px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
          <strong>Transcript:</strong> {transcript}
        </div>
      )}
    </div>
  );
}
