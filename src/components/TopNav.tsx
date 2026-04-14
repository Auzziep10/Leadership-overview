import { useState, useCallback, useEffect } from 'react';
import { Search, Menu, LogOut, Bell } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { auth } from '../services/firebaseConfig';
import { useAuth } from '../services/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from './Modal';
import { updateUserAvatar, updatePersonalDetails, uploadSignatureAsset, updateUserSignatureProfiles } from '../services/firestoreService';
import type { SignatureProfile } from '../types';
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
  const [sigGlobalLogo, setSigGlobalLogo] = useState('');
  
  const [signatureProfiles, setSignatureProfiles] = useState<SignatureProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('default');
  const [sigProfileName, setSigProfileName] = useState('Main Signature');

  const [sigGlobalBanner, setSigGlobalBanner] = useState('https://placehold.co/1200x400/eeeeee/999999?text=Upload+Global+Banner');

  const loadSignatureProfile = (profile: SignatureProfile, id: string) => {
    setActiveProfileId(id);
    setSigProfileName(profile.name);
    setSigTitle(profile.title || '');
    setSigLocation(profile.location || '');
    setSigFullName(profile.full_name || '');
    setSigPhone(profile.phone || '');
    setSigEmail(profile.email || '');
    setSigLinkedin(profile.linkedin || '');
    setSigWebsite(profile.website || '');
    setSigFraming(profile.framing || 'Top Aligned');
    setSigProfileUrl(profile.profile_url || '');
    if (profile.global_banner) setSigGlobalBanner(profile.global_banner);
    if (profile.global_logo !== undefined) setSigGlobalLogo(profile.global_logo);
  };

  useEffect(() => {
    if (user && isSettingsOpen) {
      setPersonalName(user.name || '');
      setPersonalEmail(user.email || '');
      setPersonalPhone(user.phone || '');
      setNewPassword('');
      
      const loadedProfiles = user.signature_profiles || [];
      if (loadedProfiles.length > 0) {
        setSignatureProfiles(loadedProfiles);
        loadSignatureProfile(loadedProfiles[0], loadedProfiles[0].id);
      } else {
        setSigTitle(user.role || 'Executive Fulfillment Team');
        setSigLocation('Rio Rancho, NM');
        setSigFullName(user.name || '');
        setSigPhone(user.phone || '5053065100');
        setSigEmail(user.email || 'austin@catalyst.com.co');
        setSigProfileUrl(user.avatar_url || 'https://placehold.co/400x400/eeeeee/999999?text=Upload+Profile');
        setSigGlobalLogo(''); // placeholder
      }
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

    if (target === 'sigLogo') {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        if(event.target?.result) {
          try {
            const remoteUrl = await uploadSignatureAsset(event.target.result as string);
            setSigGlobalLogo(remoteUrl);
          } catch(err) {
            console.error("Logo upload failed:", err);
            alert("Failed to upload logo.");
          } finally {
            setUploading(false);
          }
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    if (target === 'sigBanner') setCropAspect(5);
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
      
      let tw = 400;
      let th = 400;
      if (cropTarget === 'sigBanner') { tw = 1200; th = 240; }
      else if (cropTarget === 'sigLogo') { tw = 400; th = 100; }
      else if (cropTarget === 'sigProfile') { tw = 400; th = 400; }

      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
           img, 
           croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 
           0, 0, tw, th
        );
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        
        const remoteUrl = await uploadSignatureAsset(dataUrl);
        
        if (cropTarget === 'avatar') {
          await updateUserAvatar(user.id, remoteUrl);
          setIsSettingsOpen(false);
          window.location.reload(); 
        } else {
           if (cropTarget === 'sigProfile') {
             setSigProfileUrl(remoteUrl);
           } else if (cropTarget === 'sigBanner') {
             setSigGlobalBanner(remoteUrl);
           } else if (cropTarget === 'sigLogo') {
             setSigGlobalLogo(remoteUrl);
           }
        }

        setUploading(false);
        setImageSrc(null);
      }
    };
    img.src = imageSrc;
  };

  const handleCreateNewProfile = () => {
    const newId = Math.random().toString(36).substring(2, 11);
    setActiveProfileId(newId);
    setSigProfileName('New Profile ' + (signatureProfiles.length + 1));
    setSigTitle('');
    setSigLocation('');
    setSigFullName('');
    setSigPhone('');
    setSigEmail('');
    setSigLinkedin('https://linkedin.com/');
    setSigWebsite('https://wovnapparel.com');
    setSigFraming('Top Aligned');
    setSigProfileUrl('');
    // Notice we do NOT clear global banner/logo because they are meant to be global
  };

  const handleSaveSignatureProfile = async () => {
    if (!user) return;
    
    setIsUpdatingDetails(true);
    try {
      const newProfile: SignatureProfile = {
        id: activeProfileId === 'default' ? Math.random().toString(36).substring(2, 11) : activeProfileId,
        name: sigProfileName,
        title: sigTitle,
        location: sigLocation,
        full_name: sigFullName,
        phone: sigPhone,
        email: sigEmail,
        linkedin: sigLinkedin,
        website: sigWebsite,
        framing: sigFraming,
        profile_url: sigProfileUrl,
        global_banner: sigGlobalBanner,
        global_logo: sigGlobalLogo
      };
      
      const filtered = signatureProfiles.filter(p => p.id !== newProfile.id);
      const updatedProfiles = [...filtered, newProfile];
      
      await updateUserSignatureProfiles(user.id, updatedProfiles);
      
      setSignatureProfiles(updatedProfiles);
      setActiveProfileId(newProfile.id);
      
      // Update local context user object to avoid desync on next render cycle
      user.signature_profiles = updatedProfiles;
      
      alert("Signature profile saved globally!");
    } catch (e: any) {
      alert("Error saving signature profile: " + e.message);
    } finally {
      setIsUpdatingDetails(false);
    }
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

  const [baking, setBaking] = useState(false);

  const copySignature = async () => {
    if (!user) return;
    setBaking(true);
    try {
      const bUrl = sigGlobalBanner || 'https://placehold.co/1200x400/eeeeee/999999?text=Upload+Global+Banner';
      const aUrl = sigProfileUrl || 'https://placehold.co/400x400/eeeeee/999999?text=Upload+Profile';

      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 340;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");

      const loadImg = (u: string) => new Promise<HTMLImageElement>((res) => {
        if (!u || u.includes('placehold.co')) {
           const tempC = document.createElement('canvas'); tempC.width=10; tempC.height=10; 
           const tempCtx = tempC.getContext('2d'); if(tempCtx){ tempCtx.fillStyle='#e4e4e7'; tempCtx.fillRect(0,0,10,10); }
           const i = new Image(); i.onload = () => res(i); i.src = tempC.toDataURL();
           return;
        }
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => res(i);
        i.onerror = () => {
           console.warn('Image signature composite fail, bypassing tainted CORS:', u);
           const tempC = document.createElement('canvas'); tempC.width=10; tempC.height=10; 
           const tempCtx = tempC.getContext('2d'); if(tempCtx){ tempCtx.fillStyle='#e4e4e7'; tempCtx.fillRect(0,0,10,10); }
           const fb = new Image(); fb.onload = () => res(fb); fb.src = tempC.toDataURL();
        };
        i.src = u;
      });

      const [bImg, aImg] = await Promise.all([loadImg(bUrl), loadImg(aUrl)]);

      ctx.clearRect(0, 0, 1200, 340);
      ctx.drawImage(bImg, 0, 0, 1200, 240);

      const asize = 252;
      const ax = 110;
      const ay = 74;

      ctx.beginPath();
      ctx.arc(ax + asize/2, ay + asize/2, asize/2 + 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(ax + asize/2, ay + asize/2, asize/2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(aImg, ax, ay, asize, asize);
      ctx.restore();

      const bakedBase64 = canvas.toDataURL('image/png', 1.0);
      const compositeUrl = await uploadSignatureAsset(bakedBase64);

      const html = generateSignatureHTML(compositeUrl);
      const blob = new Blob([html], { type: 'text/html' });
      const clipboardItem = new window.ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([clipboardItem]);
      alert('High-fidelity signature copied to clipboard globally! Open your Gmail or Outlook settings and hit paste to install.');
    } catch(err) {
      console.warn(err);
      // Fallback
      try {
        const html = generateSignatureHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const clipboardItem = new window.ClipboardItem({ 'text/html': blob });
        await navigator.clipboard.write([clipboardItem]);
        alert("Clipboard saved! (Note: Used HTML fallback because Canvas CORS was blocked)");
      } catch (fbErr) {
        alert("Clipboard API failure. Ensure your browser is secure context.");
      }
    } finally {
      setBaking(false);
    }
  };

  const generateSignatureHTML = (bakedCompositeUrl?: string) => {
    if (!user) return '';
    const bannerUrl = sigGlobalBanner || 'https://placehold.co/1200x400/eeeeee/999999?text=Upload+Global+Banner';
    const avatarUrl = sigProfileUrl || 'https://placehold.co/400x400/eeeeee/999999?text=Upload+Profile';


    
    return `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; width: 100%; max-width: 100%;">
  <tr>
    <td style="padding-bottom: 24px;">
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%;">
        <tr>
          <td valign="top">
            ${bakedCompositeUrl ? `
            <img src="${bakedCompositeUrl}" width="100%" style="width: 100%; height: auto; max-width: 100%; display: block; border-radius: 12px 12px 0 0;" alt="Composite Banner" />
            ` : `
            <img src="${bannerUrl}" width="100%" style="width: 100%; height: auto; max-width: 100%; display: block; border-radius: 12px 12px 0 0;" alt="Banner" />
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
               <tr>
                 <td width="48" style="width: 48px;"></td>
                 <td valign="top" style="position: relative;">
                    <div style="margin-top: -93px;">
                       <img src="${avatarUrl}" width="126" height="126" style="width: 126px; height: 126px; border-radius: 50%; border: 3px solid #ffffff; display: block; object-fit: cover; background-color: #ffffff;" alt="${sigFullName}" />
                    </div>
                 </td>
               </tr>
            </table>
            `}
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="48" style="width: 48px;"></td>
          <td valign="top" style="padding-top: 16px;">
            <div style="font-weight: 700; font-size: 28px; color: #000000; margin: 0; padding: 0; letter-spacing: -0.02em; line-height: 1.05;">${sigFullName}</div>
            <div style="font-weight: 300; font-size: 15px; color: #333333; margin: 2px 0 0 0; padding: 0; letter-spacing: -0.01em; line-height: 1.2;">${sigTitle.replace('->', '→')}</div>
            <div style="font-weight: 300; font-size: 15px; color: #999999; margin: 0; padding: 0; letter-spacing: -0.01em; line-height: 1.2;">${sigLocation}</div>
            
            <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 16px; margin-bottom: 24px;">
               <tr>
                 <td style="padding-right: 8px;">
                   <a href="tel:${sigPhone}" style="display:inline-block; text-decoration:none;">
                      <img src="https://firebasestorage.googleapis.com/v0/b/leadership-overview.firebasestorage.app/o/icons%2Fphone.png?alt=media" width="40" height="40" style="width:40px; height:40px; display:block;" alt="Phone" />
                   </a>
                 </td>
                 <td style="padding-right: 8px;">
                   <a href="mailto:${sigEmail}" style="display:inline-block; text-decoration:none;">
                      <img src="https://firebasestorage.googleapis.com/v0/b/leadership-overview.firebasestorage.app/o/icons%2Fchat.png?alt=media" width="40" height="40" style="width:40px; height:40px; display:block;" alt="Chat" />
                   </a>
                 </td>
                 <td style="padding-right: 8px;">
                   <a href="${sigWebsite}" style="display:inline-block; text-decoration:none;">
                      <img src="https://firebasestorage.googleapis.com/v0/b/leadership-overview.firebasestorage.app/o/icons%2Fglobe.png?alt=media" width="40" height="40" style="width:40px; height:40px; display:block;" alt="Web" />
                   </a>
                 </td>
                 <td>
                   <a href="${sigLinkedin}" style="display:inline-block; text-decoration:none;">
                      <img src="https://firebasestorage.googleapis.com/v0/b/leadership-overview.firebasestorage.app/o/icons%2Flinkedin.png?alt=media" width="40" height="40" style="width:40px; height:40px; display:block;" alt="LinkedIn" />
                   </a>
                 </td>
               </tr>
            </table>

            ${sigGlobalLogo ? `<img src="${sigGlobalLogo}" width="160" style="width: 160px; height: auto; max-width: 160px; display:block; margin-bottom:32px;" alt="WOVN" />` : `<div style="font-family: 'Playfair Display', serif; font-size: 40px; font-weight: 900; color: #111111; margin-bottom: 32px; letter-spacing: -0.05em;">WOV/V</div>`}
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="48" style="width: 48px;"></td>
          <td style="padding-bottom: 24px; padding-right: 48px;">
            <div style="font-size: 9px; color: #aaaaaa; margin: 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">CONFIDENTIALITY NOTICE:</div>
            <div style="font-size: 8px; color: #bbbbbb; margin: 4px 0 0 0; line-height: 1.5; font-weight: 400;">The contents of this email message and any attachments are intended solely for the addressee(s) and may contain confidential and/or privileged information and may be legally protected from disclosure. If you are not the intended recipient of this message or their agent, or if this message has been addressed to you in error, please immediately alert the sender by reply email and then delete this message and any attachments. If you are not the intended recipient, you are hereby notified that any use, dissemination, copying, or storage of this message or its attachments is strictly prohibited.</div>
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
                  aspect={cropAspect}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  restrictPosition={false}
                  minZoom={0.1}
                />
              </div>
              <input 
                type="range" 
                value={zoom} 
                min={0.1} 
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
                  <div style={{ padding: '24px', border: '2px dashed var(--color-zinc-200)', borderRadius: '8px', textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {user?.avatar_url && (
                       <img src={user.avatar_url} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '12px', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'relative', zIndex: 5 }} />
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, 'avatar')} 
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                      disabled={uploading}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-900)', position: 'relative', zIndex: 5 }}>
                      {user?.avatar_url ? 'Click or drag to replace photo' : 'Click or Drag a Photo Here'}
                    </span>
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
                           <select 
                             value={activeProfileId}
                             onChange={e => {
                               const p = signatureProfiles.find(x => x.id === e.target.value);
                               if (p) loadSignatureProfile(p, p.id);
                             }}
                             style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }}
                           >
                             {signatureProfiles.length === 0 && <option value="default">Main Signature</option>}
                             {signatureProfiles.map(p => (
                               <option key={p.id} value={p.id}>{p.name}</option>
                             ))}
                           </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                           <button onClick={handleCreateNewProfile} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', background: 'var(--color-zinc-50)', cursor: 'pointer', fontWeight: 600 }}>+</button>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                           <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-zinc-500)', textTransform: 'uppercase' }}>Profile Name</label>
                           <input type="text" value={sigProfileName} onChange={e => setSigProfileName(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-zinc-200)', fontSize: '12px', outline: 'none' }} />
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

                      <button onClick={handleSaveSignatureProfile} disabled={isUpdatingDetails} style={{ background: '#000000', color: 'white', fontWeight: 600, padding: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '12px' }}>
                        Save Signature Profile
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
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-zinc-900)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: baking ? 0.7 : 1 }}
                        disabled={baking}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        {baking ? 'Baking Native Sig...' : 'Copy Signature'}
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
