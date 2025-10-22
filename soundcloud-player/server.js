import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const CLIENT_ID = "ryRUzIe9hOPkIaQ8QRP97XcuYzdhStHs";

app.get("/api/search", async (req, res) => {
    const q = req.query.q || "";
    try {
        const response = await fetch(
            `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(q)}&client_id=${CLIENT_ID}&limit=10`
        );
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("Ошибка сервера:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Добавьте этот эндпоинт в ваш server.js

app.get('/api/stream', async (req, res) => {
    try {
        const { trackId } = req.query;

        // Получаем информацию о треке
        const trackResponse = await fetch(
            `https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${CLIENT_ID}`
        );
        const track = await trackResponse.json();

        // Получаем транскодинги (различные качества аудио)
        if (track.media && track.media.transcodings) {
            // Ищем HTTP MP3 stream (самый совместимый формат)
            const mp3Transcoding = track.media.transcodings.find(
                t => t.format.protocol === 'progressive' && t.format.mime_type === 'audio/mpeg'
            );

            if (mp3Transcoding) {
                // Получаем финальный URL
                const streamResponse = await fetch(
                    `${mp3Transcoding.url}?client_id=${CLIENT_ID}`
                );
                const streamData = await streamResponse.json();

                res.json({ streamUrl: streamData.url });
            } else {
                res.status(404).json({ error: 'Stream not found' });
            }
        } else {
            res.status(404).json({ error: 'No media available' });
        }
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({ error: 'Failed to get stream' });
    }
});

app.listen(3000, () => console.log("✅ Proxy запущен на http://localhost:3000"));
