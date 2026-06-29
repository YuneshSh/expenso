import { useState, useEffect, useCallback } from 'react';
import { store } from '../lib/storage';
import type { Category, Month, Budget, Expense } from '../types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    store.getCategories().then((data) => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  return { categories, loading };
}

export function useMonth(year: number, month: number) {
  const [monthData, setMonthData] = useState<Month | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    const data = await store.getMonth(year, month);
    setMonthData(data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  const upsertMonth = async (income: number, budgetAmount?: number) => {
    if (monthData) {
      const updates: Partial<Pick<Month, 'income' | 'budget_amount'>> = { income };
      if (budgetAmount !== undefined) updates.budget_amount = budgetAmount;
      const data = await store.updateMonth(monthData.id, updates);
      if (data) setMonthData(data);
      return data;
    } else {
      const data = await store.insertMonth(year, month, income, budgetAmount ?? 0);
      if (data) setMonthData(data);
      return data;
    }
  };

  return { monthData, loading, upsertMonth, refetch: fetchMonth };
}

export function useBudgets(monthId: string | null) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBudgets = useCallback(async () => {
    if (!monthId) { setBudgets([]); return; }
    setLoading(true);
    const data = await store.getBudgets(monthId);
    setBudgets(data);
    setLoading(false);
  }, [monthId]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const upsertBudget = async (categoryId: string, expectedAmount: number) => {
    if (!monthId) return;
    const existing = budgets.find(b => b.category_id === categoryId);
    if (existing) {
      const data = await store.updateBudget(existing.id, expectedAmount);
      if (data) setBudgets(prev => prev.map(b => b.id === data.id ? data : b));
    } else {
      const data = await store.insertBudget(monthId, categoryId, expectedAmount);
      if (data) setBudgets(prev => [...prev, data]);
    }
  };

  return { budgets, loading, upsertBudget, refetch: fetchBudgets };
}

export function useExpenses(monthId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!monthId) { setExpenses([]); return; }
    setLoading(true);
    const data = await store.getExpenses(monthId);
    setExpenses(data);
    setLoading(false);
  }, [monthId]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const addExpense = async (categoryId: string, amount: number, description: string, date: string) => {
    if (!monthId) return null;
    const data = await store.insertExpense(monthId, categoryId, amount, description, date);
    if (data) setExpenses(prev => [data, ...prev]);
    return data;
  };

  const updateExpense = async (
    id: string,
    updates: Partial<Pick<Expense, 'category_id' | 'amount' | 'description' | 'date'>>
  ) => {
    const data = await store.updateExpense(id, updates);
    if (data) {
      setExpenses(prev =>
        prev
          .map(e => (e.id === data.id ? data : e))
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      );
    }
    return data;
  };

  const deleteExpense = async (id: string) => {
    await store.deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  return { expenses, loading, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses };
}
