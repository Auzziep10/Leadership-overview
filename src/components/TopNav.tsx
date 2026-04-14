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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'avatar' | 'sigProfile' | 'sigBanner' | 'sigLogo'>('avatar');
  const [cropAspect, setCropAspect] = useState(1);
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
  const [sigFullName, setSigFullName] = useState('');
  const [sigPhone, setSigPhone] = useState('');
  const [sigEmail, setSigEmail] = useState('');
  const [sigLinkedin, setSigLinkedin] = useState('https://linkedin.com/');
  const [sigWebsite, setSigWebsite] = useState('https://wovnapparel.com');
  const [sigFraming, setSigFraming] = useState('Top Aligned');
  const [sigProfileUrl, setSigProfileUrl] = useState('');
  const [sigGlobalBanner, setSigGlobalBanner] = useState('https://images.unsplash.com/photo-1617056024921-9989a695de93?q=80&w=600&auto=format&fit=crop');
  const [sigGlobalLogo, setSigGlobalLogo] = useState('');



  useEffect(() => {
    if (user && isSettingsOpen) {
      setPersonalName(user.name || '');
      setPersonalEmail(user.email || '');
      setPersonalPhone(user.phone || '');
      setNewPassword('');
      setSigTitle(user.role || 'Executive Fulfillment Team');
      setSigLocation('Rio Rancho, NM');
      setSigFullName(user.name || '');
      setSigPhone(user.phone || '5053065100');
      setSigEmail(user.email || 'austin@catalyst.com.co');
      setSigProfileUrl(user.avatar_url || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80');
      setSigGlobalLogo('https://wovn.vercel.app/wovn-signature-logo.png'); // placeholder
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

  const isStaff = user?.role !== 'owner' && user?.role !== 'admin';

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPx: any) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'sigProfile' | 'sigBanner' | 'sigLogo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === 'sigBanner') setCropAspect(3);
    else if (target === 'sigLogo') setCropAspect(2);
    else setCropAspect(1);

    setCropTarget(target);

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
      
      let tw = 120;
      let th = 120;
      if (cropTarget === 'sigBanner') { tw = 600; th = 200; }
      else if (cropTarget === 'sigLogo') { tw = 200; th = 100; }
      else if (cropTarget === 'sigProfile') { tw = 150; th = 150; }

      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
           img, 
           croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 
           0, 0, tw, th
        );
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        
        if (cropTarget === 'avatar') {
          await updateUserAvatar(user.id, dataUrl);
          setIsSettingsOpen(false);
          window.location.reload(); 
        } else if (cropTarget === 'sigProfile') {
          setSigProfileUrl(dataUrl);
        } else if (cropTarget === 'sigBanner') {
          setSigGlobalBanner(dataUrl);
        } else if (cropTarget === 'sigLogo') {
          setSigGlobalLogo(dataUrl);
        }

        setUploading(false);
        setImageSrc(null);
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
    const bannerUrl = sigGlobalBanner || 'https://images.unsplash.com/photo-1617056024921-9989a695de93?q=80&w=600&auto=format&fit=crop';
    const avatarUrl = sigProfileUrl || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80';
    
    return `
<table cellpadding="0" cellspacing="0" border="0" width="400" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 400px; min-width: 400px; width: 400px; background-color: #ffffff;">
  <tr>
    <td style="height: auto;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td height="80" style="background-color: #f4f4f5; background-image: url('${bannerUrl}'); background-size: cover; background-position: center; height: 80px; width: 100%; border-radius: 16px 16px 0 0;">
          </td>
        </tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="32" style="width: 32px; min-width: 32px; max-width: 32px;"></td>
          <td width="72" valign="top" style="width: 72px;">
            <div style="margin-top: -36px;">
              <img src="${avatarUrl}" width="72" height="72" style="width: 72px; height: 72px; border-radius: 50%; border: 4px solid #ffffff; display: block; object-fit: cover;" alt="${sigFullName}">
            </div>
          </td>
          <td width="296"></td>
        </tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 12px;">
        <tr>
          <td width="32" style="width: 32px; min-width: 32px; max-width: 32px;"></td>
          <td width="368" valign="top">
            <div style="font-weight: 800; font-size: 20px; color: #18181b; margin: 0; padding: 0; letter-spacing: -0.03em;">${sigFullName}</div>
            <div style="font-size: 13px; color: #71717a; margin: 4px 0 0 0; padding: 0;">${sigTitle}</div>
            <div style="font-size: 13px; color: #a1a1aa; margin: 2px 0 0 0; padding: 0;">${sigLocation}</div>
            
            <div style="margin-top: 16px; margin-bottom: 24px;">
               <a href="tel:${sigPhone}" style="display:inline-block; margin-right:6px; text-decoration:none;"><img src="https://img.icons8.com/ios-filled/50/c2a67e/iphone.png" width="28" height="28" style="width:28px; height:28px; border-radius:50%;" alt="Phone" /></a>
               <a href="mailto:${sigEmail}" style="display:inline-block; margin-right:6px; text-decoration:none;"><img src="https://img.icons8.com/ios-filled/50/c2a67e/speech-bubble-with-dots.png" width="28" height="28" style="width:28px; height:28px; border-radius:50%;" alt="Chat" /></a>
               <a href="${sigWebsite}" style="display:inline-block; margin-right:6px; text-decoration:none;"><img src="https://img.icons8.com/ios-filled/50/c2a67e/domain.png" width="28" height="28" style="width:28px; height:28px; border-radius:50%;" alt="Web" /></a>
               <a href="${sigLinkedin}" style="display:inline-block; margin-right:6px; text-decoration:none;"><img src="https://img.icons8.com/ios-filled/50/c2a67e/linkedin.png" width="28" height="28" style="width:28px; height:28px; border-radius:50%;" alt="LinkedIn" /></a>
            </div>

            ${sigGlobalLogo ? `<img src="${sigGlobalLogo}" width="140" style="display:block; margin-bottom:24px;" alt="WOVN" />` : `<div style="font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 900; color: #18181b; margin-bottom: 24px; letter-spacing: -0.05em;">WOV/V</div>`}

            <div style="border-top: 1px solid #f4f4f5; padding-top: 16px; padding-bottom: 24px;">
              <div style="font-size: 7px; color: #a1a1aa; margin: 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">CONFIDENTIALITY NOTICE:</div>
              <div style="font-size: 7px; color: #d4d4d8; margin: 4px 0 0 0; line-height: 1.4;">CONFIDENTIALITY NOTICE: THE CONTENTS OF THIS EMAIL MESSAGE AND ANY ATTACHMENTS ARE INTENDED SOLELY FOR THE ADDRESSEE(S) AND MAY CONTAIN CONFIDENTIAL AND/OR PRIVILEGED INFORMATION AND MAY BE LEGALLY PROTECTED FROM DISCLOSURE. IF YOU ARE NOT THE INTENDED RECIPIENT OF THIS MESSAGE OR THEIR AGENT, OR IF THIS MESSAGE HAS BEEN ADDRESSED TO YOU IN ERROR, PLEASE IMMEDIATELY ALERT THE SENDER BY REPLY EMAIL AND THEN DELETE THIS MESSAGE AND ANY ATTACHMENTS. IF YOU ARE NOT THE INTENDED RECIPIENT, YOU ARE HEREBY NOTIFIED THAT ANY USE, DISSEMINATION, COPYING, OR STORAGE OF THIS MESSAGE OR ITS ATTACHMENTS IS STRICTLY PROHIBITED.</div>
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
          <div style={{ position: 'relative' }}>
            <Menu size={20} cursor="pointer" onClick={() => setIsMenuOpen(!isMenuOpen)} />
            {isMenuOpen && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setIsMenuOpen(false)} />
                <div style={{ position: 'absolute', top: '100%', left: '0', marginTop: '12px', background: 'white', border: '1px solid var(--color-zinc-200)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 1000, minWidth: '220px' }}>
                  <a href="https://wovn-garment-catalog.vercel.app" target="_blank" rel="noreferrer" style={{ display: 'block', padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--color-zinc-900)', textDecoration: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--color-zinc-50)'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    Garment Catalog
                  </a>
                  <a href="https://print-shop-os-beta.vercel.app" target="_blank" rel="noreferrer" style={{ display: 'block', padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--color-zinc-900)', textDecoration: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--color-zinc-50)'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    Print Shop OS
                  </a>
                  <a href="https://tech-pack-creator.vercel.app" target="_blank" rel="noreferrer" style={{ display: 'block', padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--color-zinc-900)', textDecoration: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--color-zinc-50)'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    Tech Pack Creator
                  </a>
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ cursor: 'pointer', borderBottom: location.pathname === '/' ? '2px solid var(--color-zinc-900)' : 'none', color: location.pathname === '/' ? 'var(--color-zinc-900)' : 'var(--color-zinc-500)' }} onClick={() => navigate('/')}>DASHBOARD</span>
            {(user?.role === 'owner' || user?.role === 'admin') && (
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

      <Modal isOpen={isSettingsOpen} onClose={() => { setIsSettingsOpen(false); setImageSrc(null); }} title="Account Settings" maxWidth={settingsTab === 'signature' && !imageSrc ? '1200px' : '500px'}>
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
                <div className="signature-layout-grid" style={{ background: 'var(--color-zinc-50)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-zinc-100)' }}>
                  
                  {/* Left Column Controls */}
                  <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* PC Card: Personal Details */}
                    <div style={{ background: 'white', border: '1px solid var(--color-zinc-200)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, borderBottom: '1px solid var(--color-zinc-100)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         👤 Personal Details
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                           <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-zinc-500)', textTransform: 'uppercase' }}>Active Profile</label>
                           <select style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }}><option>Main Signature</option></select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                           <button style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', background: 'var(--color-zinc-50)', cursor: 'pointer', fontWeight: 600 }}>+</button>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                           <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-zinc-500)', textTransform: 'uppercase' }}>Profile Name</label>
                           <input type="text" value="Main Signature" readOnly style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-500)' }}>Full Name</label>
                        <input type="text" value={sigFullName} onChange={e => setSigFullName(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-500)' }}>Title & Tagline</label>
                        <input type="text" value={sigTitle} onChange={e => setSigTitle(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-500)' }}>Location</label>
                        <input type="text" value={sigLocation} onChange={e => setSigLocation(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-500)' }}>Profile Image</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                           <input type="text" value={sigProfileUrl} onChange={e => setSigProfileUrl(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
                           <label style={{ padding: '10px 14px', border: '1px solid var(--color-zinc-200)', borderRadius: '6px', cursor: 'pointer', background: 'var(--color-zinc-50)', display: 'flex', alignItems: 'center' }}>
                             <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'sigProfile')} />
                             ↑
                           </label>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-500)' }}>Framing</label>
                        <select value={sigFraming} onChange={e => setSigFraming(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', width: '140px', outline: 'none' }}>
                          <option>Top Aligned</option>
                          <option>Centered</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-500)' }}>Phone Number</label>
                          <input type="text" value={sigPhone} onChange={e => setSigPhone(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-500)' }}>Email Address</label>
                          <input type="text" value={sigEmail} onChange={e => setSigEmail(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-500)' }}>LinkedIn URL</label>
                          <input type="text" value={sigLinkedin} onChange={e => setSigLinkedin(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-500)' }}>Website URL</label>
                          <input type="text" value={sigWebsite} onChange={e => setSigWebsite(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
                        </div>
                      </div>

                      <button onClick={() => alert("Local configurator state preserved.")} style={{ background: '#000000', color: 'white', fontWeight: 600, padding: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '12px' }}>
                        Save My Details
                      </button>
                    </div>

                    {/* PC Card: Global Banner Details */}
                    {!isStaff && (
                      <div style={{ background: 'white', border: '1px solid var(--color-zinc-200)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                         <div style={{ fontSize: '14px', fontWeight: 600, borderBottom: '1px solid var(--color-zinc-100)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🌐 Global Banner Details (Admin)
                         </div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-500)' }}>Background Banner</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                             <input type="text" value={sigGlobalBanner} onChange={e => setSigGlobalBanner(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
                             <label style={{ padding: '10px 14px', border: '1px solid var(--color-zinc-200)', borderRadius: '6px', cursor: 'pointer', background: 'var(--color-zinc-50)', display: 'flex', alignItems: 'center' }}>
                               <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'sigBanner')} />
                               ↑
                             </label>
                          </div>
                        </div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-500)' }}>Global Logo</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                             <input type="text" value={sigGlobalLogo} onChange={e => setSigGlobalLogo(e.target.value)} placeholder="Upload or link to override text..." style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
                             <label style={{ padding: '10px 14px', border: '1px solid var(--color-zinc-200)', borderRadius: '6px', cursor: 'pointer', background: 'var(--color-zinc-50)', display: 'flex', alignItems: 'center' }}>
                               <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'sigLogo')} />
                               ↑
                             </label>
                          </div>
                        </div>
                        <button onClick={() => alert("Global banner configurations preserved.")} style={{ background: '#000000', color: 'white', fontWeight: 600, padding: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '12px' }}>
                          Save Global Banner
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column Preview */}
                  <div style={{ flex: '1 1 400px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
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
