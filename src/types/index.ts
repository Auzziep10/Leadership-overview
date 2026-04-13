export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // Migrating to dynamic roles instead of hardcoded strings
  role_id?: string;
  reports_to?: string; 
  initials: string;
  avatar_url?: string;
  phone?: string;
  last_seen_notifications?: string;
}

export interface Role {
  id: string;
  name: string;
  level: number; // 0 = Owner/Top, 1 = Executive, 2 = Manager, etc.
}

export interface Project {
  id: string;
  title: string;
  description: string;
  created_at: string;
  end_date?: string;
  status: 'active' | 'completed' | 'archived' | 'lead';
  customer_company?: string;
  customer_email?: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  details?: string;
  assignees: string[]; // User IDs
  due_date?: string; // Newly added
  created_at: string;
  status: 'pending' | 'in_progress' | 'review' | 'done';
}

export interface ThreadMessage {
  id: string;
  author_id: string;
  message: string;
  created_at: string;
}

export interface TaskUpdate {
  id: string;
  task_id: string;
  author_id: string;
  note: string;
  created_at: string;
  admin_reply?: string;
  admin_reply_by?: string;
  user_response?: string;
  thread?: ThreadMessage[];
}
