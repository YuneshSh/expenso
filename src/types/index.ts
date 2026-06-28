export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  allows_multiple: boolean;
  is_extra: boolean;
  sort_order: number;
  created_at: string;
}

export interface Month {
  id: string;
  year: number;
  month: number;
  income: number;
  budget_amount: number;
  created_at: string;
}

export interface Budget {
  id: string;
  month_id: string;
  category_id: string;
  expected_amount: number;
  created_at: string;
}

export interface Expense {
  id: string;
  month_id: string;
  category_id: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

export interface CategorySummary {
  category: Category;
  expected: number;
  actual: number;
  entries: Expense[];
}

export type View = 'dashboard' | 'budget' | 'add' | 'expenses';
