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
  signature_profiles?: SignatureProfile[];
}

export interface SignatureProfile {
  id: string;
  name: string; // The alias e.g., 'Main Signature', 'Holiday Promo', etc
  title: string;
  location: string;
  full_name: string;
  phone: string;
  email: string;
  linkedin: string;
  website: string;
  framing: string;
  profile_url: string;
  global_banner: string;
  global_logo: string;
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
  order_index?: number;
  assignees: string[]; // User IDs
  due_date?: string; // Newly added
  created_at: string;
  status: 'pending' | 'in_progress' | 'review' | 'done' | 'todo' | 'active'; // Updated based on app usage
  progress?: number; // Stores completion percentages (e.g. 25, 50, 75, 100)
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
  is_action_item?: boolean;
  created_at: string;
  admin_reply?: string;
  admin_reply_by?: string;
  user_response?: string;
  thread?: ThreadMessage[];
}
