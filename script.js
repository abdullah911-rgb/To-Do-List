/**
 * ==========================================================================
 * ZENITH PRODUCTIVITY HUB - CORE LOGIC ENGINE
 * ==========================================================================
 * 
 * Features:
 * - Redux-like State Store with LocalStorage synchronization
 * - Natural Language Parser for quick task generation (@Category, #tag, !priority)
 * - Canvas-Confetti integration on task completion
 * - Responsive UI tab switcher and slide-out detailed drawer
 * - Interactive Pomodoro timer synced to specific tasks
 * - Web Audio API audio synthesis engine for user interactions
 * - Dual responsive Analytics Dashboard driven by Chart.js
 * - JSON import/export configuration backup system
 */

// --- 1. STATE MODEL ---
const DEFAULT_STATE = {
  tasks: [
    {
      id: "demo-task-1",
      title: "Explore the Zenith dashboard features",
      completed: false,
      category: "inbox",
      priority: "high",
      dueDate: new Date().toISOString().split('T')[0],
      description: "Welcome to Zenith! Try creating a new task, starting the Pomodoro focus timer, or reviewing the analytics tab. You can click on this task to view its detailed subtasks and tags.",
      subtasks: [
        { id: "sub-1", text: "Create a customized category", completed: true },
        { id: "sub-2", text: "Complete a Pomodoro session associated with this task", completed: false },
        { id: "sub-3", text: "Export data to JSON back-up file", completed: false }
      ],
      tags: ["portfolio", "tutorial"],
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-task-2",
      title: "Refactor portfolio code using clean architecture",
      completed: true,
      category: "work",
      priority: "critical",
      dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // yesterday
      description: "Ensure codebases are clean, modular, and use appropriate structural design patterns before publishing on GitHub.",
      subtasks: [],
      tags: ["refactoring", "cv"],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  categories: [
    { id: "inbox", name: "Inbox", color: "#64748b" },
    { id: "work", name: "Work", color: "#3b82f6" },
    { id: "personal", name: "Personal", color: "#10b981" },
    { id: "health", name: "Health", color: "#ec4899" },
    { id: "learning", name: "Learning", color: "#8b5cf6" }
  ],
  settings: {
    theme: "slate",
    soundsEnabled: true,
    glowEnabled: true,
    focusDuration: 25,
    breakDuration: 5
  },
  pomoStats: {
    sessionsCompleted: 0,
    totalMinutesFocused: 0,
    dailyCompleted: 0,
    dailyTarget: 4,
    history: [] // { date: 'YYYY-MM-DD', count: N, minutes: M }
  },
  currentTab: "dashboard",
  selectedCategoryFilter: null,
  activeTaskId: null // Task currently open in drawer
};

let state = JSON.parse(localStorage.getItem("zenith_state")) || DEFAULT_STATE;

// Fallback logic for state upgrades if fields are missing in older storage versions
if (!state.categories || state.categories.length === 0) {
  state.categories = DEFAULT_STATE.categories;
}
if (!state.settings) {
  state.settings = DEFAULT_STATE.settings;
}
if (!state.pomoStats) {
  state.pomoStats = DEFAULT_STATE.pomoStats;
}

function saveState() {
  localStorage.setItem("zenith_state", JSON.stringify(state));
}

// --- 2. AUDIO SYNTHESIS ENGINE (Web Audio API) ---
const AudioEngine = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  playClick() {
    if (!state.settings.soundsEnabled) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {
      console.warn("Audio Synthesis failed:", e);
    }
  },
  playSuccess() {
    if (!state.settings.soundsEnabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      
      // Node 1 - First beep
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.start(now);
      osc1.stop(now + 0.12);
      
      // Node 2 - Second chime octave higher (E5)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.frequency.setValueAtTime(659.25, now + 0.06); // E5
      gain2.gain.setValueAtTime(0.12, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.22);
    } catch (e) {
      console.warn("Success Audio failed:", e);
    }
  },
  playAlarm() {
    if (!state.settings.soundsEnabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major chord (C5, E5, G5, C6)
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.08 / notes.length, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + idx * 0.04);
        osc.start(now + idx * 0.04);
        osc.stop(now + 0.7);
      });
    } catch (e) {
      console.warn("Alarm Audio failed:", e);
    }
  }
};

// --- 3. NATURAL LANGUAGE TASK INPUT PARSER ---
/**
 * Parsers:
 * @CategoryName -> category selection
 * #tagname -> adds tags
 * !low, !medium, !high, !critical -> sets priority
 */
