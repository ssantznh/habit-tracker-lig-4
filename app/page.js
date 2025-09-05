'use client'

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, Calendar as CalendarIcon, Sun, Moon, Download, Upload, RotateCcw, RotateCw } from "lucide-react";

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

// === CSV Functions ===
const exportToCSV = (habits, records) => {
  const csvData = [];
  
  // Add header row
  const header = ['Habit ID', 'Habit Name', 'Month', 'Day', 'Status'];
  csvData.push(header.join(','));
  
  // Add data rows
  habits.forEach(habit => {
    Object.keys(records).forEach(monthKey => {
      const monthData = records[monthKey];
      if (monthData[habit.id]) {
        Object.keys(monthData[habit.id]).forEach(day => {
          const status = monthData[habit.id][day];
          const [year, month] = monthKey.split('-');
          const row = [
            habit.id,
            `"${habit.name.replace(/"/g, '""')}"`, // Escape quotes in habit names
            monthKey,
            day,
            status
          ];
          csvData.push(row.join(','));
        });
      }
    });
  });
  
  return csvData.join('\n');
};

const importFromCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados');
  }
  
  const header = lines[0].split(',');
  const expectedHeaders = ['Habit ID', 'Habit Name', 'Month', 'Day', 'Status'];
  
  // Validate header
  if (header.length < 5) {
    throw new Error('Cabeçalho CSV inválido. Esperado: Habit ID, Habit Name, Month, Day, Status');
  }
  
  const data = lines.slice(1);
  const habitsMap = new Map();
  const recordsMap = {};
  let validRows = 0;
  let invalidRows = 0;
  
  data.forEach((line, index) => {
    if (!line.trim()) return; // Skip empty lines
    
    // Simple CSV parsing - handles quoted fields
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    
    if (fields.length >= 5) {
      const [habitId, habitName, monthKey, day, status] = fields;
      
      // Validate data
      if (!habitId || !habitName || !monthKey || !day || !status) {
        invalidRows++;
        return;
      }
      
      // Validate status
      if (!['done', 'missed'].includes(status)) {
        invalidRows++;
        return;
      }
      
      // Validate month format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(monthKey)) {
        invalidRows++;
        return;
      }
      
      // Validate day (1-31)
      const dayNum = parseInt(day);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        invalidRows++;
        return;
      }
      
      const cleanHabitName = habitName.replace(/^"|"$/g, '').replace(/""/g, '"');
      
      // Add habit to map
      if (!habitsMap.has(habitId)) {
        habitsMap.set(habitId, { id: habitId, name: cleanHabitName });
      }
      
      // Add record
      if (!recordsMap[monthKey]) {
        recordsMap[monthKey] = {};
      }
      if (!recordsMap[monthKey][habitId]) {
        recordsMap[monthKey][habitId] = {};
      }
      recordsMap[monthKey][habitId][day] = status;
      validRows++;
    } else {
      invalidRows++;
    }
  });
  
  if (validRows === 0) {
    throw new Error('Nenhuma linha válida encontrada no arquivo CSV');
  }
  
  if (invalidRows > 0) {
    console.warn(`${invalidRows} linhas inválidas foram ignoradas durante a importação`);
  }
  
  return {
    habits: Array.from(habitsMap.values()),
    records: recordsMap,
    stats: { validRows, invalidRows }
  };
};

