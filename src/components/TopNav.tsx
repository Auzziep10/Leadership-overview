import { useState, useCallback, useEffect } from 'react';
import { Search, Menu, LogOut, Bell } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { auth } from '../services/firebaseConfig';
import { useAuth } from '../services/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from './Modal';
import { updateUserAvatar, updatePersonalDetails } from '../services/firestoreService';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

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

  const [notificationsCount, setNotificationsCount] = useState(0);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'signature'>('profile');
  const [sigTitle, setSigTitle] = useState('');
  const [sigLocation, setSigLocation] = useState('');

  useEffect(() => {
    if (user && isSettingsOpen) {
      setPersonalName(user.name || '');
      setPersonalEmail(user.email || '');
      setPersonalPhone(user.phone || '');
      setNewPassword('');
      setSigTitle(user.role || 'Title & Tagline');
      setSigLocation('Location Details');
    }
  }, [user, isSettingsOpen]);

  useEffect(() => {
    const handleNotifications = (e: any) => setNotificationsCount(e.detail);
    window.addEventListener('update-notifications', handleNotifications);
    return () => window.removeEventListener('update-notifications', handleNotifications);
  }, []);

  const handleClearNotifications = async () => {
    if (!user) return;
    setNotificationsCount(0);
    await updateDoc(doc(db, 'users', user.id), { last_seen_notifications: new Date().toISOString() });
    window.dispatchEvent(new CustomEvent('notifications-cleared'));
  };

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

  const copySignature = async () => {
    if (!user) return;
    try {
      const html = generateSignatureHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const clipboardItem = new window.ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([clipboardItem]);
      alert('High-fidelity signature copied to clipboard globally! Open your Gmail or Outlook settings and hit paste to install.');
    } catch(err) {
      alert("Clipboard API failure. Ensure your browser is secure context.");
    }
  };

  const generateSignatureHTML = () => {
    if (!user) return '';
    const bannerUrl = 'https://images.unsplash.com/photo-1617056024921-9989a695de93?q=80&w=600&auto=format&fit=crop';
    const avatarUrl = user.avatar_url || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80';
    
    return `
<table cellpadding="0" cellspacing="0" border="0" width="400" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 400px; min-width: 400px; width: 400px; background-color: #ffffff;">
  <tr>
    <td style="height: auto;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td height="80" style="background-color: #18181b; background-image: url('${bannerUrl}'); background-size: cover; background-position: center; height: 80px; width: 100%;">
          </td>
        </tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="32" style="width: 32px; min-width: 32px; max-width: 32px;"></td>
          <td width="60" valign="top" style="width: 60px;">
            <div style="margin-top: -30px;">
              <img src="${avatarUrl}" width="60" height="60" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid #ffffff; display: block; object-fit: cover;" alt="${user.name}">
            </div>
          </td>
          <td width="308"></td>
        </tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 12px;">
        <tr>
          <td width="32" style="width: 32px; min-width: 32px; max-width: 32px;"></td>
          <td width="368" valign="top">
            <div style="font-weight: 700; font-size: 16px; color: #18181b; margin: 0; padding: 0; letter-spacing: -0.02em;">${user.name}</div>
            <div style="font-size: 10px; color: #71717a; margin: 4px 0 0 0; padding: 0;">${sigTitle}</div>
            <div style="font-size: 10px; color: #a1a1aa; margin: 2px 0 0 0; padding: 0;">${sigLocation}</div>
            <div style="margin-top: 16px; border-top: 1px solid #e4e4e7; padding-top: 16px; padding-bottom: 24px;">
              <div style="font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 700; color: #18181b; margin: 0; padding: 0;">Leadership Overview Inc.</div>
              <div style="font-size: 10px; color: #a1a1aa; margin: 4px 0 0 0;">CONFIDENTIAL INTERNAL DOMAIN</div>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`.replace(/\n/g, '').replace(/\s+/g, ' ');
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
              <div style={{ display: 'flex', borderBottom: '1px solid var(--color-zinc-200)', marginBottom: '24px', marginTop: '12px' }}>
                <button 
                  onClick={() => setSettingsTab('profile')} 
                  style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', borderBottom: settingsTab === 'profile' ? '2px solid var(--color-zinc-900)' : '2px solid transparent', fontWeight: 600, color: settingsTab === 'profile' ? 'var(--color-zinc-900)' : 'var(--color-zinc-500)', cursor: 'pointer', fontSize: '13px' }}
                >
                  System Profile
                </button>
                <button 
                  onClick={() => setSettingsTab('signature')} 
                  style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', borderBottom: settingsTab === 'signature' ? '2px solid var(--color-zinc-900)' : '2px solid transparent', fontWeight: 600, color: settingsTab === 'signature' ? 'var(--color-zinc-900)' : 'var(--color-zinc-500)', cursor: 'pointer', fontSize: '13px' }}
                >
                  Email Signature
                </button>
              </div>

              {settingsTab === 'profile' ? (
                <>
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
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
                  {/* Left Column Controls */}
                  <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', border: '1px solid var(--color-zinc-200)', borderRadius: '12px', padding: '24px' }}>
                     <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-serif)', borderBottom: '1px solid var(--color-zinc-100)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        👤 Personal Details
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-zinc-500)' }}>Full Name (From DB)</label>
                       <input type="text" value={user.name} disabled style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', backgroundColor: 'var(--color-zinc-50)', color: 'var(--color-zinc-500)', fontSize: '12px' }} />
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-zinc-500)' }}>Title & Tagline</label>
                       <input type="text" value={sigTitle} onChange={e => setSigTitle(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px' }} />
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-zinc-500)' }}>Location</label>
                       <input type="text" value={sigLocation} onChange={e => setSigLocation(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px' }} />
                     </div>
                  </div>

                  {/* Right Column Preview */}
                  <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-zinc-900)' }}>Live Preview</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-zinc-500)' }}>What you see is what gets copied.</div>
                      </div>
                      <button 
                        onClick={copySignature}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-zinc-900)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Copy Signature
                      </button>
                    </div>

                    <div style={{ background: 'white', border: '1px solid var(--color-zinc-200)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'flex-start', overflowX: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                      <div dangerouslySetInnerHTML={{ __html: generateSignatureHTML() }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </Modal>
    </>
  );
}
