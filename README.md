# Habit Tracker - Lig-4 Style

A beautiful, interactive habit tracker built with Next.js and styled with Tailwind CSS, inspired by the Connect 4 game visualization.

## Features

- 📅 Monthly calendar view with day-by-day tracking
- 🎯 Visual habit tracking with colored tokens (green = completed, red = missed)
- ✏️ Inline habit editing and management
- 📊 Completion statistics and percentages
- 💾 Local storage persistence
- 🎨 Beautiful, responsive design
- ⚡ Smooth animations with Framer Motion

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- **Add habits**: Click "Novo hábito" to add a new habit
- **Track progress**: Click on circles to mark habits as completed (green) or missed (red)
- **Clear marks**: Right-click on circles to clear the mark
- **Edit habits**: Click on habit names to edit them
- **Navigate months**: Use the arrow buttons to navigate between months
- **View stats**: See completion rates and statistics for each habit

## Tech Stack

- **Next.js 14** - React framework
- **React 18** - UI library
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons

## Data Storage

All data is stored locally in your browser's localStorage, so your habits and progress are saved between sessions.

## License

MIT
