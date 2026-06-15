// src/components/NotificationStack.tsx

import React, { useState, useEffect } from 'react';
import { eventBus } from '../engine/EventBus';

interface NotificationItem {
  id: string;
  message: string;
  type: 'info' | 'warn' | 'success' | 'secret' | 'achievement';
}

export const NotificationStack: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const unsub = eventBus.on('notification', (payload: { message: string; type?: 'info' | 'warn' | 'success' | 'secret' | 'achievement' }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newNotif: NotificationItem = {
        id,
        message: payload.message,
        type: payload.type || 'info',
      };
      setNotifications(prev => [...prev, newNotif]);

      // Remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    });

    return unsub;
  }, []);

  return (
    <div className="notification-stack" style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '320px',
    }}>
      {notifications.map(notif => {
        let border = '1px solid var(--terminal-green)';
        let color = 'var(--terminal-green)';
        let bg = 'rgba(10, 10, 10, 0.95)';
        let prefix = '[INFO]';

        if (notif.type === 'warn') {
          border = '1px solid var(--amber-warning)';
          color = 'var(--amber-warning)';
          prefix = '[ALERT]';
        } else if (notif.type === 'success') {
          border = '1px solid #00ff88';
          color = '#00ff88';
          prefix = '[SUCCESS]';
        } else if (notif.type === 'secret') {
          border = '1px solid #ff00ff';
          color = '#ff00ff';
          prefix = '[SECRET]';
        } else if (notif.type === 'achievement') {
          border = '2px solid #ffd700';
          color = '#ffd700';
          prefix = '🏆 [ACHIEVEMENT]';
          bg = 'rgba(25, 20, 10, 0.98)';
        }

        return (
          <div key={notif.id} className="notification-item" style={{
            border,
            color,
            backgroundColor: bg,
            padding: '10px 15px',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '0.9rem',
            animation: 'slideIn 0.3s ease forwards',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
          }}>
            <span style={{ fontWeight: 'bold', marginRight: '5px' }}>{prefix}</span>
            {notif.message}
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
export default NotificationStack;
