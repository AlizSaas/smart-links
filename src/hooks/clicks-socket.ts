// Fixed useClickSocket hook
import { useEffect, useRef, useState } from "react";
import { useGeoClickStore } from "@/hooks/geo-clicks-store";
import { durableObjectGeoClickArraySchema } from "@/zod/links";

const MAX_RETRIES = 5;

export function useClickSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const { addClicks } = useGeoClickStore();

  useEffect(() => {
    const connect = () => {
      // Fixed: Include port 3000 and use correct host
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host; // This includes port automatically
      const wsUrl = `${protocol}//${host}/click-socket`;
      
      console.log("Connecting to WebSocket:", wsUrl);
      console.log("Curren Time", Date.now().toLocaleString());
      
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        retryCountRef.current = 0;
      };

      socket.onmessage = (event) => {
        console.log("Received message:", event.data);
        try {
          const data = durableObjectGeoClickArraySchema.parse(
            JSON.parse(event.data),
          );
          addClicks(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socket.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);

        if (retryCountRef.current < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, retryCountRef.current);
          retryCountRef.current++;

          console.log(`Retrying in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);

          retryTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error("Max retries reached. WebSocket connection failed.");
        }
      };

      ws.current = socket;
    };

    connect();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [addClicks]);

  return { isConnected };
}