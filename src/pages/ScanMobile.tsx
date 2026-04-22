import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { uploadImageAttachment, updateScanSession } from '../services/firestoreService';
import { jsPDF } from 'jspdf';

export function ScanMobile() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sid');
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  
  const [mode, setMode] = useState<'select' | 'camera' | 'preview'>('select');
  const [previewData, setPreviewData] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!sessionId) {
      setIsDone(true); // Invalid
    }
  }, [sessionId]);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (mode === 'camera') {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } })
        .then(s => {
          activeStream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch(e => {
          console.error(e);
          alert('Could not access camera. Please check permissions.');
          setMode('select');
        });
    }
    return () => {
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
    };
  }, [mode]);

  const captureDocument = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw original
    ctx.drawImage(video, 0, 0);
    
    // Apply document filter (high contrast, grayscale)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const contrast = 75; // 0 to 255
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Grayscale
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // High contrast
      gray = factor * (gray - 128) + 128;
      
      // Clamp
      gray = Math.max(0, Math.min(255, gray));
      
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewData(dataUrl);
    setMode('preview');
  };

  const approveDocument = () => {
    if (!previewData) return;
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(previewData);
    const imgRatio = imgProps.width / imgProps.height;
    const pdfRatio = pdfWidth / pdfHeight;
    
    let finalW = pdfWidth;
    let finalH = pdfWidth / imgRatio;
    
    if (finalH > pdfHeight) {
      finalH = pdfHeight;
      finalW = pdfHeight * imgRatio;
    }
    
    const x = (pdfWidth - finalW) / 2;
    const y = (pdfHeight - finalH) / 2;
    
    pdf.addImage(previewData, 'JPEG', x, y, finalW, finalH);
    
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], `Scanned_Doc_${Date.now()}.pdf`, { type: 'application/pdf' });
    
    setFile(pdfFile);
    setMode('select');
    setPreviewData(null);
  };

  const handleUpload = async () => {
    if (!file || !sessionId) return;
    setIsUploading(true);
    try {
      const { url, name, type } = await uploadImageAttachment(file);
      await updateScanSession(sessionId, url, name, type);
      setIsDone(true);
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isDone && !sessionId) {
    return <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-sans)', marginTop: '40px' }}>Invalid Scan Session.</div>;
  }

  if (isDone) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'var(--font-sans)', marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-zinc-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
          ✓
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-zinc-900)' }}>Upload Complete</div>
        <div style={{ fontSize: '14px', color: 'var(--color-zinc-500)' }}>You can close this window and return to your desktop.</div>
      </div>
    );
  }

  if (mode === 'camera') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'black', display: 'flex', flexDirection: 'column' }}>
        <video ref={videoRef} playsInline style={{ flex: 1, width: '100%', objectFit: 'cover' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.8)' }}>
          <button onClick={() => setMode('select')} style={{ color: 'white', background: 'transparent', border: 'none', fontSize: '16px', padding: '8px 16px' }}>Cancel</button>
          <button onClick={captureDocument} style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'white', border: '4px solid var(--color-zinc-300)', cursor: 'pointer' }} />
          <div style={{ width: '60px' }}></div>
        </div>
      </div>
    );
  }

  if (mode === 'preview') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'black', display: 'flex', flexDirection: 'column' }}>
        <img src={previewData || ''} alt="Preview" style={{ flex: 1, width: '100%', objectFit: 'contain' }} />
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.8)' }}>
          <button onClick={() => setMode('camera')} style={{ color: 'white', background: 'transparent', border: 'none', fontSize: '16px', padding: '8px 16px' }}>Retake</button>
          <button onClick={approveDocument} style={{ background: 'var(--color-brand-accent)', color: 'white', border: 'none', fontSize: '16px', fontWeight: 700, padding: '12px 24px', borderRadius: '99px', cursor: 'pointer' }}>Use Document</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '400px', margin: '0 auto', marginTop: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-zinc-900)', fontFamily: 'var(--font-serif)' }}>Mobile Scanner</div>
        <div style={{ fontSize: '14px', color: 'var(--color-zinc-500)', marginTop: '8px' }}>Scan a document or upload an existing file to send it to your desktop.</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
        {!file ? (
          <>
            <button 
              onClick={() => setMode('camera')}
              style={{ width: '100%', padding: '24px', borderRadius: '16px', background: 'var(--color-zinc-900)', color: 'white', border: 'none', fontSize: '18px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', boxShadow: '0 8px 16px -4px rgba(0,0,0,0.2)' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="m8 17 4-4 4 4"></path></svg>
              Scan Document
              <span style={{ fontSize: '12px', fontWeight: 500, opacity: 0.8 }}>Auto-enhances to PDF</span>
            </button>

            <div style={{ position: 'relative', width: '100%', padding: '16px', border: '2px dashed var(--color-zinc-300)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-zinc-50)', overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-zinc-600)' }}>
                Choose from Files or Photos
              </div>
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
            </div>
          </>
        ) : (
          <div style={{ padding: '24px', background: 'var(--color-zinc-50)', border: '1px solid var(--color-zinc-200)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--color-zinc-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📄
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-zinc-900)' }}>Ready to Send</div>
              <div style={{ fontSize: '12px', color: 'var(--color-zinc-500)', marginTop: '4px', wordBreak: 'break-all' }}>{file.name}</div>
            </div>
            <button onClick={() => setFile(null)} style={{ fontSize: '12px', color: 'var(--color-red-500)', background: 'transparent', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Remove</button>
          </div>
        )}

        <button 
          onClick={handleUpload}
          disabled={!file || isUploading}
          style={{ 
            width: '100%', 
            padding: '16px', 
            borderRadius: '12px', 
            background: file && !isUploading ? 'var(--color-brand-accent)' : 'var(--color-zinc-200)', 
            color: file && !isUploading ? 'white' : 'var(--color-zinc-500)', 
            border: 'none', 
            fontSize: '16px', 
            fontWeight: 700, 
            cursor: file && !isUploading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            marginTop: '8px'
          }}
        >
          {isUploading ? 'Sending...' : 'Send to Desktop'}
        </button>
      </div>
    </div>
  );
}
