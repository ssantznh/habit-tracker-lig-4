'use client'

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, Calendar as CalendarIcon, Sun, Moon } from "lucide-react";

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

  const [habits, setHabits] = useState([]);
  const [records, setRecords] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      setHabits(saved.habits || []);
      setRecords(saved.records || {});
      setDarkMode(saved.darkMode || false);
      setIsLoaded(true);
    }
  }, []);

  // Persist data to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {
      const payload = { habits, records, darkMode };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    }
  }, [habits, records, darkMode, isLoaded]);

  // Apply dark mode to document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode]);

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
      <div className="flex flex-col gap-3">
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
            className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-slate-200/50 backdrop-blur-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
          />
        ) : (
          <button
            className="group flex w-full items-center justify-between rounded-2xl bg-white/70 px-3 py-2 text-left text-sm font-semibold backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
            onClick={() => setEditing(true)}
            title="Editar nome do hábito"
          >
            <span className="truncate text-slate-800">{habit.name}</span>
            <Edit2 className="ml-2 h-4 w-4 text-slate-400 transition-colors group-hover:text-indigo-500" />
          </button>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 ring-1 ring-emerald-200/50">
              <CheckCircle2 className="h-3 w-3" />
              <span className="font-semibold">{stats.done}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-red-700 ring-1 ring-red-200/50">
              <XCircle className="h-3 w-3" />
              <span className="font-semibold">{stats.missed}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 px-2 py-1 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200/50">
              {stats.pct}%
            </span>
            <motion.button
              onClick={() => removeHabit(habit.id)}
              className="rounded-xl border border-red-200 bg-red-50 p-1.5 text-red-600 transition-all hover:bg-red-100 hover:shadow-sm"
              title="Remover hábito"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 className="h-3 w-3" />
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  function Token({ state }) {
    const getTokenStyles = () => {
      switch (state) {
        case "done":
          return {
            bg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
            shadow: "shadow-emerald-200/50",
            ring: "ring-emerald-300/50",
            icon: <CheckCircle2 className="h-3 w-3 text-white" />
          };
        case "missed":
          return {
            bg: "bg-gradient-to-br from-red-400 to-red-600",
            shadow: "shadow-red-200/50",
            ring: "ring-red-300/50",
            icon: <XCircle className="h-3 w-3 text-white" />
          };
        default:
          return {
            bg: "bg-gradient-to-br from-slate-200 to-slate-300",
            shadow: "shadow-slate-200/50",
            ring: "ring-slate-300/50",
            icon: null
          };
      }
    };

    const styles = getTokenStyles();
    const title = state === "done" ? "Cumprido" : state === "missed" ? "Não cumprido" : "Sem marcação";
    
    return (
      <AnimatePresence mode="popLayout">
        <motion.div
          key={state || "empty"}
          initial={{ y: -24, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            hover: { duration: 0.2 }
          }}
          className={`
            group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full 
            ${styles.bg} ${styles.shadow} ring-2 ${styles.ring}
            shadow-lg transition-all duration-200 hover:shadow-xl
          `}
          title={title}
        >
          {styles.icon && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
            >
              {styles.icon}
            </motion.div>
          )}
          {/* Subtle glow effect */}
          <div className={`absolute inset-0 rounded-full ${styles.bg} opacity-0 blur-sm transition-opacity group-hover:opacity-30`} />
        </motion.div>
      </AnimatePresence>
    );
  }

  function Cell({ habitId, day }) {
    const state = monthRecords[habitId]?.[day];

    return (
      <div className="flex h-12 items-center justify-center p-1">
        <motion.button
          onClick={() => cycleState(habitId, day)}
          onContextMenu={(e) => {
            e.preventDefault();
            // Right-click clears
            setStateExplicit(habitId, day, undefined);
          }}
          className="group relative grid place-items-center rounded-2xl p-2 transition-all duration-200 hover:bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          aria-label={`Dia ${day}`}
          title="Clique: cumpre/miss; Botão direito: limpar"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Token state={state} />
          {/* Hover indicator */}
          <div className="absolute inset-0 rounded-2xl bg-indigo-100/0 transition-colors group-hover:bg-indigo-100/30" />
        </motion.button>
      </div>
    );
  }

  // Add habit inline control
  function AddHabit() {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    return (
      <motion.div 
        className="relative"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {open ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3"
          >
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Nome do hábito"
              className="w-56 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-lg ring-1 ring-slate-200/50 backdrop-blur-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
              autoFocus
            />
            <motion.button
              onClick={() => {
                if (value.trim()) addHabit(value.trim());
                setValue("");
                setOpen(false);
              }}
              className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Adicionar
            </motion.button>
            <motion.button
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
              className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:bg-slate-50 hover:shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancelar
            </motion.button>
          </motion.div>
        ) : (
          <motion.button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-white/90 to-slate-50/90 px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200/50 backdrop-blur-sm transition-all hover:from-white hover:to-slate-50 hover:shadow-xl"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="h-4 w-4" /> 
            <span>Novo hábito</span>
          </motion.button>
        )}
      </motion.div>
    );
  }

  // Empty state component
  function EmptyState() {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-16 shadow-inner ring-1 ring-slate-200/50"
      >
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 shadow-lg ring-1 ring-indigo-200/50"
          >
            <Plus className="h-10 w-10 text-indigo-500" />
          </motion.div>
          <motion.h3 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-3 text-xl font-bold text-slate-800"
          >
            Nenhum hábito cadastrado
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mb-8 text-slate-600"
          >
            Comece adicionando seu primeiro hábito para acompanhar seu progresso diário.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <AddHabit />
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // === Layout ===
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      <div className="mx-auto max-w-[1200px] p-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                    Habit Tracker
                  </h1>
                  <p className="text-sm text-slate-600">Estilo Connect 4 • Acompanhe seus hábitos diários</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  ✨ Interativo
                </span>
                <span className="rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                  📱 Responsivo
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => setDarkMode(!darkMode)}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
                title={darkMode ? "Modo claro" : "Modo escuro"}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: darkMode ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </motion.div>
              </motion.button>
              <button
                onClick={() => changeMonth(-1)}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Mês anterior"
              >
                <motion.span
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-lg font-medium"
                >
                  ◀
                </motion.span>
              </button>
              <div className="flex items-center gap-3 rounded-2xl bg-white/90 px-6 py-3 text-sm font-semibold shadow-lg ring-1 ring-slate-200/50 backdrop-blur-sm dark:bg-slate-800/90 dark:ring-slate-600/50">
                <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-slate-800 dark:text-slate-200">{monthNames[month]} {year}</span>
              </div>
              <button
                onClick={() => changeMonth(1)}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Próximo mês"
              >
                <motion.span
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-lg font-medium"
                >
                  ▶
                </motion.span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6 flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 shadow-sm ring-1 ring-emerald-200/50">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm ring-1 ring-emerald-300/50">
              <CheckCircle2 className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-sm font-medium text-emerald-700">Cumprido</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 shadow-sm ring-1 ring-red-200/50">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-sm ring-1 ring-red-300/50">
              <XCircle className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-sm font-medium text-red-700">Não cumprido</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-3 shadow-sm ring-1 ring-slate-200/50">
            <div className="h-4 w-4 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 shadow-sm ring-1 ring-slate-300/50" />
            <span className="text-sm font-medium text-slate-600">Sem marcação</span>
          </div>
        </motion.div>

      {/* Add Habit - only show when there are habits */}
      {habits.length > 0 && (
        <div className="mb-6">
          <AddHabit />
        </div>
      )}

        {/* Grid or Empty State */}
        {habits.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="overflow-auto rounded-3xl bg-gradient-to-br from-white/80 to-slate-50/80 p-6 shadow-2xl ring-1 ring-slate-200/50 backdrop-blur-sm"
          >
            <div className="min-w-[800px]">
              <div className="grid gap-1" style={{ gridTemplateColumns: `100px repeat(${habits.length}, minmax(140px, 1fr))` }}>
                {/* Corner empty */}
                <div />
                {/* Habit headers */}
                {habits.map((habit, index) => (
                  <motion.div 
                    key={habit.id} 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                    className="sticky top-0 z-10 -mx-2 -mt-2 rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur-sm ring-1 ring-slate-200/50"
                  >
                    <HabitHeader habit={habit} />
                  </motion.div>
                ))}
                {/* Rows */}
                {daysArray.map((day, dayIndex) => (
                  <React.Fragment key={day}>
                    {/* Day label */}
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 * dayIndex }}
                      className="sticky left-0 z-10 -ml-2 -my-1 flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur-sm ring-1 ring-slate-200/50"
                    >
                      <span className="text-slate-800">{pad(day)}/{pad(month + 1)}</span>
                      <span className="text-slate-500 text-xs">{new Date(year, month, day).toLocaleDateString("pt-BR", { weekday: "short" })}</span>
                    </motion.div>
                    {/* Cells */}
                    {habits.map((habit, habitIndex) => (
                      <motion.div 
                        key={habit.id + "-" + day} 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.05 * (dayIndex + habitIndex) }}
                        className="border-b border-slate-200/40 p-2 hover:bg-slate-50/50 transition-colors"
                      >
                        <Cell habitId={habit.id} day={day} />
                      </motion.div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer actions - only show when there are habits */}
        {habits.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/60 p-6 shadow-lg ring-1 ring-slate-200/50 backdrop-blur-sm"
          >
            <div className="max-w-prose">
              <p className="text-sm text-slate-600">
                💡 <span className="font-semibold">Dica:</span> Clique em um círculo para alternar entre <span className="font-bold text-emerald-600">cumprido</span> (verde) e <span className="font-bold text-red-600">não cumprido</span> (vermelho). Clique com o botão direito para limpar.
              </p>
            </div>
            <motion.button
              onClick={() => {
                if (confirm("Limpar todas as marcações deste mês?")) {
                  setRecords((r) => {
                    const copy = { ...r };
                    copy[monthKey] = {};
                    return copy;
                  });
                }
              }}
              className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🗑️ Limpar mês atual
            </motion.button>
          </motion.div>
        )}

        {/* Subtext */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-6 text-center"
        >
          <p className="text-xs text-slate-500">
            💾 Os dados são salvos localmente no seu navegador (localStorage)
          </p>
        </motion.div>
      </div>
    </div>
  );
}
