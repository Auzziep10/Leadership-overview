import { useState } from 'react';
import { Search, Menu, LogOut } from 'lucide-react';
import { auth } from '../services/firebaseConfig';
import { useAuth } from '../services/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from './Modal';
import { updateUserAvatar } from '../services/firestoreService';

export function TopNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const isStaff = user?.role === 'staff';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        // Compress avatar to 120x120 perfectly mapping to aspect ratio
        const size = Math.min(img.width, img.height);
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 120, 120);
          const dataUrl = canvas.toDataURL('image/webp', 0.8);
          await updateUserAvatar(user.id, dataUrl);
          setUploading(false);
          setIsSettingsOpen(false);
          // Optional: Force a window reload or auth context re-sync
          window.location.reload(); 
        }
      };
      if(event.target?.result) img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Menu size={20} cursor="pointer" />
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ cursor: 'pointer', borderBottom: location.pathname === '/' ? '2px solid var(--color-zinc-900)' : 'none', color: location.pathname === '/' ? 'var(--color-zinc-900)' : 'var(--color-zinc-500)' }} onClick={() => navigate('/')}>DASHBOARD</span>
            {user?.role !== 'staff' && (
              <span style={{ cursor: 'pointer', borderBottom: location.pathname === '/team' ? '2px solid var(--color-zinc-900)' : 'none', color: location.pathname === '/team' ? 'var(--color-zinc-900)' : 'var(--color-zinc-500)' }} onClick={() => navigate('/team')}>TEAM / ROLES</span>
            )}
            <span style={{ cursor: 'pointer', color: 'var(--color-zinc-500)' }} onClick={() => setIsSettingsOpen(true)}>SETTINGS</span>
            <span style={{ cursor: 'pointer', color: 'var(--color-zinc-500)' }} onClick={() => auth.signOut()}>LOG OUT</span>
          </div>
          {!isStaff && (
            <button className="auth-button" onClick={() => window.dispatchEvent(new Event('open-create-project'))}>Create Project +</button>
          )}
        </div>
      </header>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Account Settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            {uploading ? (
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-600)' }}>Compressing and Uploading...</span>
            ) : (
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-900)' }}>Click or Drag a Photo Here</span>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
             <button onClick={() => auth.signOut()} style={{ background: 'transparent', border: '1px solid var(--color-zinc-300)', color: 'var(--color-zinc-600)', padding: '6px 16px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
               Sign Out of Account
             </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
