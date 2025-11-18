"use client";

interface WebSocketMessage {
  type: string;
  channel: string;
  data: any;
}

interface Subscription {
  channel: string;
  callback: (data: any) => void;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // ✅ FIX: Increase max attempts
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000; // ✅ FIX: Max 30s delay (exponential backoff)
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isInitialized = false;
  private isConnecting = false; // ✅ FIX: Prevent multiple simultaneous connections

  // Lazy connection - don't auto-connect on construction
  constructor() {
    // Connection will be established when first subscription is made
  }

  private ensureConnection() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.connect();
    }
  }

  private connect() {
    // ✅ FIX: Prevent multiple simultaneous connections
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.isConnecting = true;
      
      // ✅ FIX: Get WebSocket URL from environment - prioritize WS_URL
      let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
      
      // If WS_URL is not set, construct from API_URL
      if (!wsUrl) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://predinex.fly.dev';
        // Convert http/https to ws/wss
        wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      } else {
        // Ensure WS_URL uses correct protocol
        wsUrl = wsUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      }
      
      // ✅ FIX: Append /ws if not already present - PREVENT DOUBLE /ws
      if (!wsUrl.endsWith('/ws')) {
        wsUrl = `${wsUrl}/ws`;
      }
      
      console.log('🔌 Connecting to WebSocket (websocket-client singleton):', wsUrl);
      
      // ✅ FIX: Close existing connection if any
      if (this.ws) {
        try {
          this.ws.close();
        } catch (_e) {
          // Ignore close errors
        }
      }
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        
        // ✅ FIX: Resubscribe to all channels after reconnection
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // ✅ FIX: Handle pong responses
          if (message.type === 'pong') {
            return; // Heartbeat response, no need to process
          }
          
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'No reason'})`);
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();
        
        // ✅ FIX: Don't reconnect on clean close (1000) or going away (1001)
        if (event.code !== 1000 && event.code !== 1001) {
          this.attemptReconnect();
        } else {
          console.log('✅ WebSocket closed cleanly, not reconnecting');
        }
      };

      this.ws.onerror = (_error) => {
        this.isConnecting = false;
        // ✅ FIX: Don't log generic error events (they're handled in onclose)
        // Only log if it's a meaningful error
        if (this.ws && this.ws.readyState === WebSocket.CLOSED) {
          console.warn('⚠️ WebSocket connection error (connection closed)');
        }
      };
    } catch (error) {
      this.isConnecting = false;
      console.error('❌ Error creating WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  private handleMessage(message: WebSocketMessage) {
    if (message.type === 'connected' || message.type === 'subscribed' || message.type === 'unsubscribed') {
      // Acknowledgement events; nothing to forward downstream
      return;
    }

    if (!message.channel) {
      console.warn('Received WebSocket message without channel info:', message);
      return;
    }

    if (message.data === undefined || message.data === null) {
      console.warn('Received undefined/null WebSocket data for channel:', message.channel);
      return;
    }

    const subscriptions = this.subscriptions.get(message.channel) || [];
    subscriptions.forEach(sub => {
      try {
        sub.callback(message.data);
      } catch (error) {
        console.error('Error in subscription callback:', error);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat(); // ✅ FIX: Clear any existing heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.warn('⚠️ Heartbeat ping failed:', error);
          // Connection might be dead, will be detected by onclose
        }
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect() {
    // ✅ FIX: Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      // ✅ FIX: Exponential backoff with jitter
      const baseDelay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );
      const jitter = Math.random() * 1000; // Add up to 1s jitter
      const delay = baseDelay + jitter;
      
      console.log(`🔄 Reconnecting in ${Math.round(delay)}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        if (!this.isConnecting && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached. WebSocket will not reconnect.');
    }
  }
  
  // ✅ FIX: Resubscribe to all channels after reconnection
  private resubscribeAll() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Resubscribe to all active subscriptions
    for (const channel of this.subscriptions.keys()) {
      try {
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          channel
        }));
        console.log(`📡 Resubscribed to channel: ${channel}`);
      } catch (error) {
        console.error(`❌ Error resubscribing to ${channel}:`, error);
      }
    }
  }

  public subscribe(channel: string, callback: (data: any) => void) {
    // Ensure connection is established
    this.ensureConnection();
    
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
    }
    
    this.subscriptions.get(channel)!.push({ channel, callback });
    
    // ✅ FIX: Send subscription message to server (with retry if not connected)
    const sendSubscribe = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({
            type: 'subscribe',
            channel
          }));
          console.log(`📡 Subscribed to channel: ${channel}`);
        } catch (error) {
          console.error(`❌ Error subscribing to ${channel}:`, error);
        }
      } else {
        // If not connected, wait a bit and try again
        setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            sendSubscribe();
          }
        }, 500);
      }
    };
    
    sendSubscribe();
    
    return () => this.unsubscribe(channel, callback);
  }

  public unsubscribe(channel: string, callback: (data: any) => void) {
    const subscriptions = this.subscriptions.get(channel);
    if (subscriptions) {
      const index = subscriptions.findIndex(sub => sub.callback === callback);
      if (index > -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscriptions.delete(channel);
        }
      }
    }
  }

  public subscribeToPoolProgress(poolId: string, callback: (data: any) => void) {
    return this.subscribe(`pool:${poolId}:progress`, callback);
  }

  public subscribeToRecentBets(callback: (data: any) => void) {
    return this.subscribe('recent_bets', callback);
  }

  public subscribeToPoolUpdates(poolId: string, callback: (data: any) => void) {
    return this.subscribe(`pool:${poolId}:updates`, callback);
  }

  // ===== ODDYSSEY SUBSCRIPTION METHODS =====
  
  /**
   * Subscribe to user's slip events (placed, evaluated, prize claimed)
   * @param userAddress The user's wallet address
   * @param callback Callback function for slip events
   */
  public subscribeToUserSlips(userAddress: string, callback: (data: any) => void) {
    console.log(`🎯 Subscribing to slips for user: ${userAddress}`);
    return this.subscribe(`slips:user:${userAddress}`, callback);
  }

  /**
   * Subscribe to slip placed events for a specific user
   * @param userAddress The user's wallet address
   * @param callback Callback function for slip placed events
   */
  public subscribeToSlipPlaced(userAddress: string, callback: (data: any) => void) {
    console.log(`🎯 Subscribing to slip:placed events for user: ${userAddress}`);
    return this.subscribe(`slip:placed:user:${userAddress}`, callback);
  }

  /**
   * Subscribe to slip evaluated events for a specific user
   * @param userAddress The user's wallet address
   * @param callback Callback function for slip evaluated events
   */
  public subscribeToSlipEvaluated(userAddress: string, callback: (data: any) => void) {
    console.log(`🎯 Subscribing to slip:evaluated events for user: ${userAddress}`);
    return this.subscribe(`slip:evaluated:user:${userAddress}`, callback);
  }

  /**
   * Subscribe to prize claimed events for a specific user
   * @param userAddress The user's wallet address
   * @param callback Callback function for prize claimed events
   */
  public subscribeToSlipPrizeClaimed(userAddress: string, callback: (data: any) => void) {
    console.log(`🎯 Subscribing to slip:prize_claimed events for user: ${userAddress}`);
    return this.subscribe(`slip:prize_claimed:user:${userAddress}`, callback);
  }

  /**
   * Subscribe to all Oddyssey events for a cycle
   * @param cycleId The cycle ID
   * @param callback Callback function for cycle events
   */
  public subscribeToOddysseyCycle(cycleId: number, callback: (data: any) => void) {
    console.log(`🎯 Subscribing to events for cycle: ${cycleId}`);
    return this.subscribe(`oddyssey:cycle:${cycleId}`, callback);
  }

  /**
   * Subscribe to live slip evaluation for a specific slip
   * @param slipId The slip ID
   * @param callback Callback function for evaluation updates
   */
  public subscribeToLiveSlipEvaluation(slipId: number, callback: (data: any) => void) {
    console.log(`🎯 Subscribing to live evaluation for slip: ${slipId}`);
    return this.subscribe(`oddyssey:slip:${slipId}:evaluation`, callback);
  }

  public getStats() {
    return {
      connected: this.isConnected,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce((total, subs) => total + subs.length, 0),
      channels: Array.from(this.subscriptions.keys())
    };
  }

  public disconnect() {
    // ✅ FIX: Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnect'); // Clean close
      } catch (_error) {
        // Ignore close errors
      }
      this.ws = null;
    }
    this.isConnected = false;
    this.subscriptions.clear();
  }
}

// Create singleton instance
const websocketClient = new WebSocketClient();

export default websocketClient;
