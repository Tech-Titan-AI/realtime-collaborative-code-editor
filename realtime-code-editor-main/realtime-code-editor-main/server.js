const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const ACTIONS = require('./src/Actions'); 
const Document = require('./models/Document');

const server = http.createServer(app);

// --- DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/code-editor';
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB '))
    .catch((err) => console.error('MongoDB connection error', err));

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

const userSocketMap = {};

function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

async function findOrCreateDocument(id) {
    if (id == null) return;
    const document = await Document.findById(id);
    if (document) return document;
    return await Document.create({ _id: id, code: "" });
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // Join Room Logic
    socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        // Database se purana code load karke user ko bhejna
        const document = await findOrCreateDocument(roomId);
        socket.emit(ACTIONS.CODE_CHANGE, { code: document.code });

        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    // 1. Real-time Code Sync (Fast Sync without DB update)
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // 2. Dedicated Auto-Save Event (Database Update)
    socket.on('save-document', async ({ roomId, code }) => {
        try {
            await Document.findByIdAndUpdate(roomId, { code });
            // console.log(`Room ${roomId} autosaved.`);
        } catch (e) {
            console.error("Save error:", e);
        }
    });

    // Initial Code Sync
    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Language Change Broadcast
    socket.on('language-change', ({ roomId, language }) => {
        socket.in(roomId).emit('language-change', { language });
    });

    // Chat Message Logic
    socket.on('send-message', ({ roomId, message, username }) => {
        io.to(roomId).emit('receive-message', {
            message,
            username,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    // Disconnect Logic
    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

// --- PRODUCTION DEPLOYMENT LOGIC ---
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));