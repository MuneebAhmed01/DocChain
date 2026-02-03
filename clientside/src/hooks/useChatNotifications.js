import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const useChatNotifications = (token, userType = 'user') => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socket = io('http://localhost:4000', {
      auth: {
        token: token
      }
    });

    socketRef.current = socket;

    // Listen for new message notifications
    socket.on('new-message-notification', (data) => {
      // Only show notification for patients receiving doctor messages
      if (userType === 'user' && data.senderType === 'doctor') {
        const notificationMessage = `New message from Dr. ${data.senderName}: ${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}`;
        
        toast.info(notificationMessage, {
          onClick: () => {
            // Navigate to MyAppointments page
            window.location.href = '/my-appointments';
          },
          autoClose: 5000,
          closeButton: true,
          position: 'top-right'
        });
      }
    });

    socket.on('connect', () => {
      console.log('Chat notifications connected');
    });

    socket.on('disconnect', () => {
      console.log('Chat notifications disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, userType]);

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  return { disconnect };
};

export default useChatNotifications;
