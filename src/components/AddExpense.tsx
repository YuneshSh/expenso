import { useState, FormEvent } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import type { Category, Month } from '../types';

interface Props {
  month: Month | null;
  categories: Category[];
  onAdd: (categoryId: string, amount: number, description: string, date: string) => Promise<unknown>;
  onSetupFirst: () => void;
}

const fmtNum = (n: number) =>
  new Intl.NumberFormat('en-US').format(n);

function toDisplay(raw: string): string {
  const num = parseFloat(raw);
  if (!raw || isNaN(num)) return raw;
  return fmtNum(num);
}

function toRaw(display: string): string {
  return display.replace(/,/g, '');
}

function handleNumInput(value: string, setter: (v: string) => void) {
  const raw = toRaw(value);
  if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
    setter(raw === '' ? '' : toDisplay(raw));
  }
}

export default function AddExpense({ month, categories, onAdd, onSetupFirst }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [subEntries, setSubEntries] = useState<{ desc: string; amt: string }[]>([{ desc: '', amt: '' }]);

  const selectedCat = categories.find(c => c.id === categoryId);
  const isMulti = selectedCat?.allows_multiple ?? false;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!categoryId) { setError('Select a category'); return; }

    setSaving(true);
    try {
      if (isMulti) {
        const valid = subEntries.filter(e => e.amt && parseFloat(toRaw(e.amt)) > 0);
        if (valid.length === 0) { setError('Add at least one entry'); setSaving(false); return; }
        for (const entry of valid) {
          await onAdd(categoryId, parseFloat(toRaw(entry.amt)), entry.desc, date);
        }
      } else {
        const v = parseFloat(toRaw(amount));
        if (isNaN(v) || v <= 0) { setError('Enter a valid amount'); setSaving(false); return; }
        await onAdd(categoryId, v, description, date);
      }
      setSuccess(true);
      setAmount('');
      setDescription('');
      setSubEntries([{ desc: '', amt: '' }]);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError('Failed to save. Try again.');
    }
    setSaving(false);
  };

  if (!month) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 animate-fade-in">
        <p className="text-white/60 text-sm text-center">Set up your month first to add expenses.</p>
        <button
          onClick={onSetupFirst}
          className="px-6 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-all"
        >
          Set Up Month
        </button>
      </div>
    );
  }

  const subTotal = subEntries.reduce((s, e) => s + (parseFloat(toRaw(e.amt)) || 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <div className="px-4 pt-3 pb-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 className="text-sm font-semibold text-white">Add Expense</h2>
        <p className="text-xs text-white/40 mt-0.5">Record a new expense entry</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {/* Date */}
        <div className="glass rounded-2xl p-3">
          <label className="text-xs text-white/50 mb-1.5 block flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Date
          </label>
          <input
            type="date"
            className="input-dark w-full rounded-xl px-3 py-2 text-sm"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="glass rounded-2xl p-3">
          <label className="text-xs text-white/50 mb-1.5 block">Category</label>
          <select
            className="input-dark w-full rounded-xl px-3 py-2 text-sm"
            value={categoryId}
            onChange={e => { setCategoryId(e.target.value); setSubEntries([{ desc: '', amt: '' }]); }}
          >
            <option value="">Select category...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {selectedCat && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: selectedCat.color }} />
              <span className="text-xs text-white/40">{isMulti ? 'Multiple entries allowed' : 'Single entry'}</span>
            </div>
          )}
        </div>

        {/* Amount / multi-entries */}
        {isMulti ? (
          <div className="glass rounded-2xl p-3">
            <label className="text-xs text-white/50 mb-2 block">Entries</label>
            <div className="flex flex-col gap-2">
              {subEntries.map((entry, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="input-dark flex-1 rounded-lg px-2.5 py-2 text-xs"
                    placeholder="Description"
                    value={entry.desc}
                    onChange={e => setSubEntries(p => p.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input-dark w-28 rounded-lg px-2.5 py-2 text-xs"
                    placeholder="Amount"
                    value={entry.amt}
                    onChange={e => {
                      const raw = toRaw(e.target.value);
                      if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                        setSubEntries(p => p.map((x, j) => j === i ? { ...x, amt: raw === '' ? '' : toDisplay(raw) } : x));
                      }
                    }}
                  />
                  {subEntries.length > 1 && (
                    <button type="button" onClick={() => setSubEntries(p => p.filter((_, j) => j !== i))}>
                      <X className="w-3.5 h-3.5 text-white/30 hover:text-red-400 transition-colors" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSubEntries(p => [...p, { desc: '', amt: '' }])}
              className="mt-2 flex items-center gap-1.5 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add another
            </button>
          </div>
        ) : (
          <div className="glass rounded-2xl p-3">
            <label className="text-xs text-white/50 mb-1.5 block">Amount (LKR)</label>
            <input
              type="text"
              inputMode="numeric"
              className="input-dark w-full rounded-xl px-3 py-2 text-sm"
              placeholder="e.g. 5,000"
              value={amount}
              onChange={e => handleNumInput(e.target.value, setAmount)}
            />
            <label className="text-xs text-white/50 mt-2.5 mb-1.5 block">Note (optional)</label>
            <input
              type="text"
              className="input-dark w-full rounded-xl px-3 py-2 text-sm"
              placeholder="Add a note..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        )}

        {/* Total preview for multi */}
        {isMulti && subTotal > 0 && (
          <div className="glass rounded-2xl px-3 py-2 flex justify-between text-xs">
            <span className="text-white/50">Total this entry</span>
            <span className="text-cyan-400 font-semibold">
              LKR {fmtNum(subTotal)}
            </span>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-xs px-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50
            bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/30
            text-cyan-300 hover:from-cyan-500/30 hover:to-teal-500/30 hover:border-cyan-400/40"
        >
          {success ? '✓ Saved!' : saving ? 'Saving...' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
}
