import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";

const CLIENT_ID = "ryRUzIe9hOPkIaQ8QRP97XcuYzdhStHs";

export default function SoundCloudPlayer() {
    const [query, setQuery] = useState("");
    const [tracks, setTracks] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [streamUrl, setStreamUrl] = useState(null);
    const [tg, setTg] = useState(null);

    const audioRef = useRef(null);

    // Инициализация Telegram WebApp
    useEffect(() => {
        if (window.Telegram?.WebApp) {
            const telegram = window.Telegram.WebApp;
            setTg(telegram);

            // Расширяем приложение на весь экран
            telegram.expand();

            // Настраиваем цвета темы
            telegram.setHeaderColor('#171717');
            telegram.setBackgroundColor('#171717');

            // Включаем кнопку "Назад" если нужно
            telegram.BackButton.hide();

            // Готово к использованию
            telegram.ready();
        }
    }, []);

    const searchTracks = async () => {
        if (!query.trim()) return;

        // Показываем индикатор загрузки в Telegram
        if (tg) tg.MainButton.showProgress();

        try {
            const response = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            setTracks(data.collection || []);

            // Вибрация при успешном поиске
            if (tg && data.collection?.length > 0) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        } catch (err) {
            console.error("Ошибка при поиске:", err);
            if (tg) {
                tg.HapticFeedback.notificationOccurred('error');
                tg.showAlert('Ошибка поиска. Проверьте подключение.');
            }
        } finally {
            if (tg) tg.MainButton.hideProgress();
        }
    };

    const playTrack = async (track) => {
        // Легкая вибрация при нажатии
        if (tg) tg.HapticFeedback.impactOccurred('light');

        try {
            const response = await fetch(`http://localhost:3000/api/stream?trackId=${track.id}`);
            const data = await response.json();

            if (data.streamUrl) {
                setCurrentTrack(track);
                setStreamUrl(data.streamUrl);
                setIsPlaying(true);

                // Средняя вибрация при успешной загрузке
                if (tg) tg.HapticFeedback.impactOccurred('medium');
            }
        } catch (err) {
            console.error("Ошибка воспроизведения:", err);
            if (tg) {
                tg.HapticFeedback.notificationOccurred('error');
                tg.showAlert('Не удалось загрузить трек');
            }
        }
    };

    const togglePlayPause = () => {
        if (!audioRef.current) return;

        if (tg) tg.HapticFeedback.impactOccurred('light');

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => {
                console.error("Ошибка воспроизведения:", err);
                setIsPlaying(false);
            });
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        if (tg) tg.HapticFeedback.impactOccurred('light');

        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * duration;

        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        if (tg) tg.HapticFeedback.impactOccurred('light');

        if (audioRef.current) {
            if (isMuted) {
                audioRef.current.volume = volume;
                setIsMuted(false);
            } else {
                audioRef.current.volume = 0;
                setIsMuted(true);
            }
        }
    };

    const skipTrack = (direction) => {
        if (tg) tg.HapticFeedback.impactOccurred('medium');

        const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id);
        if (currentIndex === -1) return;

        const newIndex = direction === 'next'
            ? (currentIndex + 1) % tracks.length
            : (currentIndex - 1 + tracks.length) % tracks.length;

        playTrack(tracks[newIndex]);
    };

    const formatTime = (time) => {
        if (!time || isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (streamUrl && audioRef.current) {
            audioRef.current.src = streamUrl;
            audioRef.current.play().catch(err => {
                console.error("Ошибка автовоспроизведения:", err);
                setIsPlaying(false);
            });
        }
    }, [streamUrl]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white flex flex-col items-center p-4 pb-6">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent text-center">
                    🎧 SoundCloud Player
                </h1>

                <div className="flex gap-2 mb-6">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchTracks()}
                        placeholder="Введите название трека..."
                        className="flex-1 p-3 rounded-xl bg-neutral-800 border border-neutral-700 focus:border-orange-500 focus:outline-none transition-colors text-white placeholder-neutral-500"
                    />
                    <button
                        onClick={searchTracks}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-5 py-3 rounded-xl font-semibold transition-all active:scale-95"
                    >
                        Найти
                    </button>
                </div>

                <div className="space-y-2 mb-32">
                    {tracks.map((track) => (
                        <div
                            key={track.id}
                            className={`bg-neutral-800 p-3 rounded-xl flex items-center gap-3 transition-all active:scale-98 border-2 ${
                                currentTrack?.id === track.id
                                    ? 'border-orange-500'
                                    : 'border-transparent'
                            }`}
                        >
                            <img
                                src={track.artwork_url || track.user.avatar_url}
                                alt={track.title}
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate text-sm">{track.title}</div>
                                <div className="text-xs text-neutral-400 truncate">{track.user.username}</div>
                            </div>
                            <button
                                onClick={() => playTrack(track)}
                                className="bg-orange-500 active:bg-orange-600 p-2.5 rounded-full transition-all flex-shrink-0"
                            >
                                <Play size={18} fill="white" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {currentTrack && (
                <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-neutral-900 to-neutral-800 border-t border-neutral-700 p-4 shadow-2xl">
                    <audio
                        ref={audioRef}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => skipTrack('next')}
                        onError={(e) => {
                            console.error("Ошибка аудио:", e);
                            if (tg) {
                                tg.showAlert('Ошибка воспроизведения трека');
                            }
                            setIsPlaying(false);
                        }}
                    />

                    <div className="max-w-md mx-auto">
                        {/* Progress Bar */}
                        <div
                            className="w-full h-1.5 bg-neutral-700 rounded-full mb-3 overflow-hidden active:h-2 transition-all"
                            onClick={handleSeek}
                        >
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                            />
                        </div>

                        {/* Track Info */}
                        <div className="flex items-center gap-3 mb-3">
                            <img
                                src={currentTrack.artwork_url || currentTrack.user.avatar_url}
                                alt={currentTrack.title}
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="font-bold truncate text-sm">{currentTrack.title}</div>
                                <div className="text-xs text-neutral-400 truncate">{currentTrack.user.username}</div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-neutral-400 w-16">
                                {formatTime(currentTime)}
                            </span>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => skipTrack('prev')}
                                    className="active:text-orange-500 transition-colors disabled:opacity-30"
                                    disabled={tracks.length === 0}
                                >
                                    <SkipBack size={22} />
                                </button>

                                <button
                                    onClick={togglePlayPause}
                                    className="bg-orange-500 active:bg-orange-600 p-3 rounded-full transition-all"
                                >
                                    {isPlaying ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" />}
                                </button>

                                <button
                                    onClick={() => skipTrack('next')}
                                    className="active:text-orange-500 transition-colors disabled:opacity-30"
                                    disabled={tracks.length === 0}
                                >
                                    <SkipForward size={22} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 w-16 justify-end">
                                <button onClick={toggleMute} className="active:text-orange-500 transition-colors">
                                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="mt-2">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-full accent-orange-500 h-1"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}