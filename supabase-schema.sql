-- BlueFrame Construction Management - Database Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed');
CREATE TYPE project_type AS ENUM ('new_build', 'remodel', 'addition', 'renovation');
CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'completed', 'delayed');
CREATE TYPE trade_type AS ENUM (
  'demolition', 'framing', 'plumbing', 'electrical', 'hvac',
  'insulation', 'drywall', 'painting', 'flooring', 'roofing',
  'cabinets', 'countertops', 'tile', 'trim', 'landscaping', 'concrete', 'other'
);
CREATE TYPE budget_category AS ENUM (
  'labor', 'materials', 'permits_fees', 'equipment_rental',
  'subcontractors', 'contingency', 'other'
);
CREATE TYPE change_order_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE photo_category AS ENUM ('before', 'progress', 'after', 'issue', 'other');
CREATE TYPE document_category AS ENUM (
  'permits', 'contracts', 'architectural_plans', 'invoices', 'receipts',
  'warranties', 'insurance', 'change_orders', 'inspection_reports', 'other'
);

-- ============================================
-- TABLES (in correct dependency order)
-- ============================================

-- Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  client_name VARCHAR(255),
  type project_type DEFAULT 'new_build',
  square_footage INTEGER,
  start_date DATE,
  estimated_completion_date DATE,
  actual_completion_date DATE,
  total_budget DECIMAL(12, 2),
  status project_status DEFAULT 'planning',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  trade_type trade_type DEFAULT 'other',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  dependencies UUID[] DEFAULT '{}',
  assigned_to VARCHAR(255),
  status task_status DEFAULT 'not_started',
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets Table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category budget_category NOT NULL,
  estimated_amount DECIMAL(12, 2) DEFAULT 0,
  actual_amount DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, category)
);

-- Change Orders Table (MUST be before cost_entries)
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status change_order_status DEFAULT 'pending',
  requested_date DATE NOT NULL,
  approved_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost Entries Table (references change_orders)
CREATE TABLE cost_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category budget_category NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL,
  vendor VARCHAR(255),
  description TEXT,
  receipt_url TEXT,
  is_change_order BOOLEAN DEFAULT FALSE,
  change_order_id UUID REFERENCES change_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos Table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  location VARCHAR(255),
  category photo_category DEFAULT 'progress',
  caption TEXT,
  taken_date DATE,
  uploaded_date TIMESTAMPTZ DEFAULT NOW(),
  file_size INTEGER,
  dimensions VARCHAR(50)
);

-- Documents Table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  category document_category DEFAULT 'other',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  uploaded_date TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_start_date ON tasks(start_date);
CREATE INDEX idx_budgets_project_id ON budgets(project_id);
CREATE INDEX idx_cost_entries_project_id ON cost_entries(project_id);
CREATE INDEX idx_cost_entries_date ON cost_entries(date);
CREATE INDEX idx_change_orders_project_id ON change_orders(project_id);
CREATE INDEX idx_photos_project_id ON photos(project_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks policies (through project ownership)
CREATE POLICY "Users can view tasks of own projects" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can create tasks for own projects" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update tasks of own projects" ON tasks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can delete tasks of own projects" ON tasks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

-- Budgets policies
CREATE POLICY "Users can view budgets of own projects" ON budgets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = budgets.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can create budgets for own projects" ON budgets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = budgets.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update budgets of own projects" ON budgets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = budgets.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can delete budgets of own projects" ON budgets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = budgets.project_id AND projects.user_id = auth.uid())
  );

-- Cost entries policies
CREATE POLICY "Users can view cost entries of own projects" ON cost_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = cost_entries.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can create cost entries for own projects" ON cost_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = cost_entries.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update cost entries of own projects" ON cost_entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = cost_entries.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can delete cost entries of own projects" ON cost_entries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = cost_entries.project_id AND projects.user_id = auth.uid())
  );

-- Change orders policies
CREATE POLICY "Users can view change orders of own projects" ON change_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = change_orders.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can create change orders for own projects" ON change_orders
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = change_orders.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update change orders of own projects" ON change_orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = change_orders.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can delete change orders of own projects" ON change_orders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = change_orders.project_id AND projects.user_id = auth.uid())
  );

-- Photos policies
CREATE POLICY "Users can view photos of own projects" ON photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = photos.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can create photos for own projects" ON photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = photos.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update photos of own projects" ON photos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = photos.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can delete photos of own projects" ON photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = photos.project_id AND projects.user_id = auth.uid())
  );

-- Documents policies
CREATE POLICY "Users can view documents of own projects" ON documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can create documents for own projects" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update documents of own projects" ON documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can delete documents of own projects" ON documents
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
  );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_change_orders_updated_at
  BEFORE UPDATE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
