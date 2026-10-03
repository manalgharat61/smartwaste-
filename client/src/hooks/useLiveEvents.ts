import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useLiveEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = user?.token ? `?token=${user.token}` : '';
    
    let sse: EventSource;
    let reconnectTimer: any;

    const connect = () => {
      sse = new EventSource(`http://localhost:5000/api/events${token}`);

      sse.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'heartbeat') return;
          
          // Invalidate queries based on event type
          if (event.type.startsWith('request.')) {
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            queryClient.invalidateQueries({ queryKey: ['overview'] });
            queryClient.invalidateQueries({ queryKey: ['today'] });
          } else if (event.type.startsWith('point.')) {
            queryClient.invalidateQueries({ queryKey: ['points'] });
          } else if (event.type.startsWith('vehicle.')) {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          } else if (event.type === 'notification.new') {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        } catch (err) {
          console.error('SSE parsing error', err);
        }
      };

      sse.onerror = () => {
        sse.close();
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (sse) sse.close();
      clearTimeout(reconnectTimer);
    };
  }, [queryClient]);
}
