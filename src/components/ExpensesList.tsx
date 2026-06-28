import { useState, useMemo } from 'react';
import { Trash2, ChevronDown, ChevronRight, Search } from 'lucide-react';
import type { Category, Month, Budget, Expense } from '../types';

interface Props {
  month: Month | null;
  categories: Category[];
  budgets: Budget[];
  expenses: Expense[];
  onDelete: (id: string) => void;
}

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function ExpensesList({ month, categories, budgets, expenses, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return categories
      .map(cat => {
        const catExpenses = expenses.filter(e => {
          if (e.category_id !== cat.id) return false;
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            cat.name.toLowerCase().includes(q) ||
            (e.description ?? '').toLowerCase().includes(q) ||
            e.amount.toString().includes(q)
          );
        });
        const budget = budgets.find(b => b.category_id === cat.id);
        const total = catExpenses.reduce((s, e) => s + Number(e.amount), 0);
        return { category: cat, expenses: catExpenses, total, expected: Number(budget?.expected_amount ?? 0) };
      })
      .filter(g => g.expenses.length > 0);
  }, [categories, budgets, expenses, search]);

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  if (!month) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-white/40 text-sm">No month selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <div className="px-4 pt-3 pb-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex justify-between items-baseline">
          <h2 className="text-sm font-semibold text-white">Expenses</h2>
          <span className="text-xs text-white/40">LKR {fmtFull(totalSpent)} total</span>
        </div>
        <div className="mt-2 relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            className="input-dark w-full rounded-xl pl-7 pr-3 py-1.5 text-xs"
            placeholder="Search expenses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-white/40 text-sm">{search ? 'No results found' : 'No expenses recorded yet'}</p>
          </div>
        )}

        {grouped.map(group => {
          const isOpen = expanded[group.category.id] !== false;
          const over = group.expected > 0 && group.total > group.expected;
          return (
            <div key={group.category.id} className="glass rounded-2xl overflow-hidden">
              {/* Category header */}
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors"
                onClick={() => toggle(group.category.id)}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: group.category.color }} />
                <span className="flex-1 text-left text-sm font-medium text-white/90 truncate">{group.category.name}</span>
                {over && <span className="text-xs text-red-400 font-medium">Over</span>}
                <span className="text-xs text-white/50 flex-shrink-0">
                  LKR {fmtFull(group.total)}
                  {group.expected > 0 && <span className="text-white/30"> / {fmtFull(group.expected)}</span>}
                </span>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/30" /> : <ChevronRight className="w-3.5 h-3.5 text-white/30" />}
              </button>

              {/* Entries */}
              {isOpen && (
                <div className="border-t border-white/5">
                  {group.expenses.map(exp => (
                    <div
                      key={exp.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-white/3 border-b border-white/5 last:border-0 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        {exp.description && (
                          <p className="text-xs text-white/70 truncate">{exp.description}</p>
                        )}
                        <p className="text-xs text-white/40">{formatDate(exp.date)}</p>
                      </div>
                      <span className="text-sm font-semibold text-white/90 flex-shrink-0">
                        {fmtFull(Number(exp.amount))}
                      </span>
                      {confirmDelete === exp.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { onDelete(exp.id); setConfirmDelete(null); }}
                            className="text-xs text-red-400 hover:text-red-300 px-1"
                          >Del</button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs text-white/30 hover:text-white/60 px-1"
                          >✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(exp.id)}>
                          <Trash2 className="w-3 h-3 text-white/20 hover:text-red-400 transition-colors" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