function parseQuickInput(rawText) {
  let text = rawText.trim();
  let categoryId = "inbox";
  const tags = [];
  let priority = "none";

  // 1. Parse Priority: !high, !critical, !medium, !low
  const priorityMatch = text.match(/!(low|medium|high|critical)\b/i);
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase();
    text = text.replace(priorityMatch[0], "");
  }

  // 2. Parse Category: @Category
  const categoryMatch = text.match(/@([a-zA-Z0-9_\-]+)\b/);
  if (categoryMatch) {
    const catName = categoryMatch[1].toLowerCase();
    const cat = state.categories.find(c => c.name.toLowerCase() === catName);
    if (cat) {
      categoryId = cat.id;
    } else {
      // Dynamic category creation if not exists
      const newId = "cat-" + Date.now();
      state.categories.push({
        id: newId,
        name: categoryMatch[1],
        color: "#3b82f6" // default blue
      });
      categoryId = newId;
    }
    text = text.replace(categoryMatch[0], "");
  }

  // 3. Parse Tags: #tag1 #tag2
  const tagsMatches = [...text.matchAll(/#([a-zA-Z0-9_\-]+)\b/g)];
  tagsMatches.forEach(match => {
    tags.push(match[1].toLowerCase());
    text = text.replace(match[0], "");
  });

  // Clean title text from extra spaces
  const title = text.replace(/\s+/g, " ").trim();
  
  return {
    title: title || "New Untitled Task",
    category: categoryId,
    tags,
    priority
  };
}

// --- 4. POMODORO TIMER CONTROLLER ---
const PomodoroTimer = {
  mode: "focus", // focus, short, long
  secondsRemaining: 25 * 60,
  timerInterval: null,
  isRunning: false,
  associatedTaskId: "",
  
  init() {
    this.reset(true);
    this.updateUI();
  },

  setMode(newMode) {
    this.mode = newMode;
    this.reset(true);
    AudioEngine.playClick();
  },

  reset(preserveRunning = false) {
    if (!preserveRunning) {
      this.pause();
    }
    
    if (this.mode === "focus") {
      this.secondsRemaining = state.settings.focusDuration * 60;
    } else if (this.mode === "short") {
      this.secondsRemaining = state.settings.breakDuration * 60;
    } else {
      this.secondsRemaining = 15 * 60; // long break 15 mins
    }
    
    this.updateUI();
  },

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
    AudioEngine.playClick();
  },

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerInterval = setInterval(() => {
      this.tick();
    }, 1000);
    this.updateUIControls();
    
    // Add pulsing glow class if setting is on
    const timerCircle = document.querySelector(".pomodoro-timer-wrapper");
    if (state.settings.glowEnabled && timerCircle) {
      timerCircle.classList.add("timer-glowing");
    }
  },

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.timerInterval);
    this.updateUIControls();
    
    const timerCircle = document.querySelector(".pomodoro-timer-wrapper");
    if (timerCircle) {
      timerCircle.classList.remove("timer-glowing");
    }
  },

  tick() {
    if (this.secondsRemaining > 0) {
      this.secondsRemaining--;
      this.updateUI();
    } else {
      this.completeCycle();
    }
  },

  completeCycle() {
    this.pause();
    AudioEngine.playAlarm();

    if (this.mode === "focus") {
      state.pomoStats.sessionsCompleted++;
      state.pomoStats.totalMinutesFocused += state.settings.focusDuration;
      state.pomoStats.dailyCompleted++;
      
      // Update historical trend
      const todayStr = new Date().toISOString().split('T')[0];
      const historyDay = state.pomoStats.history.find(h => h.date === todayStr);
      if (historyDay) {
        historyDay.count++;
        historyDay.minutes += state.settings.focusDuration;
      } else {
        state.pomoStats.history.push({
          date: todayStr,
          count: 1,
          minutes: state.settings.focusDuration
        });
      }

      // If tied to a task, increment Pomodoro cycles or prompt finish
      if (this.associatedTaskId) {
        const t = state.tasks.find(tk => tk.id === this.associatedTaskId);
        if (t) {
          t.description = (t.description || "") + `\n[Pomo session completed on ${new Date().toLocaleDateString()}]`;
        }
      }

      // Trigger Confetti
      try {
        window.confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch (e) {
        console.log("No confetti library active");
      }

      alert("🎉 Focus session completed! Take a well-deserved break.");
      this.setMode("short");
    } else {
      alert("☕ Break finished! Ready to get back to focus?");
      this.setMode("focus");
    }

    saveState();
    AppUI.renderAll();
  },

  updateUI() {
    const minutes = Math.floor(this.secondsRemaining / 60);
    const seconds = this.secondsRemaining % 60;
    const displayString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update labels in views
    document.getElementById("pomo-display-time").textContent = displayString;
    document.getElementById("mini-timer-time").textContent = displayString;
    
    // Page title browser tag update
    document.title = `(${displayString}) Zenith Focus`;

    // Progress Ring Calculations
    let totalSec = state.settings.focusDuration * 60;
    if (this.mode === "short") totalSec = state.settings.breakDuration * 60;
    if (this.mode === "long") totalSec = 15 * 60;
    
    const percentage = this.secondsRemaining / totalSec;
    const progressRing = document.getElementById("timer-progress-bar");
    if (progressRing) {
      const radius = progressRing.r.baseVal.value;
      const circumference = radius * 2 * Math.PI;
      const offset = circumference - (percentage * circumference);
      progressRing.style.strokeDashoffset = offset;
    }

    let modeName = "Focus Session";
    if (this.mode === "short") modeName = "Short Break";
    if (this.mode === "long") modeName = "Long Break";
    
    document.getElementById("pomo-display-mode").textContent = modeName;
    document.getElementById("mini-timer-mode").textContent = modeName;
  },

  updateUIControls() {
    const playIcon = this.isRunning ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    document.getElementById("pomo-play-btn").innerHTML = playIcon;
    document.getElementById("mini-timer-play").innerHTML = playIcon;
  }
};

