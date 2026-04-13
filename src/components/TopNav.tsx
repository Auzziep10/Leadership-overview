import React from 'react';
import { Search, Menu, LogOut } from 'lucide-react';
import { auth } from '../services/firebaseConfig';
import { useAuth } from '../services/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export function TopNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isStaff = user?.role === 'staff';
  
  return (
    <>
      <div className="top-banner">
        <span>&#9432;</span>
        ADMIN VIEW: YOU ARE CURRENTLY VIEWING THE PORTAL AS {user?.role?.toUpperCase() || 'STAFF'} {user?.name?.toUpperCase()}
      </div>
      <header className="header-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <img src="/C-Logo@300x.png" alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />
          <div className="search-bar">
            <Search size={14} color="var(--color-zinc-400)" />
            <input type="text" placeholder="Search tasks, staff, projects..." />
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
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
    </>
  );
}
