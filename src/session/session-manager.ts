import type { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { SessionData } from "../auth/types.js";
import { getSessionConfig } from "../config/session-config.js";

interface Session {
  transport: StreamableHTTPServerTransport;
  sessionData: SessionData;
  createdAt: number;
  lastAccessedAt: number;
}

// Configuration - loaded from environment
const sessionConfig = getSessionConfig();
const TRANSPORT_IDLE_TIMEOUT = sessionConfig.TRANSPORT_IDLE_TIMEOUT;
const TRANSPORT_MAX_LIFETIME = sessionConfig.TRANSPORT_MAX_LIFETIME;

export class SessionManager {
  private sessions = new Map<string, Session>();

  /**
   * Check if a session is still valid based on TTL
   */
  private isValid(session: Session): boolean {
    const now = Date.now();
    const idleTime = now - session.lastAccessedAt;
    const lifetime = now - session.createdAt;

    return idleTime < TRANSPORT_IDLE_TIMEOUT && lifetime < TRANSPORT_MAX_LIFETIME;
  }

  /**
   * Get session data for a session ID
   */
  getSessionData(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    // Update timestamp BEFORE validity check for atomicity
    const now = Date.now();
    session.lastAccessedAt = now;

    if (!this.isValid(session)) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    return session.sessionData;
  }

  /**
   * Get transport for a session ID
   */
  getTransport(sessionId: string): StreamableHTTPServerTransport | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    // Update timestamp BEFORE validity check for atomicity
    const now = Date.now();
    session.lastAccessedAt = now;

    if (!this.isValid(session)) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    return session.transport;
  }

  /**
   * Get full session (for validation checks)
   */
  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    // Update timestamp BEFORE validity check for atomicity
    const now = Date.now();
    session.lastAccessedAt = now;

    if (!this.isValid(session)) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    return session;
  }

  /**
   * Create a new session
   */
  createSession(
    sessionId: string,
    transport: StreamableHTTPServerTransport,
    sessionData: SessionData
  ): void {
    // Defensive check for collision (extremely unlikely with UUIDs)
    if (this.sessions.has(sessionId)) {
      console.error(`[SessionManager] Warning: Session ID collision detected: ${sessionId}`);
    }

    this.sessions.set(sessionId, {
      transport,
      sessionData,
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    });

    console.error(`[SessionManager] Created session ${sessionId} (total: ${this.sessions.size})`);
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): boolean {
    const removed = this.sessions.delete(sessionId);
    if (removed) {
      console.error(`[SessionManager] Removed session ${sessionId} (remaining: ${this.sessions.size})`);
    }
    return removed;
  }

  /**
   * Check if session exists and is valid
   */
  hasSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session !== undefined && this.isValid(session);
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpired(): void {
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (!this.isValid(session)) {
        try {
          session.transport.close();
        } catch (err) {
          console.error(`[SessionManager] Error closing transport for ${sessionId}:`, err);
        }
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.error(`[SessionManager] Cleaned up ${cleaned} expired sessions (remaining: ${this.sessions.size})`);
    }
  }

  /**
   * Cleanup all sessions (for shutdown)
   */
  cleanupAll(): void {
    console.error(`[SessionManager] Cleaning up all sessions (${this.sessions.size} total)`);

    for (const [sessionId, session] of this.sessions.entries()) {
      try {
        session.transport.close();
      } catch (err) {
        console.error(`[SessionManager] Error closing transport for ${sessionId}:`, err);
      }
    }

    this.sessions.clear();
    console.error('[SessionManager] All sessions cleaned up');
  }

  /**
   * Get current session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}
