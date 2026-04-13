import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import type { TaskUpdate } from '../types';

interface TimelineCardProps {
  title: string;
  subtitle: string;
  initials: string;
  avatarUrl?: string;
  color?: string;
  updates: TaskUpdate[];
  onAction1?: () => void;
  onAction2?: () => void;
  action1Label?: string;
  action2Label?: string;
  startDate?: string;
  endDate?: string;
  users?: { id: string; name: string }[];
  currentUser?: { id: string; name: string; role?: string } | null;
  onReplyClick?: (updateId: string) => void;
  onEditDates?: () => void;
  tasks?: { id: string; title: string }[];
}

export function TimelineCard({
  title,
  subtitle,
  initials,
  avatarUrl,
  color = '#f43f5e',
  updates,
  onAction1,
  onAction2,
  action1Label = 'View Tasks',
  action2Label = 'Message',
  startDate,
  endDate,
  users = [],
  currentUser,
  onReplyClick,
  onEditDates,
  tasks = []
}: TimelineCardProps) {
  
  const [isExpanded, setIsExpanded] = useState(false);

  const nodes = updates.slice().sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  const tStart = startDate ? new Date(startDate).getTime() : (nodes.length > 0 ? new Date(nodes[0].created_at).getTime() : Date.now());
  const tEnd = endDate ? new Date(endDate).getTime() : Math.max(Date.now(), nodes.length > 0 ? new Date(nodes[nodes.length-1].created_at).getTime() : 0);
  const timeSpan = Math.max(1, tEnd - tStart);

  return (
    <div className="card-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <div className="card-left" style={{ cursor: 'pointer' }} onClick={() => setIsExpanded(!isExpanded)}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${color}, #fca5a5)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '32px',
            fontWeight: 800,
            fontFamily: 'var(--font-serif)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {avatarUrl ? (
               <img src={avatarUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
               initials
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="card-title">
              {title} <span style={{ color: 'var(--color-zinc-400)', fontSize: '14px', marginLeft: '4px', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
            </div>
            <div className="card-subtitle">{subtitle}</div>
          </div>
        </div>

      <div className="timeline-track">
        <div className="timeline-date timeline-date-start">
          {timeSpan <= 24 * 60 * 60 * 1000 ? format(new Date(tStart), 'h:mm a') : format(new Date(tStart), 'MMM d, yyyy')}
        </div>
        <div className="timeline-date timeline-date-end">
          {timeSpan <= 24 * 60 * 60 * 1000 ? format(new Date(tEnd), 'h:mm a') : format(new Date(tEnd), 'MMM d, yyyy')}
        </div>

        <div className="timeline-line"></div>
        <div className="timeline-progress" style={{ width: nodes.length > 0 ? 'calc(100% - 48px)' : '0%' }}></div>
        
        <div className="timeline-nodes" style={{ position: 'absolute', left: '24px', right: '24px', top: '50%', height: 0 }}>
          {nodes.length === 0 && <div style={{ fontSize: '11px', color: 'var(--color-zinc-400)', background: 'white', padding: '0 8px', zIndex: 3, position: 'absolute', top: '0', left: '50%', transform: 'translate(-50%, -50%)' }}>No Updates Yet</div>}
          
          {nodes.map((node, i) => {
            const nTime = new Date(node.created_at).getTime();
            let pct = ((nTime - tStart) / timeSpan) * 100;
            pct = Math.max(0, Math.min(100, pct)); // clamp
            
            const messages = [...(node.thread || [])];
            if (!node.thread && node.admin_reply) {
              messages.push({ id: 'lgcy1', author_id: node.admin_reply_by || 'admin', message: node.admin_reply, created_at: '' });
              if (node.user_response) {
                messages.push({ id: 'lgcy2', author_id: node.author_id, message: node.user_response, created_at: '' });
              }
            }
            
            const canReply = currentUser?.role !== 'staff' || currentUser?.id === node.author_id;

            return (
              <div key={node.id} className="timeline-node-wrapper" style={{ position: 'absolute', left: `${pct}%`, top: '0', transform: 'translate(-50%, -50%)' }}>
                <div 
                  className="timeline-node" 
                  style={{ 
                    background: color,
                    borderColor: 'white'
                  }}
                />
                
                {/* Tooltip on hover */}
                <div className="timeline-tooltip">
                  <div style={{ fontWeight: 600, color: 'var(--color-zinc-900)', marginBottom: '4px' }}>
                     {tasks?.find(t => t.id === node.task_id)?.title || `Task Update ${i+1}`}
                  </div>
                  <div style={{ color: 'var(--color-zinc-500)', lineHeight: '1.4' }}>
                    {node.note}
                  </div>
                  <div style={{ fontSize: '9px', marginTop: '6px', color: 'var(--color-zinc-400)', textTransform: 'uppercase' }}>
                    {format(new Date(node.created_at), 'MM/dd/yyyy h:mm a')}
                  </div>
                  {onReplyClick && canReply && messages.length === 0 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onReplyClick(node.id); }} 
                      style={{ marginTop: '8px', padding: '4px', fontSize: '9px', fontWeight: 600, color: 'var(--color-zinc-600)', background: 'var(--color-zinc-50)', border: '1px solid var(--color-zinc-200)', borderRadius: '4px', cursor: 'pointer', width: '100%', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-zinc-100)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-zinc-50)'}
                    >
                      + Add Messaage
                    </button>
                  )}
                  {messages.length > 0 && (
                    <div style={{ marginTop: '8px', padding: '6px', fontSize: '9px', color: 'var(--color-zinc-700)', background: 'var(--color-zinc-50)', border: '1px solid var(--color-zinc-200)', borderRadius: '4px', textAlign: 'left', lineHeight: '1.3' }}>
                      {messages.map((msg, idx) => {
                        const mAuthorObj = users.find(u => u.id === msg.author_id);
                        const mAuthorName = mAuthorObj?.name || (currentUser?.id === msg.author_id ? currentUser.name : 'Manager');
                        return (
                          <div key={msg.id} style={{ marginTop: idx > 0 ? '6px' : '0', paddingTop: idx > 0 ? '6px' : '0', borderTop: idx > 0 ? '1px solid var(--color-zinc-200)' : 'none' }}>
                            <strong style={{ color: msg.author_id === node.author_id ? 'var(--color-zinc-600)' : color, display: 'block', marginBottom: '2px' }}>{mAuthorName} Replied:</strong> {msg.message}
                          </div>
                        );
                      })}
                      
                      {onReplyClick && canReply && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onReplyClick(node.id); }} 
                          style={{ marginTop: '6px', padding: '4px', fontSize: '9px', fontWeight: 600, color: 'white', background: color, border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
                        >
                          + Reply Thread
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-right">
        {action1Label && (
          <button className="pill-button" onClick={onAction1} style={{ width: '100%', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{action1Label}</span>
          </button>
        )}
        
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          {onEditDates && (
            <button className="pill-button" onClick={onEditDates} style={{ flex: 1, justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>Edit Dates</span>
            </button>
          )}

          {action2Label && (
            <button className="pill-button" onClick={action2Label.includes('Tasks') ? () => setIsExpanded(!isExpanded) : onAction2} style={{ flex: 1, justifyContent: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{action2Label}</span>
              {action2Label.includes('Tasks') ? (
                 <ChevronDown size={14} color="var(--color-zinc-500)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'all 0.2s' }} />
              ) : (
                 <Download size={14} color="var(--color-zinc-500)" />
              )}
            </button>
          )}
        </div>
      </div>
      </div>
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateRows: isExpanded ? '1fr' : '0fr', 
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          marginTop: isExpanded ? '24px' : '0',
          paddingTop: isExpanded ? '24px' : '0',
          borderTop: '1px solid',
          borderColor: isExpanded ? 'var(--color-zinc-100)' : 'transparent',
          opacity: isExpanded ? 1 : 0,
          visibility: isExpanded ? 'visible' : 'hidden'
        }}
      >
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-zinc-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Timeline Logs</div>
          {nodes.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--color-zinc-500)' }}>No logged updates yet.</div>
          ) : (
            nodes.map(n => {
              const authorName = users.find(u => u.id === n.author_id)?.name || (currentUser?.id === n.author_id ? currentUser.name : n.author_id);
              
              const messages = [...(n.thread || [])];
              if (!n.thread && n.admin_reply) {
                messages.push({ id: 'lgcy1', author_id: n.admin_reply_by || 'admin', message: n.admin_reply, created_at: '' });
                if (n.user_response) {
                  messages.push({ id: 'lgcy2', author_id: n.author_id, message: n.user_response, created_at: '' });
                }
              }
              const canReply = currentUser?.role !== 'staff' || currentUser?.id === n.author_id;

              return (
                <div key={n.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '130px', flexShrink: 0, fontSize: '11px', fontWeight: 600, color: 'var(--color-zinc-400)' }}>
                    {format(new Date(n.created_at), 'MMM d, yyyy - h:mm a')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--color-zinc-900)' }}>{n.note}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-zinc-500)', textTransform: 'uppercase' }}>Logged by {authorName}</div>
                    
                    {messages.length > 0 && (
                      <div style={{ marginTop: '6px', padding: '8px 12px', background: 'white', borderRadius: '6px', borderLeft: `2px solid ${color}`, fontSize: '12px', color: 'var(--color-zinc-700)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        {messages.map((msg, idx) => {
                          const mAuthorObj = users.find(u => u.id === msg.author_id);
                          const mAuthorName = mAuthorObj?.name || (currentUser?.id === msg.author_id ? currentUser.name : 'Manager');
                          return (
                            <div key={msg.id} style={{ marginTop: idx > 0 ? '8px' : '0', paddingTop: idx > 0 ? '8px' : '0', borderTop: idx > 0 ? '1px solid var(--color-zinc-100)' : 'none', fontSize: '11px', color: 'var(--color-zinc-600)' }}>
                              <strong style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px', color: msg.author_id === n.author_id ? 'var(--color-zinc-400)' : color, letterSpacing: '0.05em' }}>
                                {mAuthorName} Replied:
                              </strong>
                              {msg.message}
                            </div>
                          );
                        })}

                        {onReplyClick && canReply && (
                          <button onClick={() => onReplyClick(n.id)} style={{ alignSelf: 'flex-start', marginTop: '8px', fontSize: '10px', fontWeight: 600, color: 'white', background: color, border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px 10px', transition: 'all 0.2s', opacity: 0.9 }}>
                            + Add Reply
                          </button>
                        )}
                      </div>
                    )}
                    {onReplyClick && canReply && messages.length === 0 && (
                      <button onClick={() => onReplyClick(n.id)} style={{ alignSelf: 'flex-start', marginTop: '6px', fontSize: '10px', fontWeight: 600, color: 'var(--color-zinc-400)', background: 'var(--color-zinc-50)', border: '1px solid var(--color-zinc-200)', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', transition: 'all 0.2s' }}>
                        + Add Thread Message
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
