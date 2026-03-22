const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let waitingPlayer = null;

io.on('connection', (socket) => {
    socket.on('find_match', () => {
        if (waitingPlayer && waitingPlayer !== socket) {
            const roomName = 'room_' + socket.id;
            socket.join(roomName);
            waitingPlayer.join(roomName);
            socket.roomId = roomName;
            waitingPlayer.roomId = roomName;

            // 匹配成功
            io.to(roomName).emit('match_found');
            waitingPlayer = null; 
        } else {
            waitingPlayer = socket;
            socket.emit('waiting', '正在寻找对手...');
        }
    });

    socket.on('ACTION', (data) => {
        socket.to(socket.roomId).emit('ACTION', data);
    });

    socket.on('RESTART', () => {
        socket.to(socket.roomId).emit('RESTART');
    });

    socket.on('disconnect', () => {
        if (waitingPlayer === socket) waitingPlayer = null;
        if (socket.roomId) socket.to(socket.roomId).emit('opponent_disconnected');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`服务器启动在端口 ${PORT}`));