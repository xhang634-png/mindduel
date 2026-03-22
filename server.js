const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// 让 Express 托管 public 文件夹里的网页和图片
app.use(express.static('public'));

let waitingPlayer = null; // 记录正在等待匹配的玩家

io.on('connection', (socket) => {
    console.log('玩家已连接:', socket.id);

    // 监听玩家发起匹配的请求
    socket.on('find_match', () => {
        if (waitingPlayer && waitingPlayer !== socket) {
            // 匹配成功：将两人加入同一个房间
            const roomName = 'room_' + socket.id;
            socket.join(roomName);
            waitingPlayer.join(roomName);

            // 记录房间号，方便后续发送消息
            socket.roomId = roomName;
            waitingPlayer.roomId = roomName;

            // 通知双方匹配成功，游戏开始
            io.to(roomName).emit('match_found');
            
            // 清空等待位，让后面的人继续排队
            waitingPlayer = null; 
        } else {
            // 没有人等待，自己进入等待位
            waitingPlayer = socket;
            socket.emit('waiting', '正在浩瀚精神海中寻找对手...');
        }
    });

    // 接收玩家出牌动作，并转发给同房间的对手
    socket.on('ACTION', (data) => {
        socket.to(socket.roomId).emit('ACTION', data);
    });

    // 接收重新开始请求
    socket.on('RESTART', () => {
        socket.to(socket.roomId).emit('RESTART');
    });

    // 玩家断开连接（刷新页面或关闭浏览器）
    socket.on('disconnect', () => {
        console.log('玩家断开连接:', socket.id);
        if (waitingPlayer === socket) {
            waitingPlayer = null; // 从等待队列中移除
        }
        if (socket.roomId) {
            // 通知对手你已掉线
            socket.to(socket.roomId).emit('opponent_disconnected');
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`游戏服务器已启动，请在浏览器访问 http://localhost:${PORT}`);
});