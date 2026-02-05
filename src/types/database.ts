export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed'
export type ProjectType = 'new_build' | 'remodel' | 'addition' | 'renovation'
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed'
export type TradeType =
  | 'demolition'
  | 'framing'
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'insulation'
  | 'drywall'
  | 'painting'
  | 'flooring'
  | 'roofing'
  | 'cabinets'
  | 'countertops'
  | 'tile'
  | 'trim'
  | 'landscaping'
  | 'concrete'
  | 'other'

export type BudgetCategory =
  | 'labor'
  | 'materials'
  | 'permits_fees'
  | 'equipment_rental'
  | 'subcontractors'
  | 'contingency'
  | 'other'

export type ChangeOrderStatus = 'pending' | 'approved' | 'rejected'
export type PhotoCategory = 'before' | 'progress' | 'after' | 'issue' | 'other'
export type DocumentCategory =
  | 'permits'
  | 'contracts'
  | 'architectural_plans'
  | 'invoices'
  | 'receipts'
  | 'warranties'
  | 'insurance'
  | 'change_orders'
  | 'inspection_reports'
  | 'other'

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string
          client_name: string | null
          type: ProjectType
          square_footage: number | null
          start_date: string | null
          estimated_completion_date: string | null
          actual_completion_date: string | null
          total_budget: number | null
          status: ProjectStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address: string
          client_name?: string | null
          type?: ProjectType
          square_footage?: number | null
          start_date?: string | null
          estimated_completion_date?: string | null
          actual_completion_date?: string | null
          total_budget?: number | null
          status?: ProjectStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string
          client_name?: string | null
          type?: ProjectType
          square_footage?: number | null
          start_date?: string | null
          estimated_completion_date?: string | null
          actual_completion_date?: string | null
          total_budget?: number | null
          status?: ProjectStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          name: string
          trade_type: TradeType
          start_date: string
          end_date: string
          duration_days: number
          dependencies: string[]
          assigned_to: string | null
          status: TaskStatus
          notes: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          trade_type?: TradeType
          start_date: string
          end_date: string
          duration_days: number
          dependencies?: string[]
          assigned_to?: string | null
          status?: TaskStatus
          notes?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          trade_type?: TradeType
          start_date?: string
          end_date?: string
          duration_days?: number
          dependencies?: string[]
          assigned_to?: string | null
          status?: TaskStatus
          notes?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          project_id: string
          category: BudgetCategory
          estimated_amount: number
          actual_amount: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          category: BudgetCategory
          estimated_amount?: number
          actual_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          category?: BudgetCategory
          estimated_amount?: number
          actual_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cost_entries: {
        Row: {
          id: string
          project_id: string
          category: BudgetCategory
          amount: number
          date: string
          vendor: string | null
          description: string | null
          receipt_url: string | null
          is_change_order: boolean
          change_order_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          category: BudgetCategory
          amount: number
          date: string
          vendor?: string | null
          description?: string | null
          receipt_url?: string | null
          is_change_order?: boolean
          change_order_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          category?: BudgetCategory
          amount?: number
          date?: string
          vendor?: string | null
          description?: string | null
          receipt_url?: string | null
          is_change_order?: boolean
          change_order_id?: string | null
          created_at?: string
        }
      }
      change_orders: {
        Row: {
          id: string
          project_id: string
          description: string
          amount: number
          status: ChangeOrderStatus
          requested_date: string
          approved_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          description: string
          amount: number
          status?: ChangeOrderStatus
          requested_date: string
          approved_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          description?: string
          amount?: number
          status?: ChangeOrderStatus
          requested_date?: string
          approved_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          project_id: string
          file_url: string
          thumbnail_url: string | null
          location: string | null
          category: PhotoCategory
          caption: string | null
          taken_date: string | null
          uploaded_date: string
          file_size: number | null
          dimensions: string | null
        }
        Insert: {
          id?: string
          project_id: string
          file_url: string
          thumbnail_url?: string | null
          location?: string | null
          category?: PhotoCategory
          caption?: string | null
          taken_date?: string | null
          uploaded_date?: string
          file_size?: number | null
          dimensions?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          file_url?: string
          thumbnail_url?: string | null
          location?: string | null
          category?: PhotoCategory
          caption?: string | null
          taken_date?: string | null
          uploaded_date?: string
          file_size?: number | null
          dimensions?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          project_id: string
          file_url: string
          file_name: string
          file_type: string | null
          file_size: number | null
          category: DocumentCategory
          description: string | null
          tags: string[]
          uploaded_date: string
          version: number
        }
        Insert: {
          id?: string
          project_id: string
          file_url: string
          file_name: string
          file_type?: string | null
          file_size?: number | null
          category?: DocumentCategory
          description?: string | null
          tags?: string[]
          uploaded_date?: string
          version?: number
        }
        Update: {
          id?: string
          project_id?: string
          file_url?: string
          file_name?: string
          file_type?: string | null
          file_size?: number | null
          category?: DocumentCategory
          description?: string | null
          tags?: string[]
          uploaded_date?: string
          version?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      project_status: ProjectStatus
      project_type: ProjectType
      task_status: TaskStatus
      trade_type: TradeType
      budget_category: BudgetCategory
      change_order_status: ChangeOrderStatus
      photo_category: PhotoCategory
      document_category: DocumentCategory
    }
  }
}

// Helper types for easier use
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type Budget = Database['public']['Tables']['budgets']['Row']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update']

export type CostEntry = Database['public']['Tables']['cost_entries']['Row']
export type CostEntryInsert = Database['public']['Tables']['cost_entries']['Insert']
export type CostEntryUpdate = Database['public']['Tables']['cost_entries']['Update']

export type ChangeOrder = Database['public']['Tables']['change_orders']['Row']
export type ChangeOrderInsert = Database['public']['Tables']['change_orders']['Insert']
export type ChangeOrderUpdate = Database['public']['Tables']['change_orders']['Update']

export type Photo = Database['public']['Tables']['photos']['Row']
export type PhotoInsert = Database['public']['Tables']['photos']['Insert']
export type PhotoUpdate = Database['public']['Tables']['photos']['Update']

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']
