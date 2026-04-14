import React, { useState, useEffect } from 'react';
import { TimelineCard } from '../components/TimelineCard';
import { Modal } from '../components/Modal';
import type { TaskUpdate, User, Project, Task } from '../types';
import { fetchUsers, fetchProjects, fetchTasks, fetchTaskUpdates, subscribeToUsers, subscribeToProjects, subscribeToTasks, subscribeToAllTaskUpdates, createProject, createTask, addTaskUpdate, updateProject, updateTask, updateTaskOrders, updateTaskUpdateOrders, addThreadMessage, createCustomerLead } from '../services/firestoreService';
import { useAuth } from '../services/AuthContext';

export function Dashboard() {
  const { user: currentUser } = useAuth();
  const [view, setView] = useState<'team' | 'projects' | 'leads' | 'metrics' | 'archives' | 'pulse'>('team');
  const [projectViewType, setProjectViewType] = useState<'list' | 'grid'>('list');
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalType, setModalType] = useState<'project' | 'task' | 'update' | 'tasks-list' | 'updates-list' | 'edit-project' | 'reply-update' | 'lead' | 'lead-note' | 'edit_task' | 'action-item' | 'progress-log' | null>(null);
  const [showArchives, setShowArchives] = useState(false);
  const [progressLogTaskId, setProgressLogTaskId] = useState('');
  const [progressLogPct, setProgressLogPct] = useState<number>(0);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activeUserId, setActiveUserId] = useState<string>('');
  const [tasksListSubject, setTasksListSubject] = useState<string>('');
  const [tasksListItems, setTasksListItems] = useState<Task[]>([]);
  const [updatesListSubject, setUpdatesListSubject] = useState<string>('');
  const [updatesListItems, setUpdatesListItems] = useState<TaskUpdate[]>([]);
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
  const [formTaskProjectId, setFormTaskProjectId] = useState('');
  const [formActionItems, setFormActionItems] = useState<string[]>([]);
  
  const [formLeadName, setFormLeadName] = useState('');
  const [formLeadCompany, setFormLeadCompany] = useState('');
  const [formLeadEmail, setFormLeadEmail] = useState('');

  const loadDashboardData = async () => { /* deprecated, handled by snapshots */ };

  useEffect(() => { 
    if (!currentUser) return;
    
    setLoading(true);
    let allU: User[] = [];
    let allP: Project[] = [];
    let allT: Task[] = [];
    let allUpd: TaskUpdate[] = [];

    const processData = () => {
      const isStaff = currentUser.role !== 'owner' && currentUser.role !== 'admin';
      let u = [...allU];
      let p = [...allP];
      let t = [...allT];

      if (!isStaff) {
        setArchivedProjects(p.filter(proj => proj.status === 'archived'));
        setArchivedTasks(t.filter(task => task.status === 'archived'));
      }

      p = p.filter(proj => proj.status !== 'archived');
      t = t.filter(task => task.status !== 'archived');

      if (isStaff) {
        u = u.filter(user => user.id === currentUser.id);
        t = t.filter(task => task.assignees?.includes(currentUser.id));
        p = p.filter(proj => t.some(task => task.project_id === proj.id));
      }

      setUsers(u);
      setProjects(p);
      setTasks(t);
      
      const filteredUpdates = allUpd.filter(upd => t.some(task => task.id === upd.task_id))
        .sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      setUpdates(filteredUpdates);

      // Notification Calculation
      const lastSeen = currentUser.last_seen_notifications || '2000-01-01T00:00:00Z';
      let unreadCount = 0;
      
      t.forEach(task => { // New task assigned
        if (task.assignees?.includes(currentUser.id) && task.created_at > lastSeen) unreadCount++;
      });

      filteredUpdates.forEach(upd => { // Updates or threads
        const task = t.find(task => task.id === upd.task_id);
        if (task && (task.assignees?.includes(currentUser.id) || currentUser.role === 'owner' || currentUser.role === 'admin')) {
            if (upd.created_at > lastSeen && upd.author_id !== currentUser.id) unreadCount++;
            if (upd.thread) {
                upd.thread.forEach(msg => {
                    if (msg.created_at > lastSeen && msg.author_id !== currentUser.id) unreadCount++;
                });
            }
            if (upd.admin_reply && upd.admin_reply_by !== currentUser.id && upd.created_at > lastSeen) unreadCount++;
            if (upd.user_response && upd.author_id !== currentUser.id && upd.created_at > lastSeen) unreadCount++;
        }
      });
      window.dispatchEvent(new CustomEvent('update-notifications', { detail: unreadCount }));
      setLoading(false);
    };

    const unsubU = subscribeToUsers((data) => { allU = data; processData(); });
    const unsubP = subscribeToProjects((data) => { allP = data; processData(); });
    const unsubT = subscribeToTasks((data) => { allT = data; processData(); });
    const unsubUpd = subscribeToAllTaskUpdates((data) => { allUpd = data; processData(); });
    
    // Listen for TopNav calls
    const handleOpenProject = () => setModalType('project');
    const handleSearch = (e: any) => setSearchQuery(e.detail);
    const handleClearing = () => { /* wait for snapshot loop check */ };
    
    window.addEventListener('open-create-project', handleOpenProject);
    window.addEventListener('global-search', handleSearch);
    window.addEventListener('notifications-cleared', handleClearing);
    
    return () => {
      unsubU(); unsubP(); unsubT(); unsubUpd();
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

  const archiveProject = async () => {
    const confirmation = window.prompt('DANGER: Archiving this project will remove it from the pipeline. Type ARCHIVE to confirm.');
    if (confirmation === 'ARCHIVE') {
      await updateProject(activeProjectId, undefined, undefined, 'archived');
      setModalType(null);
    }
  };

  const archiveTask = async () => {
    const confirmation = window.prompt('DANGER: Archiving this task will remove it from the pipeline. Type ARCHIVE to confirm.');
    if (confirmation === 'ARCHIVE') {
      await updateTask(activeTaskId, { status: 'archived' });
      setModalType(null);
    }
  };

  const restoreProject = async (id: string) => {
    await updateProject(id, undefined, undefined, 'active');
  };

  const restoreTask = async (id: string) => {
    await updateTask(id, { status: 'todo' });
  };

  const submitEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTask(activeTaskId, { title: formTitle, details: formDetails || null, assignees: formAssigneeIds, due_date: formDueDate || null, status: formTaskStatus, project_id: formTaskProjectId });
    if (currentUser) {
      for (const item of formActionItems.filter(i => i.trim() !== '')) {
        await addTaskUpdate(activeTaskId, currentUser.id, item, true);
      }
    }
    setModalType(null);
    setFormTitle(''); setFormDetails(''); setFormAssigneeIds([]); setFormDueDate(''); setFormTaskStatus(''); setFormTaskProjectId(''); setFormActionItems([]);
    loadDashboardData();
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTaskId = await createTask(activeProjectId, formTitle, formAssigneeIds, formDueDate, formDetails, 'active');
    if (currentUser) {
      for (const item of formActionItems.filter(i => i.trim() !== '')) {
        await addTaskUpdate(newTaskId, currentUser.id, item, true);
      }
    }
    setModalType(null);
    setFormTitle(''); setFormDetails(''); setFormAssigneeIds([]); setFormDueDate(''); setFormActionItems([]);
    loadDashboardData();
  };

  const handleReorderTasks = async (reorderedTasks: { id: string, order_index: number }[]) => {
    await updateTaskOrders(reorderedTasks);
    // Note: We immediately request a reload from DB so changes echo correctly.
    // However, TimelineCard caches the list visually already.
    loadDashboardData();
  };

  const handleReorderUpdates = async (reorderedUpdates: { id: string, order_index: number }[]) => {
    await updateTaskUpdateOrders(reorderedUpdates);
    loadDashboardData();
  };

  const submitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTaskUpdate(formTaskId, activeUserId || currentUser?.id || '', formNote);
    setModalType(null);
    setFormTaskId(''); setFormNote(''); setActiveUserId('');
    loadDashboardData();
  };

  const submitActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      await addTaskUpdate(activeTaskId, currentUser.id, formNote, true);
      setModalType(null);
      setFormNote('');
      loadDashboardData();
    }
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

  const submitProgressLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNote || formNote.trim() === '') return;
    
    // Update task
    const isDone = progressLogPct === 100;
    await updateTask(progressLogTaskId, { progress: progressLogPct, status: isDone ? 'done' : (progressLogPct === 0 ? 'todo' : 'active') });
    
    // Add timeline log
    if (currentUser) {
      const explicitNote = `[Advanced to ${isDone ? 'Done' : progressLogPct + '%'}] ${formNote.trim()}`;
      await addTaskUpdate(progressLogTaskId, currentUser.id, explicitNote);
    }
    
    setModalType(null);
    setFormNote('');
    setProgressLogTaskId('');
    setProgressLogPct(0);
  };

  const convertLead = async (projectId: string) => {
    if(window.confirm('Convert this lead pipe into an active functional project view?')) {
      await updateProject(projectId, undefined, undefined, 'active');
      loadDashboardData();
    }
  };

  const openTaskModal = (projectId: string) => {
    setActiveProjectId(projectId);
    setFormActionItems([]);
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
    setFormTaskProjectId(task.project_id || '');
    setFormActionItems([]);
    setModalType('edit_task');
  };

  const openActionItemModal = (task: Task) => {
    setActiveTaskId(task.id);
    setFormNote('');
    setModalType('action-item');
  };

  const openUpdateModal = (userId: string) => {
    setActiveUserId(userId);
    setFormTaskId('');
    setModalType('update');
  };

  const openTaskUpdateModal = (taskId: string) => {
    setActiveUserId('');
    setFormTaskId(taskId);
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

  const openUpdatesList = (subjectName: string, items: TaskUpdate[]) => {
    setUpdatesListSubject(subjectName);
    setUpdatesListItems(items.slice().sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setModalType('updates-list');
  };

  const isStaff = currentUser?.role !== 'owner' && currentUser?.role !== 'admin';

  if (loading) return <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '13px', fontWeight: 600 }}>Loading Dashboard...</div>;

  return (
    <div>
      <div className="dashboard-toggles" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
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
        {!isStaff && (
          <button 
            onClick={() => setView('archives')}
            style={{ 
              padding: '8px 24px', 
              borderRadius: '99px',
              border: '1px solid var(--color-zinc-200)',
              background: view === 'archives' ? 'var(--color-zinc-900)' : 'white',
              color: view === 'archives' ? 'white' : 'var(--color-zinc-600)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Data Archives
          </button>
        )}
        {!isStaff && (
          <button 
            onClick={() => setView('pulse')}
            style={{ 
              padding: '8px 24px', 
              borderRadius: '99px',
              border: '1px solid var(--color-zinc-200)',
              background: view === 'pulse' ? 'var(--color-zinc-900)' : 'white',
              color: view === 'pulse' ? 'white' : 'var(--color-zinc-600)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Live Pulse
          </button>
        )}
        <button 
          onClick={() => setView('metrics')}
          style={{ 
            padding: '8px 24px', 
            borderRadius: '99px',
            border: '1px solid var(--color-zinc-200)',
            background: view === 'metrics' ? 'var(--color-zinc-900)' : 'white',
            color: view === 'metrics' ? 'white' : 'var(--color-zinc-600)',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Staff Metrics
        </button>
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
                  projects={projects}
                  groupByProject={true}
                  users={users}
                  tasks={tasks}
                  assignedTasks={userTasks}
                  currentUser={currentUser}
                  onReplyClick={openReplyModal}
                  onEditTask={openEditTaskModal}
                  onActionItem={openActionItemModal}
                  onLogUpdateClick={openTaskUpdateModal}
                  onReorderTasks={handleReorderTasks}
                  onReorderUpdates={handleReorderUpdates}
                  onUpdateTask={async (taskId, updates) => await updateTask(taskId, updates)}
                  onProgressClick={(taskId, pct) => {
                    setProgressLogTaskId(taskId);
                    setProgressLogPct(pct);
                    setModalType('progress-log');
                  }}
                />
              );
            })}
          </>
        )})()}
        {view === 'metrics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-zinc-900)', marginLeft: '8px' }}>Staff Day-to-Day Productivity</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {users.map(user => {
                const userTasks = tasks.filter(t => t.assignees?.includes(user.id));
                const completedTasks = userTasks.filter(t => t.status === 'done');
                const completionRatio = userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0;
                
                const today = new Date();
                today.setHours(0,0,0,0);
                const userUpdatesToday = updates.filter(u => u.author_id === user.id && new Date(u.created_at) >= today);
                
                return (
                  <div key={user.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--color-zinc-200)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--color-zinc-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-serif)' }}>
                        {user.initials || user.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-zinc-900)' }}>{user.name}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-zinc-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.role}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--color-zinc-50)', padding: '16px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-600)' }}>Total Tasks Assigned</span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-zinc-900)' }}>{userTasks.length}</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-600)' }}>Completion Ratio</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: completionRatio === 100 ? 'var(--color-zinc-900)' : 'var(--color-zinc-600)' }}>{completionRatio}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--color-zinc-200)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${completionRatio}%`, background: 'var(--color-zinc-900)', borderRadius: '3px', transition: 'width 0.4s ease' }}></div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-zinc-200)', paddingTop: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-600)' }}>Activity Logs Today</span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: userUpdatesToday.length > 0 ? 'var(--color-zinc-900)' : 'var(--color-zinc-400)' }}>{userUpdatesToday.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {view === 'projects' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--color-zinc-100)', padding: '4px', borderRadius: '8px' }}>
                <button onClick={() => setProjectViewType('list')} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600, background: projectViewType === 'list' ? 'white' : 'transparent', color: projectViewType === 'list' ? 'black' : 'var(--color-zinc-500)', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: projectViewType === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>List View</button>
                <button onClick={() => setProjectViewType('grid')} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600, background: projectViewType === 'grid' ? 'white' : 'transparent', color: projectViewType === 'grid' ? 'black' : 'var(--color-zinc-500)', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: projectViewType === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Grid View</button>
              </div>
              {!isStaff && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowArchives(!showArchives)} style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 600, background: showArchives ? 'var(--color-zinc-900)' : 'transparent', color: showArchives ? 'white' : 'var(--color-zinc-500)', border: showArchives ? '1px solid var(--color-zinc-900)' : '1px solid var(--color-zinc-200)', borderRadius: '999px', cursor: 'pointer', transition: 'all 0.2s' }}>{showArchives ? 'Hide Archives' : 'Data Archives'}</button>
                  <button 
                    onClick={() => setModalType('project')}
                    style={{ background: 'var(--color-zinc-100)', border: '1px solid var(--color-zinc-200)', padding: '8px 20px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'white'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-zinc-100)'}>
                    New Project +
                  </button>
                </div>
              )}
            </div>
            {projects.filter(p => p.status !== 'lead').length === 0 && <div style={{ fontSize: '12px', color: 'var(--color-zinc-500)', textAlign: 'center' }}>No projects accessible yet.</div>}
            <div style={projectViewType === 'list' ? { display: 'flex', flexDirection: 'column', gap: '8px' } : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px', alignItems: 'start' }}>
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
                    {projectViewType === 'list' ? (
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
                        onActionItem={openActionItemModal}
                        onLogUpdateClick={openTaskUpdateModal}
                        onReorderTasks={handleReorderTasks}
                        onReorderUpdates={handleReorderUpdates}
                        onUpdateTask={async (taskId, updates) => await updateTask(taskId, updates)}
                        onProgressClick={(taskId, pct) => {
                          setProgressLogTaskId(taskId);
                          setProgressLogPct(pct);
                          setModalType('progress-log');
                        }}
                      />
                    ) : (
                      <div style={{ background: 'white', border: '1px solid var(--color-zinc-200)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)'; }}
                        onClick={() => openTasksList(`Project (${proj.title})`, projTasks)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ flex: '0 0 48px', height: '48px', borderRadius: '12px', background: 'var(--color-zinc-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-serif)' }}>
                            {proj.title.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-zinc-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.title}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-zinc-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{projTasks.length} Active Tasks</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--color-zinc-50)', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-zinc-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-700)' }}>{proj.status.toUpperCase()}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-zinc-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Update</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-700)' }}>
                              {projUpdates.length > 0 ? new Date(projUpdates[0].created_at).toLocaleDateString() : 'None'}
                            </div>
                          </div>
                        </div>
                        {!isStaff && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                            <button onClick={(e) => { e.stopPropagation(); openTaskModal(proj.id); }} style={{ flex: 1, padding: '8px', background: 'white', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s', color: 'var(--color-zinc-600)' }} onMouseEnter={e => { e.currentTarget.style.background='var(--color-zinc-50)'; e.currentTarget.style.color='var(--color-zinc-900)'; }} onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.color='var(--color-zinc-600)'; }}>+ Task</button>
                            <button onClick={(e) => { e.stopPropagation(); openEditProjectModal(proj); }} style={{ flex: 1, padding: '8px', background: 'white', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s', color: 'var(--color-zinc-600)' }} onMouseEnter={e => { e.currentTarget.style.background='var(--color-zinc-50)'; e.currentTarget.style.color='var(--color-zinc-900)'; }} onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.color='var(--color-zinc-600)'; }}>Edit</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {showArchives && !isStaff && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '32px', paddingTop: '32px', borderTop: '2px dashed var(--color-zinc-200)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-zinc-900)', marginLeft: '8px' }}>Archived Projects</div>
                  {archivedProjects.length === 0 && <div style={{ fontSize: '12px', color: 'var(--color-zinc-500)', marginLeft: '8px' }}>No archived projects.</div>}
                  {archivedProjects.map(proj => (
                    <div key={proj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-zinc-200)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-zinc-900)' }}>{proj.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-zinc-500)' }}>Created: {new Date(proj.created_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => restoreProject(proj.id)} style={{ padding: '8px 16px', background: 'var(--color-zinc-900)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Restore Project</button>
                    </div>
                  ))}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-zinc-900)', marginLeft: '8px' }}>Archived Tasks</div>
                  {archivedTasks.length === 0 && <div style={{ fontSize: '12px', color: 'var(--color-zinc-500)', marginLeft: '8px' }}>No archived tasks.</div>}
                  {archivedTasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-zinc-200)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-zinc-900)' }}>{task.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-zinc-500)' }}>Created: {new Date(task.created_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => restoreTask(task.id)} style={{ padding: '8px 16px', background: 'var(--color-zinc-900)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Restore Task</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    onActionItem={openActionItemModal}
                    onLogUpdateClick={openTaskUpdateModal}
                    onReorderTasks={handleReorderTasks}
                    onReorderUpdates={handleReorderUpdates}
                    onUpdateTask={async (taskId, updates) => await updateTask(taskId, updates)}
                    onProgressClick={(taskId, pct) => {
                      setProgressLogTaskId(taskId);
                      setProgressLogPct(pct);
                      setModalType('progress-log');
                    }}
                  />
                </div>
              );
            })}
            </div>
          </>
        )}

        {view === 'pulse' && !isStaff && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-zinc-900)', marginLeft: '8px' }}>Global Activity Feed</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {updates.slice().sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50).map(upd => {
                const author = users.find(u => u.id === upd.author_id);
                const task = tasks.find(t => t.id === upd.task_id) || archivedTasks.find(t => t.id === upd.task_id);
                const project = projects.find(p => p.id === task?.project_id) || archivedProjects.find(p => p.id === task?.project_id);
                
                return (
                  <div key={upd.id} style={{ display: 'flex', gap: '16px', background: 'white', border: '1px solid var(--color-zinc-200)', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px -2px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--color-zinc-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-serif)', flexShrink: 0 }}>
                      {author?.initials || author?.name.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-zinc-900)' }}>{author?.name || 'Unknown User'}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-zinc-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {project?.title ? `${project.title} › ` : ''}{task?.title || 'Unknown Task'}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-zinc-400)' }}>
                          {new Date(upd.created_at).toLocaleDateString()} {new Date(upd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-zinc-800)', lineHeight: '1.5', marginTop: '4px', background: upd.is_action_item ? 'var(--color-red-50)' : 'var(--color-zinc-50)', padding: '12px', borderRadius: '8px', border: upd.is_action_item ? '1px solid var(--color-red-100)' : 'none' }}>
                        {upd.is_action_item && <span style={{ fontWeight: 800, color: 'var(--color-red-600)', display: 'block', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🚨 Action Item</span>}
                        {upd.note}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
          <button type="button" onClick={archiveProject} style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: '1px solid var(--color-red-600)', color: 'var(--color-red-600)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Archive Project</button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'task'} onClose={() => setModalType(null)} title="Assign New Task">
        <form onSubmit={submitTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="text" placeholder="Task Name (e.g. Gather Art Files)" value={formTitle} onChange={e => setFormTitle(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }} />
          <textarea placeholder="Task Details & Notes (Optional)" value={formDetails} onChange={e => setFormDetails(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} />
          
          {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-red-600)', marginLeft: '4px' }}>🚨 Action Items / Directives (Logs to Timeline)</label>
              {formActionItems.map((item, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <textarea placeholder="Write a specialized action item required by the participant..." value={item} onChange={e => { const newItems = [...formActionItems]; newItems[index] = e.target.value; setFormActionItems(newItems); }} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit', background: 'var(--color-zinc-50)' }} />
                  <button type="button" onClick={() => setFormActionItems(formActionItems.filter((_, i) => i !== index))} style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--color-zinc-200)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', fontWeight: 700, color: 'var(--color-zinc-600)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                </div>
              ))}
              <button type="button" onClick={() => setFormActionItems([...formActionItems, ''])} style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px solid var(--color-zinc-200)', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--color-zinc-600)', cursor: 'pointer' }}>
                + Add Action Item
              </button>
            </div>
          )}

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
          
          {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-red-600)', marginLeft: '4px' }}>🚨 Action Items / Directives (Logs to Timeline)</label>
              {formActionItems.map((item, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <textarea placeholder="Write a specialized action item required by the participant..." value={item} onChange={e => { const newItems = [...formActionItems]; newItems[index] = e.target.value; setFormActionItems(newItems); }} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit', background: 'var(--color-zinc-50)' }} />
                  <button type="button" onClick={() => setFormActionItems(formActionItems.filter((_, i) => i !== index))} style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--color-zinc-200)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', fontWeight: 700, color: 'var(--color-zinc-600)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                </div>
              ))}
              <button type="button" onClick={() => setFormActionItems([...formActionItems, ''])} style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px solid var(--color-zinc-200)', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--color-zinc-600)', cursor: 'pointer' }}>
                + Add Action Item
              </button>
            </div>
          )}

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
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-zinc-500)', marginLeft: '4px' }}>Associated Project</label>
            <select value={formTaskProjectId} onChange={e => setFormTaskProjectId(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', background: 'white' }}>
              <option value="" disabled>Select Project Destination</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
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
          <button type="button" onClick={archiveTask} style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: '1px solid var(--color-red-600)', color: 'var(--color-red-600)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Archive Task</button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'action-item'} onClose={() => setModalType(null)} title="Create Action Item">
        <form onSubmit={submitActionItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <textarea placeholder="Describe the required action..." value={formNote} onChange={e => setFormNote(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} />
          <button type="submit" className="auth-button">Log Action Item</button>
        </form>
      </Modal>

      <Modal isOpen={modalType === 'update'} onClose={() => { setModalType(null); setFormTaskId(''); setActiveUserId(''); }} title="Log Task Update">
        <form onSubmit={submitUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeUserId ? (
            <select value={formTaskId} onChange={e => setFormTaskId(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', background: 'white' }}>
              <option value="" disabled>Select Active Task</option>
              {tasks.filter(t => t.assignees?.includes(activeUserId)).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          ) : (
            <div style={{ padding: '12px 16px', background: 'var(--color-zinc-100)', borderRadius: '8px', border: '1px solid var(--color-zinc-200)', fontSize: '13px', fontWeight: 600, color: 'var(--color-zinc-800)' }}>
              TARGET TASK: {tasks.find(t => t.id === formTaskId)?.title}
            </div>
          )}
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
            tasksListItems.map(t => {
              const taskUpdates = updates
                .filter(u => u.task_id === t.id)
                .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              
              return (
                <div key={t.id} style={{ padding: '16px', background: 'var(--color-zinc-50)', borderRadius: '12px', border: '1px solid var(--color-zinc-200)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-zinc-900)' }}>{t.title}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-zinc-500)', background: 'white', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-zinc-200)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t.status}
                    </span>
                  </div>
                  {taskUpdates.length > 0 ? (
                    <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-zinc-200)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {taskUpdates.map((upd, idx) => {
                        const authorName = users.find(u => u.id === upd.author_id)?.name || 'Manager';
                        return (
                          <div key={upd.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: idx < taskUpdates.length - 1 ? '12px' : '0', borderBottom: idx < taskUpdates.length - 1 ? '1px dashed var(--color-zinc-100)' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-zinc-900)' }}>{authorName}</span>
                              <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-zinc-400)' }}>{new Date(upd.created_at).toLocaleDateString()} {new Date(upd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--color-zinc-700)', lineHeight: '1.4' }}>{upd.note}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--color-zinc-400)', fontStyle: 'italic', padding: '4px 0' }}>No timeline updates available.</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Modal>

      <Modal isOpen={modalType === 'updates-list'} onClose={() => setModalType(null)} title={`Recent Updates: ${updatesListSubject}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
          {updatesListItems.length === 0 ? (
            <div style={{ color: 'var(--color-zinc-500)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No tracked updates found.</div>
          ) : (
            updatesListItems.map(upd => {
              const taskTitle = tasks.find(t => t.id === upd.task_id)?.title || 'Unknown Task';
              const authorName = users.find(u => u.id === upd.author_id)?.name || 'Manager';
              return (
                <div key={upd.id} style={{ padding: '16px', background: 'var(--color-zinc-50)', borderRadius: '12px', border: '1px solid var(--color-zinc-200)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-zinc-900)' }}>{authorName}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-zinc-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>via {taskTitle}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-zinc-400)' }}>
                      {new Date(upd.created_at).toLocaleDateString()} {new Date(upd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-zinc-800)', lineHeight: '1.5' }}>
                    {upd.note}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>

      <Modal isOpen={modalType === 'progress-log'} onClose={() => { setModalType(null); setProgressLogPct(0); setProgressLogTaskId(''); setFormNote(''); }} title={`Log Event Context (${progressLogPct === 100 ? 'Done' : progressLogPct + '%'})`}>
        <form onSubmit={submitProgressLog} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--color-zinc-600)', lineHeight: '1.5' }}>
            To properly track workflow metrics, please provide a brief timeline update detailing this advancement.
          </div>
          <textarea placeholder="Describe what progressed..." value={formNote} onChange={e => setFormNote(e.target.value)} required style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} />
          <button type="submit" className="auth-button">Confirm Advancement</button>
        </form>
      </Modal>
    </div>
  );
}
