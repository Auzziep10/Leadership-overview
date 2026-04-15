import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, orderBy, arrayUnion, setDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { db, storage, firebaseConfig } from './firebaseConfig';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updatePassword, updateEmail } from 'firebase/auth';
import type { User, Role, Project, Task, TaskUpdate } from '../types';

export const uploadSignatureAsset = async (base64String: string): Promise<string> => {
  const fileName = `signatures/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.png`;
  const storageRef = ref(storage, fileName);
  await uploadString(storageRef, base64String, 'data_url');
  return await getDownloadURL(storageRef);
};// --- ROLES ---
export const fetchRoles = async (): Promise<Role[]> => {
  const snap = await getDocs(collection(db, 'roles'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Role)).sort((a,b) => a.level - b.level);
};

export const createRole = async (name: string, level: number) => {
  const docRef = await addDoc(collection(db, 'roles'), { name, level });
  return docRef.id;
};

// --- USERS ---
export const createTeamAccount = async (email: string, pass: string, name: string) => {
  const secondaryApp = initializeApp(firebaseConfig, `AccountCreator_${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  
  const res = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
  
  await setDoc(doc(db, 'users', res.user.uid), {
    name,
    email,
    role: 'staff',
    initials: name.charAt(0).toUpperCase(),
    created_at: new Date().toISOString()
  });
  
  await secondaryAuth.signOut();
};

export const fetchUsers = async (): Promise<User[]> => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
};

export const subscribeToUsers = (cb: (users: User[]) => void) => {
  return onSnapshot(collection(db, 'users'), (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
  });
};

export const updateUserRoleAndHierarchy = async (userId: string, role_id: string, reports_to: string | null, systemRole?: string) => {
  const updates: any = { 
    role_id: role_id || null, 
    reports_to: reports_to || null 
  };
  if (systemRole) updates.role = systemRole.toLowerCase();
  
  await updateDoc(doc(db, 'users', userId), updates);
};

export const updateUserSignatureProfiles = async (userId: string, profiles: any[]) => {
  await updateDoc(doc(db, 'users', userId), {
    signature_profiles: profiles
  });
};

export const updatePersonalDetails = async (userId: string, name: string, email: string, phone: string, newPassword?: string) => {
  const authInstance = getAuth();
  const cUser = authInstance.currentUser;
  
  if (cUser) {
    if (newPassword && newPassword.trim() !== '') {
      await updatePassword(cUser, newPassword);
    }
    if (email !== cUser.email) {
      await updateEmail(cUser, email);
    }
  }

  await updateDoc(doc(db, 'users', userId), {
    name, email, phone, initials: name.charAt(0).toUpperCase()
  });
};

export const updateUserAvatar = async (userId: string, avatarDataUrl: string) => {
  await updateDoc(doc(db, 'users', userId), { avatar_url: avatarDataUrl });
};

// --- PROJECTS ---
export const fetchProjects = async (): Promise<Project[]> => {
  const snap = await getDocs(collection(db, 'projects'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
};

export const subscribeToProjects = (cb: (projects: Project[]) => void) => {
  return onSnapshot(collection(db, 'projects'), (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
  });
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

export const updateProject = async (projectId: string, end_date?: string, start_date?: string, status?: string, title?: string, description?: string) => {
  const updates: any = {};
  if (end_date !== undefined) updates.end_date = end_date || null;
  if (start_date) updates.created_at = start_date;
  if (status) updates.status = status;
  if (title) updates.title = title;
  if (description !== undefined) updates.description = description;
  
  await updateDoc(doc(db, 'projects', projectId), updates);
};

export const createCustomerLead = async (name: string, company: string, email: string) => {
  const docRef = await addDoc(collection(db, 'projects'), {
    title: name,
    customer_company: company,
    customer_email: email,
    description: `Initial contact and lead tracking pipeline`,
    status: 'lead',
    created_at: new Date().toISOString()
  });
  
  // Attach default invisible tracking task to act as the native timeline anchor
  await addDoc(collection(db, 'tasks'), {
    project_id: docRef.id,
    title: 'Pipeline tracking',
    assignees: [],
    status: 'active',
    created_at: new Date().toISOString()
  });
  
  return docRef.id;
};

// --- TASKS & UPDATES ---
export const fetchTasks = async (): Promise<Task[]> => {
  const snap = await getDocs(collection(db, 'tasks'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
};

export const subscribeToTasks = (cb: (tasks: Task[]) => void) => {
  return onSnapshot(collection(db, 'tasks'), (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
  });
};

export const createTask = async (projectId: string, title: string, assignees: string[], due_date?: string, details?: string, status: string = 'todo') => {
  const docRef = await addDoc(collection(db, 'tasks'), {
    project_id: projectId,
    title,
    details: details || null,
    assignees,
    status,
    due_date: due_date || null,
    created_at: new Date().toISOString()
  });
  return docRef.id;
};

export const updateTask = async (taskId: string, updates: Partial<any>) => {
  await updateDoc(doc(db, 'tasks', taskId), updates);
};

export const deleteTask = async (taskId: string) => {
  await deleteDoc(doc(db, 'tasks', taskId));
};

export const updateTaskOrders = async (reorderedTasks: { id: string, order_index: number }[]) => {
  const batch = writeBatch(db);
  for (const task of reorderedTasks) {
    batch.update(doc(db, 'tasks', task.id), { order_index: task.order_index });
  }
  await batch.commit();
};

export const updateTaskUpdateOrders = async (reorderedUpdates: { id: string, order_index: number }[]) => {
  const batch = writeBatch(db);
  for (const update of reorderedUpdates) {
    batch.update(doc(db, 'task_updates', update.id), { order_index: update.order_index });
  }
  await batch.commit();
};

export const updateTaskUpdate = async (updateId: string, updates: Partial<any>) => {
  await updateDoc(doc(db, 'task_updates', updateId), updates);
};

export const fetchTaskUpdates = async (taskId: string): Promise<TaskUpdate[]> => {
  const q = query(collection(db, 'task_updates'), where('task_id', '==', taskId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskUpdate)).sort((a,b) => {
    if (a.order_index !== undefined && b.order_index !== undefined) {
      return a.order_index - b.order_index;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
};

export const subscribeToAllTaskUpdates = (cb: (updates: TaskUpdate[]) => void) => {
  return onSnapshot(collection(db, 'task_updates'), (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskUpdate)).sort((a,b) => {
      if (a.order_index !== undefined && b.order_index !== undefined) {
        return a.order_index - b.order_index;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }));
  });
};

export const addTaskUpdate = async (taskId: string, authorId: string, note: string, isActionItem?: boolean) => {
  const docRef = await addDoc(collection(db, 'task_updates'), {
    task_id: taskId,
    author_id: authorId,
    note,
    is_action_item: isActionItem || false,
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

export const addThreadMessage = async (updateId: string, authorId: string, message: string, replyToId?: string) => {
  const newMessage: any = {
    id: Math.random().toString(36).substring(2, 11),
    author_id: authorId,
    message,
    created_at: new Date().toISOString()
  };
  if (replyToId) {
    newMessage.reply_to_id = replyToId;
  }
  
  await updateDoc(doc(db, 'task_updates', updateId), {
    thread: arrayUnion(newMessage)
  });
};
