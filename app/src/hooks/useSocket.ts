import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

const getServerUrl = () => localStorage.getItem('server_url') || '';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = getServerUrl();
    if (!url) return;

    const socket = io(url, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => { socket.disconnect(); };
  }, []);

  const join = useCallback((userId: number) => {
    socketRef.current?.emit('join', userId);
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  const sendMessage = useCallback((to: number, content: string) => {
    socketRef.current?.emit('send_message', { to, content });
  }, []);

  return { socket: socketRef.current, connected, join, on, sendMessage };
}
