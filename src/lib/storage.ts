import type { Category, Month, Budget, Expense } from '../types';
import { DEFAULT_CURRENCY } from './currencies';

/**
 * Local, backend-free persistence for the Expenso extension.
 *
 * Data lives in chrome.storage.local when running as an installed extension,
 * and falls back to window.localStorage during `npm run dev` in a normal browser.
 * Everything is stored under a single key as one JSON document.
 */

const KEY = 'expenso_db_v1';

interface DB {
  currency?: string;
  categories: Category[];
  months: Month[];
  budgets: Budget[];
  expenses: Expense[];
}

export interface ExpensoBackup {
  format: 'expenso-backup';
  version: 1;
  exportedAt: string;
  data: DB;
}

function isDB(value: unknown): value is DB {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  return (
    Array.isArray(d.categories) &&
    Array.isArray(d.months) &&
    Array.isArray(d.budgets) &&
    Array.isArray(d.expenses)
  );
}

export function parseBackup(raw: unknown): ExpensoBackup {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file');
  }
  const b = raw as Record<string, unknown>;
  if (b.format !== 'expenso-backup') {
    throw new Error('Not an Expenso backup file');
  }
  if (b.version !== 1) {
    throw new Error('Unsupported backup version');
  }
  if (!isDB(b.data)) {
    throw new Error('Backup is missing required data');
  }
  const currency =
    typeof (b.data as DB).currency === 'string' && (b.data as DB).currency
      ? (b.data as DB).currency
      : DEFAULT_CURRENCY;

  return {
    format: 'expenso-backup',
    version: 1,
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : now(),
    data: {
      currency,
      categories: b.data.categories,
      months: b.data.months,
      budgets: b.data.budgets,
      expenses: b.data.expenses,
    },
  };
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
  return {
    currency: DEFAULT_CURRENCY,
    categories: [...DEFAULT_CATEGORIES],
    months: [],
    budgets: [],
    expenses: [],
  };
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
  // Note: we intentionally do NOT re-add missing default categories here.
  // Users can customise their category set (add/edit/delete) in Settings, and
  // deleted categories must stay deleted across reloads.
  if (!existing.currency) {
    existing.currency = DEFAULT_CURRENCY;
    await writeRaw(existing);
  }
  return existing;
}

export const store = {
  async getCurrency(): Promise<string> {
    const db = await loadDB();
    return db.currency || DEFAULT_CURRENCY;
  },

  async setCurrency(code: string): Promise<string> {
    const db = await loadDB();
    db.currency = code.trim().toUpperCase() || DEFAULT_CURRENCY;
    await writeRaw(db);
    return db.currency;
  },

  async getCategories(): Promise<Category[]> {
    const db = await loadDB();
    return [...db.categories].sort((a, b) => a.sort_order - b.sort_order);
  },

  async insertCategory(
    name: string,
    color: string,
    allowsMultiple = false
  ): Promise<Category> {
    const db = await loadDB();
    const maxSort = db.categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const record: Category = {
      id: uuid(),
      name: name.trim(),
      icon: 'circle',
      color,
      allows_multiple: allowsMultiple,
      is_extra: false,
      sort_order: maxSort + 1,
      created_at: now(),
    };
    db.categories.push(record);
    await writeRaw(db);
    return record;
  },

  async updateCategory(
    id: string,
    updates: Partial<Pick<Category, 'name' | 'color' | 'allows_multiple'>>
  ): Promise<Category | null> {
    const db = await loadDB();
    const c = db.categories.find((x) => x.id === id);
    if (!c) return null;
    if (updates.name !== undefined) c.name = updates.name.trim();
    if (updates.color !== undefined) c.color = updates.color;
    if (updates.allows_multiple !== undefined) c.allows_multiple = updates.allows_multiple;
    await writeRaw(db);
    return c;
  },

  // Deleting a category also removes any budgets and expenses that reference it
  // (across every month), so no orphaned records are left behind.
  async deleteCategory(id: string): Promise<void> {
    const db = await loadDB();
    db.categories = db.categories.filter((c) => c.id !== id);
    db.budgets = db.budgets.filter((b) => b.category_id !== id);
    db.expenses = db.expenses.filter((e) => e.category_id !== id);
    await writeRaw(db);
  },

  // Replace the whole category set with the built-in defaults.
  async resetCategories(): Promise<Category[]> {
    const db = await loadDB();
    db.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c, created_at: now() }));
    await writeRaw(db);
    return [...db.categories];
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

  async exportDB(): Promise<ExpensoBackup> {
    const data = await loadDB();
    return {
      format: 'expenso-backup',
      version: 1,
      exportedAt: now(),
      data: {
        currency: data.currency || DEFAULT_CURRENCY,
        categories: [...data.categories],
        months: [...data.months],
        budgets: [...data.budgets],
        expenses: [...data.expenses],
      },
    };
  },

  async importDB(backup: unknown): Promise<void> {
    const parsed = parseBackup(backup);
    if (!parsed.data.currency) parsed.data.currency = DEFAULT_CURRENCY;
    await writeRaw(parsed.data);
  },
};
