
import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import { RoomState, User, Comment } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { randomUUID } from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Optimized Memory & State management
  const rooms: Record<string, {
    state: RoomState;
    users: Record<string, User>;
    comments: Comment[];
    lastActivity: number;
  }> = {};

  // Room Cleanup Interval (every 5 minutes)
  setInterval(() => {
    const now = Date.now();
    Object.keys(rooms).forEach(roomId => {
      // Delete empty rooms or rooms inactive for > 1 hour
      const isInactive = now - rooms[roomId].lastActivity > 3600000;
      const isEmpty = Object.keys(rooms[roomId].users).length === 0;
      if (isEmpty || isInactive) {
        console.log(`[CLEANUP] Evicting room: ${roomId}`);
        delete rooms[roomId];
      }
    });
  }, 300000);

  // Vite middleware for development
  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // WebSocket Server
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket & { roomId?: string; userId?: string }, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const roomId = url.searchParams.get("roomId") || "default";
    const userId = url.searchParams.get("userId") || randomUUID();
    const userName = url.searchParams.get("userName") || `User-${userId.substr(0, 4)}`;
    
    ws.roomId = roomId;
    ws.userId = userId;

    if (!rooms[roomId]) {
      rooms[roomId] = {
        state: {
          filters: { brightness: 100, contrast: 100, saturation: 100 },
          grading: {
            hue: 0,
            shadowsR: 0, shadowsG: 0, shadowsB: 0,
            midtonesR: 0, midtonesG: 0, midtonesB: 0,
            highlightsR: 0, highlightsG: 0, highlightsB: 0,
            blacks: 0, shadows: 0, midtones: 0, highlights: 0, whites: 0
          },
          prompt: "",
          mode: "generate",
          sourceImage: null,
          resultImage: null,
          mask: null,
          activePreset: null,
        },
        users: {},
        comments: [],
        lastActivity: Date.now(),
      };
    }

    const colors = ["#F87171", "#FB923C", "#FBBF24", "#34D399", "#60A5FA", "#818CF8", "#A78BFA", "#F472B6"];
    const userColor = colors[Math.floor(Math.random() * colors.length)];

    rooms[roomId].users[userId] = { id: userId, name: userName, color: userColor, mode: "generate" };

    // Send initial state
    ws.send(JSON.stringify({
      type: "init",
      payload: {
        state: rooms[roomId].state,
        users: Object.values(rooms[roomId].users),
        comments: rooms[roomId].comments,
        userId: userId
      }
    }));

    // Broadcast join
    broadcast(roomId, {
      type: "user:joined",
      payload: rooms[roomId].users[userId]
    }, userId);

    ws.on("message", (data) => {
      // Security: Limit payload size (5MB for images/state)
      if (data.toString().length > 5 * 1024 * 1024) {
        console.warn(`[SECURITY] Large payload rejected from ${userId}`);
        return;
      }

      try {
        const message = JSON.parse(data.toString());
        const { type, payload } = message;
        
        if (rooms[roomId]) rooms[roomId].lastActivity = Date.now();

        switch (type) {
          case "state:update":
            rooms[roomId].state = { ...rooms[roomId].state, ...payload };
            if (payload.mode && rooms[roomId].users[userId]) {
              rooms[roomId].users[userId].mode = payload.mode;
            }
            broadcast(roomId, { type: "state:updated", payload }, userId);
            break;
          
          case "user:update-mode":
            if (rooms[roomId].users[userId]) {
              rooms[roomId].users[userId].mode = payload.mode;
              broadcast(roomId, { type: "user:mode-updated", payload: { userId, mode: payload.mode } });
            }
            break;

          case "user:typing":
            broadcast(roomId, { type: "user:typing-status", payload: { userId, isTyping: payload.isTyping } }, userId);
            break;

          case "comment:add":
            const newComment = {
              id: randomUUID(),
              userId,
              userName,
              userColor,
              text: payload.text,
              timestamp: new Date().toISOString(),
              x: payload.x,
              y: payload.y
            };
            rooms[roomId].comments.push(newComment);
            broadcast(roomId, { type: "comment:added", payload: newComment });
            break;

          case "comment:delete":
            rooms[roomId].comments = rooms[roomId].comments.filter(c => c.id !== payload.id);
            broadcast(roomId, { type: "comment:deleted", payload: { id: payload.id } });
            break;

          case "cursor:move":
            broadcast(roomId, {
              type: "cursor:moved",
              payload: { userId, x: payload.x, y: payload.y }
            }, userId);
            break;
        }
      } catch (err) {
        console.error("WS Message Error:", err);
      }
    });

    ws.on("close", () => {
      if (rooms[roomId] && rooms[roomId].users[userId]) {
        delete rooms[roomId].users[userId];
        broadcast(roomId, {
          type: "user:left",
          payload: { userId }
        });
      }
    });
  });

  function broadcast(roomId: string, message: any, excludeUserId?: string) {
    const data = JSON.stringify(message);
    wss.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN && client.roomId === roomId && client.userId !== excludeUserId) {
        client.send(data);
      }
    });
  }
}

startServer();
