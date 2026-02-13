# Enterprise Task Execution System v2.0

A lightweight enterprise task management system built with React, TypeScript, and Node.js.

## Features

- **Task Management**: Create, update, delete tasks with priorities, statuses, and categories
- **Calendar Views**: Month, week, and day views for task visualization
- **Dashboard**: Statistics, trends, and workload analysis
- **Comments System**: Task comments with @mentions support
- **Notifications**: Real-time notifications with WebSocket support
- **File Attachments**: Upload and attach files to tasks and comments
- **Team Management**: User management with role-based permissions
- **Workflow Engine**: Configurable status transitions and role restrictions
- **Multi-language Support**: English, Traditional Chinese, Simplified Chinese

## Architecture

```
├── src/                    # Frontend React application
│   ├── api/               # API client modules
│   ├── components/        # React components
│   │   ├── calendar/      # Calendar module
│   │   ├── common/        # Reusable UI components
│   │   ├── dashboard/     # Dashboard charts
│   │   ├── notifications/ # Notification system
│   │   └── tasks/         # Task-related components
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand state management
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
│
└── server/                 # Backend API server
    └── src/
        ├── db/            # Database setup and migrations
        ├── middleware/    # Express middleware
        └── routes/        # API route handlers
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install frontend dependencies:
```bash
npm install
```

2. Install backend dependencies:
```bash
cd server && npm install
```

3. Seed the database:
```bash
npm run server:seed
```

### Running the Application

1. Start the backend server:
```bash
npm run server:dev
```

2. In a new terminal, start the frontend:
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

### Default Login

- Email: `admin@example.com`
- Password: `admin123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Tasks
- `GET /api/tasks` - List tasks (with filtering)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/status` - Update status
- `POST /api/tasks/:id/log-time` - Log work hours

### Comments
- `GET /api/comments/task/:taskId` - Get task comments
- `POST /api/comments/task/:taskId` - Add comment
- `PUT /api/comments/:id` - Edit comment
- `DELETE /api/comments/:id` - Delete comment

### Notifications
- `GET /api/notifications` - List notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

### Dashboard
- `GET /api/dashboard/stats` - Get statistics
- `GET /api/dashboard/team-workload` - Get team workload

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

### Backend (.env)
```
PORT=3001
JWT_SECRET=your-secret-key
DATABASE_URL=./data/tasktracker.db
FRONTEND_URL=http://localhost:5173
```

## Tech Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Axios (HTTP client)
- Vite (build tool)

### Backend
- Node.js
- Express
- SQLite (better-sqlite3)
- JWT authentication
- WebSocket (ws)

## License

MIT
