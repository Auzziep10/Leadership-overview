import { useState, useCallback, useEffect } from 'react';
import { Search, Menu, LogOut } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { auth } from '../services/firebaseConfig';
import { useAuth } from '../services/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from './Modal';
import { updateUserAvatar, updatePersonalDetails } from '../services/firestoreService';

export function TopNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [personalName, setPersonalName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);

  useEffect(() => {
    if (user && isSettingsOpen) {
      setPersonalName(user.name || '');
      setPersonalEmail(user.email || '');
      setPersonalPhone(user.phone || '');
      setNewPassword('');
    }
  }, [user, isSettingsOpen]);

  const isStaff = user?.role === 'staff';

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPx: any) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if(event.target?.result) setImageSrc(event.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const finishCrop = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;
    setUploading(true);

    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
           img, 
           croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 
           0, 0, 120, 120
        );
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        await updateUserAvatar(user.id, dataUrl);
        setUploading(false);
        setImageSrc(null);
        setIsSettingsOpen(false);
        window.location.reload(); 
      }
    };
    img.src = imageSrc;
  };

  const handleSaveDetails = async () => {
    if (!user) return;
    setIsUpdatingDetails(true);
    try {
      await updatePersonalDetails(user.id, personalName, personalEmail, personalPhone, newPassword);
      setNewPassword('');
      alert("Details saved successfully!");
      window.location.reload();
    } catch (e: any) {
      alert("Error saving security details. Please log out completely, log back in immediately, and try again so Firebase registers a fresh handshake.\n\n" + e.message);
    } finally {
      setIsUpdatingDetails(false);
    }
  };
  
  return (
    <>
      <header className="header-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <img src="/C-Logo@300x.png" alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />
          <div className="search-bar">
             <Search size={14} color="var(--color-zinc-400)" />
             <input type="text" placeholder="Search tasks, staff, projects..." onChange={(e) => window.dispatchEvent(new CustomEvent('global-search', { detail: e.target.value.toLowerCase() }))} />
          </div>
        </div>
        
        <div className="nav-controls" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Menu size={20} cursor="pointer" />
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ cursor: 'pointer', borderBottom: location.pathname === '/' ? '2px solid var(--color-zinc-900)' : 'none', color: location.pathname === '/' ? 'var(--color-zinc-900)' : 'var(--color-zinc-500)' }} onClick={() => navigate('/')}>DASHBOARD</span>
            {user?.role !== 'staff' && (
              <span style={{ cursor: 'pointer', borderBottom: location.pathname === '/team' ? '2px solid var(--color-zinc-900)' : 'none', color: location.pathname === '/team' ? 'var(--color-zinc-900)' : 'var(--color-zinc-500)' }} onClick={() => navigate('/team')}>TEAM / ROLES</span>
            )}
            <span style={{ cursor: 'pointer', color: 'var(--color-zinc-500)' }} onClick={() => auth.signOut()}>LOG OUT</span>
          </div>
          {!isStaff && (
            <button className="auth-button" onClick={() => window.dispatchEvent(new Event('open-create-project'))}>Create Project +</button>
          )}
        </div>
      </header>

      <div 
        style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 100, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--color-zinc-200)' }}
        onClick={() => setIsSettingsOpen(true)}
      >
         <span style={{ fontSize: '14px' }}>⚙️</span>
         <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-zinc-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Settings</span>
      </div>

      <Modal isOpen={isSettingsOpen} onClose={() => { setIsSettingsOpen(false); setImageSrc(null); }} title="Account Settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {imageSrc ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative', width: '100%', height: '300px', background: '#333', borderRadius: '8px', overflow: 'hidden' }}>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              <input 
                type="range" 
                value={zoom} 
                min={1} 
                max={3} 
                step={0.1} 
                aria-labelledby="Zoom" 
                onChange={(e) => setZoom(Number(e.target.value))} 
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                 <button onClick={() => setImageSrc(null)} style={{ background: 'transparent', border: '1px solid var(--color-zinc-200)', padding: '8px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                 <button onClick={finishCrop} style={{ background: 'var(--color-zinc-900)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                   {uploading ? 'Processing...' : 'Save Avatar Drop'}
                 </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '13px', color: 'var(--color-zinc-500)' }}>
                Upload a new profile picture. This icon will appear across all timelines and project boards.
              </div>
              <div style={{ padding: '24px', border: '2px dashed var(--color-zinc-200)', borderRadius: '8px', textAlign: 'center', position: 'relative' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  disabled={uploading}
                />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-900)' }}>Click or Drag a Photo Here</span>
              </div>
              
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-zinc-100)', margin: '8px 0' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-serif)', marginTop: '8px' }}>Personal Data</div>
                <input type="text" placeholder="Full Name" value={personalName} onChange={e => setPersonalName(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-zinc-200)', fontSize: '13px' }} />
                <input type="email" placeholder="Email Address" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-zinc-200)', fontSize: '13px' }} />
                <input type="tel" placeholder="Phone Number" value={personalPhone} onChange={e => setPersonalPhone(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-zinc-200)', fontSize: '13px' }} />
                
                <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-serif)', marginTop: '16px' }}>Account Security</div>
                <input type="password" placeholder="New Password (leave blank to keep current)" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-zinc-200)', fontSize: '13px' }} />

                <button 
                  onClick={handleSaveDetails}
                  disabled={isUpdatingDetails}
                  className="auth-button"
                  style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '8px', opacity: isUpdatingDetails ? 0.6 : 1 }}
                >
                  {isUpdatingDetails ? 'Applying Changes...' : 'Save Local Details'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
                 <button onClick={() => auth.signOut()} style={{ background: 'transparent', border: '1px solid var(--color-zinc-300)', color: 'var(--color-zinc-600)', padding: '6px 16px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                   Sign Out of Account
                 </button>
              </div>
            </>
          )}

        </div>
      </Modal>
    </>
  );
}
