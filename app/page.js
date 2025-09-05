'use client'

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, Calendar as CalendarIcon } from "lucide-react";

// === Helpers ===
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const daysInMonth = (year, month /* 0-index */) => new Date(year, month + 1, 0).getDate();

const getMonthKey = (year, month) => `${year}-${pad(month + 1)}`; // e.g., 2025-09

const storageKey = "connect4_habit_tracker_v1";

// === Main Component ===
export default function ConnectFourHabitTracker() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const [habits, setHabits] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return saved.habits || [
        { id: crypto.randomUUID(), name: "Exercício" },
        { id: crypto.randomUUID(), name: "Leitura" },
      ];
    }
    return [
      { id: crypto.randomUUID(), name: "Exercício" },
      { id: crypto.randomUUID(), name: "Leitura" },
    ];
  });

  // records: { [monthKey]: { [habitId]: { [dayNumber]: 'done' | 'missed' }}}
  const [records, setRecords] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return saved.records || {};
    }
    return {};
  });

  // Persist
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const payload = { habits, records };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    }
  }, [habits, records]);

  const monthKey = useMemo(() => getMonthKey(year, month), [year, month]);
  const totalDays = useMemo(() => daysInMonth(year, month), [year, month]);
  const daysArray = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => i + 1),
    [totalDays]
  );

  const monthRecords = records[monthKey] || {};

  // === Actions ===
  const addHabit = (name) => {
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setHabits((h) => [...h, { id: crypto.randomUUID(), name: trimmed }]);
  };

  const editHabit = (id, newName) => {
    setHabits((h) => h.map((x) => (x.id === id ? { ...x, name: newName } : x)));
  };

  const removeHabit = (id) => {
    setHabits((h) => h.filter((x) => x.id !== id));
    setRecords((r) => {
      const copy = { ...r };
      for (const mk of Object.keys(copy)) {
        if (copy[mk]?.[id]) {
          const { [id]: _, ...rest } = copy[mk];
          copy[mk] = rest;
        }
      }
      return copy;
    });
  };

  const cycleState = (habitId, day) => {
    // Cycle: undefined -> 'done' -> 'missed' -> undefined
    setRecords((r) => {
      const copy = { ...r };
      const mk = monthKey;
      copy[mk] = copy[mk] ? { ...copy[mk] } : {};
      const habitDays = copy[mk][habitId] ? { ...copy[mk][habitId] } : {};
      const current = habitDays[day];
      const next = current === undefined ? "done" : current === "done" ? "missed" : undefined;
      if (next === undefined) delete habitDays[day];
      else habitDays[day] = next;
      copy[mk][habitId] = habitDays;
      return copy;
    });
  };

  const setStateExplicit = (habitId, day, state) => {
    setRecords((r) => {
      const copy = { ...r };
      const mk = monthKey;
      copy[mk] = copy[mk] ? { ...copy[mk] } : {};
      const habitDays = copy[mk][habitId] ? { ...copy[mk][habitId] } : {};
      if (state === undefined) delete habitDays[day];
      else habitDays[day] = state;
      copy[mk][habitId] = habitDays;
      return copy;
    });
  };

  const changeMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  // === UI Helpers ===
  const completionRate = (habitId) => {
    const map = monthRecords[habitId] || {};
    const done = Object.values(map).filter((v) => v === "done").length;
    const missed = Object.values(map).filter((v) => v === "missed").length;
    const totalMarked = done + missed;
    return {
      done,
      missed,
      totalMarked,
      pct: totalMarked ? Math.round((done / totalMarked) * 100) : 0,
    };
  };

  // === Components ===
  function HabitHeader({ habit }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(habit.name);
    const inputRef = useRef(null);

    useEffect(() => {
      if (editing) inputRef.current?.focus();
    }, [editing]);

    const stats = completionRate(habit.id);

    return (
      <div className="flex items-center gap-2">
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (name.trim()) editHabit(habit.id, name.trim());
              else setName(habit.name);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                setName(habit.name);
                setEditing(false);
              }
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <button
            className="group flex w-full items-center justify-between rounded-xl bg-white/70 px-2 py-1 text-left text-sm font-medium backdrop-blur hover:bg-white"
            onClick={() => setEditing(true)}
            title="Editar nome do hábito"
          >
            <span className="truncate">{habit.name}</span>
            <Edit2 className="ml-2 h-4 w-4 opacity-60 group-hover:opacity-100" />
          </button>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />{stats.done}</span>
          <span className="inline-flex items-center gap-1"><XCircle className="h-4 w-4" />{stats.missed}</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold">{stats.pct}%</span>
        </div>
        <button
          onClick={() => removeHabit(habit.id)}
          className="ml-1 rounded-xl border border-red-200 bg-red-50 p-1 text-red-600 hover:bg-red-100"
          title="Remover hábito"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  function Token({ state }) {
    const color = state === "done" ? "bg-emerald-500" : state === "missed" ? "bg-red-500" : "bg-slate-200";
    const title = state === "done" ? "Cumprido" : state === "missed" ? "Não cumprido" : "Sem marcação";
    return (
      <AnimatePresence mode="popLayout">
        <motion.div
          key={state || "empty"}
          initial={{ y: -24, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`h-6 w-6 shrink-0 rounded-full ${color} shadow-inner ring-1 ring-black/10`}
          title={title}
        />
      </AnimatePresence>
    );
  }

  function Cell({ habitId, day }) {
    const state = monthRecords[habitId]?.[day];

    return (
      <div
        className="flex h-10 items-center justify-center"
      >
        <button
          onClick={() => cycleState(habitId, day)}
          onContextMenu={(e) => {
            e.preventDefault();
            // Right-click clears
            setStateExplicit(habitId, day, undefined);
          }}
          className="grid place-items-center rounded-full p-1 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={`Dia ${day}`}
          title="Clique: cumpre/miss; Botão direito: limpar"
        >
          <Token state={state} />
        </button>
      </div>
    );
  }

  // Add habit inline control
  function AddHabit() {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    return (
      <div className="relative">
        {open ? (
          <div className="flex items-center gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Nome do hábito"
              className="w-48 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => {
                if (value.trim()) addHabit(value.trim());
                setValue("");
                setOpen(false);
              }}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700"
            >
              Adicionar
            </button>
            <button
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow ring-1 ring-slate-200 hover:bg-white"
          >
            <Plus className="h-4 w-4" /> Novo hábito
          </button>
        )}
      </div>
    );
  }

  // === Layout ===
  return (
    <div className="mx-auto max-w-[1100px] p-4 font-sans">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Habit Tracker — estilo Lig‑4</h1>
          <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">Interativo</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            title="Mês anterior"
          >
            ◀
          </button>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium shadow ring-1 ring-slate-200">
            <CalendarIcon className="h-4 w-4" />
            {monthNames[month]} {year}
          </div>
          <button
            onClick={() => changeMonth(1)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            title="Próximo mês"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow ring-1 ring-slate-200">
          <span className="h-3 w-3 rounded-full bg-emerald-500 ring-1 ring-black/10" /> Verde = Cumprido
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow ring-1 ring-slate-200">
          <span className="h-3 w-3 rounded-full bg-red-500 ring-1 ring-black/10" /> Vermelho = Não cumprido
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow ring-1 ring-slate-200">
          <span className="h-3 w-3 rounded-full bg-slate-200 ring-1 ring-black/10" /> Sem marcação
        </div>
      </div>

      {/* Add Habit */}
      <div className="mb-6">
        <AddHabit />
      </div>

      {/* Grid */}
      <div className="overflow-auto rounded-2xl bg-gradient-to-b from-sky-50 to-slate-50 p-3 shadow-inner ring-1 ring-slate-200">
        <div className="min-w-[720px]">
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(${habits.length}, minmax(120px, 1fr))` }}>
            {/* Corner empty */}
            <div />
            {/* Habit headers */}
            {habits.map((habit) => (
              <div key={habit.id} className="sticky top-0 z-10 -mx-1 -mt-1 rounded-xl bg-white/80 p-2 shadow backdrop-blur">
                <HabitHeader habit={habit} />
              </div>
            ))}
            {/* Rows */}
            {daysArray.map((day) => (
              <React.Fragment key={day}>
                {/* Day label */}
                <div className="sticky left-0 z-10 -ml-1 -my-1 flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm font-medium shadow backdrop-blur">
                  <span>{pad(day)}/{pad(month + 1)}</span>
                  <span className="text-slate-500">{new Date(year, month, day).toLocaleDateString("pt-BR", { weekday: "short" })}</span>
                </div>
                {/* Cells */}
                {habits.map((habit) => (
                  <div key={habit.id + "-" + day} className="border-b border-slate-200/60 p-1">
                    <Cell habitId={habit.id} day={day} />
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p className="max-w-prose">
          Dica: clique em um círculo para alternar entre <span className="font-semibold">cumprido</span> (verde) e <span className="font-semibold">não cumprido</span> (vermelho). Clique com o botão direito para limpar.
        </p>
        <button
          onClick={() => {
            if (confirm("Limpar todas as marcações deste mês?")) {
              setRecords((r) => {
                const copy = { ...r };
                copy[monthKey] = {};
                return copy;
              });
            }
          }}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          Limpar mês atual
        </button>
      </div>

      {/* Subtext */}
      <div className="mt-4 text-xs text-slate-500">
        <p>Os dados são salvos localmente no seu navegador (localStorage).</p>
      </div>
    </div>
  );
}
