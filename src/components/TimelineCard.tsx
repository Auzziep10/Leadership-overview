import { useState, useEffect } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskUpdate } from '../types';

const SortableTaskWrapper = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 0,
    position: isDragging ? ('relative' as const) : ('static' as const),
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

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
  onEditTask?: (task: any) => void;
  onActionItem?: (task: any) => void;
  onLogUpdateClick?: (taskId: string) => void;
  onReorderTasks?: (tasks: { id: string, order_index: number }[]) => void;
  tasks?: { id: string; title: string, project_id?: string }[];
  projects?: { id: string; title: string, [key: string]: any }[];
  groupByProject?: boolean;
  assignedTasks?: { id: string; title: string; status: string; details?: string; order_index?: number; project_id?: string; }[];
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
  onEditTask,
  onActionItem,
  onLogUpdateClick,
  onReorderTasks,
  projects = [],
  groupByProject = false,
  tasks = [],
  assignedTasks = []
}: TimelineCardProps) {
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [localTasks, setLocalTasks] = useState(assignedTasks || []);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalTasks([...(assignedTasks || [])].sort((a,b) => (a.order_index || 0) - (b.order_index || 0)));
  }, [assignedTasks]);

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id && over?.id) {
       setLocalTasks((items) => {
         const oldIndex = items.findIndex(t => t.id === active.id);
         const newIndex = items.findIndex(t => t.id === over.id);
         const newOrder = arrayMove(items, oldIndex, newIndex);
         if (onReorderTasks) {
           onReorderTasks(newOrder.map((t, idx) => ({ id: t.id, order_index: idx })));
         }
         return newOrder;
       });
    }
  };

  const nodes = updates.slice().sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  const tStart = startDate ? new Date(startDate).getTime() : (nodes.length > 0 ? new Date(nodes[0].created_at).getTime() : Date.now());
  const tEnd = endDate ? new Date(endDate).getTime() : Math.max(Date.now(), nodes.length > 0 ? new Date(nodes[nodes.length-1].created_at).getTime() : 0);
  const timeSpan = Math.max(1, tEnd - tStart);

  const renderTimelineTrack = (trackNodes: TaskUpdate[], calcStart?: number, calcEnd?: number) => {
    const sTime = calcStart || tStart;
    const eTime = calcEnd || tEnd;
    const sSpan = Math.max(1, eTime - sTime);

    return (
      <div className="timeline-track" onClick={(e) => e.stopPropagation()}>
        <div className="timeline-date timeline-date-start">
          {sSpan <= 24 * 60 * 60 * 1000 ? format(new Date(sTime), 'h:mm a') : format(new Date(sTime), 'MMM d, yyyy')}
        </div>
        <div className="timeline-date timeline-date-end">
          {sSpan <= 24 * 60 * 60 * 1000 ? format(new Date(eTime), 'h:mm a') : format(new Date(eTime), 'MMM d, yyyy')}
        </div>

        <div className="timeline-line"></div>
        <div className="timeline-progress" style={{ 
          width: (() => {
            const rawProg = Math.max(0, Math.min(100, ((Date.now() - sTime) / sSpan) * 100));
            return `calc(${rawProg}% - ${rawProg * 0.48}px)`;
          })() 
        }}></div>
        
        <div className="timeline-nodes" style={{ position: 'absolute', left: '24px', right: '24px', top: '50%', height: 0 }}>
          {trackNodes.length === 0 && <div style={{ fontSize: '11px', color: 'var(--color-zinc-400)', background: 'transparent', padding: '0 8px', zIndex: 3, position: 'absolute', top: '0', left: '50%', transform: 'translate(-50%, -50%)' }}>No Updates Yet</div>}
          
          {trackNodes.map((node, i) => {
            const nTime = new Date(node.created_at).getTime();
            let pct = ((nTime - sTime) / sSpan) * 100;
            pct = Math.max(0, Math.min(100, pct)); // clamp
            
            const messages = [...(node.thread || [])];
            if (!node.thread && node.admin_reply) {
              messages.push({ id: 'lgcy1', author_id: node.admin_reply_by || 'admin', message: node.admin_reply, created_at: '' });
              if (node.user_response) {
                messages.push({ id: 'lgcy2', author_id: node.author_id, message: node.user_response, created_at: '' });
              }
            }
            
            const canReply = (currentUser?.role === 'owner' || currentUser?.role === 'admin') || currentUser?.id === node.author_id;

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
                      + Add Message
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
    );
  };

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

      {renderTimelineTrack(nodes)}

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
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {localTasks.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {(() => {
              const renderTask = (task: any, idx: number) => {
                const taskNodes = nodes.filter(n => n.task_id === task.id);
                return (
                  <div 
                    key={task.id} 
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <div 
                    onClick={() => toggleTask(task.id)}
                    title={task.details || 'Click to view log iterations'}
                    className="task-header"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-zinc-100)', paddingBottom: '8px', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-zinc-900)' }}>
                      {task.title}
                      <span style={{ color: 'var(--color-zinc-400)', fontSize: '14px', marginLeft: '6px', display: 'inline-block', transform: expandedTasks[task.id] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                    </div>
                    <div className="task-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {onActionItem && (currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                        <div 
                          onClick={(e) => { e.stopPropagation(); onActionItem(task); }} 
                          style={{ fontSize: '10px', fontWeight: 700, color: 'white', background: 'var(--color-zinc-900)', padding: '6px 14px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'background 0.2s' }}
                        >
                          + Action Item
                        </div>
                      )}
                      {onEditTask && (
                        <div 
                          onClick={(e) => { e.stopPropagation(); onEditTask(task); }} 
                          style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-zinc-600)', background: 'white', border: '1px solid var(--color-zinc-200)', padding: '5px 14px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          Edit
                        </div>
                      )}
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-zinc-500)', background: 'var(--color-zinc-100)', padding: '6px 14px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{task.status}</div>
                    </div>
                  </div>
                  
                  {expandedTasks[task.id] && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                      {taskNodes.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--color-zinc-400)', fontStyle: 'italic', textAlign: 'center', padding: '16px', background: 'white', borderRadius: '8px', border: '1px dashed var(--color-zinc-200)' }}>No timeline updates logged.</div>
                      ) : (
                        taskNodes.map(n => {
                        const authorName = users.find(u => u.id === n.author_id)?.name || (currentUser?.id === n.author_id ? currentUser.name : n.author_id);
                        const messages = [...(n.thread || [])];
                        if (!n.thread && n.admin_reply) {
                          messages.push({ id: 'lgcy1', author_id: n.admin_reply_by || 'admin', message: n.admin_reply, created_at: '' });
                          if (n.user_response) {
                            messages.push({ id: 'lgcy2', author_id: n.author_id, message: n.user_response, created_at: '' });
                          }
                        }
                        const canReply = (currentUser?.role === 'owner' || currentUser?.role === 'admin') || currentUser?.id === n.author_id;

                        return (
                          <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', padding: '16px', border: n.is_action_item ? '1px solid var(--color-zinc-300)' : '1px solid var(--color-zinc-200)', borderRadius: '12px', boxShadow: '0 2px 4px -2px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ fontSize: '10px', color: n.is_action_item ? 'var(--color-red-600)' : 'var(--color-zinc-500)', textTransform: 'uppercase', fontWeight: n.is_action_item ? 800 : 600, letterSpacing: '0.05em', background: n.is_action_item ? 'var(--color-red-50)' : 'var(--color-zinc-100)', padding: '4px 8px', borderRadius: '4px' }}>
                                {n.is_action_item ? `🚨 ACTION ITEM BY ${authorName}` : `Logged by ${authorName}`}
                              </div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-zinc-400)' }}>
                                {format(new Date(n.created_at), 'MMM d, yyyy - h:mm a')}
                              </div>
                            </div>
                            
                            <div style={{ fontSize: '13px', color: 'var(--color-zinc-900)', fontWeight: n.is_action_item ? 500 : 400, marginTop: '4px', lineHeight: '1.5' }}>
                              {n.note}
                            </div>
                              
                              {messages.length > 0 && (
                                <div style={{ marginTop: '8px', padding: '12px', background: 'var(--color-zinc-50)', borderRadius: '8px', borderLeft: `3px solid ${color}` }}>
                                  {messages.map((msg, idx) => {
                                    const mAuthorObj = users.find(u => u.id === msg.author_id);
                                    const mAuthorName = mAuthorObj?.name || (currentUser?.id === msg.author_id ? currentUser.name : 'Manager');
                                    return (
                                      <div key={msg.id} style={{ marginTop: idx > 0 ? '12px' : '0', paddingTop: idx > 0 ? '12px' : '0', borderTop: idx > 0 ? '1px solid var(--color-zinc-200)' : 'none', fontSize: '12px', color: 'var(--color-zinc-700)', lineHeight: '1.5' }}>
                                        <strong style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px', color: msg.author_id === n.author_id ? 'var(--color-zinc-500)' : color, letterSpacing: '0.05em' }}>
                                          {mAuthorName} Replied:
                                        </strong>
                                        {msg.message}
                                      </div>
                                    );
                                  })}

                                  {onReplyClick && canReply && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                      <button onClick={() => onReplyClick(n.id)} style={{ fontSize: '11px', fontWeight: 600, color: 'white', background: color, border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '6px 14px', transition: 'all 0.2s', opacity: 0.9 }}>
                                        + Add Reply
                                      </button>
                                      {n.is_action_item && onLogUpdateClick && (
                                        <button onClick={() => onLogUpdateClick(task.id)} style={{ fontSize: '11px', fontWeight: 600, color: color, background: 'transparent', border: `1px solid ${color}`, borderRadius: '6px', cursor: 'pointer', padding: '5px 14px', transition: 'all 0.2s', opacity: 0.9 }}>
                                          + Add Log to Action Item
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              {onReplyClick && canReply && messages.length === 0 && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                  <button onClick={() => onReplyClick(n.id)} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-zinc-500)', background: 'var(--color-zinc-50)', border: '1px solid var(--color-zinc-200)', borderRadius: '6px', cursor: 'pointer', padding: '6px 12px', transition: 'all 0.2s' }}>
                                    + Add Thread Message
                                  </button>
                                  {n.is_action_item && onLogUpdateClick && (
                                    <button onClick={() => onLogUpdateClick(task.id)} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-zinc-600)', background: 'transparent', border: '1px solid var(--color-zinc-300)', borderRadius: '6px', cursor: 'pointer', padding: '6px 12px', transition: 'all 0.2s' }}>
                                      + Add Log to Action Item
                                    </button>
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      })
                      )}
                      {onLogUpdateClick && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onLogUpdateClick(task.id); }}
                          style={{ width: '100%', fontSize: '12px', fontWeight: 700, color: 'var(--color-zinc-500)', background: 'transparent', border: '2px dashed var(--color-zinc-300)', padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-zinc-400)'; e.currentTarget.style.color = 'var(--color-zinc-700)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-zinc-300)'; e.currentTarget.style.color = 'var(--color-zinc-500)'; }}
                        >
                          + Log Timeline Update
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
              };

              if (groupByProject && projects && projects.length > 0) {
                const grouped = localTasks.reduce((acc, t) => {
                  const pid = t.project_id || 'unassigned';
                  if (!acc[pid]) acc[pid] = [];
                  acc[pid].push(t);
                  return acc;
                }, {} as Record<string, typeof localTasks>);
                
                return Object.entries(grouped).map(([pid, pTasks]) => {
                  const pObj = projects.find(p => p.id === pid);
                  const pName = pObj?.title || 'Standalone Tasks';

                  const pStart = pObj?.created_at ? new Date(pObj.created_at).getTime() : tStart;
                  const pEnd = pObj?.end_date ? new Date(pObj.end_date).getTime() : tEnd;

                  return (
                    <div key={pid} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-zinc-50)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-zinc-200)' }}>
                      <div 
                        onClick={() => setExpandedProjects(prev => ({ ...prev, [pid]: !prev[pid] }))}
                        className="project-group-header"
                      >
                        <div className="project-group-title">
                          PROJECT: {pName}
                        </div>
                        
                        {renderTimelineTrack(updates.filter(u => pTasks.some(t => t.id === u.task_id)).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), pStart, pEnd)}
                        
                        <span className="project-group-chevron" style={{ transform: expandedProjects[pid] ? 'rotate(90deg)' : 'none' }}>›</span>
                      </div>
                      {expandedProjects[pid] && (
                        <SortableContext items={pTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '8px' }}>
                            {pTasks.map(t => <SortableTaskWrapper key={t.id} id={t.id}>{renderTask(t, -1)}</SortableTaskWrapper>)}
                          </div>
                        </SortableContext>
                      )}
                    </div>
                  );
                });
              }

              return (
                <SortableContext items={localTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {localTasks.map((task, idx) => <SortableTaskWrapper key={task.id} id={task.id}>{renderTask(task, idx)}</SortableTaskWrapper>)}
                  </div>
                </SortableContext>
              );
            })()}
            </DndContext>
          ) : (
            <>
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
                  const canReply = (currentUser?.role === 'owner' || currentUser?.role === 'admin') || currentUser?.id === n.author_id;

                  return (
                    <div key={n.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ width: '130px', flexShrink: 0, fontSize: '11px', fontWeight: 600, color: 'var(--color-zinc-400)' }}>
                        {format(new Date(n.created_at), 'MMM d, yyyy - h:mm a')}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
