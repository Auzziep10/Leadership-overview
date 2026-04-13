import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { User, Role, Project, Task, TaskUpdate } from '../types';

// --- ROLES ---
export const fetchRoles = async (): Promise<Role[]> => {
  const snap = await getDocs(collection(db, 'roles'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Role)).sort((a,b) => a.level - b.level);
};

export const createRole = async (name: string, level: number) => {
  const docRef = await addDoc(collection(db, 'roles'), { name, level });
  return docRef.id;
};

// --- USERS ---
export const fetchUsers = async (): Promise<User[]> => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
};

export const updateUserRoleAndHierarchy = async (userId: string, role_id: string, reports_to: string | null) => {
  await updateDoc(doc(db, 'users', userId), { 
    role_id: role_id || null, 
    reports_to: reports_to || null 
  });
};

// --- PROJECTS ---
export const fetchProjects = async (): Promise<Project[]> => {
  const snap = await getDocs(collection(db, 'projects'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
};

export const createProject = async (title: string, description: string, end_date?: string) => {
  const docRef = await addDoc(collection(db, 'projects'), {
    title,
    description,
    status: 'active',
    end_date: end_date || null,
    created_at: new Date().toISOString()
  });
  return docRef.id;
};

export const updateProject = async (projectId: string, end_date?: string, start_date?: string) => {
  const updates: any = {};
  if (end_date !== undefined) updates.end_date = end_date || null;
  if (start_date) updates.created_at = start_date;
  
  await updateDoc(doc(db, 'projects', projectId), updates);
};

// --- TASKS & UPDATES ---
export const fetchTasks = async (): Promise<Task[]> => {
  const snap = await getDocs(collection(db, 'tasks'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
};

export const createTask = async (projectId: string, title: string, assignees: string[], due_date?: string, status: string = 'todo') => {
  const docRef = await addDoc(collection(db, 'tasks'), {
    project_id: projectId,
    title,
    assignees,
    status,
    due_date: due_date || null,
    created_at: new Date().toISOString()
  });
  return docRef.id;
};

export const fetchTaskUpdates = async (taskId: string): Promise<TaskUpdate[]> => {
  const q = query(collection(db, 'task_updates'), where('task_id', '==', taskId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskUpdate)).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const addTaskUpdate = async (taskId: string, authorId: string, note: string) => {
  const docRef = await addDoc(collection(db, 'task_updates'), {
    task_id: taskId,
    author_id: authorId,
    note,
    created_at: new Date().toISOString()
  });
  return docRef.id;
};

export const replyToTaskUpdate = async (updateId: string, adminId: string, reply: string) => {
  await updateDoc(doc(db, 'task_updates', updateId), {
    admin_reply: reply,
    admin_reply_by: adminId
  });
};

export const respondToAdminReply = async (updateId: string, response: string) => {
  await updateDoc(doc(db, 'task_updates', updateId), {
    user_response: response
  });
};

export const addThreadMessage = async (updateId: string, authorId: string, message: string) => {
  const newMessage = {
    id: Math.random().toString(36).substring(2, 11),
    author_id: authorId,
    message,
    created_at: new Date().toISOString()
  };
  await updateDoc(doc(db, 'task_updates', updateId), {
    thread: arrayUnion(newMessage)
  });
};
