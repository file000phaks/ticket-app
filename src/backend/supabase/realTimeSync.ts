// Real-time Synchronization Service for Field Engineer Portal
// Handles real-time updates, WebSocket connections, and data synchronization

import { supabase } from './supabase-interface';
import { toast } from '@/components/ui/use-toast';

interface SyncEvent {
  type: 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'user_status_changed' | 'system_update';
  data: any;
  timestamp: Date;
  userId?: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  lastSeen: Date;
  reconnectAttempts: number;
  quality: 'excellent' | 'good' | 'poor' | 'offline';
}

type SyncEventHandler = (event: SyncEvent) => void;

class RealTimeSyncService {
  private eventHandlers: Map<string, SyncEventHandler[]> = new Map();
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    lastSeen: new Date(),
    reconnectAttempts: 0,
    quality: 'offline'
  };
  private syncInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private supabaseSubscriptions: any[] = [];
  private isInitialized = false;

  // Initialize the service
  async initialize(userId?: string): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('Initializing real-time sync service...');

      // Start connection monitoring
      this.startConnectionMonitoring();

      // Set up Supabase real-time subscriptions
      await this.setupSupabaseSubscriptions(userId);

      // Start periodic sync
      this.startPeriodicSync();

      this.isInitialized = true;
      console.log('Real-time sync service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize real-time sync service:', error);
      return false;
    }
  }

  // Set up Supabase real-time subscriptions
  private async setupSupabaseSubscriptions(userId?: string): Promise<void> {
    try {
      // Subscribe to ticket changes
      const ticketSubscription = supabase
        .channel('tickets')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'tickets' 
          }, 
          (payload) => {
            this.handleSupabaseEvent('ticket', payload);
          }
        )
        .subscribe();

      this.supabaseSubscriptions.push(ticketSubscription);

      // Subscribe to user profile changes
      const profileSubscription = supabase
        .channel('user_profiles')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles'
          },
          (payload) => {
            this.handleSupabaseEvent('user_profile', payload);
          }
        )
        .subscribe();

      this.supabaseSubscriptions.push(profileSubscription);

      // Subscribe to notifications
      if (userId) {
        const notificationSubscription = supabase
          .channel('notifications')
          .on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`
            },
            (payload) => {
              this.handleSupabaseEvent('notification', payload);
            }
          )
          .subscribe();

        this.supabaseSubscriptions.push(notificationSubscription);
      }

      this.updateConnectionStatus(true, 'excellent');
    } catch (error) {
      console.error('Failed to setup Supabase subscriptions:', error);
      this.updateConnectionStatus(false, 'offline');
    }
  }

  // Handle Supabase real-time events
  private handleSupabaseEvent(table: string, payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    let syncEvent: SyncEvent;

    switch (table) {
      case 'ticket':
        syncEvent = {
          type: eventType === 'INSERT' ? 'ticket_created' : 'ticket_updated',
          data: newRecord || oldRecord,
          timestamp: new Date()
        };
        break;

      case 'user_profile':
        syncEvent = {
          type: 'user_status_changed',
          data: { profile: newRecord || oldRecord, eventType },
          timestamp: new Date()
        };
        break;

      case 'notification':
        syncEvent = {
          type: 'system_update',
          data: newRecord,
          timestamp: new Date(),
          userId: newRecord?.user_id
        };
        
        // Show notification toast
        if (newRecord) {
          toast({
            title: newRecord.title || 'New Notification',
            description: newRecord.message || 'You have a new notification'
          });
        }
        break;

      default:
        return;
    }

    this.emitEvent(syncEvent);
  }

  // Start connection monitoring
  private startConnectionMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 10000); // Check every 10 seconds

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Connection restored');
      this.handleConnectionRestore();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost');
      this.updateConnectionStatus(false, 'offline');
    });

    // Monitor network quality
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.updateNetworkQuality(connection);
      });
    }
  }

  // Check connection health
  private async checkConnectionHealth(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Simple ping to check connectivity
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const quality = this.getQualityFromResponseTime(responseTime);
        this.updateConnectionStatus(true, quality);
        this.connectionStatus.reconnectAttempts = 0;
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.warn('Connection health check failed:', error);
      this.updateConnectionStatus(false, 'offline');
      this.attemptReconnection();
    }
  }

  // Determine connection quality from response time
  private getQualityFromResponseTime(responseTime: number): ConnectionStatus['quality'] {
    if (responseTime < 100) return 'excellent';
    if (responseTime < 300) return 'good';
    if (responseTime < 1000) return 'poor';
    return 'offline';
  }

  // Update network quality based on navigator.connection
  private updateNetworkQuality(connection: any): void {
    const { effectiveType, downlink } = connection;
    
    let quality: ConnectionStatus['quality'] = 'good';
    
    if (effectiveType === '4g' && downlink > 5) {
      quality = 'excellent';
    } else if (effectiveType === '3g' || downlink < 1) {
      quality = 'poor';
    } else if (effectiveType === 'slow-2g' || downlink < 0.5) {
      quality = 'offline';
    }

    this.connectionStatus.quality = quality;
    this.emitConnectionStatusChange();
  }

  // Handle connection restoration
  private handleConnectionRestore(): void {
    this.updateConnectionStatus(true, 'good');
    
    // Re-establish Supabase subscriptions if needed
    if (this.supabaseSubscriptions.length === 0) {
      this.setupSupabaseSubscriptions();
    }

    // Trigger data sync
    this.triggerFullSync();
    
    toast({
      title: 'Connection restored',
      description: 'Syncing latest data...'
    });
  }

  // Attempt to reconnect
  private attemptReconnection(): void {
    if (this.reconnectTimeout) return;

    this.connectionStatus.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.connectionStatus.reconnectAttempts), 30000);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.checkConnectionHealth();
    }, delay);
  }

  // Update connection status
  private updateConnectionStatus(isConnected: boolean, quality: ConnectionStatus['quality']): void {
    const wasConnected = this.connectionStatus.isConnected;
    
    this.connectionStatus = {
      ...this.connectionStatus,
      isConnected,
      quality,
      lastSeen: new Date()
    };

    // Emit status change if connection state changed
    if (wasConnected !== isConnected) {
      this.emitConnectionStatusChange();
    }
  }

  // Start periodic sync for offline-first architecture
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.connectionStatus.isConnected) {
        this.performIncrementalSync();
      }
    }, 30000); // Sync every 30 seconds when online
  }

  // Perform incremental data sync
  private async performIncrementalSync(): Promise<void> {
    try {
      const lastSyncTime = localStorage.getItem('lastSyncTime');
      const timestamp = lastSyncTime ? new Date(lastSyncTime) : new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Sync tickets updated since last sync
      const { data: updatedTickets } = await supabase
        .from('tickets')
        .select('*')
        .gt('updated_at', timestamp.toISOString());

      if (updatedTickets && updatedTickets.length > 0) {
        this.emitEvent({
          type: 'ticket_updated',
          data: { tickets: updatedTickets, incremental: true },
          timestamp: new Date()
        });
      }

      localStorage.setItem('lastSyncTime', new Date().toISOString());
    } catch (error) {
      console.error('Incremental sync failed:', error);
    }
  }

  // Trigger full data sync
  private async triggerFullSync(): Promise<void> {
    try {
      console.log('Performing full data sync...');
      
      this.emitEvent({
        type: 'system_update',
        data: { action: 'full_sync_started' },
        timestamp: new Date()
      });

      // This would trigger a full data refresh in the application
      localStorage.setItem('lastSyncTime', new Date().toISOString());
      
      this.emitEvent({
        type: 'system_update',
        data: { action: 'full_sync_completed' },
        timestamp: new Date()
      });

      console.log('Full data sync completed');
    } catch (error) {
      console.error('Full sync failed:', error);
    }
  }

  // Event handling
  on(eventType: SyncEvent['type'], handler: SyncEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  off(eventType: SyncEvent['type'], handler: SyncEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emitEvent(event: SyncEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in sync event handler:', error);
        }
      });
    }
  }

  private emitConnectionStatusChange(): void {
    this.emitEvent({
      type: 'system_update',
      data: { 
        action: 'connection_status_changed', 
        status: this.connectionStatus 
      },
      timestamp: new Date()
    });
  }

  // Public methods
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  async forceSync(): Promise<void> {
    if (!this.connectionStatus.isConnected) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.triggerFullSync();
  }

  // Cleanup
  destroy(): void {
    // Clear intervals
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Unsubscribe from Supabase
    this.supabaseSubscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.supabaseSubscriptions = [];

    // Clear event handlers
    this.eventHandlers.clear();

    this.isInitialized = false;
    
  }
}

// Create and export singleton instance
export const realTimeSyncService = new RealTimeSyncService();

// Auto-initialize (will be called by the app)
export const initializeRealTimeSync = (userId?: string) => {
  return realTimeSyncService.initialize(userId);
};

export type { SyncEvent, ConnectionStatus, SyncEventHandler };
export default realTimeSyncService;
