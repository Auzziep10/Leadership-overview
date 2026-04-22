import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { uploadImageAttachment, updateScanSession } from '../services/firestoreService';

export function ScanMobile() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sid');
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setIsDone(true); // Invalid
    }
  }, [sessionId]);

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

  return (
    <div style={{ padding: '24px', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '400px', margin: '0 auto', marginTop: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-zinc-900)', fontFamily: 'var(--font-serif)' }}>Mobile Scanner</div>
        <div style={{ fontSize: '14px', color: 'var(--color-zinc-500)', marginTop: '8px' }}>Take a photo or upload a document to send it instantly to your desktop session.</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
        <div style={{ position: 'relative', width: '100%', height: '200px', border: '2px dashed var(--color-zinc-300)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-zinc-50)', overflow: 'hidden' }}>
          {file ? (
            <div style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: 'var(--color-zinc-900)' }}>
              {file.type.startsWith('image/') ? 'Image Selected' : 'Document Selected'}
              <div style={{ fontSize: '12px', color: 'var(--color-zinc-500)', marginTop: '4px', wordBreak: 'break-all' }}>{file.name}</div>
            </div>
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: 'var(--color-zinc-500)' }}>Tap to Scan/Upload</div>
          )}
          <input 
            type="file" 
            accept="image/*,application/pdf" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
          />
        </div>

        <button 
          onClick={handleUpload}
          disabled={!file || isUploading}
          style={{ 
            width: '100%', 
            padding: '16px', 
            borderRadius: '12px', 
            background: file && !isUploading ? 'var(--color-zinc-900)' : 'var(--color-zinc-200)', 
            color: file && !isUploading ? 'white' : 'var(--color-zinc-500)', 
            border: 'none', 
            fontSize: '16px', 
            fontWeight: 700, 
            cursor: file && !isUploading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
        >
          {isUploading ? 'Uploading securely...' : 'Send to Desktop'}
        </button>

        <div style={{ marginTop: '16px', padding: '16px', background: 'var(--color-zinc-50)', border: '1px solid var(--color-zinc-200)', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-zinc-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💡</span> Pro Tip: Native Document Scanning
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-zinc-600)', marginTop: '8px', lineHeight: '1.5' }}>
            Your phone has a built-in scanner that automatically crops borders and saves as a high-quality PDF!<br/><br/>
            <strong>iOS:</strong> Tap above, choose <strong>"Choose Files"</strong>, then tap the <strong>(⋯) menu</strong> in the top right and select <strong>"Scan Documents"</strong>.<br/><br/>
            <strong>Android:</strong> Tap above, select <strong>"Files"</strong>, and use the Google Drive <strong>"Scan"</strong> feature.
          </div>
        </div>
      </div>
    </div>
  );
}
