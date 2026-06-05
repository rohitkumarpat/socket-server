import express from "express";
import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import axios from "axios";

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

app.use(express.json());

console.log("=== SOCKET SERVER STARTED ===");

const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_BASE_URL,
    methods: ["GET", "POST"],
  },
  pingInterval: 25000,
  pingTimeout: 60000,
});

io.on("connection", (socket) => {
  console.log("[socketserver] client connected", {
    socketId: socket.id,
    transport: socket.conn.transport.name,
  });

  socket.onAny((event, ...args) => {
    console.log("[socketserver] onAny", {
      socketId: socket.id,
      event,
      payload: args,
    });
  });

  socket.conn.on("upgrade", (transport) => {
    console.log("[socketserver] transport upgraded", {
      socketId: socket.id,
      transport: transport.name,
    });
  });

  socket.on("identity", async (userid) => {
    socket.data.userid = userid;

    console.log("[socketserver] identity received", {
      socketId: socket.id,
      userid,
    });

    try {
      await axios.post(
        `${process.env.NEXT_BASE_URL}/api/socket/conect`,
        {
          userid,
          socketid: socket.id,
        },
        {
          timeout: 15000,
        }
      );

      console.log("[socketserver] identity persisted", {
        socketId: socket.id,
        userid,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[socketserver] failed to connect socket user", {
          socketId: socket.id,
          userid,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      } else {
        console.error("[socketserver] unexpected socket identity error", error);
      }
    }
  });

  socket.on("updateLocation", async ({ userId, latitude, longitude }) => {
    console.log("[socketserver] updateLocation received", {
      socketId: socket.id,
      userId,
      latitude,
      longitude,
    });

    const payload = {
      userId,
      latitude,
      longitude,
    };

    io.emit("update-delivery-boy-location", payload);

    console.log("[socketserver] emitted update-delivery-boy-location", payload);

    try {
      await axios.post(
        `${process.env.NEXT_BASE_URL}/api/socket/update-location`,
        payload,
        {
          timeout: 15000,
        }
      );

      console.log("[socketserver] location persisted", payload);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[socketserver] failed to update user location", {
          socketId: socket.id,
          userId,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          code: error.code,
        });
      } else {
        console.error("[socketserver] unexpected location update error", error);
      }
    }
  });

  socket.on("disconnect", (reason) => {
    console.warn("[socketserver] user disconnected", {
      socketId: socket.id,
      userid: socket.data.userid,
      reason,
    });
  });
});

app.post("/notify-delivery", (req, res) => {
  console.log("=== NOTIFY DELIVERY HIT ===");

  const { event, data, socketid } = req.body;

  if (socketid) {
    io.to(socketid).emit(event, data);
    return res.status(200).json({ message: "Notification sent successfully" });
  }

  io.emit(event, data);
  return res
    .status(200)
    .json({ message: "Notification sent to all users successfully" });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
