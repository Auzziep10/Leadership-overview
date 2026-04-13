import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(0,0,0,0.4)', 
      backdropFilter: 'blur(4px)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 50, 
      padding: '20px' 
    }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '24px', 
        width: '100%', 
        maxWidth: '500px', 
        padding: '32px', 
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: 'var(--color-zinc-900)', margin: 0 }}>{title}</h2>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'var(--color-zinc-100)', 
              border: 'none', 
              width: '32px', 
              height: '32px', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              color: 'var(--color-zinc-600)',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
