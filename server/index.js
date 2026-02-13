const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/meetup';
console.log('Connecting to MongoDB...');

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Successfully connected to MongoDB');
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:');
        console.error(err.message);
    });

// Handle legacy index cleanup once connection is fully open
mongoose.connection.once('open', async () => {
    try {
        const collections = await mongoose.connection.db.listCollections({ name: 'users' }).toArray();
        if (collections.length > 0) {
            await mongoose.connection.db.collection('users').dropIndex('username_1');
            console.log('🗑️ Successfully dropped legacy username index');
        }
    } catch (err) {
        if (err.code !== 27) { // 27 = IndexNotFound
            console.log('ℹ️ Note: No legacy username index to drop or already removed.');
        }
    }
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', require('./routes/auth'));

app.get('/', (req, res) => {
    res.send('Zoom Clone Server is running');
});

const usersInRooms = {};

// Socket logic for signaling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-room', (roomId, userProfile) => {
        console.log(`User ${userProfile?.name} (Socket: ${socket.id}) joining room ${roomId}`);

        const newUser = {
            id: socket.id,
            name: userProfile?.name || 'Anonymous'
        };

        if (usersInRooms[roomId]) {
            usersInRooms[roomId].push(newUser);
        } else {
            usersInRooms[roomId] = [newUser];
        }
        socket.join(roomId);

        // Get all other users in this room
        const otherUsers = usersInRooms[roomId].filter(user => user.id !== socket.id);

        // Emitting 'all-users' to the newcomer
        socket.emit("all-users", otherUsers);

        // Broadcast full participant list to everyone in the room
        io.to(roomId).emit("room-users", usersInRooms[roomId]);

        console.log(`Users in room ${roomId}:`, usersInRooms[roomId].map(u => u.name));

        socket.on('disconnect', () => {
            if (usersInRooms[roomId]) {
                usersInRooms[roomId] = usersInRooms[roomId].filter(user => user.id !== socket.id);
                if (usersInRooms[roomId].length === 0) {
                    delete usersInRooms[roomId];
                } else {
                    // Update list for remaining users
                    io.to(roomId).emit("room-users", usersInRooms[roomId]);
                }
            }
            socket.to(roomId).emit('user-disconnected', socket.id);
        });

        // Chat Feature
        socket.on("send-message", ({ roomId, message }) => {
            console.log(`Message from ${message.sender} in room ${roomId}: ${message.text}`);
            socket.to(roomId).emit("receive-message", message);
        });

        // Hand Raise Feature
        socket.on("raise-hand", ({ roomId, raised }) => {
            console.log(`User ${socket.id} raised hand: ${raised} in room ${roomId}`);
            socket.to(roomId).emit("user-raised-hand", { userId: socket.id, raised });
        });
    });

    // Signaling for WebRTC
    socket.on('sending-signal', payload => {
        console.log(`Forwarding signal from ${payload.callerID} to ${payload.userToSignal}`);
        const caller = Object.values(usersInRooms).flat().find(u => u.id === payload.callerID);
        io.to(payload.userToSignal).emit('user-joined', {
            signal: payload.signal,
            callerID: payload.callerID,
            name: caller?.name || 'New Participant'
        });
    });

    socket.on('returning-signal', payload => {
        console.log(`Returning signal from ${socket.id} to ${payload.callerID}`);
        io.to(payload.callerID).emit('receiving-returned-signal', { signal: payload.signal, id: socket.id });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
