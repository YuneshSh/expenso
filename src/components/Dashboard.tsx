import { useMemo, ReactNode } from 'react';
import { Wallet, AlertCircle, CheckCircle, PiggyBank, Receipt } from 'lucide-react';
import type { Category, Month, Budget, Expense } from '../types';
import { money } from '../lib/format';

interface Props {
  month: Month | null;
  categories: Category[];
  budgets: Budget[];
  expenses: Expense[];
  currency: string;
  onSetupMonth: () => void;
}

const fmtCompact = (n: number) => {
  if (n >= 100000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1000) return new Intl.NumberFormat('en-US').format(Math.round(n));
  return n.toFixed(0);
};

export default function Dashboard({ month, categories, budgets, expenses, currency, onSetupMonth }: Props) {
  const totalActual = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const budgetAmount = month?.budget_amount ?? 0;
  const remaining = budgetAmount - totalActual;
  const spendPct = budgetAmount > 0 ? (totalActual / budgetAmount) * 100 : 0;
  const spendPctClamped = Math.min(spendPct, 100);

  const categorySummary = useMemo(() => {
    return categories.map(cat => {
      const budget = budgets.find(b => b.category_id === cat.id);
      const catExpenses = expenses.filter(e => e.category_id === cat.id);
      const actual = catExpenses.reduce((s, e) => s + Number(e.amount), 0);
      return {
        category: cat,
        expected: Number(budget?.expected_amount ?? 0),
        actual,
      };
    }).filter(s => s.expected > 0 || s.actual > 0);
  }, [categories, budgets, expenses]);

  const pieData = useMemo(() =>
    categorySummary
      .filter(s => s.actual > 0)
      .map(s => ({ name: s.category.name, value: s.actual, color: s.category.color })),
    [categorySummary]
  );

  const topCategories = useMemo(() =>
    [...categorySummary].sort((a, b) => b.actual - a.actual).slice(0, 6),
    [categorySummary]
  );

  if (!month) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-6 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center">
          <Wallet className="w-9 h-9 text-cyan-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">No data for this month</p>
          <p className="text-white/40 text-sm mt-1.5">Set up your income and budget to get started</p>
        </div>
        <button
          onClick={onSetupMonth}
          className="px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:from-cyan-500/30 hover:to-teal-500/30 transition-all"
        >
          Set Up Month
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto h-full px-4 py-3 animate-fade-in">
      {/* Main budget overview card */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-white/60 font-medium">Monthly Budget</span>
          </div>
          <span className="text-xs text-white/50 font-medium">{money(budgetAmount, currency)}</span>
        </div>

        {/* Percentage + Remaining */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className={`text-3xl font-bold tracking-tight ${spendPct > 90 ? 'text-red-400' : spendPct > 70 ? 'text-amber-400' : 'text-cyan-400'}`}>
              {spendPct.toFixed(1)}%
            </p>
            <p className="text-xs text-white/40 mt-0.5">of budget used</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-semibold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {money(Math.abs(remaining), currency)}
            </p>
            <p className="text-xs text-white/40">{remaining >= 0 ? 'remaining' : 'over budget'}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.max(spendPctClamped, 1)}%`,
              background: spendPct > 90
                ? 'linear-gradient(90deg, #f97316, #ef4444)'
                : spendPct > 70
                ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                : 'linear-gradient(90deg, #22d3ee, #10b981)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/30">
          <span>{money(totalActual, currency)} spent</span>
          <span>{money(budgetAmount, currency)} budget</span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label={`Income (${currency})`}
          value={fmtCompact(month.income)}
          icon={<Wallet className="w-3.5 h-3.5" />}
          color="text-cyan-400"
          bg="from-cyan-500/8 to-cyan-500/3"
        />
        <StatCard
          label={`Expensed (${currency})`}
          value={fmtCompact(totalActual)}
          icon={<Receipt className="w-3.5 h-3.5" />}
          color="text-rose-400"
          bg="from-rose-500/8 to-rose-500/3"
        />
        <StatCard
          label={`Remaining (${currency})`}
          value={fmtCompact(Math.abs(remaining))}
          icon={remaining >= 0 ? <PiggyBank className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          color={remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}
          bg={remaining >= 0 ? 'from-emerald-500/8 to-emerald-500/3' : 'from-red-500/8 to-red-500/3'}
          prefix={remaining < 0 ? '-' : ''}
        />
      </div>

      {/* Donut chart + legend */}
      {pieData.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-white/60 font-medium mb-3">Spending Breakdown</p>
          <div className="flex items-center gap-4">
            <DonutChart data={pieData} size={100} />
            <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
              {pieData.slice(0, 6).map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-white/70 text-xs truncate">{d.name}</span>
                  </div>
                  <span className="text-white/90 text-xs font-medium flex-shrink-0">{fmtCompact(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Budget vs Actual bars */}
      {topCategories.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-white/60 font-medium mb-3">Budget vs Actual</p>
          <div className="flex flex-col gap-2.5">
            {topCategories.map(s => {
              const maxVal = Math.max(s.expected, s.actual, 1);
              const expectedW = (s.expected / maxVal) * 100;
              const actualW = (s.actual / maxVal) * 100;
              return (
                <div key={s.category.id} className="flex items-center gap-2.5">
                  <span className="text-xs text-white/50 w-16 truncate flex-shrink-0">{s.category.name}</span>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="h-full rounded-full" style={{ width: `${expectedW}%`, background: 'rgba(129,140,248,0.35)' }} />
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="h-full rounded-full" style={{ width: `${actualW}%`, background: s.actual > s.expected ? '#f43f5e' : '#22d3ee' }} />
                    </div>
                  </div>
                  <span className="text-xs text-white/60 w-12 text-right flex-shrink-0">{fmtCompact(s.actual)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: 'rgba(129,140,248,0.5)' }}/><span className="text-white/40 text-xs">Budget</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-400"/><span className="text-white/40 text-xs">Actual</span></div>
          </div>
        </div>
      )}

      {/* Category health list */}
      {categorySummary.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-white/60 font-medium mb-3">Category Status</p>
          <div className="flex flex-col gap-2.5">
            {categorySummary.map(s => {
              const pct = s.expected > 0 ? Math.min((s.actual / s.expected) * 100, 120) : 0;
              const over = s.expected > 0 && s.actual > s.expected;
              return (
                <div key={s.category.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {over
                        ? <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        : <CheckCircle className="w-3 h-3 text-emerald-400/60 flex-shrink-0" />
                      }
                      <span className="text-white/80 text-xs">{s.category.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-semibold ${over ? 'text-red-400' : 'text-white/80'}`}>
                        {fmtCompact(s.actual)}
                      </span>
                      {s.expected > 0 && (
                        <span className="text-white/40 text-xs"> / {fmtCompact(s.expected)}</span>
                      )}
                    </div>
                  </div>
                  {s.expected > 0 && (
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: over
                            ? 'linear-gradient(90deg, #f97316, #ef4444)'
                            : pct > 80
                            ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                            : s.category.color,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Savings card */}
      <div className="glass rounded-2xl p-4 mb-1">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-white/50">Savings (Income - Expenses)</span>
          <span className={`font-semibold ${(month.income - totalActual) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            {money(Math.abs(month.income - totalActual), currency)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Over Budget Spending</span>
          <span className="text-amber-400 font-medium">
            {money(Math.max(0, totalActual - budgetAmount), currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, bg, prefix = '' }: {
  label: string; value: string; icon: ReactNode;
  color: string; bg: string; prefix?: string;
}) {
  return (
    <div className={`glass rounded-xl p-2.5 bg-gradient-to-br ${bg}`}>
      <div className={`flex items-center gap-1 ${color} mb-1`}>
        {icon}
        <span className="text-[10px] opacity-70">{label}</span>
      </div>
      <p className={`text-sm font-bold ${color}`}>{prefix}{value}</p>
    </div>
  );
}

function DonutChart({ data, size }: { data: { name: string; value: number; color: string }[]; size: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = size / 2 - 4;
  const innerRadius = radius * 0.58;
  const cx = size / 2;
  const cy = size / 2;

  let cumulativeAngle = -90;
  const segments = data.map(d => {
    const angle = (d.value / total) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return { ...d, startAngle, angle };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      {segments.map((seg, i) => {
        const startRad = (seg.startAngle * Math.PI) / 180;
        const endRad = ((seg.startAngle + seg.angle) * Math.PI) / 180;
        const largeArc = seg.angle > 180 ? 1 : 0;

        const x1 = cx + radius * Math.cos(startRad);
        const y1 = cy + radius * Math.sin(startRad);
        const x2 = cx + radius * Math.cos(endRad);
        const y2 = cy + radius * Math.sin(endRad);
        const ix1 = cx + innerRadius * Math.cos(startRad);
        const iy1 = cy + innerRadius * Math.sin(startRad);
        const ix2 = cx + innerRadius * Math.cos(endRad);
        const iy2 = cy + innerRadius * Math.sin(endRad);

        const path = [
          `M ${x1} ${y1}`,
          `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
          `L ${ix2} ${iy2}`,
          `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
          'Z',
        ].join(' ');

        return <path key={i} d={path} fill={seg.color} opacity={0.85} />;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize={11} fontWeight="600">
        {fmtCompact(total)}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={8}>
        Total
      </text>
    </svg>
  );
}
