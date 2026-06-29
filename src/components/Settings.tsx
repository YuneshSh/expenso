import { useState } from 'react';
import { Plus, Trash2, Check, X, Pencil, RotateCcw, Tag } from 'lucide-react';
import type { Category } from '../types';

interface Props {
  categories: Category[];
  onAddCategory: (name: string, color: string) => Promise<Category>;
  onUpdateCategory: (
    id: string,
    updates: Partial<Pick<Category, 'name' | 'color'>>
  ) => Promise<Category | null>;
  onDeleteCategory: (id: string) => Promise<void>;
  onResetCategories: () => Promise<void>;
}

const PALETTE = [
  '#22d3ee', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6',
  '#84cc16', '#fb923c', '#06b6d4', '#a78bfa', '#34d399',
  '#f472b6', '#6366f1', '#14b8a6', '#ef4444', '#eab308',
];

export default function Settings({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onResetCategories,
}: Props) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PALETTE[0]);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) { setError('Enter a category name'); return; }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setError('That category already exists');
      return;
    }
    setError('');
    setAdding(true);
    try {
      await onAddCategory(name, newColor);
      setNewName('');
      setNewColor(PALETTE[0]);
    } catch {
      setError('Could not add category');
    }
    setAdding(false);
  };

  const startEdit = (cat: Category) => {
    setConfirmDelete(null);
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const saveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    await onUpdateCategory(id, { name, color: editColor });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <div className="px-4 pt-3 pb-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Settings</h2>
            <p className="text-xs text-white/40 mt-0.5">Manage your category set</p>
          </div>
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-8 flex flex-col gap-3">
        {/* Add new category */}
        <div className="glass rounded-2xl p-3">
          <label className="text-xs text-white/50 mb-2 flex items-center gap-1.5">
            <Plus className="w-3 h-3" /> Add a category
          </label>
          <input
            type="text"
            className="input-dark w-full rounded-xl px-3 py-2 text-sm"
            placeholder="Category name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            {PALETTE.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? 'ring-2 ring-white/70 scale-110' : 'ring-1 ring-white/10'}`}
                style={{ background: c }}
              />
            ))}
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          <button
            onClick={handleAdd}
            disabled={adding}
            className="w-full mt-3 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50
              bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/30
              text-cyan-300 hover:from-cyan-500/30 hover:to-teal-500/30 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> {adding ? 'Adding…' : 'Add Category'}
          </button>
        </div>

        {/* Existing categories */}
        <div className="glass rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Tag className="w-3 h-3 text-white/50" />
            <p className="text-xs text-white/60 font-medium">Categories ({categories.length})</p>
          </div>

          <div className="flex flex-col gap-1.5">
            {categories.map(cat =>
              editingId === cat.id ? (
                <div key={cat.id} className="flex flex-col gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <input
                    type="text"
                    className="input-dark w-full rounded-lg px-2.5 py-2 text-xs"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(cat.id)}
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PALETTE.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-4 h-4 rounded-full transition-transform ${editColor === c ? 'ring-2 ring-white/70 scale-110' : 'ring-1 ring-white/10'}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(cat.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div key={cat.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <span className="flex-1 text-sm text-white/80 truncate">{cat.name}</span>
                  {confirmDelete === cat.id ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={async () => { await onDeleteCategory(cat.id); setConfirmDelete(null); }}
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
                        onClick={() => startEdit(cat)}
                        title="Edit category"
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-cyan-300/90 bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/25 hover:text-cyan-200 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(cat.id)}
                        title="Delete category"
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-red-300/90 bg-red-500/10 border border-red-500/25 hover:bg-red-500/25 hover:text-red-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
            {categories.length === 0 && (
              <p className="text-white/40 text-xs text-center py-3">No categories. Add one above.</p>
            )}
          </div>
          <p className="text-[11px] text-white/30 mt-2.5 leading-relaxed">
            Deleting a category also removes its budget allocations and recorded expenses across all months.
          </p>
        </div>
      </div>

      {/* Reset confirmation */}
      {confirmReset && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-6" style={{ background: 'rgba(7,11,20,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-strong rounded-2xl p-5 w-full max-w-[300px]">
            <p className="text-sm font-semibold text-white mb-1.5">Reset categories?</p>
            <p className="text-xs text-white/50 leading-relaxed mb-4">
              This restores the default category set. Custom categories and their budgets/expenses will be removed.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >Cancel</button>
              <button
                onClick={async () => { await onResetCategories(); setConfirmReset(false); }}
                className="px-3 py-2 rounded-lg text-xs font-medium text-red-300 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 transition-colors"
              >Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
