import React, { useState } from 'react';
import type { Project, Task, User, TaskUpdate } from '../types';

interface MobileHubProps {
  projects: Project[];
  tasks: Task[];
  updates: TaskUpdate[];
  users: User[];
  currentUser: User | null;
}

export function MobileHub({ projects, tasks, updates, users, currentUser }: MobileHubProps) {
  const [expandedProj, setExpandedProj] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const activeProjects = projects.filter(p => p.status === 'active');
  const leadProjects = projects.filter(p => p.status === 'lead');

  return (
    <div style={{ paddingBottom: '120px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
         <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--color-zinc-900)' }}>Active Pipelines</div>
         {activeProjects.length === 0 && <div style={{ fontSize: '14px', color: 'var(--color-zinc-500)' }}>No active projects.</div>}
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeProjects.map(proj => {
              const pTasks = tasks.filter(t => t.project_id === proj.id && t.status !== 'archived').sort((a,b) => (a.order_index || 0) - (b.order_index || 0));
              const isEx = expandedProj === proj.id;
              
              return (
                <div key={proj.id} style={{ background: 'white', border: '3px solid', borderColor: isEx ? 'var(--color-zinc-900)' : 'var(--color-zinc-200)', borderRadius: '20px', overflow: 'hidden', transition: 'all 0.2s', boxShadow: isEx ? '0 12px 32px -8px rgba(0,0,0,0.15)' : '0 4px 12px -4px rgba(0,0,0,0.05)' }}>
                  <div 
                    onClick={() => setExpandedProj(isEx ? null : proj.id)}
                    style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isEx ? 'var(--color-zinc-900)' : 'white', color: isEx ? 'white' : 'var(--color-zinc-900)' }}
                  >
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <span style={{ fontSize: '20px', fontWeight: 800 }}>{proj.title}</span>
                       <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{pTasks.length} Active Tasks</span>
                     </div>
                     <span style={{ fontSize: '28px', transition: 'transform 0.2s', transform: isEx ? 'rotate(90deg)' : 'none', fontWeight: 300 }}>›</span>
                  </div>
                  
                  {isEx && (
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--color-zinc-50)' }}>
                       {pTasks.length === 0 ? (
                         <div style={{ fontSize: '14px', color: 'var(--color-zinc-500)', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>No active tasks. Tap the Quick Action + button below!</div>
                       ) : (
                         pTasks.map(task => {
                           const taskUpdates = updates.filter(u => u.task_id === task.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                           const topUpdate = taskUpdates[0];
                           const assignedUsers = users.filter(u => task.assignees?.includes(u.id));
                           
                           return (
                             <div 
                               key={task.id} 
                               onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                               style={{ background: 'white', border: '2px solid var(--color-zinc-200)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: expandedTask === task.id ? '0 8px 24px -8px rgba(0,0,0,0.15)' : 'none' }}
                             >
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                 <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-zinc-900)' }}>{task.title}</span>
                                 <span style={{ fontSize: '11px', fontWeight: 800, padding: '6px 10px', borderRadius: '6px', background: task.status === 'done' ? '#22c55e' : 'var(--color-zinc-200)', color: task.status === 'done' ? 'white' : 'var(--color-zinc-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                   {task.status}
                                 </span>
                               </div>
                               
                               {assignedUsers.length > 0 && (
                                 <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                   {assignedUsers.map(u => (
                                      <div key={u.id} style={{ padding: '6px 12px', background: 'var(--color-zinc-900)', color: 'white', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
                                        {u.name.split(' ')[0]}
                                      </div>
                                   ))}
                                 </div>
                               )}
                               
                               {expandedTask === task.id ? (
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px', borderTop: '1px solid var(--color-zinc-100)', paddingTop: '16px' }}>
                                   <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-zinc-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>All Timeline Updates</div>
                                   {taskUpdates.length === 0 ? (
                                      <div style={{ fontSize: '13px', color: 'var(--color-zinc-500)', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>No updates logged.</div>
                                   ) : taskUpdates.map(upd => {
                                      const uAuthor = users.find(u => u.id === upd.author_id);
                                      return (
                                        <div key={upd.id} style={{ background: upd.is_action_item ? 'var(--color-red-50)' : 'var(--color-zinc-50)', padding: '16px', borderRadius: '12px', border: upd.is_action_item ? '2px solid var(--color-red-200)' : '1px solid var(--color-zinc-200)' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 800, color: upd.is_action_item ? 'var(--color-red-600)' : 'var(--color-zinc-600)', textTransform: 'uppercase' }}>
                                              {uAuthor?.name || 'System'} {upd.is_action_item && '🚨 DIRECTIVE'}
                                            </span>
                                            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-zinc-400)' }}>
                                              {new Date(upd.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          </div>
                                          <div style={{ fontSize: '14px', color: 'var(--color-zinc-900)', lineHeight: '1.4', fontWeight: 500 }}>{upd.note}</div>
                                        </div>
                                      );
                                   })}
                                 </div>
                               ) : (
                                 topUpdate && (
                                   <div style={{ background: topUpdate.is_action_item ? 'var(--color-red-50)' : 'var(--color-zinc-50)', padding: '16px', borderRadius: '12px', border: topUpdate.is_action_item ? '2px solid var(--color-red-200)' : '2px solid var(--color-zinc-200)' }}>
                                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: topUpdate.is_action_item ? 'var(--color-red-600)' : 'var(--color-zinc-500)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                        {topUpdate.is_action_item ? '🚨 Action Item Directive' : 'Latest Timeline Update'}
                                      </div>
                                      <div style={{ fontSize: '15px', color: 'var(--color-zinc-900)', lineHeight: '1.5', fontWeight: 500 }}>{topUpdate.note}</div>
                                   </div>
                                 )
                               )}
                             </div>
                           );
                         })
                       )}
                    </div>
                  )}
                </div>
              );
            })}
         </div>
      </div>
      
      {leadProjects.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
           <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--color-zinc-900)' }}>Leads & Prospects</div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {leadProjects.map(proj => (
                <div key={proj.id} style={{ background: 'white', border: '2px solid var(--color-zinc-200)', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                   <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-zinc-900)' }}>{proj.title} • {proj.customer_company || 'Independent'}</div>
                   <div style={{ fontSize: '14px', color: 'var(--color-zinc-500)', fontWeight: 500 }}>{proj.customer_email || 'No email provided'}</div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Adding a highly visible area for Global Feed on Mobile */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
         <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--color-zinc-900)' }}>Global Pulse Feed</div>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-zinc-50)', padding: '20px', borderRadius: '20px', border: '2px solid var(--color-zinc-200)' }}>
            {updates.slice().sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8).map(upd => {
              const author = users.find(u => u.id === upd.author_id);
              const task = tasks.find(t => t.id === upd.task_id);
              const proj = projects.find(p => p.id === task?.project_id);
              return (
                <div key={upd.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid var(--color-zinc-200)', marginBottom: '4px' }}>
                   <div style={{ flex: '0 0 40px', height: '40px', borderRadius: '12px', background: upd.is_action_item ? 'var(--color-red-600)' : 'var(--color-zinc-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>
                     {author?.initials || '?'}
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-zinc-900)' }}>{author?.name || 'User'}</div>
                       <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-zinc-400)' }}>{new Date(upd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                     </div>
                     <div style={{ fontSize: '12px', fontWeight: 700, color: upd.is_action_item ? 'var(--color-red-500)' : 'var(--color-zinc-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{proj?.title} › {task?.title}</div>
                     <div style={{ fontSize: '14px', color: 'var(--color-zinc-800)', marginTop: '4px', fontWeight: 500, lineHeight: '1.4' }}>{upd.note}</div>
                   </div>
                </div>
              );
            })}
         </div>
      </div>
    </div>
  );
}