// --- 5. ANALYTICS METRICS CONTROLLER ---
const AnalyticsDashboard = {
  charts: {},

  init() {
    this.renderCharts();
  },

  renderCharts() {
    if (typeof window.Chart === "undefined") {
      console.warn("Chart.js was not loaded properly.");
      return;
    }

    // Destroy old charts to redraw
    if (this.charts.history) this.charts.history.destroy();
    if (this.charts.category) this.charts.category.destroy();
    if (this.charts.priority) this.charts.priority.destroy();
    if (this.charts.mini) this.charts.mini.destroy();

    const stats = this.gatherStats();

    // Line Chart - Tasks Completed over time
    const ctxHistory = document.getElementById("productivity-history-chart");
    if (ctxHistory) {
      this.charts.history = new Chart(ctxHistory, {
        type: 'line',
        data: {
          labels: stats.dates,
          datasets: [{
            label: 'Completed Tasks',
            data: stats.completionsByDay,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }

    // Pie Chart - Categories distribution
    const ctxCat = document.getElementById("category-distribution-chart");
    if (ctxCat) {
      this.charts.category = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
          labels: stats.categories.names,
          datasets: [{
            data: stats.categories.counts,
            backgroundColor: stats.categories.colors,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } } }
        }
      });
    }

    // Bar Chart - Priorities breakdown
    const ctxPrio = document.getElementById("priority-distribution-chart");
    if (ctxPrio) {
      this.charts.priority = new Chart(ctxPrio, {
        type: 'bar',
        data: {
          labels: ['Critical', 'High', 'Medium', 'Low', 'None'],
          datasets: [{
            data: [
              stats.priorities.critical,
              stats.priorities.high,
              stats.priorities.medium,
              stats.priorities.low,
              stats.priorities.none
            ],
            backgroundColor: ['#f87171', '#fbbf24', '#60a5fa', '#94a3b8', '#cbd5e1']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }

    // Mini Chart on Dashboard
    const ctxMini = document.getElementById("mini-productivity-chart");
    if (ctxMini) {
      this.charts.mini = new Chart(ctxMini, {
        type: 'bar',
        data: {
          labels: stats.dates.slice(-5),
          datasets: [{
            data: stats.completionsByDay.slice(-5),
            backgroundColor: '#10b981',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: { display: false, beginAtZero: true }
          }
        }
      });
    }

    this.renderInsights(stats);
  },

  gatherStats() {
    // Last 7 days dates array
    const dates = [];
    const completionsByDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      dates.push(d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }));
      
      // Calculate how many completed tasks correspond to this day
      // (Using due date or creation date fallback as mock completed day indicator)
      const matches = state.tasks.filter(t => {
        if (!t.completed) return false;
        // Mocking completion date: if overdue, completed date is today, otherwise due date
        const matchStr = t.dueDate || new Date(t.createdAt).toISOString().split('T')[0];
        return matchStr === str;
      }).length;
      completionsByDay.push(matches);
    }

    // Categories Counts
    const catNames = [];
    const catCounts = [];
    const catColors = [];
    state.categories.forEach(c => {
      const count = state.tasks.filter(t => t.category === c.id && !t.completed).length;
      if (count > 0) {
        catNames.push(c.name);
        catCounts.push(count);
        catColors.push(c.color);
      }
    });

    // Priorities Counts
    const priorities = { critical: 0, high: 0, medium: 0, low: 0, none: 0 };
    state.tasks.forEach(t => {
      if (!t.completed && priorities.hasOwnProperty(t.priority)) {
        priorities[t.priority]++;
      }
    });

    return {
      dates,
      completionsByDay,
      categories: { names: catNames, counts: catCounts, colors: catColors },
      priorities
    };
  },

  renderInsights(stats) {
    const insightsList = document.getElementById("analytics-insights-list");
    if (!insightsList) return;

    const insights = [];
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.completed).length;
    const focusRatio = totalTasks > 0 ? (completedTasks / totalTasks) : 0;

    if (focusRatio > 0.7) {
      insights.push(`<li><i class="fa-solid fa-face-smile text-success"></i> <strong>Peak Efficiency:</strong> Excellent completion rate! You finish over 70% of your tasks.</li>`);
    } else if (focusRatio > 0) {
      insights.push(`<li><i class="fa-solid fa-compass text-secondary"></i> Keep going! Try prioritizing your critical items first.</li>`);
    }

    const criticalPending = state.tasks.filter(t => t.priority === 'critical' && !t.completed).length;
    if (criticalPending > 0) {
      insights.push(`<li><i class="fa-solid fa-triangle-exclamation text-danger"></i> <strong>Priority Alert:</strong> You have ${criticalPending} pending <em>Critical</em> task(s). Finish these before starting other focus work.</li>`);
    }

    if (state.pomoStats.sessionsCompleted > 3) {
      insights.push(`<li><i class="fa-solid fa-bolt text-warning"></i> <strong>Deep Work:</strong> You have clocked in ${state.pomoStats.totalMinutesFocused} minutes of deep focus.</li>`);
    }

    if (insights.length === 0) {
      insights.push(`<li><i class="fa-solid fa-sparkles text-success"></i> Welcome to the analytics hub. Get to work, and smart insights will dynamically generate!</li>`);
    }

    insightsList.innerHTML = insights.join("");
  }
};

// --- 6. USER INTERFACE (UI) RENDER CONTROLLER ---
const AppUI = {
  init() {
    this.bindEvents();
    this.renderAll();
    
    // Keyboard listener for shortcuts
    document.addEventListener("keydown", (e) => {
      // '/' focuses search bar
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        document.getElementById("global-search").focus();
      }
      // 'Esc' closes drawer & modal overlays
      if (e.key === "Escape") {
        AppUI.closeTaskDrawer();
        document.getElementById("category-modal").classList.add("hidden");
      }
    });
  },

  bindEvents() {
    // Navigation tabs
    document.querySelectorAll(".sidebar-nav ul.nav-links li").forEach(li => {
      li.addEventListener("click", () => {
        AudioEngine.playClick();
        document.querySelectorAll(".sidebar-nav ul.nav-links li").forEach(el => el.classList.remove("active"));
        li.classList.add("active");
        
        const tab = li.getAttribute("data-tab");
        state.currentTab = tab;
        state.selectedCategoryFilter = null; // clear category filters
        
        document.querySelectorAll(".view-panel").forEach(panel => panel.classList.remove("active"));
        document.getElementById(`${tab}-view`).classList.add("active");
        
        if (tab === "analytics") {
          AnalyticsDashboard.renderCharts();
        }
        
        saveState();
        AppUI.renderAll();
      });
    });

    // Theme selector
    document.querySelectorAll(".theme-card").forEach(card => {
      card.addEventListener("click", () => {
        const theme = card.getAttribute("data-theme-name");
        state.settings.theme = theme;
        document.documentElement.setAttribute("data-theme", theme);
        
        // Handle custom light vs dark backgrounds on the page body
        if (theme === "glass-light") {
          document.documentElement.setAttribute("data-color-mode", "light");
        } else {
          document.documentElement.setAttribute("data-color-mode", "dark");
        }

        document.querySelectorAll(".theme-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        
        AudioEngine.playSuccess();
        saveState();
        
        // Redraw charts to match text styling
        if (state.currentTab === "analytics") {
          AnalyticsDashboard.renderCharts();
        }
      });
    });

    // Quick task button opens task view
    document.getElementById("quick-task-btn").addEventListener("click", () => {
      document.querySelector('[data-tab="tasks"]').click();
      document.getElementById("task-input").focus();
    });

    // Add Task listener
    document.getElementById("add-task-btn").addEventListener("click", () => this.handleAddTask());
    document.getElementById("task-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleAddTask();
    });

    // Add Category button
    document.getElementById("add-category-btn").addEventListener("click", () => {
      AudioEngine.playClick();
      document.getElementById("category-modal").classList.remove("hidden");
    });
    
    document.getElementById("close-category-modal-btn").addEventListener("click", () => {
      document.getElementById("category-modal").classList.add("hidden");
    });
    document.getElementById("cancel-category-btn").addEventListener("click", () => {
      document.getElementById("category-modal").classList.add("hidden");
    });

    // Category Color dot selectors inside modal
    document.querySelectorAll(".color-dot").forEach(dot => {
      dot.addEventListener("click", () => {
        document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
        dot.classList.add("active");
      });
    });

    document.getElementById("save-category-btn").addEventListener("click", () => {
      const name = document.getElementById("new-category-name").value.trim();
      const activeColorDot = document.querySelector(".color-dot.active");
      const color = activeColorDot ? activeColorDot.getAttribute("data-color") : "#3b82f6";
      
      if (name) {
        const id = "cat-" + Date.now();
        state.categories.push({ id, name, color });
        document.getElementById("new-category-name").value = "";
        document.getElementById("category-modal").classList.add("hidden");
        
        AudioEngine.playSuccess();
        saveState();
        AppUI.renderAll();
      }
    });

    // Task Sorting selector
    document.getElementById("task-sort").addEventListener("change", () => {
      AppUI.renderTaskList();
    });

    // Task Filter Pills
    document.querySelectorAll(".filter-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        AudioEngine.playClick();
        document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        AppUI.renderTaskList();
      });
    });

    // Global Search Input
    document.getElementById("global-search").addEventListener("input", () => {
      AppUI.renderTaskList();
    });

    // Bulk delete completed
    document.getElementById("bulk-delete-completed").addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all completed tasks?")) {
        state.tasks = state.tasks.filter(t => !t.completed);
        AudioEngine.playClick();
        saveState();
        AppUI.renderAll();
      }
    });

    // Drawer detailed attributes auto-saves
    document.getElementById("detail-task-title").addEventListener("change", (e) => {
      const task = state.tasks.find(t => t.id === state.activeTaskId);
      if (task) {
        task.title = e.target.value;
        saveState();
        AppUI.renderTaskList();
      }
    });

    document.getElementById("detail-task-category").addEventListener("change", (e) => {
      const task = state.tasks.find(t => t.id === state.activeTaskId);
      if (task) {
        task.category = e.target.value;
        saveState();
        AppUI.renderTaskList();
      }
    });

    document.getElementById("detail-task-priority").addEventListener("change", (e) => {
      const task = state.tasks.find(t => t.id === state.activeTaskId);
      if (task) {
        task.priority = e.target.value;
        saveState();
        AppUI.renderTaskList();
      }
    });

    document.getElementById("detail-task-due").addEventListener("change", (e) => {
      const task = state.tasks.find(t => t.id === state.activeTaskId);
      if (task) {
        task.dueDate = e.target.value;
        saveState();
        AppUI.renderTaskList();
      }
    });

    document.getElementById("detail-task-description").addEventListener("change", (e) => {
      const task = state.tasks.find(t => t.id === state.activeTaskId);
      if (task) {
        task.description = e.target.value;
        saveState();
      }
    });

    // Drawer Subtasks listeners
    document.getElementById("detail-add-subtask-btn").addEventListener("click", () => this.handleAddSubtask());
    document.getElementById("detail-subtask-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleAddSubtask();
    });

    // Drawer Tags Builder
    document.getElementById("detail-tags-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const val = e.target.value.trim().toLowerCase();
        if (val) {
          const task = state.tasks.find(t => t.id === state.activeTaskId);
          if (task) {
            if (!task.tags) task.tags = [];
            if (!task.tags.includes(val)) {
              task.tags.push(val);
              e.target.value = "";
              saveState();
              this.renderTaskDetails(task);
              this.renderTaskList();
            }
          }
        }
      }
    });

    // Drawer Delete Task Action
    document.getElementById("detail-delete-btn").addEventListener("click", () => {
      if (confirm("Permanently delete this task?")) {
        state.tasks = state.tasks.filter(t => t.id !== state.activeTaskId);
        this.closeTaskDrawer();
        AudioEngine.playClick();
        saveState();
        AppUI.renderAll();
      }
    });

    document.getElementById("close-drawer-btn").addEventListener("click", () => {
      this.closeTaskDrawer();
    });

    // Pomodoro Play Button click
    document.getElementById("pomo-play-btn").addEventListener("click", () => {
      PomodoroTimer.toggle();
    });

    document.getElementById("mini-timer-play").addEventListener("click", () => {
      PomodoroTimer.toggle();
    });

    // Pomodoro Reset button
    document.getElementById("pomo-reset-btn").addEventListener("click", () => {
      PomodoroTimer.reset();
    });

    // Skip Pomodoro cycle on Dashboard widget
    document.getElementById("mini-timer-skip").addEventListener("click", () => {
      PomodoroTimer.completeCycle();
    });

    // Pomo Modes selector
    document.querySelectorAll(".pomodoro-modes button").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".pomodoro-modes button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        PomodoroTimer.setMode(btn.getAttribute("data-pomo-mode"));
      });
    });

    // Pomodoro View task dropdown sync
    document.getElementById("pomo-task-selector").addEventListener("change", (e) => {
      PomodoroTimer.associatedTaskId = e.target.value;
    });

    // Mini timer shortcut redirects to Pomodoro panel
    document.getElementById("mini-pomo-go").addEventListener("click", () => {
      document.querySelector('[data-tab="pomodoro"]').click();
    });

    // Settings Sound Toggle Switch
    document.getElementById("settings-sounds").addEventListener("change", (e) => {
      state.settings.soundsEnabled = e.target.checked;
      saveState();
    });

    document.getElementById("settings-glow").addEventListener("change", (e) => {
      state.settings.glowEnabled = e.target.checked;
      saveState();
    });

    // Duration numbers update
    document.getElementById("settings-focus-duration").addEventListener("change", (e) => {
      state.settings.focusDuration = Math.max(1, parseInt(e.target.value) || 25);
      saveState();
      PomodoroTimer.reset(true);
    });

    document.getElementById("settings-break-duration").addEventListener("change", (e) => {
      state.settings.breakDuration = Math.max(1, parseInt(e.target.value) || 5);
      saveState();
      PomodoroTimer.reset(true);
    });

    // Data backups actions
    document.getElementById("backup-export-btn").addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `zenith_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    // Import Trigger click
    document.getElementById("backup-import-trigger").addEventListener("click", () => {
      document.getElementById("backup-import-file").click();
    });

    document.getElementById("backup-import-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.tasks && parsed.categories) {
            state = parsed;
            saveState();
            AudioEngine.playSuccess();
            alert("Backup imported successfully!");
            window.location.reload();
          } else {
            alert("Invalid backup file layout.");
          }
        } catch (err) {
          alert("Error parsing backup JSON file.");
        }
      };
      reader.readAsText(file);
    });

    // Reset Application button
    document.getElementById("app-reset-btn").addEventListener("click", () => {
      if (confirm("CRITICAL WARNING: This will completely wipe all tasks, custom categories, settings, and histories. Are you sure you want to reset Zenith?")) {
        localStorage.removeItem("zenith_state");
        window.location.reload();
      }
    });
  },

  handleAddTask() {
    const input = document.getElementById("task-input");
    const rawVal = input.value.trim();
    if (rawVal === "") return;

    // Use NLP parser to build properties
    const parsed = parseQuickInput(rawVal);
    
    const newTask = {
      id: "task-" + Date.now(),
      title: parsed.title,
      completed: false,
      category: parsed.category,
      priority: parsed.priority,
      dueDate: "",
      description: "",
      subtasks: [],
      tags: parsed.tags,
      createdAt: new Date().toISOString()
    };

    state.tasks.push(newTask);
    input.value = "";
    
    AudioEngine.playSuccess();
    saveState();
    
    this.renderAll();
  },

  handleAddSubtask() {
    const input = document.getElementById("detail-subtask-input");
    const text = input.value.trim();
    if (text === "") return;

    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (task) {
      if (!task.subtasks) task.subtasks = [];
      task.subtasks.push({
        id: "sub-" + Date.now(),
        text,
        completed: false
      });
      
      input.value = "";
      AudioEngine.playClick();
      saveState();
      
      this.renderTaskDetails(task);
      this.renderTaskList();
    }
  },

  openTaskDrawer(task) {
    state.activeTaskId = task.id;
    this.renderTaskDetails(task);
    
    const drawer = document.getElementById("task-detail-drawer");
    drawer.classList.add("open");
  },

  closeTaskDrawer() {
    state.activeTaskId = null;
    const drawer = document.getElementById("task-detail-drawer");
    if (drawer) drawer.classList.remove("open");
  },

  renderAll() {
    // Sync theme options in UI on load
    document.documentElement.setAttribute("data-theme", state.settings.theme);
    if (state.settings.theme === "glass-light") {
      document.documentElement.setAttribute("data-color-mode", "light");
    } else {
      document.documentElement.setAttribute("data-color-mode", "dark");
    }
    
    const activeThemeCard = document.querySelector(`.theme-card[data-theme-name="${state.settings.theme}"]`);
    if (activeThemeCard) {
      document.querySelectorAll(".theme-card").forEach(c => c.classList.remove("active"));
      activeThemeCard.classList.add("active");
    }

    // Set toggle switch in preferences
    document.getElementById("settings-sounds").checked = state.settings.soundsEnabled;
    document.getElementById("settings-glow").checked = state.settings.glowEnabled;
    document.getElementById("settings-focus-duration").value = state.settings.focusDuration;
    document.getElementById("settings-break-duration").value = state.settings.breakDuration;

    this.renderWelcomeHeader();
    this.renderCategoriesSidebar();
    this.renderTaskList();
    this.renderDashboardView();
    this.renderPomoViewOptions();
  },

  renderWelcomeHeader() {
    // Current date
    const opt = { weekday: 'long', month: 'short', day: 'numeric' };
    document.getElementById("current-date-text").textContent = new Date().toLocaleDateString(undefined, opt);

    // Dynamic greeting based on time of day
    const hour = new Date().getHours();
    let greet = "Hello, Builder!";
    if (hour < 12) greet = "Good Morning, Achiever!";
    else if (hour < 18) greet = "Good Afternoon, Focus!";
    else greet = "Good Evening, Designer!";
    
    document.getElementById("greeting-text").textContent = greet;
  },

  renderCategoriesSidebar() {
    const list = document.getElementById("sidebar-categories");
    if (!list) return;

    list.innerHTML = "";

    // Load static category filters first (e.g. inbox, work, personal, etc.)
    state.categories.forEach(cat => {
      const activeClass = state.selectedCategoryFilter === cat.id ? "active" : "";
      const count = state.tasks.filter(t => t.category === cat.id && !t.completed).length;

      const li = document.createElement("li");
      if (activeClass) li.classList.add("active");
      
      li.innerHTML = `
        <a href="#">
          <span class="category-dot-label">
            <span class="cat-dot" style="background-color: ${cat.color}"></span>
            <span>${cat.name}</span>
          </span>
          <span class="cat-count">${count}</span>
        </a>
      `;

      li.addEventListener("click", (e) => {
        e.preventDefault();
        AudioEngine.playClick();
        
        // Go to tasks view if not already
        document.querySelector('[data-tab="tasks"]').click();
        
        state.selectedCategoryFilter = cat.id;
        document.querySelectorAll("#sidebar-categories li").forEach(el => el.classList.remove("active"));
        li.classList.add("active");
        
        this.renderTaskList();
      });

      list.appendChild(li);
    });
  },

  renderTaskList() {
    const list = document.getElementById("task-list");
    const emptyState = document.getElementById("task-empty-state");
    if (!list) return;

    list.innerHTML = "";

    // Filters
    const query = document.getElementById("global-search").value.toLowerCase().trim();
    const activeFilter = document.querySelector(".filter-pill.active").getAttribute("data-filter");
    
    let filteredTasks = [...state.tasks];

    // 1. Search Query Filter
    if (query) {
      filteredTasks = filteredTasks.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.description.toLowerCase().includes(query) || 
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // 2. Category Sidebar Filter
    if (state.selectedCategoryFilter) {
      filteredTasks = filteredTasks.filter(t => t.category === state.selectedCategoryFilter);
    }

    // 3. Tab Filter pills
    if (activeFilter === "active") {
      filteredTasks = filteredTasks.filter(t => !t.completed);
    } else if (activeFilter === "completed") {
      filteredTasks = filteredTasks.filter(t => t.completed);
    } else if (activeFilter === "today") {
      const todayStr = new Date().toISOString().split('T')[0];
      filteredTasks = filteredTasks.filter(t => t.dueDate === todayStr && !t.completed);
    } else if (activeFilter === "high") {
      filteredTasks = filteredTasks.filter(t => (t.priority === "high" || t.priority === "critical") && !t.completed);
    }

    // Sort order selection
    const sortVal = document.getElementById("task-sort").value;
    filteredTasks.sort((a, b) => {
      if (sortVal === "date-desc") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortVal === "date-asc") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortVal === "due-asc") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      } else if (sortVal === "priority-desc") {
        const prioritiesMap = { critical: 4, high: 3, medium: 2, low: 1, none: 0 };
        return (prioritiesMap[b.priority] || 0) - (prioritiesMap[a.priority] || 0);
      }
      return 0;
    });

    if (filteredTasks.length === 0) {
      emptyState.classList.remove("hidden");
    } else {
      emptyState.classList.add("hidden");
    }

    filteredTasks.forEach(task => {
      const catObj = state.categories.find(c => c.id === task.category) || { name: "Inbox", color: "#64748b" };
      const checkedAttr = task.completed ? "checked" : "";
      
      const li = document.createElement("li");
      li.className = `task-card ${task.completed ? 'completed' : ''}`;
      if (task.id === state.activeTaskId) li.style.borderColor = "var(--primary-color)";

      // Subtasks count builder
      let subtasksText = "";
      if (task.subtasks && task.subtasks.length > 0) {
        const doneSubs = task.subtasks.filter(s => s.completed).length;
        subtasksText = `<div class="subtask-indicator"><i class="fa-solid fa-list-check"></i> ${doneSubs}/${task.subtasks.length}</div>`;
      }

      // Priority color pill builder
      const priorityChip = task.priority !== "none" ? `<span class="chip chip-priority ${task.priority}">${task.priority}</span>` : "";

      // Due date pill builder
      let dueChip = "";
      if (task.dueDate && !task.completed) {
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = task.dueDate < today;
        const isToday = task.dueDate === today;
        
        dueChip = `<span class="chip chip-due ${isOverdue ? 'overdue' : ''} ${isToday ? 'today' : ''}">
          <i class="fa-regular fa-calendar"></i> ${this.formatFriendlyDate(task.dueDate)}
        </span>`;
      }

      // Tags chip builder
      let tagsChips = "";
      if (task.tags && task.tags.length > 0) {
        tagsChips = task.tags.map(tag => `<span class="chip chip-tag">#${tag}</span>`).join("");
      }

      li.innerHTML = `
        <div class="task-card-left">
          <label class="checkbox-wrapper">
            <input type="checkbox" ${checkedAttr} class="task-toggle-box"/>
            <span class="custom-checkbox"></span>
          </label>
          <div class="task-info-block">
            <span class="task-title">${task.title}</span>
            <div class="task-chips">
              <span class="chip chip-category" style="color: ${catObj.color}; background: rgba(${this.hexToRgb(catObj.color)}, 0.1)">
                <i class="fa-solid fa-circle" style="font-size: 6px; margin-right: 4px; color: ${catObj.color}"></i> ${catObj.name}
              </span>
              ${priorityChip}
              ${dueChip}
              ${tagsChips}
            </div>
          </div>
        </div>
        <div class="task-card-right">
          ${subtasksText}
          <button class="btn-icon task-edit-btn"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
      `;

      // Event listener to open detailed drawer
      li.addEventListener("click", (e) => {
        // Prevent trigger if checkboxes or delete action clicked
        if (e.target.closest(".checkbox-wrapper") || e.target.closest(".task-toggle-box")) {
          return;
        }
        AudioEngine.playClick();
        this.openTaskDrawer(task);
        // Redraw list to update highlighted task card border
        document.querySelectorAll(".task-card").forEach(c => c.style.borderColor = "");
        li.style.borderColor = "var(--primary-color)";
      });

      // Task Completion Checkbox Listener
      const checkbox = li.querySelector(".task-toggle-box");
      checkbox.addEventListener("change", (e) => {
        task.completed = e.target.checked;
        li.classList.toggle("completed", task.completed);
        
        if (task.completed) {
          AudioEngine.playSuccess();
          // Trigger Confetti on completion
          try {
            window.confetti({
              particleCount: 50,
              spread: 45,
              origin: { y: 0.8 }
            });
          } catch (err) {}
        } else {
          AudioEngine.playClick();
        }
        
        saveState();
        // Dynamic stats updates
        this.renderWelcomeHeader();
        this.renderCategoriesSidebar();
        this.renderDashboardView();
        
        // Timeout to allow clean transition animation before full task view refresh
        setTimeout(() => {
          AppUI.renderTaskList();
        }, 300);
      });

      list.appendChild(li);
    });
  },

  renderDashboardView() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Stats elements
    document.getElementById("stat-completion-pct").textContent = `${percent}%`;
    document.getElementById("stat-progress-bar-fill").style.width = `${percent}%`;
    
    const pending = state.tasks.filter(t => !t.completed).length;
    document.getElementById("stat-pending-count").textContent = pending;

    document.getElementById("stat-pomo-sessions").textContent = state.pomoStats.sessionsCompleted;
    
    // Simple streak simulator: increment if they completed tasks on consecutive days
    document.getElementById("stat-streak-count").textContent = Math.max(1, state.pomoStats.sessionsCompleted);

    // Dashboard Target Task / Highlight
    const focusTaskContainer = document.getElementById("dashboard-focus-task");
    if (focusTaskContainer) {
      // Find critical or high priority active tasks
      const highPrioTasks = state.tasks.filter(t => !t.completed && (t.priority === 'critical' || t.priority === 'high'));
      if (highPrioTasks.length > 0) {
        const target = highPrioTasks[0];
        const cat = state.categories.find(c => c.id === target.category) || { name: 'Inbox', color: '#64748b' };
        focusTaskContainer.innerHTML = `
          <div class="focus-task-container">
            <div class="focus-task-details">
              <span class="focus-task-title">${target.title}</span>
              <div class="focus-task-meta">
                <span class="chip chip-priority ${target.priority}">${target.priority}</span>
                <span class="chip chip-category" style="color: ${cat.color}"><i class="fa-solid fa-circle" style="font-size: 6px;"></i> ${cat.name}</span>
              </div>
            </div>
            <div class="focus-task-actions">
              <button class="btn btn-primary" id="dash-focus-play-btn" title="Focus on Pomodoro timer">
                <i class="fa-solid fa-stopwatch"></i> Focus
              </button>
            </div>
          </div>
        `;
        
        document.getElementById("dash-focus-play-btn").addEventListener("click", () => {
          // Select this task in Pomodoro View dropdown and redirect
          document.getElementById("pomo-task-selector").value = target.id;
          PomodoroTimer.associatedTaskId = target.id;
          document.querySelector('[data-tab="pomodoro"]').click();
        });
      } else {
        focusTaskContainer.innerHTML = `
          <div class="empty-state" style="padding: 10px 0;">
            <p style="font-size: 13px;">No pending Critical or High Priority tasks. Nice work!</p>
          </div>
        `;
      }
    }

    // Dashboard Due Today / Overdue Mini List
    const dueTodayList = document.getElementById("dashboard-due-today-list");
    if (dueTodayList) {
      dueTodayList.innerHTML = "";
      const today = new Date().toISOString().split('T')[0];
      const overdueTasks = state.tasks.filter(t => !t.completed && t.dueDate && t.dueDate <= today);
      
      if (overdueTasks.length > 0) {
        overdueTasks.slice(0, 4).forEach(t => {
          const isOverdue = t.dueDate < today;
          const li = document.createElement("li");
          li.className = "task-item-min";
          li.innerHTML = `
            <div class="task-item-min-left">
              <i class="fa-solid fa-circle-exclamation ${isOverdue ? 'text-danger' : 'text-warning'}" style="color: ${isOverdue ? 'var(--color-streak)' : 'var(--color-pending)'}"></i>
              <span>${t.title}</span>
            </div>
            <span class="chip chip-due ${isOverdue ? 'overdue' : 'today'}">${isOverdue ? 'Overdue' : 'Today'}</span>
          `;
          li.addEventListener("click", () => {
            document.querySelector('[data-tab="tasks"]').click();
            this.openTaskDrawer(t);
          });
          dueTodayList.appendChild(li);
        });
      } else {
        dueTodayList.innerHTML = `
          <div class="empty-state" style="padding: 10px 0;">
            <p style="font-size: 13px;">No tasks due today or overdue. You are on track!</p>
          </div>
        `;
      }
    }
  },

  renderPomoViewOptions() {
    // Populate active task dropdown inside Pomodoro view
    const selector = document.getElementById("pomo-task-selector");
    if (!selector) return;

    selector.innerHTML = '<option value="">-- No Specific Task --</option>';
    
    state.tasks.forEach(t => {
      if (!t.completed) {
        const option = document.createElement("option");
        option.value = t.id;
        option.textContent = t.title;
        if (t.id === PomodoroTimer.associatedTaskId) {
          option.selected = true;
        }
        selector.appendChild(option);
      }
    });

    // Pomo stats display
    document.getElementById("pomo-target-display").textContent = `${state.pomoStats.dailyCompleted}/${state.pomoStats.dailyTarget}`;
    document.getElementById("pomo-total-time-display").textContent = `${state.pomoStats.totalMinutesFocused}m`;
  },

  renderTaskDetails(task) {
    document.getElementById("detail-task-title").value = task.title;
    document.getElementById("detail-task-priority").value = task.priority;
    document.getElementById("detail-task-due").value = task.dueDate || "";
    document.getElementById("detail-task-description").value = task.description || "";

    // Categories dropdown list in details drawer
    const catSelect = document.getElementById("detail-task-category");
    catSelect.innerHTML = "";
    state.categories.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      if (c.id === task.category) opt.selected = true;
      catSelect.appendChild(opt);
    });

    // Subtasks Checklist
    const subList = document.getElementById("detail-subtask-list");
    subList.innerHTML = "";
    
    if (!task.subtasks) task.subtasks = [];
    
    const totalSubs = task.subtasks.length;
    const completedSubs = task.subtasks.filter(s => s.completed).length;
    const subPercent = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
    
    document.getElementById("detail-subtask-progress").style.width = `${subPercent}%`;
    document.getElementById("detail-subtask-text").textContent = `${completedSubs}/${totalSubs}`;

    task.subtasks.forEach(sub => {
      const li = document.createElement("li");
      li.className = `subtask-item ${sub.completed ? 'completed' : ''}`;
      
      li.innerHTML = `
        <div class="subtask-item-left">
          <label class="checkbox-wrapper">
            <input type="checkbox" ${sub.completed ? 'checked' : ''} class="sub-toggle-box"/>
            <span class="custom-checkbox" style="width:18px; height:18px;"></span>
          </label>
          <span>${sub.text}</span>
        </div>
        <button class="btn-icon subtask-del-btn"><i class="fa-solid fa-trash-can" style="font-size:12px;"></i></button>
      `;

      // Checkbox event
      li.querySelector(".sub-toggle-box").addEventListener("change", (e) => {
        sub.completed = e.target.checked;
        li.classList.toggle("completed", sub.completed);
        
        AudioEngine.playClick();
        saveState();
        AppUI.renderTaskDetails(task);
        AppUI.renderTaskList();
      });

      // Delete event
      li.querySelector(".subtask-del-btn").addEventListener("click", () => {
        task.subtasks = task.subtasks.filter(s => s.id !== sub.id);
        AudioEngine.playClick();
        saveState();
        AppUI.renderTaskDetails(task);
        AppUI.renderTaskList();
      });

      subList.appendChild(li);
    });

    // Render Tags lists in drawer
    const tagsWrapper = document.getElementById("detail-tags-list");
    tagsWrapper.innerHTML = "";
    if (task.tags && task.tags.length > 0) {
      task.tags.forEach(tag => {
        const badge = document.createElement("span");
        badge.className = "tag-badge";
        badge.innerHTML = `
          <span>#${tag}</span>
          <button class="tag-del-btn"><i class="fa-solid fa-xmark"></i></button>
        `;
        
        badge.querySelector(".tag-del-btn").addEventListener("click", () => {
          task.tags = task.tags.filter(t => t !== tag);
          AudioEngine.playClick();
          saveState();
          AppUI.renderTaskDetails(task);
          AppUI.renderTaskList();
        });

        tagsWrapper.appendChild(badge);
      });
    }
  },

  // --- Helper formatting functions ---
  formatFriendlyDate(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    if (dateStr === today) return "Today";
    if (dateStr === tomorrow) return "Tomorrow";
    
    const parts = dateStr.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  },

  hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "99, 102, 241";
  }
};

// --- 7. APPLICATION INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Pomodoro and General UI layout
  PomodoroTimer.init();
  AppUI.init();
  
  // Set default timer preset styles on load
  const focusPomoPreset = document.querySelector('[data-pomo-mode="focus"]');
  if (focusPomoPreset) focusPomoPreset.classList.add("active");
});