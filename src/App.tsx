import { useState, useCallback, ReactNode } from 'react';
import { LayoutDashboard, Target, Plus, List, Settings as SettingsIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Dashboard from './components/Dashboard';
import BudgetSetup from './components/BudgetSetup';
import AddExpense from './components/AddExpense';
import ExpensesList from './components/ExpensesList';
import Settings from './components/Settings';
import { useCategories, useMonth, useBudgets, useExpenses } from './hooks';
import { store } from './lib/storage';
import type { ExpensoBackup } from './lib/storage';
import type { View } from './types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [view, setView] = useState<View>('dashboard');

  const { categories, addCategory, updateCategory, deleteCategory, resetCategories } = useCategories();
  const { monthData, upsertMonth } = useMonth(year, month);
  const { budgets, upsertBudget, refetch: refetchBudgets } = useBudgets(monthData?.id ?? null);
  const { expenses, addExpense, updateExpense, deleteExpense, refetch: refetchExpenses } = useExpenses(monthData?.id ?? null);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleSaveIncome = useCallback(async (income: number, budgetAmount: number) => {
    await upsertMonth(income, budgetAmount);
  }, [upsertMonth]);

  const handleSaveBudget = useCallback(async (categoryId: string, amount: number) => {
    if (!monthData) {
      await upsertMonth(0);
    }
    await upsertBudget(categoryId, amount);
  }, [monthData, upsertMonth, upsertBudget]);

  const handleAddExpense = useCallback(async (
    categoryId: string, amount: number, description: string, date: string
  ) => {
    let mid = monthData?.id;
    if (!mid) {
      const m = await upsertMonth(0);
      mid = m?.id;
    }
    if (!mid) return null;
    return addExpense(categoryId, amount, description, date);
  }, [monthData, upsertMonth, addExpense]);

  // Deleting/resetting categories cascades to budgets & expenses, so refresh
  // the current month's data afterwards to keep the UI in sync.
  const handleDeleteCategory = useCallback(async (id: string) => {
    await deleteCategory(id);
    await Promise.all([refetchBudgets(), refetchExpenses()]);
  }, [deleteCategory, refetchBudgets, refetchExpenses]);

  const handleResetCategories = useCallback(async () => {
    await resetCategories();
    await Promise.all([refetchBudgets(), refetchExpenses()]);
  }, [resetCategories, refetchBudgets, refetchExpenses]);

  const handleExport = useCallback(async () => store.exportDB(), []);

  const handleImport = useCallback(async (backup: ExpensoBackup) => {
    await store.importDB(backup);
    // Full reload so every hook picks up the replaced database (month IDs included).
    window.location.reload();
  }, []);

  const tabs: { id: View; icon: ReactNode; label: string }[] = [
    { id: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Overview' },
    { id: 'budget',    icon: <Target className="w-4 h-4" />,           label: 'Budget' },
    { id: 'add',       icon: <Plus className="w-4 h-4" />,             label: 'Add' },
    { id: 'expenses',  icon: <List className="w-4 h-4" />,             label: 'History' },
    { id: 'settings',  icon: <SettingsIcon className="w-4 h-4" />,     label: 'Settings' },
  ];

  return (
    <div className="w-[480px] h-[600px] flex flex-col overflow-hidden relative"
      style={{ background: 'linear-gradient(160deg, #070b14 0%, #0c1524 40%, #0a1220 100%)' }}>
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.04), transparent 70%)' }} />
      <div className="absolute bottom-1/3 right-0 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.03), transparent 70%)' }} />

      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-3 pb-2.5 flex items-center justify-between relative z-10"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,11,20,0.6)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2.5">
          <img src="icons/icon48.png" alt="Expenso" className="w-8 h-8" />
          <div>
            <span className="text-sm font-bold text-white tracking-tight">Expenso</span>
            <span className="text-[10px] text-white/25 ml-1.5 font-light">tracker</span>
          </div>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-1.5 glass rounded-xl px-2 py-1">
          <button onClick={prevMonth} className="p-0.5 rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-medium text-white/70 min-w-[68px] text-center">
            {MONTHS[month - 1].slice(0, 3)} {year}
          </span>
          <button onClick={nextMonth} className="p-0.5 rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative z-10">
        {view === 'dashboard' && (
          <Dashboard
            month={monthData}
            categories={categories}
            budgets={budgets}
            expenses={expenses}
            onSetupMonth={() => setView('budget')}
          />
        )}
        {view === 'budget' && (
          <BudgetSetup
            year={year}
            month={month}
            monthData={monthData}
            categories={categories}
            budgets={budgets}
            expenses={expenses}
            onSaveIncome={handleSaveIncome}
            onSaveBudget={handleSaveBudget}
          />
        )}
        {view === 'add' && (
          <AddExpense
            month={monthData}
            categories={categories}
            onAdd={handleAddExpense}
            onAddCategory={addCategory}
            onSetupFirst={() => setView('budget')}
          />
        )}
        {view === 'expenses' && (
          <ExpensesList
            month={monthData}
            categories={categories}
            budgets={budgets}
            expenses={expenses}
            onUpdate={updateExpense}
            onDelete={deleteExpense}
          />
        )}
        {view === 'settings' && (
          <Settings
            categories={categories}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={handleDeleteCategory}
            onResetCategories={handleResetCategories}
            onExport={handleExport}
            onImport={handleImport}
          />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="flex-shrink-0 flex items-center justify-around px-3 py-2 relative z-10"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,11,20,0.7)', backdropFilter: 'blur(12px)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 relative
              ${view === tab.id
                ? 'text-cyan-400'
                : 'text-white/25 hover:text-white/50'
              }
              ${tab.id === 'add' ? 'bg-gradient-to-b from-cyan-500/10 to-teal-500/5 border border-cyan-500/20' : ''}
            `}
          >
            {tab.icon}
            <span className="text-[9px] font-medium">{tab.label}</span>
            {view === tab.id && tab.id !== 'add' && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
