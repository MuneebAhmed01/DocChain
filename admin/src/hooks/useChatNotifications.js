import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const useChatNotifications = (dToken) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!dToken) return;

    const socket = io('http://localhost:4000', {
      auth: {
        token: dToken
      }
    });

    socketRef.current = socket;

    // Listen for new message notifications
    socket.on('new-message-notification', (data) => {
      // Only show notification for doctors receiving patient messages
      if (data.senderType === 'patient') {
        const notificationMessage = `New message from ${data.senderName}: ${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}`;
        
        toast.info(notificationMessage, {
          onClick: () => {
            // Navigate to patient chats
            window.location.href = '/patient-chats';
          },
          autoClose: 5000,
          closeButton: true,
          position: 'top-right'
        });
      }
    });

    socket.on('connect', () => {
      console.log('Doctor chat notifications connected');
    });

    socket.on('disconnect', () => {
      console.log('Doctor chat notifications disconnected');
    });

    socket.on('error', (error) => {
      console.error('Doctor socket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [dToken]);

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  return { disconnect };
};

export default useChatNotifications;
