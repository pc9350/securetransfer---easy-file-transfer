import { useState, useEffect, useCallback, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { 
  ConnectionInfo, 
  PeerMessage, 
  SECURITY_CONSTANTS 
} from '../types';
import { 
  generateSecureRoomCode, 
  normalizeRoomCode, 
  createSession, 
  destroySession,
  isRateLimited,
  recordAttempt,
  clearRateLimit,
  hashPin,
} from '../utils/security';
import { 
  logRoomCreated, 
  logConnectionAttempt, 
  logConnectionApproved, 
  logConnectionDenied,
  logPinVerified,
  logPinFailed,
  logError,
} from '../utils/auditLog';
import { logger } from '../utils/logger';

interface UseWebRTCOptions {
  mode: 'host' | 'client';
  roomCode?: string;
  onConnectionRequest?: (peerId: string) => Promise<boolean>;
  onPinRequired?: () => Promise<string | null>;
  onMessage?: (message: PeerMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

interface UseWebRTCReturn {
  connectionInfo: ConnectionInfo;
  connect: (roomCode?: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: PeerMessage) => boolean;
  setPin: (pin: string) => Promise<void>;
  roomCode: string | null;
  isConnected: boolean;
  isHost: boolean;
}

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCReturn {
  const {
    mode,
    roomCode: initialRoomCode,
    onConnectionRequest,
    onPinRequired,
    onMessage,
    onConnected,
    onDisconnected,
    onError,
  } = options;

  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    state: 'idle',
    peerId: null,
    remotePeerId: null,
    roomCode: null,
    connectedAt: null,
    error: null,
    isPinRequired: false,
    isPinVerified: false,
  });

  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const pinHashRef = useRef<string | null>(null);
  const pinAttemptsRef = useRef<number>(0);
  const isConnectingRef = useRef<boolean>(false);

  // Store roomCode in a ref to avoid dependency issues
  const roomCodeRef = useRef<string | null>(null);
  
  // Store callbacks in refs to avoid stale closures
  const onMessageRef = useRef(onMessage);
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);
  const onErrorRef = useRef(onError);
  const onConnectionRequestRef = useRef(onConnectionRequest);
  const onPinRequiredRef = useRef(onPinRequired);

  // Keep refs in sync with latest callbacks
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectedRef.current = onConnected;
    onDisconnectedRef.current = onDisconnected;
    onErrorRef.current = onError;
    onConnectionRequestRef.current = onConnectionRequest;
    onPinRequiredRef.current = onPinRequired;
  });
  
  // Keep roomCode ref in sync
  useEffect(() => {
    roomCodeRef.current = connectionInfo.roomCode;
  }, [connectionInfo.roomCode]);

  // Clean up function - NO dependencies to avoid re-running effects
  const cleanup = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // Use ref instead of state to avoid dependency
    if (roomCodeRef.current) {
      destroySession(roomCodeRef.current);
      roomCodeRef.current = null;
    }

    pinHashRef.current = null;
    pinAttemptsRef.current = 0;
  }, []); // Empty deps - cleanup function never changes

  // Update connection state
  const updateState = useCallback((updates: Partial<ConnectionInfo>) => {
    setConnectionInfo(prev => ({ ...prev, ...updates }));
  }, []);

  // Send message through data channel
  const sendMessage = useCallback((message: PeerMessage): boolean => {
    if (!connectionRef.current || connectionRef.current.open === false) {
      return false;
    }

    try {
      connectionRef.current.send(message);
      return true;
    } catch {
      logError('Failed to send message');
      return false;
    }
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = window.setInterval(() => {
      const message: PeerMessage = {
        type: 'heartbeat',
        timestamp: Date.now(),
        payload: null,
      };
      sendMessage(message);
    }, SECURITY_CONSTANTS.HEARTBEAT_INTERVAL_MS);
  }, [sendMessage]);

  // Handle incoming messages
  const handleMessage = useCallback(async (message: PeerMessage) => {
    logger.log('[WebRTC] Received message:', message.type);
    
    switch (message.type) {
      case 'connection_request':
        // Host receives connection request
        if (mode === 'host' && onConnectionRequestRef.current) {
          const remotePeerId = (message.payload as { peerId: string }).peerId;
          
          // Check rate limit
          if (isRateLimited(remotePeerId)) {
            const response: PeerMessage = {
              type: 'connection_denied',
              timestamp: Date.now(),
              payload: { reason: 'Too many attempts' },
            };
            sendMessage(response);
            logConnectionDenied(remotePeerId, 'Rate limited');
            return;
          }

          recordAttempt(remotePeerId);
          updateState({ state: 'awaiting_approval' });

          const approved = await onConnectionRequestRef.current(remotePeerId);
          
          if (approved) {
            clearRateLimit(remotePeerId);
            logConnectionApproved(remotePeerId);

            if (pinHashRef.current) {
              // PIN is required
              const response: PeerMessage = {
                type: 'pin_required',
                timestamp: Date.now(),
                payload: null,
              };
              sendMessage(response);
              updateState({ isPinRequired: true });
            } else {
              // No PIN, connection approved
              const response: PeerMessage = {
                type: 'connection_approved',
                timestamp: Date.now(),
                payload: null,
              };
              sendMessage(response);
              updateState({ 
                state: 'connected', 
                connectedAt: Date.now(),
                remotePeerId,
              });
              startHeartbeat();
              onConnectedRef.current?.();
            }
          } else {
            logConnectionDenied(remotePeerId, 'User denied');
            const response: PeerMessage = {
              type: 'connection_denied',
              timestamp: Date.now(),
              payload: { reason: 'Connection denied' },
            };
            sendMessage(response);
            updateState({ state: 'idle' });
          }
        }
        break;

      case 'connection_approved':
        // Client receives approval
        if (mode === 'client') {
          logConnectionAttempt(connectionInfo.peerId || 'unknown', true);
          updateState({ 
            state: 'connected', 
            connectedAt: Date.now(),
            isPinVerified: true,
          });
          startHeartbeat();
          onConnectedRef.current?.();
        }
        break;

      case 'connection_denied':
        // Client receives denial
        if (mode === 'client') {
          const reason = (message.payload as { reason?: string })?.reason || 'Connection denied';
          logConnectionAttempt(connectionInfo.peerId || 'unknown', false);
          updateState({ 
            state: 'error', 
            error: reason,
          });
          onErrorRef.current?.(reason);
        }
        break;

      case 'pin_required':
        // Client needs to enter PIN
        if (mode === 'client' && onPinRequired) {
          updateState({ isPinRequired: true });
          const pin = await onPinRequired();
          
          if (pin) {
            const hashedPin = await hashPin(pin);
            const response: PeerMessage = {
              type: 'pin_attempt',
              timestamp: Date.now(),
              payload: { 
                hashedPin,
                attemptNumber: pinAttemptsRef.current + 1,
              },
            };
            sendMessage(response);
          } else {
            // User cancelled PIN entry
            const response: PeerMessage = {
              type: 'disconnect',
              timestamp: Date.now(),
              payload: null,
            };
            sendMessage(response);
            cleanup();
            updateState({ state: 'idle', error: 'PIN entry cancelled' });
          }
        }
        break;

      case 'pin_attempt':
        // Host verifies PIN
        if (mode === 'host') {
          const { hashedPin, attemptNumber } = message.payload as { hashedPin: string; attemptNumber: number };
          
          if (hashedPin === pinHashRef.current) {
            logPinVerified();
            const response: PeerMessage = {
              type: 'pin_verified',
              timestamp: Date.now(),
              payload: null,
            };
            sendMessage(response);
            
            // Follow up with connection approved
            const approvalResponse: PeerMessage = {
              type: 'connection_approved',
              timestamp: Date.now(),
              payload: null,
            };
            sendMessage(approvalResponse);
            
            updateState({ 
              state: 'connected', 
              connectedAt: Date.now(),
              isPinVerified: true,
            });
            startHeartbeat();
            onConnectedRef.current?.();
          } else {
            logPinFailed(attemptNumber);
            pinAttemptsRef.current = attemptNumber;
            
            if (attemptNumber >= SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS) {
              const response: PeerMessage = {
                type: 'connection_denied',
                timestamp: Date.now(),
                payload: { reason: 'Too many PIN attempts' },
              };
              sendMessage(response);
              cleanup();
              updateState({ state: 'idle' });
            } else {
              const response: PeerMessage = {
                type: 'pin_invalid',
                timestamp: Date.now(),
                payload: { attemptsRemaining: SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS - attemptNumber },
              };
              sendMessage(response);
            }
          }
        }
        break;

      case 'pin_verified':
        // Client PIN was correct
        if (mode === 'client') {
          updateState({ isPinVerified: true });
        }
        break;

      case 'pin_invalid':
        // Client PIN was wrong
        if (mode === 'client' && onPinRequired) {
          const { attemptsRemaining } = message.payload as { attemptsRemaining: number };
          onErrorRef.current?.(`Invalid PIN. ${attemptsRemaining} attempts remaining.`);
          
          const pin = await onPinRequired();
          if (pin) {
            const hashedPin = await hashPin(pin);
            const response: PeerMessage = {
              type: 'pin_attempt',
              timestamp: Date.now(),
              payload: { 
                hashedPin,
                attemptNumber: SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS - attemptsRemaining + 1,
              },
            };
            sendMessage(response);
          }
        }
        break;

      case 'heartbeat':
        // Connection is alive
        break;

      case 'disconnect':
        cleanup();
        updateState({ state: 'disconnected' });
        onDisconnectedRef.current?.();
        break;

      default:
        // Forward other messages to handler
        logger.log('[WebRTC] Forwarding message to handler:', message.type);
        onMessageRef.current?.(message);
    }
  }, [mode, sendMessage, startHeartbeat, cleanup, updateState, connectionInfo.peerId]); // No callback deps - using refs

  // Initialize peer connection - let PeerJS generate ID for better compatibility
  const initializePeer = useCallback((peerId: string): Promise<Peer> => {
    return new Promise((resolve, reject) => {
      // Add prefix to make IDs more unique and avoid collisions
      const fullPeerId = `st-${peerId.toLowerCase()}`;
      
      logger.log('[PeerJS] Attempting to connect with ID:', fullPeerId);
      
      const peer = new Peer(fullPeerId, {
        debug: import.meta.env.DEV ? 2 : 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      const timeout = setTimeout(() => {
        logger.log('[PeerJS] Connection timeout, destroying peer');
        peer.destroy();
        reject(new Error('Connection timeout - server may be busy'));
      }, SECURITY_CONSTANTS.CONNECTION_TIMEOUT_MS);

      let hasResolved = false;
      let reconnectAttempts = 0;
      const MAX_RECONNECT_ATTEMPTS = 5;

      peer.on('open', (id) => {
        if (hasResolved) return;
        hasResolved = true;
        clearTimeout(timeout);
        reconnectAttempts = 0;
        updateState({ peerId: id });
        logger.log('[PeerJS] Successfully connected with ID:', id);
        resolve(peer);
      });

      peer.on('error', (err) => {
        console.error('[PeerJS] Error:', err.type, err.message);
        if (!hasResolved) {
          clearTimeout(timeout);
          if (err.type === 'unavailable-id') {
            reject(new Error('Room code already in use. Refreshing...'));
          } else if (err.type === 'browser-incompatible') {
            reject(new Error('Your browser does not support WebRTC'));
          } else {
            reject(new Error(`Connection error: ${err.type}`));
          }
        }
      });

      peer.on('disconnected', () => {
        logger.log('[PeerJS] Disconnected from signaling server, attempt:', reconnectAttempts + 1);
        
        if (peer && !peer.destroyed && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          // Exponential backoff for reconnection
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 10000);
          logger.log(`[PeerJS] Will attempt reconnect in ${delay}ms...`);
          
          setTimeout(() => {
            if (peer && !peer.destroyed && peer.disconnected) {
              logger.log('[PeerJS] Attempting reconnect...');
              peer.reconnect();
            }
          }, delay);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('[PeerJS] Max reconnect attempts reached');
          updateState({ state: 'error', error: 'Connection lost. Please refresh the page.' });
        }
      });

      peer.on('close', () => {
        logger.log('[PeerJS] Peer destroyed/closed');
      });
    });
  }, [updateState]);

  // Connect as host (receiver) with retry logic
  const connectAsHost = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    try {
      updateState({ state: 'connecting' });

      const roomCode = generateSecureRoomCode();
      const normalizedCode = normalizeRoomCode(roomCode);
      
      createSession(roomCode);
      logRoomCreated(roomCode);

      const peer = await initializePeer(normalizedCode);
      peerRef.current = peer;

      // Wait a moment to ensure connection is stable before showing room code
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if still connected
      if (peer.disconnected || peer.destroyed) {
        throw new Error('Connection not stable');
      }

      logger.log('[WebRTC] Connection stable, showing room code');
      
      updateState({ 
        state: 'idle',
        roomCode,
      });

      // Listen for incoming connections
      peer.on('connection', (conn) => {
        connectionRef.current = conn;
        updateState({ remotePeerId: conn.peer });

        conn.on('open', () => {
          // Wait for connection request message
        });

        conn.on('data', (data) => {
          handleMessage(data as PeerMessage);
        });

        conn.on('close', () => {
          cleanup();
          updateState({ state: 'disconnected' });
          onDisconnectedRef.current?.();
        });

        conn.on('error', (err) => {
          logError('Connection error', { error: String(err) });
          updateState({ state: 'error', error: 'Connection error' });
          onErrorRef.current?.('Connection error');
        });
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create room';
      logError('Failed to create room', { error: message, retryCount });
      
      // Retry if we haven't exceeded max retries
      if (retryCount < MAX_RETRIES) {
        logger.log(`[WebRTC] Connection failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return connectAsHost(retryCount + 1);
      }
      
      updateState({ state: 'error', error: 'Failed to connect. Please refresh the page.' });
      onErrorRef.current?.('Failed to connect. Please refresh the page.');
    }
  }, [initializePeer, updateState, handleMessage, cleanup]); // Using refs for callbacks

  // Connect as client (sender) with retry logic
  const connectAsClient = useCallback(async (targetRoomCode: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    try {
      updateState({ state: 'connecting' });

      const normalizedCode = normalizeRoomCode(targetRoomCode);
      // Host peer ID uses st- prefix and lowercase
      const hostPeerId = `st-${normalizedCode.toLowerCase()}`;
      
      // Generate unique client ID
      const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      logger.log('[WebRTC] Connecting to host:', hostPeerId);
      
      const peer = await initializePeer(clientId);
      peerRef.current = peer;

      // Connect to host using their peer ID
      const conn = peer.connect(hostPeerId, {
        reliable: true,
      });

      connectionRef.current = conn;

      conn.on('open', () => {
        updateState({ 
          roomCode: targetRoomCode,
          remotePeerId: normalizedCode,
        });

        // Send connection request
        const request: PeerMessage = {
          type: 'connection_request',
          timestamp: Date.now(),
          payload: { 
            peerId: clientId,
            deviceInfo: navigator.userAgent,
          },
        };
        conn.send(request);

        updateState({ state: 'awaiting_approval' });
      });

      conn.on('data', (data) => {
        handleMessage(data as PeerMessage);
      });

      conn.on('close', () => {
        cleanup();
        updateState({ state: 'disconnected' });
        onDisconnectedRef.current?.();
      });

      conn.on('error', (err) => {
        logError('Connection error', { error: String(err) });
        updateState({ state: 'error', error: 'Connection failed. Please check the room code.' });
        onErrorRef.current?.('Connection failed. Please check the room code.');
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect';
      logError('Failed to connect', { error: message, retryCount });
      
      // Retry if we haven't exceeded max retries
      if (retryCount < MAX_RETRIES) {
        logger.log(`[WebRTC] Client connection failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return connectAsClient(targetRoomCode, retryCount + 1);
      }
      
      updateState({ state: 'error', error: 'Connection failed. Please try again.' });
      onErrorRef.current?.('Connection failed. Please try again.');
    }
  }, [initializePeer, updateState, handleMessage, cleanup]); // Using refs for callbacks

  // Main connect function
  const connect = useCallback(async (roomCode?: string) => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      logger.log('[WebRTC] Already connecting, skipping...');
      return;
    }
    
    // Prevent connecting if already connected
    if (peerRef.current && !peerRef.current.destroyed) {
      logger.log('[WebRTC] Already connected, skipping...');
      return;
    }

    isConnectingRef.current = true;
    
    try {
      cleanup();

      if (mode === 'host') {
        await connectAsHost();
      } else {
        const code = roomCode || initialRoomCode;
        if (!code) {
          throw new Error('Room code is required for client mode');
        }
        await connectAsClient(code);
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [mode, initialRoomCode, connectAsHost, connectAsClient, cleanup]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (connectionRef.current) {
      const message: PeerMessage = {
        type: 'disconnect',
        timestamp: Date.now(),
        payload: null,
      };
      sendMessage(message);
    }
    cleanup();
    updateState({ 
      state: 'idle',
      peerId: null,
      remotePeerId: null,
      roomCode: null,
      connectedAt: null,
      error: null,
      isPinRequired: false,
      isPinVerified: false,
    });
  }, [sendMessage, cleanup, updateState]);

  // Set PIN for session
  const setPin = useCallback(async (pin: string) => {
    const hashedPin = await hashPin(pin);
    pinHashRef.current = hashedPin;
    updateState({ isPinRequired: true });
  }, [updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    connectionInfo,
    connect,
    disconnect,
    sendMessage,
    setPin,
    roomCode: connectionInfo.roomCode,
    isConnected: connectionInfo.state === 'connected',
    isHost: mode === 'host',
  };
}

