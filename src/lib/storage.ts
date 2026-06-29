import type { Category, Month, Budget, Expense } from '../types';

/**
 * Local, backend-free persistence for the Expenso extension.
 *
 * Data lives in chrome.storage.local when running as an installed extension,
 * and falls back to window.localStorage during `npm run dev` in a normal browser.
 * Everything is stored under a single key as one JSON document.
 */

const KEY = 'expenso_db_v1';

interface DB {
  categories: Category[];
  months: Month[];
  budgets: Budget[];
  expenses: Expense[];
}

// chrome.* is only present inside the extension; type it loosely to avoid @types/chrome.
const chromeApi: any = (globalThis as any).chrome;
const hasChromeStorage = !!(chromeApi && chromeApi.storage && chromeApi.storage.local);

const now = () => new Date().toISOString();
const uuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Default categories (mirrors the original seed data, with stable ids so that
// budgets/expenses keep referencing the right category across reloads).
const DEFAULT_CATEGORIES: Category[] = [
  { name: 'CEB', icon: 'zap', color: '#f59e0b', allows_multiple: false, is_extra: false, sort_order: 1 },
  { name: 'Water', icon: 'droplets', color: '#06b6d4', allows_multiple: false, is_extra: false, sort_order: 2 },
  { name: 'TP & Internet', icon: 'wifi', color: '#8b5cf6', allows_multiple: false, is_extra: false, sort_order: 3 },
  { name: 'Rent', icon: 'home', color: '#22d3ee', allows_multiple: false, is_extra: false, sort_order: 4 },
  { name: 'Loan Repayment', icon: 'landmark', color: '#f97316', allows_multiple: false, is_extra: false, sort_order: 5 },
  { name: 'Lease', icon: 'car', color: '#84cc16', allows_multiple: false, is_extra: false, sort_order: 6 },
  { name: 'Insurance-1', icon: 'shield', color: '#10b981', allows_multiple: false, is_extra: false, sort_order: 7 },
  { name: 'Insurance-2', icon: 'shield-check', color: '#14b8a6', allows_multiple: false, is_extra: false, sort_order: 8 },
  { name: 'Subscriptions', icon: 'repeat', color: '#a78bfa', allows_multiple: true, is_extra: false, sort_order: 9 },
  { name: 'Fuel', icon: 'fuel', color: '#fb923c', allows_multiple: false, is_extra: false, sort_order: 10 },
  { name: 'House Hold', icon: 'shopping-cart', color: '#34d399', allows_multiple: false, is_extra: false, sort_order: 11 },
  { name: 'Credit Card', icon: 'credit-card', color: '#f43f5e', allows_multiple: false, is_extra: false, sort_order: 12 },
  { name: 'Extra', icon: 'plus-circle', color: '#94a3b8', allows_multiple: true, is_extra: true, sort_order: 13 },
  { name: 'Uber/Pick me', icon: 'car-taxi-front', color: '#6366f1', allows_multiple: false, is_extra: false, sort_order: 14 },
  { name: 'Kangaroo', icon: 'package', color: '#f472b6', allows_multiple: false, is_extra: false, sort_order: 15 },
].map((c) => ({ ...c, id: `cat-${c.sort_order}`, created_at: now() }));

function emptyDB(): DB {
  return { categories: [...DEFAULT_CATEGORIES], months: [], budgets: [], expenses: [] };
}

async function readRaw(): Promise<DB | null> {
  if (hasChromeStorage) {
    const res = await chromeApi.storage.local.get(KEY);
    return (res?.[KEY] as DB) ?? null;
  }
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as DB) : null;
}

async function writeRaw(db: DB): Promise<void> {
  if (hasChromeStorage) {
    await chromeApi.storage.local.set({ [KEY]: db });
  } else {
    localStorage.setItem(KEY, JSON.stringify(db));
  }
}

async function loadDB(): Promise<DB> {
  const existing = await readRaw();
  if (!existing) {
    const fresh = emptyDB();
    await writeRaw(fresh);
    return fresh;
  }
  // Make sure any newly-added default categories appear for older installs.
  const known = new Set(existing.categories.map((c) => c.id));
  const missing = DEFAULT_CATEGORIES.filter((c) => !known.has(c.id));
  if (missing.length > 0) {
    existing.categories = [...existing.categories, ...missing].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    await writeRaw(existing);
  }
  return existing;
}

export const store = {
  async getCategories(): Promise<Category[]> {
    const db = await loadDB();
    return [...db.categories].sort((a, b) => a.sort_order - b.sort_order);
  },

  async getMonth(year: number, month: number): Promise<Month | null> {
    const db = await loadDB();
    return db.months.find((m) => m.year === year && m.month === month) ?? null;
  },

  async insertMonth(year: number, month: number, income: number, budgetAmount: number): Promise<Month> {
    const db = await loadDB();
    const record: Month = {
      id: uuid(),
      year,
      month,
      income,
      budget_amount: budgetAmount,
      created_at: now(),
    };
    db.months.push(record);
    await writeRaw(db);
    return record;
  },

  async updateMonth(id: string, updates: Partial<Pick<Month, 'income' | 'budget_amount'>>): Promise<Month | null> {
    const db = await loadDB();
    const m = db.months.find((x) => x.id === id);
    if (!m) return null;
    Object.assign(m, updates);
    await writeRaw(db);
    return m;
  },

  async getBudgets(monthId: string): Promise<Budget[]> {
    const db = await loadDB();
    return db.budgets.filter((b) => b.month_id === monthId);
  },

  async insertBudget(monthId: string, categoryId: string, expectedAmount: number): Promise<Budget> {
    const db = await loadDB();
    const record: Budget = {
      id: uuid(),
      month_id: monthId,
      category_id: categoryId,
      expected_amount: expectedAmount,
      created_at: now(),
    };
    db.budgets.push(record);
    await writeRaw(db);
    return record;
  },

  async updateBudget(id: string, expectedAmount: number): Promise<Budget | null> {
    const db = await loadDB();
    const b = db.budgets.find((x) => x.id === id);
    if (!b) return null;
    b.expected_amount = expectedAmount;
    await writeRaw(db);
    return b;
  },

  async getExpenses(monthId: string): Promise<Expense[]> {
    const db = await loadDB();
    return db.expenses
      .filter((e) => e.month_id === monthId)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  },

  async insertExpense(
    monthId: string,
    categoryId: string,
    amount: number,
    description: string,
    date: string
  ): Promise<Expense> {
    const db = await loadDB();
    const record: Expense = {
      id: uuid(),
      month_id: monthId,
      category_id: categoryId,
      amount,
      description: description || null,
      date,
      created_at: now(),
    };
    db.expenses.push(record);
    await writeRaw(db);
    return record;
  },

  async updateExpense(
    id: string,
    updates: Partial<Pick<Expense, 'category_id' | 'amount' | 'description' | 'date'>>
  ): Promise<Expense | null> {
    const db = await loadDB();
    const e = db.expenses.find((x) => x.id === id);
    if (!e) return null;
    if (updates.category_id !== undefined) e.category_id = updates.category_id;
    if (updates.amount !== undefined) e.amount = updates.amount;
    if (updates.description !== undefined) e.description = updates.description || null;
    if (updates.date !== undefined) e.date = updates.date;
    await writeRaw(db);
    return e;
  },

  async deleteExpense(id: string): Promise<void> {
    const db = await loadDB();
    db.expenses = db.expenses.filter((e) => e.id !== id);
    await writeRaw(db);
  },
};
