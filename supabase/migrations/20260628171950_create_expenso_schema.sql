
/*
# Expenso - Daily Expense Tracker Schema

## Overview
Single-tenant personal expense tracker with monthly budgeting and expense logging.
No authentication required — all data is shared/public under anon access.

## New Tables

### categories
Stores the fixed expense categories (CEB, Water, Rent, etc.).
- id: UUID primary key
- name: Category display name
- icon: Lucide icon name string
- color: Hex color for UI display
- allows_multiple: Whether multiple sub-entries are allowed (e.g. Subscriptions, Extra)
- sort_order: Display ordering
- is_extra: Whether this is the "extra/unplanned" category type

### months
One record per tracked month. Stores the total income for that month.
- id: UUID primary key
- year: Calendar year (e.g. 2026)
- month: Month number 1-12
- income: Total income for that month
- UNIQUE constraint on (year, month)

### budgets
Expected (planned) amounts per category per month.
- id: UUID primary key
- month_id: FK to months
- category_id: FK to categories
- expected_amount: Planned spending for this category
- UNIQUE constraint on (month_id, category_id)

### expenses
Actual expense entries. Multiple entries allowed per category per month.
- id: UUID primary key
- month_id: FK to months
- category_id: FK to categories
- amount: Expense amount
- description: Optional note/label
- date: Date of expense

## Security
RLS enabled on all tables with open anon + authenticated policies
(single-tenant personal app, no auth).

## Seed Data
Pre-populated categories matching the user's fixed expense list from their tracker.
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'circle',
  color text NOT NULL DEFAULT '#22d3ee',
  allows_multiple boolean NOT NULL DEFAULT false,
  is_extra boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);

-- Months table
CREATE TABLE IF NOT EXISTS months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  income decimal(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (year, month)
);

ALTER TABLE months ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_months" ON months;
CREATE POLICY "anon_select_months" ON months FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_months" ON months;
CREATE POLICY "anon_insert_months" ON months FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_months" ON months;
CREATE POLICY "anon_update_months" ON months FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_months" ON months;
CREATE POLICY "anon_delete_months" ON months FOR DELETE
  TO anon, authenticated USING (true);

-- Budgets table (expected amounts per category per month)
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id uuid NOT NULL REFERENCES months(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  expected_amount decimal(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (month_id, category_id)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_budgets" ON budgets;
CREATE POLICY "anon_select_budgets" ON budgets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_budgets" ON budgets;
CREATE POLICY "anon_insert_budgets" ON budgets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_budgets" ON budgets;
CREATE POLICY "anon_update_budgets" ON budgets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_budgets" ON budgets;
CREATE POLICY "anon_delete_budgets" ON budgets FOR DELETE
  TO anon, authenticated USING (true);

-- Expenses table (actual expense entries)
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id uuid NOT NULL REFERENCES months(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount decimal(14,2) NOT NULL,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_expenses" ON expenses;
CREATE POLICY "anon_select_expenses" ON expenses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_expenses" ON expenses;
CREATE POLICY "anon_insert_expenses" ON expenses FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_expenses" ON expenses;
CREATE POLICY "anon_update_expenses" ON expenses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_expenses" ON expenses;
CREATE POLICY "anon_delete_expenses" ON expenses FOR DELETE
  TO anon, authenticated USING (true);

-- Seed categories (idempotent using DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories LIMIT 1) THEN
    INSERT INTO categories (name, icon, color, allows_multiple, is_extra, sort_order) VALUES
      ('CEB',            'zap',          '#f59e0b', false, false, 1),
      ('Water',          'droplets',     '#06b6d4', false, false, 2),
      ('TP & Internet',  'wifi',         '#8b5cf6', false, false, 3),
      ('Rent',           'home',         '#22d3ee', false, false, 4),
      ('Loan Repayment', 'landmark',     '#f97316', false, false, 5),
      ('Lease',          'car',          '#84cc16', false, false, 6),
      ('Insurance-1',    'shield',       '#10b981', false, false, 7),
      ('Insurance-2',    'shield-check', '#14b8a6', false, false, 8),
      ('Subscriptions',  'repeat',       '#a78bfa', true,  false, 9),
      ('Fuel',           'fuel',         '#fb923c', false, false, 10),
      ('House Hold',     'shopping-cart','#34d399', false, false, 11),
      ('Credit Card',    'credit-card',  '#f43f5e', false, false, 12),
      ('Extra',          'plus-circle',  '#94a3b8', true,  true,  13);
  END IF;
END $$;
