import { useState, useMemo } from 'react';
import { Trash2, ChevronDown, ChevronRight, Search, Pencil, Check, X } from 'lucide-react';
import type { Category, Month, Budget, Expense } from '../types';

interface Props {
  month: Month | null;
  categories: Category[];
  budgets: Budget[];
  expenses: Expense[];
  onUpdate: (
    id: string,
    updates: Partial<Pick<Expense, 'category_id' | 'amount' | 'description' | 'date'>>
  ) => Promise<Expense | null>;
  onDelete: (id: string) => void;
}

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(n);

const toRaw = (display: string) => display.replace(/,/g, '');
function toDisplay(raw: string): string {
  const num = parseFloat(raw);
  if (!raw || isNaN(num)) return raw;
  return fmtNum(num);
}

interface EditDraft {
  category_id: string;
  amount: string;
  description: string;
  date: string;
}

export default function ExpensesList({ month, categories, budgets, expenses, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);

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

  // groups are open by default (expanded[id] === undefined), so toggle must
  // flip relative to the *visible* state, not the raw stored value.
  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: p[id] === false ? true : false }));

  const startEdit = (exp: Expense) => {
    setConfirmDelete(null);
    setEditingId(exp.id);
    setDraft({
      category_id: exp.category_id,
      amount: fmtNum(Number(exp.amount)),
      description: exp.description ?? '',
      date: exp.date,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = async (id: string) => {
    if (!draft) return;
    const amt = parseFloat(toRaw(draft.amount));
    if (!draft.category_id || isNaN(amt) || amt <= 0) return;
    await onUpdate(id, {
      category_id: draft.category_id,
      amount: amt,
      description: draft.description.trim(),
      date: draft.date,
    });
    cancelEdit();
  };

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

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-8 flex flex-col gap-2">
        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-white/40 text-sm">{search ? 'No results found' : 'No expenses recorded yet'}</p>
          </div>
        )}

        {grouped.map(group => {
          const isOpen = expanded[group.category.id] !== false;
          const over = group.expected > 0 && group.total > group.expected;
          return (
            <div key={group.category.id} className="glass rounded-2xl overflow-hidden flex-shrink-0">
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
                  {group.expenses.map(exp =>
                    editingId === exp.id && draft ? (
                      <div key={exp.id} className="flex flex-col gap-2 px-3 py-3 border-b border-white/5 last:border-0 bg-white/[0.03]">
                        <select
                          className="input-dark w-full rounded-lg px-2.5 py-2 text-xs"
                          value={draft.category_id}
                          onChange={e => setDraft({ ...draft, category_id: e.target.value })}
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            className="input-dark flex-1 rounded-lg px-2.5 py-2 text-xs"
                            value={draft.date}
                            onChange={e => setDraft({ ...draft, date: e.target.value })}
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            className="input-dark w-28 rounded-lg px-2.5 py-2 text-xs"
                            placeholder="Amount"
                            value={draft.amount}
                            onChange={e => {
                              const raw = toRaw(e.target.value);
                              if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                                setDraft({ ...draft, amount: raw === '' ? '' : toDisplay(raw) });
                              }
                            }}
                          />
                        </div>
                        <input
                          type="text"
                          className="input-dark w-full rounded-lg px-2.5 py-2 text-xs"
                          placeholder="Description (optional)"
                          value={draft.description}
                          onChange={e => setDraft({ ...draft, description: e.target.value })}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                          <button
                            onClick={() => saveEdit(exp.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={exp.id}
                        className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.04] border-b border-white/5 last:border-0 transition-colors"
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
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => { onDelete(exp.id); setConfirmDelete(null); }}
                              className="px-2 py-1 rounded-lg text-xs font-medium text-red-300 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 transition-colors"
                            >Delete</button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
                            >Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => startEdit(exp)}
                              title="Edit entry"
                              className="flex items-center justify-center w-7 h-7 rounded-lg text-cyan-300/90 bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/25 hover:text-cyan-200 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(exp.id)}
                              title="Delete entry"
                              className="flex items-center justify-center w-7 h-7 rounded-lg text-red-300/90 bg-red-500/10 border border-red-500/25 hover:bg-red-500/25 hover:text-red-200 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  )}
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
