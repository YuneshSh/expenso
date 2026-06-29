import { useState, useEffect, useMemo } from 'react';
import { Save, Wallet, PiggyBank, CheckCircle2, XCircle } from 'lucide-react';
import type { Category, Month, Budget, Expense } from '../types';
import { fmtNum, toRaw, AMOUNT_RE, formatAmountInput } from '../lib/format';

interface Props {
  year: number;
  month: number;
  monthData: Month | null;
  categories: Category[];
  budgets: Budget[];
  expenses: Expense[];
  onSaveIncome: (income: number, budgetAmount: number) => Promise<void>;
  onSaveBudget: (categoryId: string, amount: number) => Promise<void>;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function BudgetSetup({ year, month, monthData, categories, budgets, expenses, onSaveIncome, onSaveBudget }: Props) {
  const paidCategoryIds = useMemo(() => new Set(expenses.map(e => e.category_id)), [expenses]);
  const [income, setIncome] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetValues, setBudgetValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const inc = monthData?.income;
    setIncome(inc ? fmtNum(inc) : '');
    const bgt = monthData?.budget_amount;
    setBudgetAmount(bgt ? fmtNum(bgt) : '');
  }, [monthData]);

  useEffect(() => {
    const vals: Record<string, string> = {};
    budgets.forEach(b => {
      const amt = Number(b.expected_amount);
      vals[b.category_id] = amt ? fmtNum(amt) : '';
    });
    setBudgetValues(vals);
  }, [budgets]);

  const handleNumChange = (value: string, setter: (v: string) => void) => {
    const raw = toRaw(value);
    if (raw === '' || AMOUNT_RE.test(raw)) {
      setter(raw === '' ? '' : formatAmountInput(raw));
    }
  };

  const handleSaveMonthly = async () => {
    const inc = parseFloat(toRaw(income)) || 0;
    const bgt = parseFloat(toRaw(budgetAmount)) || 0;
    if (inc < 0 || bgt < 0) return;
    setSaving('monthly');
    await onSaveIncome(inc, bgt);
    setSaving(null);
    setSavedMap(p => ({ ...p, monthly: true }));
    setTimeout(() => setSavedMap(p => ({ ...p, monthly: false })), 1500);
  };

  const handleSaveBudget = async (catId: string) => {
    const v = parseFloat(toRaw(budgetValues[catId] ?? '0'));
    if (isNaN(v) || v < 0) return;
    setSaving(catId);
    await onSaveBudget(catId, v);
    setSaving(null);
    setSavedMap(p => ({ ...p, [catId]: true }));
    setTimeout(() => setSavedMap(p => ({ ...p, [catId]: false })), 1500);
  };

  const totalCategoryBudget = Object.values(budgetValues).reduce((s, v) => s + (parseFloat(toRaw(v)) || 0), 0);
  const budgetVal = parseFloat(toRaw(budgetAmount)) || 0;
  const unallocated = budgetVal - totalCategoryBudget;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {MONTHS[month - 1]} {year} Setup
            </h2>
            <p className="text-xs text-white/40 mt-0.5">Configure monthly income & budget</p>
          </div>
          {budgetVal > 0 && (
            <div className="text-right">
              <p className={`text-xs font-semibold ${unallocated >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {unallocated >= 0 ? '+' : ''}{fmtNum(Math.abs(unallocated))}
              </p>
              <p className="text-xs text-white/40">unallocated</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {/* Income & Budget */}
        <div className="glass rounded-2xl p-4">
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                <label className="text-xs text-white/60 font-medium">Income for the Month (LKR)</label>
              </div>
              <input
                type="text"
                inputMode="numeric"
                className="input-dark w-full rounded-xl px-3 py-2.5 text-sm"
                placeholder="e.g. 800,000"
                value={income}
                onChange={e => handleNumChange(e.target.value, setIncome)}
                onKeyDown={e => e.key === 'Enter' && handleSaveMonthly()}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
                <label className="text-xs text-white/60 font-medium">Budget for the Month (LKR)</label>
              </div>
              <input
                type="text"
                inputMode="numeric"
                className="input-dark w-full rounded-xl px-3 py-2.5 text-sm"
                placeholder="e.g. 500,000"
                value={budgetAmount}
                onChange={e => handleNumChange(e.target.value, setBudgetAmount)}
                onKeyDown={e => e.key === 'Enter' && handleSaveMonthly()}
              />
              <p className="text-xs text-white/30 mt-1.5 pl-1">All expenses will be deducted from this budget</p>
            </div>
            <button
              onClick={handleSaveMonthly}
              disabled={saving === 'monthly'}
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:from-cyan-500/30 hover:to-teal-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savedMap['monthly'] ? (
                <span className="text-emerald-400">Saved</span>
              ) : saving === 'monthly' ? (
                <span className="text-white/50">Saving...</span>
              ) : (
                <><Save className="w-3.5 h-3.5" /> Save Monthly Setup</>
              )}
            </button>
          </div>
        </div>

        {/* Category budgets */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/60 font-medium">Category Allocations</p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] text-white/40">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> paid
              </span>
              <span className="flex items-center gap-1 text-[10px] text-white/40">
                <XCircle className="w-3 h-3 text-white/30" /> none
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {categories.map(cat => (
              <CategoryRow
                key={cat.id}
                category={cat}
                paid={paidCategoryIds.has(cat.id)}
                value={budgetValues[cat.id] ?? ''}
                onChange={v => {
                  const raw = toRaw(v);
                  if (raw === '' || AMOUNT_RE.test(raw)) {
                    setBudgetValues(p => ({ ...p, [cat.id]: raw === '' ? '' : formatAmountInput(raw) }));
                  }
                }}
                onSave={() => handleSaveBudget(cat.id)}
                saving={saving === cat.id}
                saved={!!savedMap[cat.id]}
              />
            ))}
          </div>
        </div>

        {/* Budget summary */}
        <div className="glass rounded-2xl p-4 mb-1">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/50">Total Allocated</span>
            <span className="text-white font-semibold">LKR {fmtNum(totalCategoryBudget)}</span>
          </div>
          {budgetVal > 0 && (
            <>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-white/50">Unallocated</span>
                <span className={`font-semibold ${unallocated >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  LKR {fmtNum(Math.abs(unallocated))} {unallocated < 0 ? 'over' : ''}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((totalCategoryBudget / budgetVal) * 100, 100)}%`,
                    background: unallocated < 0
                      ? 'linear-gradient(90deg, #f97316, #ef4444)'
                      : 'linear-gradient(90deg, #22d3ee, #10b981)',
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ category, paid, value, onChange, onSave, saving, saved }: {
  category: Category;
  paid: boolean;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {paid ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
      )}
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: category.color }} />
      <span className="text-xs text-white/70 w-20 flex-shrink-0 truncate">{category.name}</span>
      <input
        type="text"
        inputMode="numeric"
        className="input-dark flex-1 rounded-lg px-2.5 py-1.5 text-xs"
        placeholder="0"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onSave}
        onKeyDown={e => e.key === 'Enter' && onSave()}
      />
      <span className="text-xs w-5 text-center">
        {saved ? <span className="text-emerald-400">✓</span> : saving ? <span className="text-white/30">...</span> : null}
      </span>
    </div>
  );
}
