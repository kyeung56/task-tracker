import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { initializeDatabase } from './db/index.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import categoryRoutes from './routes/categories.js';
import commentRoutes from './routes/comments.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import uploadRoutes from './routes/uploads.js';
import workflowRoutes from './routes/workflows.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Initialize database
initializeDatabase();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Serve static files
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/workflows', workflowRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
  });
});

// WebSocket connection handling
interface WSClient extends WebSocket {
  userId?: string;
}

const wsClients = new Map<string, Set<WSClient>>();

wss.on('connection', (ws: WSClient) => {
  console.log('WebSocket client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'auth' && message.token) {
        // Store userId with the websocket connection
        // In production, verify JWT token here
        ws.userId = message.userId;

        if (!wsClients.has(ws.userId)) {
          wsClients.set(ws.userId, new Set());
        }
        wsClients.get(ws.userId)!.add(ws);

        ws.send(JSON.stringify({ type: 'auth', success: true }));
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    if (ws.userId && wsClients.has(ws.userId)) {
      wsClients.get(ws.userId)!.delete(ws);
      if (wsClients.get(ws.userId)!.size === 0) {
        wsClients.delete(ws.userId);
      }
    }
  });
});

// Export function to send notifications via WebSocket
export function sendNotificationToUser(userId: string, notification: unknown) {
  const clients = wsClients.get(userId);
  if (clients) {
    const message = JSON.stringify({ type: 'notification', data: notification });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// Export function to broadcast to all connected clients
export function broadcast(message: unknown) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

export default app;
