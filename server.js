const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));

const MAX = 8;
const rooms = {}; // room -> { socketId: name }

io.on('connection', (s) => {
  s.on('join', ({ room, name }) => {
    room = String(room || '').trim().slice(0, 30);
    name = String(name || 'অজানা').trim().slice(0, 20);
    if (!room) return;
    rooms[room] = rooms[room] || {};
    if (Object.keys(rooms[room]).length >= MAX) return s.emit('full');
    s.room = room;
    s.name = name;
    s.join(room);
    const others = Object.entries(rooms[room]).map(([id, n]) => ({ id, name: n }));
    rooms[room][s.id] = name;
    s.emit('peers', others);
  });

  s.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: s.id, name: s.name, data });
  });

  s.on('chat', (t) => {
    if (s.room) io.to(s.room).emit('chat', { name: s.name, text: String(t).slice(0, 500) });
  });

  s.on('disconnect', () => {
    if (!s.room || !rooms[s.room]) return;
    delete rooms[s.room][s.id];
    if (!Object.keys(rooms[s.room]).length) delete rooms[s.room];
    io.to(s.room).emit('left', s.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('চালু হয়েছে: ' + PORT));
