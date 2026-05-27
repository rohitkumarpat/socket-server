import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import axios from 'axios';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

const io = new Server(server, {
    cors: {
        origin: process.env.NEXT_BASE_URL,
    },
});

io.on('connection', (socket) => {

    socket.on("identity", async (userid) => {

        try {
            await axios.post(`${process.env.NEXT_BASE_URL}/api/socket/conect`, {
                userid,
                socketid: socket.id
            });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Failed to connect socket user:', error.response?.status, error.response?.data || error.message);
            } else {
                console.error('Unexpected socket identity error:', error);
            }
        }
    });

    

    socket.on("updateLocation", async ({ userId, latitude, longitude }) => {
        try {
            await axios.post(`${process.env.NEXT_BASE_URL}/api/socket/update-location`, {
                userId,
                latitude,
                longitude
            });
            
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Failed to update user location:', error.response?.status, error.response?.data || error.message);
            } else {
                console.error('Unexpected location update error:', error);
            }
        }
    });


    socket.on('disconnect', () => {
        console.log('user disconnected', socket.id);
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
