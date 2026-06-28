import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Category, Month, Budget, Expense } from '../types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setCategories(data);
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
    const { data } = await supabase
      .from('months')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();
    setMonthData(data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  const upsertMonth = async (income: number, budgetAmount?: number) => {
    if (monthData) {
      const updates: Record<string, number> = { income };
      if (budgetAmount !== undefined) updates.budget_amount = budgetAmount;
      const { data } = await supabase
        .from('months')
        .update(updates)
        .eq('id', monthData.id)
        .select()
        .single();
      if (data) setMonthData(data);
      return data;
    } else {
      const { data } = await supabase
        .from('months')
        .insert({ year, month, income, budget_amount: budgetAmount ?? 0 })
        .select()
        .single();
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
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('month_id', monthId);
    if (data) setBudgets(data);
    setLoading(false);
  }, [monthId]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const upsertBudget = async (categoryId: string, expectedAmount: number) => {
    if (!monthId) return;
    const existing = budgets.find(b => b.category_id === categoryId);
    if (existing) {
      const { data } = await supabase
        .from('budgets')
        .update({ expected_amount: expectedAmount })
        .eq('id', existing.id)
        .select()
        .single();
      if (data) setBudgets(prev => prev.map(b => b.id === data.id ? data : b));
    } else {
      const { data } = await supabase
        .from('budgets')
        .insert({ month_id: monthId, category_id: categoryId, expected_amount: expectedAmount })
        .select()
        .single();
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
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('month_id', monthId)
      .order('date', { ascending: false });
    if (data) setExpenses(data);
    setLoading(false);
  }, [monthId]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const addExpense = async (categoryId: string, amount: number, description: string, date: string) => {
    if (!monthId) return null;
    const { data, error } = await supabase
      .from('expenses')
      .insert({ month_id: monthId, category_id: categoryId, amount, description: description || null, date })
      .select()
      .single();
    if (data) setExpenses(prev => [data, ...prev]);
    return error ? null : data;
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) setExpenses(prev => prev.filter(e => e.id !== id));
  };

  return { expenses, loading, addExpense, deleteExpense, refetch: fetchExpenses };
}
