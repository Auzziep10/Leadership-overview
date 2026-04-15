import React, { useState, useEffect } from 'react';
import type { User, Project } from '../types';

interface MobileQuickAddProps {
  users: User[];
  projects: Project[];
  currentUser: any;
  onCreateProject: (title: string, desc: string, endDate: string) => Promise<void>;
  onCreateTask: (projectId: string, title: string, assignees: string[], actionItem: string) => Promise<void>;
}

export function MobileQuickAdd({ users, projects, currentUser, onCreateProject, onCreateTask }: MobileQuickAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'project' | 'task' | null>(null);
  
  // Project Form
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  
  // Task Form
  const [taskProjId, setTaskProjId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);
  const [taskActionItem, setTaskActionItem] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setMode('menu');
      setProjTitle(''); setProjDesc('');
      setTaskProjId(''); setTaskTitle(''); setTaskAssignees([]); setTaskActionItem('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) return null;

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreateProject(projTitle, projDesc, '');
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreateTask(taskProjId, taskTitle, taskAssignees, taskActionItem);
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '64px',
          height: '64px',
          borderRadius: '32px',
          background: 'var(--color-zinc-900)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        +
      </button>

      {/* Full Screen Overlay / Bottom Sheet */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.2s forwards'
        }}>
          <div style={{ flex: 1 }} onClick={() => setIsOpen(false)} />
          
          <div style={{
            background: 'white',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-zinc-900)' }}>
                {mode === 'menu' ? 'Quick Actions' : mode === 'project' ? 'New Project' : 'New Task & Directive'}
              </div>
              <button 
                onClick={() => mode === 'menu' ? setIsOpen(false) : setMode('menu')}
                style={{ background: 'var(--color-zinc-100)', border: 'none', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, cursor: 'pointer' }}
              >
                {mode === 'menu' ? 'X' : '←'}
              </button>
            </div>

            {mode === 'menu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button 
                  onClick={() => setMode('task')}
                  style={{ padding: '24px', background: 'var(--color-zinc-900)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: 700, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                >
                  <span>📝 Create Task & Directive</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.8 }}>Instantly assign a task and action item</span>
                </button>
                <button 
                  onClick={() => setMode('project')}
                  style={{ padding: '24px', background: 'white', color: 'var(--color-zinc-900)', border: '2px solid var(--color-zinc-200)', borderRadius: '16px', fontSize: '18px', fontWeight: 700, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                >
                  <span>📁 Create New Project</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-zinc-500)' }}>Start a new project pipeline</span>
                </button>
              </div>
            )}

            {mode === 'project' && (
              <form onSubmit={handleSubmitProject} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <input 
                  type="text" 
                  placeholder="Project Name" 
                  value={projTitle} 
                  onChange={e => setProjTitle(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '16px', fontSize: '16px', border: '2px solid var(--color-zinc-200)', borderRadius: '12px', outline: 'none' }} 
                  autoFocus
                />
                <textarea 
                  placeholder="Brief Description (Optional)" 
                  value={projDesc} 
                  onChange={e => setProjDesc(e.target.value)} 
                  style={{ width: '100%', padding: '16px', fontSize: '16px', border: '2px solid var(--color-zinc-200)', borderRadius: '12px', outline: 'none', resize: 'vertical', minHeight: '100px' }} 
                />
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  style={{ padding: '16px', background: isSubmitting ? 'var(--color-zinc-400)' : 'var(--color-zinc-900)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, marginTop: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? 'Creating...' : 'Launch Project'}
                </button>
              </form>
            )}

            {mode === 'task' && (
              <form onSubmit={handleSubmitTask} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-zinc-500)', textTransform: 'uppercase' }}>1. Select Project</label>
                  <select 
                    value={taskProjId} 
                    onChange={e => setTaskProjId(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '16px', fontSize: '16px', border: '2px solid var(--color-zinc-200)', borderRadius: '12px', outline: 'none', background: 'white' }}
                  >
                    <option value="" disabled>Choose a Project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-zinc-500)', textTransform: 'uppercase' }}>2. Task Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Gather Files, Design V1" 
                    value={taskTitle} 
                    onChange={e => setTaskTitle(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '16px', fontSize: '16px', border: '2px solid var(--color-zinc-200)', borderRadius: '12px', outline: 'none' }} 
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-zinc-500)', textTransform: 'uppercase' }}>3. Tap to Assign</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {users.map(u => {
                      const isSelected = taskAssignees.includes(u.id);
                      return (
                        <div 
                          key={u.id}
                          onClick={() => setTaskAssignees(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                          style={{ 
                            padding: '12px 16px', 
                            borderRadius: '12px', 
                            border: isSelected ? '2px solid var(--color-zinc-900)' : '2px solid var(--color-zinc-200)',
                            background: isSelected ? 'var(--color-zinc-900)' : 'white',
                            color: isSelected ? 'white' : 'var(--color-zinc-600)',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            userSelect: 'none',
                            flexGrow: 1,
                            justifyContent: 'center'
                          }}
                        >
                          <span>{isSelected ? '✓' : '+'}</span>
                          <span>{u.name.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-red-600)', textTransform: 'uppercase' }}>4. Action Item / Directive</label>
                  <textarea 
                    placeholder="Provide explicit instructions..." 
                    value={taskActionItem} 
                    onChange={e => setTaskActionItem(e.target.value)} 
                    style={{ width: '100%', padding: '16px', fontSize: '16px', border: '2px solid var(--color-red-200)', background: 'var(--color-red-50)', borderRadius: '12px', outline: 'none', resize: 'vertical', minHeight: '100px' }} 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  style={{ padding: '16px', background: isSubmitting ? 'var(--color-zinc-400)' : 'var(--color-zinc-900)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, marginTop: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? 'Deploying...' : 'Deploy Task'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
