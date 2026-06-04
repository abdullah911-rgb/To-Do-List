# Zenith - Ultimate Productivity Hub & Task Manager

  <img src="https://img.shields.io/badge/Language-Vanilla%20JavaScript-f7df1e?style=for-the-badge&logo=javascript&logoColor=black" alt="JS Badge" />
  <img src="https://img.shields.io/badge/Styling-Vanilla%20CSS3-1572b6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS Badge" />
  <img src="https://img.shields.io/badge/Markup-HTML5-e34f26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML Badge" />
  <img src="https://img.shields.io/badge/Release-v1.0.0-6366f1?style=for-the-badge" alt="Release Badge" />
  <img src="https://img.shields.io/badge/License-MIT-06b6d4?style=for-the-badge" alt="License Badge" />


## 🎯 About Zenith
**Zenith** is a high-end, responsive single-page productivity dashboard built from scratch with pure frontend technologies. Designed with **glassmorphism aesthetics**, it elevates standard task management to a SaaS-like experience. Zenith integrates advanced task scheduling, categorizations, tag compilers, subtask checkers, a fully functional Pomodoro Timer, synthesized Web Audio feedback, data persistence, and interactive productivity analytics.

This project was built to demonstrate clean, state-driven vanilla architecture, advanced CSS customization, responsive layout breakpoints, and usage of native browser APIs (such as Web Audio API and LocalStorage).

---

## ✨ Key Features

### 1. 🎨 Theme Customization Engine
Zenith features a unified CSS Custom Properties variable engine supporting **5 aesthetic themes** that toggle in real-time without layout shifts:
- **Slate Dark** (Default corporate indigo)
- **Aurora Borealis** (Mystic teal and deep forest green)
- **Neon Sunset** (Cyberpunk fuchsia, pink, and dark violet)
- **Emerald Forest** (Soothing organic dark green)
- **Crystal Light** (Modern high-contrast translucent light mode)

### 2. ⚡ Natural Language Task Compiler
Create tasks at lightspeed with Zenith's built-in NLP parser. Type commands directly in the task input bar:
- `@CategoryName` to dynamically categorize your task (creates the category if it doesn't exist!).
- `#tag` to bind tags (e.g. `#refactor #cv`).
- `!priority` (`!low`, `!medium`, `!high`, `!critical`) to assign importance tiers.
- *Example*: `Refactor layout scripts @Work #code #design !high` -> Generates a high-priority task under the category "Work", tagged with "code" and "design".

### 3. ⏱️ Integrated Pomodoro Focus Engine
- Fully functional circular timer utilizing animated SVG stroke offsets.
- Synchronize focus sessions directly to pending tasks in your list.
- Configurable settings panel to modify Work and Break intervals.
- Plays synthesized bell alarms when the countdown completes and tracks daily targeted metrics.

### 4. 📈 Real-Time Productivity Analytics
Powered by **Chart.js** CDN, Zenith visualizes your performance:
- **Task Completion History**: Line chart tracking completions over a rolling 7-day period.
- **Category Distribution**: Doughnut chart showing task volume breakdown.
- **Priority Breakdown**: Bar chart representing pending work.
- **Insights Engine**: Dynamically compiles text recommendations and efficiency metrics based on task completion trends.

### 5. 🎹 Web Audio Synthesizer
Natively synthesizes user interface sound cues:
- Clean woodblock/tick audio feedback on toggles.
- Electronic rising chimes celebrating task completions.
- Harmonized desk bell chord alarm on focus session conclusions.
- Self-contained using browser-native `AudioContext` and `OscillatorNode` with a preferences toggle.

### 6. 💾 LocalStorage Sync & JSON Backups
- Automatically synchronizes all tasks, checklists, statistics, and settings parameters.
- **Data Portability**: Download your configurations into a `zenith_backup.json` file or import historical backups to restore tasks instantly.

---

## 🎹 Keyboard Shortcuts
Navigate Zenith like a power user:
- <kbd>/</kbd> Focuses the global Search input field.
- <kbd>Esc</kbd> Instantly closes slide-out drawers, settings modals, and category forms.

---

## 🛠️ Installation & Usage
Zenith is completely client-side and requires **no external servers or package installations**.

1. Clone or download this repository:
   ```bash
   git clone https://github.com/yourusername/zenith-productivity-hub.git
   ```
2. Navigate to the project directory:
   ```bash
   cd zenith-productivity-hub/to-do-list
   ```
3. Open `index.html` directly in any modern web browser, or launch using a local development server:
   - **VS Code**: Right-click `index.html` -> "Open with Live Server"
   - **Python**: `python -m http.server 8000`
   - **Node.js / npm**: Install `serve` and run `npx serve`

---

