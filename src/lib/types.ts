export type UserRole = "admin" | "member";

export interface Profile {
  id: string;
  name: string;
  email: string;
  contact_no: string;
  role: UserRole;
  created_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  user_name: string;
  submission_date: string;
  submission_time: string;
  completion_date: string;
  application_number: string;
  cable_return: boolean;
  cable_return_date: string | null;
  photos: string[];
  remark: string | null;
  created_at: string;
}
