import React, { useState, useEffect } from 'react';
import { TimelineCard } from '../components/TimelineCard';
import { Modal } from '../components/Modal';
import type { TaskUpdate, User, Project, Task } from '../types';
import { fetchUsers, fetchProjects, fetchTasks, fetchTaskUpdates, createProject, createTask, addTaskUpdate, updateProject, addThreadMessage, createCustomerLead } from '../services/firestoreService';
import { useAuth } from '../services/AuthContext';

export function Dashboard() {
  const { user: currentUser } = useAuth();
  const [view, setView] = useState<'team' | 'projects' | 'leads'>('team');
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalType, setModalType] = useState<'project' | 'task' | 'update' | 'tasks-list' | 'edit-project' | 'reply-update' | 'lead' | 'lead-note' | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activeUserId, setActiveUserId] = useState<string>('');
  const [tasksListSubject, setTasksListSubject] = useState<string>('');
  const [tasksListItems, setTasksListItems] = useState<Task[]>([]);
  const [activeUpdateId, setActiveUpdateId] = useState<string>('');
  const [activeTaskId, setActiveTaskId] = useState<string>('');
  
  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formAssigneeIds, setFormAssigneeIds] = useState<string[]>([]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formTaskId, setFormTaskId] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formReply, setFormReply] = useState('');
  const [formTaskStatus, setFormTaskStatus] = useState('');
  
  const [formLeadName, setFormLeadName] = useState('');
  const [formLeadCompany, setFormLeadCompany] = useState('');
  const [formLeadEmail, setFormLeadEmail] = useState('');

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      let [u, p, t] = await Promise.all([fetchUsers(), fetchProjects(), fetchTasks()]);
      
      const isStaff = currentUser?.role === 'staff';
      if (isStaff && currentUser) {
        // Staff filter: Only see themselves and tasks/projects they are strictly assigned to
        u = u.filter(user => user.id === currentUser.id);
        t = t.filter(task => task.assignees?.includes(currentUser.id));
        p = p.filter(proj => t.some(task => task.project_id === proj.id));
      }

      setUsers(u);
      setProjects(p);
      setTasks(t);
      
      // Fetch updates for all active tasks
      const allUpdates: TaskUpdate[] = [];
      for (const task of t) {
        const tUpdates = await fetchTaskUpdates(task.id);
        allUpdates.push(...tUpdates);
      }
      setUpdates(allUpdates);

      // Notification calculation
      if (currentUser) {
        const lastSeen = currentUser.last_seen_notifications || '2000-01-01T00:00:00Z';
        let unreadCount = 0;
        
        t.forEach(task => { // New task assigned
          if (task.assignees?.includes(currentUser.id) && task.created_at > lastSeen) unreadCount++;
        });

        allUpdates.forEach(upd => { // Updates or threads
          const task = t.find(task => task.id === upd.task_id);
          if (task && (task.assignees?.includes(currentUser.id) || currentUser.role === 'owner' || currentUser.role === 'admin')) {
              // Note itself
              if (upd.created_at > lastSeen && upd.author_id !== currentUser.id) unreadCount++;
              // Threads
              if (upd.thread) {
                  upd.thread.forEach(msg => {
                      if (msg.created_at > lastSeen && msg.author_id !== currentUser.id) unreadCount++;
                  });
              }
              // Legacy Replies
              if (upd.admin_reply && upd.admin_reply_by !== currentUser.id && upd.created_at > lastSeen) unreadCount++;
              if (upd.user_response && upd.author_id !== currentUser.id && upd.created_at > lastSeen) unreadCount++;
          }
        });
        window.dispatchEvent(new CustomEvent('update-notifications', { detail: unreadCount }));
      }
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadDashboardData(); 
    
    // Listen for TopNav calls
    const handleOpenProject = () => setModalType('project');
    const handleSearch = (e: any) => setSearchQuery(e.detail);
    const handleClearing = () => loadDashboardData();
    
    window.addEventListener('open-create-project', handleOpenProject);
    window.addEventListener('global-search', handleSearch);
    window.addEventListener('notifications-cleared', handleClearing);
    
    return () => {
      window.removeEventListener('open-create-project', handleOpenProject);
      window.removeEventListener('global-search', handleSearch);
      window.removeEventListener('notifications-cleared', handleClearing);
    };
  }, [currentUser]);

  // Submit Handlers
  const submitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProject(formTitle, formDesc, formEndDate);
    setModalType(null);
    setFormTitle(''); setFormDesc(''); setFormEndDate('');
    loadDashboardData();
  };

  const submitEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProject(activeProjectId, formEndDate, formStartDate ? new Date(formStartDate).toISOString() : undefined);
    setModalType(null);
    setFormEndDate(''); setFormStartDate('');
    loadDashboardData();
  };

  const submitEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTask(activeTaskId, { title: formTitle, details: formDetails || null, assignees: formAssigneeIds, due_date: formDueDate || null, status: formTaskStatus });
    setModalType(null);
    setFormTitle(''); setFormDetails(''); setFormAssigneeIds([]); setFormDueDate(''); setFormTaskStatus('');
    loadDashboardData();
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTask(activeProjectId, formTitle, formAssigneeIds, formDueDate, formDetails, 'active');
    setModalType(null);
    setFormTitle(''); setFormDetails(''); setFormAssigneeIds([]); setFormDueDate('');
    loadDashboardData();
  };

  const submitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTaskUpdate(formTaskId, activeUserId, formNote);
    setModalType(null);
    setFormTaskId(''); setFormNote('');
    loadDashboardData();
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      await addThreadMessage(activeUpdateId, currentUser.id, formReply);
      setModalType(null);
      setFormReply('');
      loadDashboardData();
    }
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCustomerLead(formLeadName, formLeadCompany, formLeadEmail);
    setModalType(null);
    setFormLeadName(''); setFormLeadCompany(''); setFormLeadEmail('');
    loadDashboardData();
  };

  const submitLeadNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      await addTaskUpdate(formTaskId, currentUser.id, formNote);
      setModalType(null);
      setFormTaskId(''); setFormNote('');
      loadDashboardData();
    }
  };

  const convertLead = async (projectId: string) => {
    if(window.confirm('Convert this lead pipe into an active functional project view?')) {
      await updateProject(projectId, undefined, undefined, 'active');
      loadDashboardData();
    }
  };

  const openTaskModal = (projectId: string) => {
    setActiveProjectId(projectId);
    setModalType('task');
  };

  const openEditProjectModal = (proj: Project) => {
    setActiveProjectId(proj.id);
    setFormEndDate(proj.end_date || '');
    // Convert ISO to local datetime string for input
    setFormStartDate(proj.created_at ? new Date(proj.created_at).toISOString().slice(0,16) : '');
    setModalType('edit-project');
  };

  const openEditTaskModal = (task: Task) => {
    setActiveTaskId(task.id);
    setFormTitle(task.title);
    setFormDetails(task.details || '');
    setFormAssigneeIds(task.assignees || []);
    setFormDueDate(task.due_date || '');
    setFormTaskStatus(task.status || 'todo');
    setModalType('edit_task');
  };

  const openUpdateModal = (userId: string) => {
    setActiveUserId(userId);
    setModalType('update');
  };

  const openReplyModal = (updateId: string) => {
    setActiveUpdateId(updateId);
    setModalType('reply-update');
  };

  const openTasksList = (subjectName: string, items: Task[]) => {
    setTasksListSubject(subjectName);
    setTasksListItems(items);
    setModalType('tasks-list');
  };

  const isStaff = currentUser?.role === 'staff';

  if (loading) return <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '13px', fontWeight: 600 }}>Loading Dashboard...</div>;

  return (
    <div>
      <div className="dashboard-toggles" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
        <button 
          onClick={() => setView('team')}
          style={{ 
            padding: '8px 24px', 
            borderRadius: '99px',
            border: '1px solid var(--color-zinc-200)',
            background: view === 'team' ? 'var(--color-zinc-900)' : 'white',
            color: view === 'team' ? 'white' : 'var(--color-zinc-600)',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Team Workload
        </button>
        <button 
          onClick={() => setView('projects')}
          style={{ 
            padding: '8px 24px', 
            borderRadius: '99px',
            border: '1px solid var(--color-zinc-200)',
            background: view === 'projects' ? 'var(--color-zinc-900)' : 'white',
            color: view === 'projects' ? 'white' : 'var(--color-zinc-600)',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Project Overview
        </button>
        {currentUser?.role === 'owner' && (
          <button 
            onClick={() => setView('leads')}
            style={{ 
              padding: '8px 24px', 
              borderRadius: '99px',
              border: '1px solid var(--color-zinc-200)',
              background: view === 'leads' ? 'var(--color-zinc-900)' : 'white',
              color: view === 'leads' ? 'white' : 'var(--color-zinc-600)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Customer Leads
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {view === 'team' && (() => {
          const shiftStart = new Date();
          shiftStart.setHours(8, 0, 0, 0);
          const shiftEnd = new Date();
          shiftEnd.setHours(18, 0, 0, 0);
          
          return (
          <>
            {users.length === 0 && <div style={{ fontSize: '12px', color: 'var(--color-zinc-500)', textAlign: 'center' }}>No staff found. Create an account first.</div>}
            {users.filter(user => {
              if (!searchQuery) return true;
              const matchName = user.name.toLowerCase().includes(searchQuery);
              const matchRole = user.role?.toLowerCase().includes(searchQuery);
              const uTasks = tasks.filter(t => t.assignees?.includes(user.id));
              const mTasks = uTasks.some(t => t.title.toLowerCase().includes(searchQuery));
              const uProjIds = new Set(uTasks.map(t => t.project_id));
              const mProjs = projects.some(p => uProjIds.has(p.id) && p.title.toLowerCase().includes(searchQuery));
              return matchName || matchRole || mTasks || mProjs;
            }).map(user => {
              // Get tasks where user is assigned
              const userTasks = tasks.filter(t => t.assignees?.includes(user.id));
              // Get unique projects from those tasks
              const userProjectIds = new Set(userTasks.map(t => t.project_id));
              
              // Get all updates for user's tasks
              const userUpdates = updates.filter(update => userTasks.some(t => t.id === update.task_id));
              
              return (
                <TimelineCard 
                  key={user.id}
                  initials={user.initials}
                  avatarUrl={user.avatar_url}
                  title={user.name} 
                  subtitle={`${userTasks.length} ACTIVE TASKS | ${userProjectIds.size} PROJECTS`} 
                  color="#18181b" 
                  updates={userUpdates}
                  action1Label="Log Update"
                  onAction1={() => openUpdateModal(user.id)}
                  action2Label={userTasks.length > 0 ? "View Active Tasks" : ""}
                  onAction2={() => userTasks.length > 0 ? openTasksList(`${user.name}'s`, userTasks) : undefined}
                  startDate={shiftStart.toISOString()}
                  endDate={shiftEnd.toISOString()}
                  users={users}
                  tasks={tasks}
                  assignedTasks={userTasks}
                  currentUser={currentUser}
                  onReplyClick={openReplyModal}
                  onEditTask={openEditTaskModal}
                />
              );
            })}
          </>
        )})()}

        {view === 'projects' && (
          <>
            {!isStaff && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button 
                  onClick={() => setModalType('project')}
                  style={{ background: 'var(--color-zinc-100)', border: '1px solid var(--color-zinc-200)', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                  New Project +
                </button>
              </div>
            )}
            {projects.filter(p => p.status !== 'lead').length === 0 && <div style={{ fontSize: '12px', color: 'var(--color-zinc-500)', textAlign: 'center' }}>No projects accessible yet.</div>}
            {projects.filter(p => p.status !== 'lead').filter(proj => {
              if (!searchQuery) return true;
              const matchProj = proj.title.toLowerCase().includes(searchQuery) || (proj.description && proj.description.toLowerCase().includes(searchQuery));
              const pTasks = tasks.filter(t => t.project_id === proj.id);
              const matchTasks = pTasks.some(t => t.title.toLowerCase().includes(searchQuery));
              const assignedUserIds = new Set(pTasks.flatMap(t => t.assignees || []));
              const matchStaff = users.some(u => assignedUserIds.has(u.id) && (u.name.toLowerCase().includes(searchQuery) || u.role?.toLowerCase().includes(searchQuery)));
              return matchProj || matchTasks || matchStaff;
            }).map(proj => {
              // Get tasks for this project
              const projTasks = tasks.filter(t => t.project_id === proj.id);
              // Get all updates for this project's tasks
              const projUpdates = updates.filter(update => projTasks.some(t => t.id === update.task_id));
              
              return (
                <div key={proj.id} style={{ position: 'relative' }}>
                  <TimelineCard 
                    initials={proj.title.charAt(0).toUpperCase()} 
                  title={proj.title} 
                  subtitle={`PROJECT STATUS: ${proj.status.toUpperCase()} | ${projTasks.length} TASKS`} 
                  color="#18181b" 
                  updates={projUpdates}
                  {...(!isStaff ? {
                    action1Label: "Add Task",
                    onAction1: () => openTaskModal(proj.id),
                    action2Label: "View All Tasks",
                    onAction2: () => openTasksList(`Project (${proj.title})`, projTasks),
                    onEditDates: () => openEditProjectModal(proj)
                  } : {})}
                  startDate={proj.created_at}
                  endDate={proj.end_date}
                  users={users}
                  tasks={tasks}
                  assignedTasks={projTasks}
                  currentUser={currentUser}
                  onReplyClick={openReplyModal}
                  onEditTask={openEditTaskModal}
                />
              </div>
              );
            })}
          </>
        )}
        {view === 'leads' && currentUser?.role === 'owner' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button 
                onClick={() => setModalType('lead')}
                style={{ background: 'var(--color-zinc-900)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>
                Create New Lead +
              </button>
            </div>
            {projects.filter(p => p.status === 'lead').filter(proj => {
              if (!searchQuery) return true;
              return proj.title.toLowerCase().includes(searchQuery) || (proj.customer_company && proj.customer_company.toLowerCase().includes(searchQuery));
            }).map(proj => {
              const projTasks = tasks.filter(t => t.project_id === proj.id);
              const projUpdates = updates.filter(update => projTasks.some(t => t.id === update.task_id));
              
              return (
                <div key={proj.id} style={{ position: 'relative' }}>
                  <button 
                    onClick={() => convertLead(proj.id)}
                    style={{ position: 'absolute', right: '32px', top: '16px', zIndex: 10, background: 'var(--color-zinc-900)', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '10px', fontWeight: 600, color: 'white', cursor: 'pointer' }}
                  >
                    Turn into Project
                  </button>
                  <TimelineCard 
                    initials={proj.title.charAt(0).toUpperCase()} 
                    title={`${proj.title} • ${proj.customer_company || 'Independent Contact'}`} 
                    subtitle={`PIPELINE TRACKING | ${proj.customer_email || 'No email provided'}`} 
                    color="#18181b" 
                    updates={projUpdates}
                    action1Label="Add Timeline Note"
                    onAction1={() => {
                        setFormTaskId(projTasks[0]?.id || ''); 
                        setModalType('lead-note');
                    }}
                    startDate={proj.created_at}
                    users={users}
                    tasks={tasks}
                    assignedTasks={subProjTasks}
                    currentUser={currentUser}
                    onReplyClick={openReplyModal}
                    onEditTask={openEditTaskModal}
                  />
                </div>
              );
            })}
          </>
        )}
      </div>

      <Modal isOpen={modalType === 'project'} onClose={() => setModalType(null)} title="Create New Project">
        <form onSubmit={submitProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="text" placeholder="Project Title" value={formTitle} onChange={e => setFormTitle(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <textarea placeholder="Description (Optional)" value={formDesc} onChange={e => setFormDesc(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', resize: 'vertical', minHeight: '80px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-500)', marginLeft: '4px' }}>Project Target End Date (Optional)</label>
            <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          </div>
          <button type="submit" className="auth-button">Create Project</button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'edit-project'} onClose={() => setModalType(null)} title="Edit Project Timeline">
        <form onSubmit={submitEditProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-500)', marginLeft: '4px' }}>Project Start Bound (Beginning of Line)</label>
            <input type="datetime-local" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-500)', marginLeft: '4px' }}>Project Target End Bound (End of Line)</label>
            <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          </div>
          <button type="submit" className="auth-button">Update Timeline Parameters</button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'task'} onClose={() => setModalType(null)} title="Assign New Task">
        <form onSubmit={submitTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="text" placeholder="Task Name (e.g. Gather Art Files)" value={formTitle} onChange={e => setFormTitle(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <textarea placeholder="Task Details & Notes (Optional)" value={formDetails} onChange={e => setFormDetails(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-zinc-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assign Staff Participants</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {users.map(u => {
                const isSelected = formAssigneeIds.includes(u.id);
                return (
                  <div 
                    key={u.id}
                    onClick={() => setFormAssigneeIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '999px', 
                      border: isSelected ? '1px solid var(--color-zinc-900)' : '1px solid var(--color-zinc-200)',
                      background: isSelected ? 'var(--color-zinc-900)' : 'white',
                      color: isSelected ? 'white' : 'var(--color-zinc-600)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      userSelect: 'none'
                    }}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{u.name.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-500)', marginLeft: '4px' }}>Specific Due Date & Time</label>
            <input type="datetime-local" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          </div>
          <button type="submit" className="auth-button">Add Task</button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'edit_task'} onClose={() => setModalType(null)} title="Edit Active Task">
        <form onSubmit={submitEditTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="text" placeholder="Task Name (e.g. Gather Art Files)" value={formTitle} onChange={e => setFormTitle(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <textarea placeholder="Task Details & Notes (Optional)" value={formDetails} onChange={e => setFormDetails(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-zinc-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assign Staff Participants</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {users.map(u => {
                const isSelected = formAssigneeIds.includes(u.id);
                return (
                  <div 
                    key={u.id}
                    onClick={() => setFormAssigneeIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '999px', 
                      border: isSelected ? '1px solid var(--color-zinc-900)' : '1px solid var(--color-zinc-200)',
                      background: isSelected ? 'var(--color-zinc-900)' : 'white',
                      color: isSelected ? 'white' : 'var(--color-zinc-600)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      userSelect: 'none'
                    }}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{u.name.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-500)', marginLeft: '4px' }}>Specific Due Date & Time</label>
            <input type="datetime-local" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-500)', marginLeft: '4px' }}>Task Status</label>
            <select value={formTaskStatus} onChange={e => setFormTaskStatus(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', background: 'white' }}>
              <option value="todo">Pending Todo</option>
              <option value="active">Active Execution</option>
              <option value="review">Needs Review</option>
              <option value="done">Completed</option>
            </select>
          </div>
          
          <button type="submit" className="auth-button">Save Changes to Task</button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'update'} onClose={() => setModalType(null)} title="Log Task Update">
        <form onSubmit={submitUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <select value={formTaskId} onChange={e => setFormTaskId(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', background: 'white' }}>
            <option value="" disabled>Select Active Task</option>
            {tasks.filter(t => t.assignees?.includes(activeUserId)).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <input type="text" placeholder="Quick Note (e.g. Scoped out the layers)" value={formNote} onChange={e => setFormNote(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <button type="submit" className="auth-button">Save Note & Update Timeline</button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'reply-update'} onClose={() => setModalType(null)} title="Add Thread Message">
        <form onSubmit={submitReply} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--color-zinc-500)', marginBottom: '8px' }}>Your message will be appended to this log's active timeline thread.</div>
          <textarea placeholder="Type your message here..." value={formReply} onChange={e => setFormReply(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', resize: 'vertical', minHeight: '80px' }} />
          <button type="submit" className="auth-button">Send Message</button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'lead-note'} onClose={() => setModalType(null)} title="CRM Status Note">
        <form onSubmit={submitLeadNote} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--color-zinc-500)', marginBottom: '8px' }}>This text will show up directly as an anchor note on the customer's pipeline timeline.</div>
          <input type="text" placeholder="CRM Note (e.g. Scoped out the layers)" value={formNote} onChange={e => setFormNote(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <button type="submit" className="auth-button">Save Point</button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'lead'} onClose={() => setModalType(null)} title="Register Customer Lead">
        <form onSubmit={submitLead} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="text" placeholder="Customer Name" value={formLeadName} onChange={e => setFormLeadName(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <input type="text" placeholder="Company Brand (Optional)" value={formLeadCompany} onChange={e => setFormLeadCompany(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <input type="email" placeholder="Contact Email" value={formLeadEmail} onChange={e => setFormLeadEmail(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <button type="submit" className="auth-button">Initialize Pipeline Tracking</button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'tasks-list'} onClose={() => setModalType(null)} title={`${tasksListSubject} Tasks`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
          {tasksListItems.length === 0 ? (
            <div style={{ color: 'var(--color-zinc-500)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No active tasks found.</div>
          ) : (
            tasksListItems.map(t => (
              <div key={t.id} style={{ padding: '16px', background: 'var(--color-zinc-50)', borderRadius: '12px', border: '1px solid var(--color-zinc-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-zinc-900)' }}>{t.title}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-zinc-500)', background: 'white', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-zinc-200)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t.status}
                </span>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
