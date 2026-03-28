// Fixed useClickSocket hook
import { useEffect, useRef, useState, useCallback } from "react";
import { useGeoClickStore } from "@/hooks/geo-clicks-store";
import { durableObjectGeoClickArraySchema } from "@/zod/links";

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000; // 1 second base delay

export function useClickSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  const { addClicks } = useGeoClickStore();

  // Memoize the message handler to avoid recreating on each render
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = durableObjectGeoClickArraySchema.parse(
        JSON.parse(event.data)
      );
      if (data.length > 0) {
        addClicks(data);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }, [addClicks]);

  useEffect(() => {
    mountedRef.current = true;

    const connect = () => {
      if (!mountedRef.current) return;

      // Use current window location for WebSocket URL
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/click-socket`;
      
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (!mountedRef.current) {
          socket.close();
          return;
        }
        console.log("WebSocket connected");
        setIsConnected(true);
        retryCountRef.current = 0;
      };

      socket.onmessage = handleMessage;

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socket.onclose = (event) => {
        if (!mountedRef.current) return;
        
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);

        // Exponential backoff with max retries
        if (retryCountRef.current < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY * Math.pow(2, retryCountRef.current);
          retryCountRef.current++;

          console.log(`Retrying in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);

          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, delay);
        } else {
          console.error("Max retries reached. WebSocket connection failed.");
        }
      };

      ws.current = socket;
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [handleMessage]);

  return { isConnected };
}