// === Main Component ===
export default function ConnectFourHabitTracker() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const [habits, setHabits] = useState([]);
  const [records, setRecords] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' or 'summary'
  const [isHorizontalLayout, setIsHorizontalLayout] = useState(true);
  const [showAutoMarkNotification, setShowAutoMarkNotification] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      setHabits(saved.habits || []);
      setRecords(saved.records || {});
      setDarkMode(saved.darkMode || false);
      setIsHorizontalLayout(saved.isHorizontalLayout !== undefined ? saved.isHorizontalLayout : true);
      setIsLoaded(true);
    }
  }, []);

  // Auto-mark today's habits as "cumprido" if not already marked
  useEffect(() => {
    if (!isLoaded || habits.length === 0) return;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    
    // Only auto-mark if we're viewing the current month
    if (year === currentYear && month === currentMonth) {
      const currentMonthKey = getMonthKey(currentYear, currentMonth);
      const currentMonthRecords = records[currentMonthKey] || {};
      
      // Check if any habits are unmarked for today
      const needsAutoMark = habits.some(habit => {
        const habitRecords = currentMonthRecords[habit.id] || {};
        return habitRecords[currentDay] === undefined;
      });

      if (needsAutoMark) {
        setRecords((r) => {
          const copy = { ...r };
          const mk = currentMonthKey;
          copy[mk] = copy[mk] ? { ...copy[mk] } : {};
          
          let markedCount = 0;
          habits.forEach(habit => {
            const habitDays = copy[mk][habit.id] ? { ...copy[mk][habit.id] } : {};
            // Only mark as "done" if not already marked
            if (habitDays[currentDay] === undefined) {
              habitDays[currentDay] = "done";
              copy[mk][habit.id] = habitDays;
              markedCount++;
            }
          });
          
          // Show notification if any habits were auto-marked
          if (markedCount > 0) {
            setShowAutoMarkNotification(true);
            // Hide notification after 3 seconds
            setTimeout(() => setShowAutoMarkNotification(false), 3000);
          }
          
          return copy;
        });
      }
    }
  }, [isLoaded, habits, records, year, month]);

  // Persist data to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {
      const payload = { habits, records, darkMode, isHorizontalLayout };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    }
  }, [habits, records, darkMode, isHorizontalLayout, isLoaded]);

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

  // CSV Export/Import functions
  const handleExportCSV = () => {
    const csvContent = exportToCSV(habits, records);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `habit-tracker-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const { habits: importedHabits, records: importedRecords, stats } = importFromCSV(csvText);
        
        let confirmMessage = `Importar ${importedHabits.length} hábitos e seus registros?\n\n`;
        confirmMessage += `• ${stats.validRows} linhas válidas processadas\n`;
        if (stats.invalidRows > 0) {
          confirmMessage += `• ${stats.invalidRows} linhas inválidas ignoradas\n`;
        }
        confirmMessage += `\nIsso substituirá todos os dados atuais.`;
        
        if (confirm(confirmMessage)) {
          setHabits(importedHabits);
          setRecords(importedRecords);
          
          let successMessage = `Dados importados com sucesso!\n\n`;
          successMessage += `• ${importedHabits.length} hábitos importados\n`;
          successMessage += `• ${stats.validRows} registros processados\n`;
          if (stats.invalidRows > 0) {
            successMessage += `• ${stats.invalidRows} linhas inválidas ignoradas`;
          }
          
          alert(successMessage);
        }
      } catch (error) {
        alert(`Erro ao importar arquivo CSV:\n\n${error.message}`);
        console.error('CSV Import Error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
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

  // Calculate total cumprido across all months for unbroken habits
  const getHabitSummary = (habitId) => {
    // Collect all records in chronological order
    const allRecords = [];
    
    Object.entries(records).forEach(([monthKey, monthData]) => {
      const habitData = monthData[habitId];
      if (habitData) {
        Object.entries(habitData).forEach(([day, status]) => {
          const [year, month] = monthKey.split('-');
          allRecords.push({
            date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)),
            status,
            monthKey,
            day: parseInt(day)
          });
        });
      }
    });
    
    // Sort by date
    allRecords.sort((a, b) => a.date - b.date);
    
    if (allRecords.length === 0) {
      return { totalCumprido: 0, isBroken: false };
    }
    
    // Find the last "missed" record
    let lastMissedIndex = -1;
    for (let i = allRecords.length - 1; i >= 0; i--) {
      if (allRecords[i].status === "missed") {
        lastMissedIndex = i;
        break;
      }
    }
    
    // Count "done" records after the last "missed" (or from beginning if never missed)
    const startIndex = lastMissedIndex + 1;
    let totalCumprido = 0;
    
    for (let i = startIndex; i < allRecords.length; i++) {
      if (allRecords[i].status === "done") {
        totalCumprido++;
      }
    }
    
    // A habit is considered "broken" only if it has recent "missed" records
    // and no recent "done" records (indicating it was abandoned)
    const recentRecords = allRecords.slice(-7); // Last 7 records
    const hasRecentMissed = recentRecords.some(r => r.status === "missed");
    const hasRecentDone = recentRecords.some(r => r.status === "done");
    
    // If there are recent missed records but no recent done records, consider broken
    const isBroken = hasRecentMissed && !hasRecentDone;
    
    return {
      totalCumprido: isBroken ? 0 : totalCumprido,
      isBroken
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

  // Summary tab component
  function SummaryTab() {
    const unbrokenHabits = habits.filter(habit => {
      const summary = getHabitSummary(habit.id);
      return !summary.isBroken && summary.totalCumprido > 0;
    });

    const totalCumprido = unbrokenHabits.reduce((sum, habit) => {
      const summary = getHabitSummary(habit.id);
      return sum + summary.totalCumprido;
    }, 0);

    if (habits.length === 0) {
      return <EmptyState />;
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="space-y-6"
      >
        {/* Summary Header */}
        <div className="rounded-3xl bg-gradient-to-br from-white/80 to-slate-50/80 p-6 shadow-2xl ring-1 ring-slate-200/50 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold text-slate-800">Resumo dos Hábitos</h2>
            <p className="text-slate-600 mb-4">Total de dias cumpridos sem interrupção</p>
            <div className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 shadow-lg ring-1 ring-emerald-200/50">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <div className="text-3xl font-bold text-emerald-700">{totalCumprido}</div>
                <div className="text-sm font-medium text-emerald-600">dias cumpridos</div>
              </div>
            </div>
          </div>
        </div>

        {/* Habit Cards */}
        {unbrokenHabits.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-12 shadow-inner ring-1 ring-amber-200/50"
          >
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 shadow-lg ring-1 ring-amber-200/50">
                <XCircle className="h-10 w-10 text-amber-500" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-amber-800">Nenhum hábito ininterrupto</h3>
              <p className="text-amber-600">
                Todos os hábitos foram quebrados em algum momento. Mantenha a consistência para ver o resumo!
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unbrokenHabits.map((habit, index) => {
              const summary = getHabitSummary(habit.id);
              return (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 to-slate-50/90 p-6 shadow-lg ring-1 ring-slate-200/50 backdrop-blur-sm transition-all hover:shadow-xl hover:ring-indigo-300/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="mb-2 text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {habit.name}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-200/50">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-semibold">{summary.totalCumprido}</span>
                        </div>
                        <span className="text-xs text-slate-500">dias cumpridos</span>
                      </div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 shadow-sm ring-1 ring-emerald-200/50">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Progresso</span>
                      <span>{summary.totalCumprido} dias</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((summary.totalCumprido / 30) * 100, 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      />
                    </div>
                  </div>

                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/0 to-teal-500/0 opacity-0 blur-sm transition-opacity group-hover:opacity-10" />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Broken habits info */}
        {habits.length > unbrokenHabits.length && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-2xl bg-gradient-to-r from-slate-50 to-gray-50 p-4 shadow-sm ring-1 ring-slate-200/50"
          >
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <XCircle className="h-4 w-4 text-slate-400" />
              <span>
                {habits.length - unbrokenHabits.length} hábito(s) foram quebrados e não aparecem no resumo
              </span>
            </div>
          </motion.div>
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
              {/* CSV Export/Import buttons */}
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={handleExportCSV}
                  disabled={habits.length === 0}
                  className="group flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="Exportar dados para CSV"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Download className="h-4 w-4" />
                  <span className="text-sm font-medium">Exportar</span>
                </motion.button>
                
                <label className="group flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">Importar</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                    title="Importar dados de CSV"
                  />
                </label>
              </div>
              
              <motion.button
                onClick={() => setIsHorizontalLayout(!isHorizontalLayout)}
                className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
                title={isHorizontalLayout ? "Layout vertical" : "Layout horizontal"}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: isHorizontalLayout ? 90 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isHorizontalLayout ? <RotateCcw className="h-5 w-5" /> : <RotateCw className="h-5 w-5" />}
                </motion.div>
              </motion.button>
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

        {/* Auto-mark notification */}
        <AnimatePresence>
          {showAutoMarkNotification && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
              className="mb-4"
            >
              <div className="mx-auto max-w-md rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 shadow-lg ring-1 ring-emerald-200/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm ring-1 ring-emerald-300/50">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      Hábitos marcados automaticamente
                    </p>
                    <p className="text-xs text-emerald-600">
                      Os hábitos de hoje foram marcados como cumpridos
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-2 rounded-2xl bg-white/60 p-2 shadow-lg ring-1 ring-slate-200/50 backdrop-blur-sm">
            <motion.button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              📅 Calendário
            </motion.button>
            <motion.button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                activeTab === 'summary'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              📊 Resumo
            </motion.button>
          </div>
        </motion.div>

        {/* Main Content */}
        {activeTab === 'calendar' ? (
          <>
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
                {isHorizontalLayout ? (
                  // Horizontal Layout: Habits as rows, Days as columns
                  <div className="min-w-[800px]">
                    <div className="grid gap-1" style={{ gridTemplateRows: `60px repeat(${habits.length}, minmax(80px, 1fr))` }}>
                      {/* Day headers row */}
                      <div className="sticky top-0 z-10 -mx-2 -mt-2 rounded-2xl bg-white/90 p-2 shadow-lg backdrop-blur-sm ring-1 ring-slate-200/50">
                        <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${totalDays}, minmax(60px, 1fr))` }}>
                          <div className="flex items-center justify-center text-sm font-semibold text-slate-600">
                            Hábitos
                          </div>
                          {daysArray.map((day, dayIndex) => (
                            <motion.div 
                              key={day}
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, delay: 0.1 * dayIndex }}
                              className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 px-2 py-2 text-xs font-semibold shadow-sm ring-1 ring-indigo-200/50"
                            >
                              <span className="text-slate-800">{pad(day)}</span>
                              <span className="text-slate-500">{new Date(year, month, day).toLocaleDateString("pt-BR", { weekday: "short" })}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      {/* Habit rows */}
                      {habits.map((habit, habitIndex) => (
                        <motion.div 
                          key={habit.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.1 * habitIndex }}
                          className="grid gap-1" 
                          style={{ gridTemplateColumns: `120px repeat(${totalDays}, minmax(60px, 1fr))` }}
                        >
                          {/* Habit header */}
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.05 * habitIndex }}
                            className="sticky left-0 z-10 -ml-2 -my-1 rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur-sm ring-1 ring-slate-200/50"
                          >
                            <HabitHeader habit={habit} />
                          </motion.div>
                          {/* Day cells */}
                          {daysArray.map((day, dayIndex) => (
                            <motion.div 
                              key={habit.id + "-" + day} 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: 0.05 * (habitIndex + dayIndex) }}
                              className="border-r border-slate-200/40 p-2 hover:bg-slate-50/50 transition-colors"
                            >
                              <Cell habitId={habit.id} day={day} />
                            </motion.div>
                          ))}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Vertical Layout: Days as rows, Habits as columns (original)
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
                )}
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
          </>
        ) : (
          <SummaryTab />
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
