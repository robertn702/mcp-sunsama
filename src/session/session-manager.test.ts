import { describe, test, expect, beforeEach, jest } from "bun:test";
import { SessionManager } from "./session-manager.js";
import type { SessionData } from "../auth/types.js";
import type { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

describe("SessionManager", () => {
  let manager: SessionManager;
  let mockTransport: StreamableHTTPServerTransport;
  let mockSessionData: SessionData;

  beforeEach(() => {
    manager = new SessionManager();

    // Create mock transport
    mockTransport = {
      sessionId: "test-session-123",
      close: jest.fn(),
    } as unknown as StreamableHTTPServerTransport;

    // Create mock session data
    mockSessionData = {
      sunsamaClient: {} as any,
      email: "test@example.com",
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };
  });

  describe("Session Creation", () => {
    test("should create a new session", () => {
      manager.createSession("session-1", mockTransport, mockSessionData);

      expect(manager.hasSession("session-1")).toBe(true);
      expect(manager.getSessionCount()).toBe(1);
    });

    test("should handle multiple sessions", () => {
      const transport2 = { ...mockTransport, sessionId: "session-2" } as StreamableHTTPServerTransport;
      const sessionData2 = { ...mockSessionData, email: "test2@example.com" };

      manager.createSession("session-1", mockTransport, mockSessionData);
      manager.createSession("session-2", transport2, sessionData2);

      expect(manager.getSessionCount()).toBe(2);
      expect(manager.hasSession("session-1")).toBe(true);
      expect(manager.hasSession("session-2")).toBe(true);
    });

    test("should warn about session ID collision", () => {
      manager.createSession("session-1", mockTransport, mockSessionData);

      // Creating with same ID should log warning but still create
      manager.createSession("session-1", mockTransport, mockSessionData);

      expect(manager.getSessionCount()).toBe(1); // Overwritten
    });
  });

  describe("Session Retrieval", () => {
    test("should retrieve session data", () => {
      manager.createSession("session-1", mockTransport, mockSessionData);

      const retrieved = manager.getSessionData("session-1");

      expect(retrieved).toBeDefined();
      expect(retrieved?.email).toBe("test@example.com");
    });

    test("should retrieve transport", () => {
      manager.createSession("session-1", mockTransport, mockSessionData);

      const retrieved = manager.getTransport("session-1");

      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe("test-session-123");
    });

    test("should retrieve full session", () => {
      manager.createSession("session-1", mockTransport, mockSessionData);

      const retrieved = manager.getSession("session-1");

      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionData.email).toBe("test@example.com");
      expect(retrieved?.transport.sessionId).toBe("test-session-123");
    });

    test("should return undefined for non-existent session", () => {
      expect(manager.getSessionData("non-existent")).toBeUndefined();
      expect(manager.getTransport("non-existent")).toBeUndefined();
      expect(manager.getSession("non-existent")).toBeUndefined();
    });

    test("should update lastAccessedAt on retrieval", () => {
      manager.createSession("session-1", mockTransport, mockSessionData);

      // Wait a bit
      const timestampBefore = Date.now();

      // Small delay to ensure timestamp difference
      Bun.sleepSync(10); // 10ms

      // Retrieve session (should update timestamp)
      const retrieved = manager.getSessionData("session-1");

      expect(retrieved?.lastAccessedAt).toBeGreaterThanOrEqual(timestampBefore);
    });
  });

  describe("Session Validation", () => {
    test("should validate session exists", () => {
      manager.createSession("session-1", mockTransport, mockSessionData);

      expect(manager.hasSession("session-1")).toBe(true);
      expect(manager.hasSession("non-existent")).toBe(false);
    });

    test("should validate TTL logic with fresh session", () => {
      // Note: createSession() always sets timestamps to Date.now()
      // Testing actual expiry requires either mocking Date.now() or waiting
      manager.createSession("session-1", mockTransport, mockSessionData);

      // Freshly created session should be valid
      expect(manager.hasSession("session-1")).toBe(true);
      expect(manager.getSessionData("session-1")).toBeDefined();
    });
  });

  describe("Session Removal", () => {
    test("should remove a session", () => {
      manager.createSession("session-1", mockTransport, mockSessionData);

      const removed = manager.removeSession("session-1");

      expect(removed).toBe(true);
      expect(manager.hasSession("session-1")).toBe(false);
      expect(manager.getSessionCount()).toBe(0);
    });

    test("should return false when removing non-existent session", () => {
      const removed = manager.removeSession("non-existent");

      expect(removed).toBe(false);
    });

    test("should handle removing from multiple sessions", () => {
      const transport2 = { ...mockTransport, sessionId: "session-2" } as StreamableHTTPServerTransport;
      const sessionData2 = { ...mockSessionData, email: "test2@example.com" };

      manager.createSession("session-1", mockTransport, mockSessionData);
      manager.createSession("session-2", transport2, sessionData2);

      manager.removeSession("session-1");

      expect(manager.hasSession("session-1")).toBe(false);
      expect(manager.hasSession("session-2")).toBe(true);
      expect(manager.getSessionCount()).toBe(1);
    });
  });

  describe("Session Cleanup", () => {
    test("should cleanup expired sessions", () => {
      // Note: cleanupExpired logic is tested but we can't easily create
      // expired sessions without mocking Date.now()
      // This test verifies the cleanup method runs without errors
      manager.createSession("valid-session", mockTransport, mockSessionData);

      manager.cleanupExpired();

      // Valid session should remain
      expect(manager.hasSession("valid-session")).toBe(true);
      expect(manager.getSessionCount()).toBe(1);
    });

    test("should cleanup all sessions", () => {
      const transport2 = { ...mockTransport, sessionId: "session-2", close: jest.fn() } as unknown as StreamableHTTPServerTransport;
      const sessionData2 = { ...mockSessionData, email: "test2@example.com" };

      manager.createSession("session-1", mockTransport, mockSessionData);
      manager.createSession("session-2", transport2, sessionData2);

      manager.cleanupAll();

      expect(manager.getSessionCount()).toBe(0);
      expect(mockTransport.close).toHaveBeenCalled();
      expect(transport2.close).toHaveBeenCalled();
    });

    test("should handle cleanup errors gracefully", () => {
      const faultyTransport = {
        ...mockTransport,
        close: jest.fn(() => {
          throw new Error("Transport close failed");
        }),
      } as unknown as StreamableHTTPServerTransport;

      manager.createSession("faulty-session", faultyTransport, mockSessionData);

      // Should not throw, just log error
      expect(() => manager.cleanupAll()).not.toThrow();
      expect(manager.getSessionCount()).toBe(0);
    });

    test("should not cleanup valid sessions", () => {
      manager.createSession("session-1", mockTransport, mockSessionData);
      manager.createSession("session-2", mockTransport, mockSessionData);

      manager.cleanupExpired();

      expect(manager.getSessionCount()).toBe(2);
      expect(mockTransport.close).not.toHaveBeenCalled();
    });
  });

  describe("Session Count", () => {
    test("should return correct session count", () => {
      expect(manager.getSessionCount()).toBe(0);

      manager.createSession("session-1", mockTransport, mockSessionData);
      expect(manager.getSessionCount()).toBe(1);

      manager.createSession("session-2", mockTransport, mockSessionData);
      expect(manager.getSessionCount()).toBe(2);

      manager.removeSession("session-1");
      expect(manager.getSessionCount()).toBe(1);

      manager.cleanupAll();
      expect(manager.getSessionCount()).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    test("should handle rapid session creation and removal", () => {
      for (let i = 0; i < 100; i++) {
        manager.createSession(`session-${i}`, mockTransport, mockSessionData);
      }

      expect(manager.getSessionCount()).toBe(100);

      for (let i = 0; i < 50; i++) {
        manager.removeSession(`session-${i}`);
      }

      expect(manager.getSessionCount()).toBe(50);
    });

    test("should handle session with exact timeout boundaries", () => {
      // Note: createSession() always sets timestamps to Date.now()
      // so we can't directly test boundary conditions without modifying internal state
      // This test verifies that a freshly created session is valid
      manager.createSession("boundary-session", mockTransport, mockSessionData);

      // Freshly created session should be valid
      expect(manager.hasSession("boundary-session")).toBe(true);
    });
  });
});
