import { useState } from 'react';

export default function VoiceInput({ onJobCreated }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('');

  const startRecording = async () => {
    try {
      setStatus('🎤 Listening... Speak now');
      setIsRecording(true);
      setTranscript('');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');

        setStatus('Sending to Grok...');

        try {
          const res = await fetch('http://localhost:8000/voice/stt', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          setTranscript(data.transcript);
          setStatus('Ready to create job');
        } catch (err) {
          setStatus('Error: ' + err.message);
        }
        
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 7000); // 7 seconds max

    } catch (err) {
      setStatus('Microphone error');
      setIsRecording(false);
    }
  };

  const createJobFromVoice = async () => {
    if (!transcript) return;
    
    const jobData = {
      title: transcript.slice(0, 60),
      description: transcript,
      price: 75,
      lat: 47.0379,
      lon: -122.9015,
      status: "open"
    };

    try {
      await fetch('http://localhost:8000/jobs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData)
      });
      alert('✅ Job created from voice!');
      setTranscript('');
      setStatus('');
      if (onJobCreated) onJobCreated();
    } catch (err) {
      alert('Failed to create job');
    }
  };

  return (
    <div style={{ margin: '20px 0', textAlign: 'center', padding: '20px', background: '#f9f9f9', borderRadius: '12px' }}>
      <button
        onClick={startRecording}
        disabled={isRecording}
        style={{
          padding: '16px 32px',
          fontSize: '18px',
          background: isRecording ? '#e74c3c' : '#27ae60',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          cursor: isRecording ? 'not-allowed' : 'pointer',
        }}
      >
        🎤 {isRecording ? 'Recording...' : 'Speak to Create Job'}
      </button>

      <p style={{ margin: '10px 0', color: '#555' }}>{status}</p>

      {transcript && (
        <div style={{ marginTop: '15px', padding: '15px', background: 'white', borderRadius: '8px', textAlign: 'left' }}>
          <strong>Transcript:</strong> "{transcript}"
          <br /><br />
          <button 
            onClick={createJobFromVoice}
            style={{ padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px' }}
          >
            ✅ Create Job from this
          </button>
        </div>
      )}
    </div>
  );
}
