import { describe, test, expect, beforeEach } from "bun:test";
import { getSessionConfig } from "../../../src/config/session-config.js";

describe("Session Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env for each test
    process.env = { ...originalEnv };
    delete process.env.CLIENT_IDLE_TIMEOUT;
    delete process.env.CLIENT_MAX_LIFETIME;
    delete process.env.TRANSPORT_IDLE_TIMEOUT;
    delete process.env.TRANSPORT_MAX_LIFETIME;
    delete process.env.CLEANUP_INTERVAL;
  });

  describe("Default Values", () => {
    test("should use default values when no env vars set", () => {
      const config = getSessionConfig();

      expect(config.CLIENT_IDLE_TIMEOUT).toBe(600000); // 10 minutes
      expect(config.CLIENT_MAX_LIFETIME).toBe(3600000); // 1 hour
      expect(config.TRANSPORT_IDLE_TIMEOUT).toBe(900000); // 15 minutes
      expect(config.TRANSPORT_MAX_LIFETIME).toBe(7200000); // 2 hours
      expect(config.CLEANUP_INTERVAL).toBe(300000); // 5 minutes
    });
  });

  describe("Environment Variable Parsing", () => {
    test("should parse CLIENT_IDLE_TIMEOUT from env", () => {
      process.env.CLIENT_IDLE_TIMEOUT = "300000"; // 5 minutes
      const config = getSessionConfig();

      expect(config.CLIENT_IDLE_TIMEOUT).toBe(300000);
    });

    test("should parse CLIENT_MAX_LIFETIME from env", () => {
      process.env.CLIENT_MAX_LIFETIME = "1800000"; // 30 minutes
      const config = getSessionConfig();

      expect(config.CLIENT_MAX_LIFETIME).toBe(1800000);
    });

    test("should parse TRANSPORT_IDLE_TIMEOUT from env", () => {
      process.env.TRANSPORT_IDLE_TIMEOUT = "600000"; // 10 minutes
      const config = getSessionConfig();

      expect(config.TRANSPORT_IDLE_TIMEOUT).toBe(600000);
    });

    test("should parse TRANSPORT_MAX_LIFETIME from env", () => {
      process.env.TRANSPORT_MAX_LIFETIME = "3600000"; // 1 hour
      const config = getSessionConfig();

      expect(config.TRANSPORT_MAX_LIFETIME).toBe(3600000);
    });

    test("should parse CLEANUP_INTERVAL from env", () => {
      process.env.CLEANUP_INTERVAL = "180000"; // 3 minutes
      const config = getSessionConfig();

      expect(config.CLEANUP_INTERVAL).toBe(180000);
    });

    test("should parse all env vars together", () => {
      process.env.CLIENT_IDLE_TIMEOUT = "120000";
      process.env.CLIENT_MAX_LIFETIME = "600000";
      process.env.TRANSPORT_IDLE_TIMEOUT = "180000";
      process.env.TRANSPORT_MAX_LIFETIME = "900000";
      process.env.CLEANUP_INTERVAL = "60000";

      const config = getSessionConfig();

      expect(config.CLIENT_IDLE_TIMEOUT).toBe(120000);
      expect(config.CLIENT_MAX_LIFETIME).toBe(600000);
      expect(config.TRANSPORT_IDLE_TIMEOUT).toBe(180000);
      expect(config.TRANSPORT_MAX_LIFETIME).toBe(900000);
      expect(config.CLEANUP_INTERVAL).toBe(60000);
    });
  });

  describe("Validation", () => {
    test("should enforce minimum CLIENT_IDLE_TIMEOUT (1 minute)", () => {
      process.env.CLIENT_IDLE_TIMEOUT = "30000"; // 30 seconds

      expect(() => getSessionConfig()).toThrow();
    });

    test("should enforce minimum CLIENT_MAX_LIFETIME (5 minutes)", () => {
      process.env.CLIENT_MAX_LIFETIME = "120000"; // 2 minutes

      expect(() => getSessionConfig()).toThrow();
    });

    test("should enforce minimum TRANSPORT_IDLE_TIMEOUT (1 minute)", () => {
      process.env.TRANSPORT_IDLE_TIMEOUT = "45000"; // 45 seconds

      expect(() => getSessionConfig()).toThrow();
    });

    test("should enforce minimum TRANSPORT_MAX_LIFETIME (5 minutes)", () => {
      process.env.TRANSPORT_MAX_LIFETIME = "240000"; // 4 minutes

      expect(() => getSessionConfig()).toThrow();
    });

    test("should enforce minimum CLEANUP_INTERVAL (1 minute)", () => {
      process.env.CLEANUP_INTERVAL = "30000"; // 30 seconds

      expect(() => getSessionConfig()).toThrow();
    });

    test("should accept minimum valid values", () => {
      process.env.CLIENT_IDLE_TIMEOUT = "60000"; // 1 minute
      process.env.CLIENT_MAX_LIFETIME = "300000"; // 5 minutes
      process.env.TRANSPORT_IDLE_TIMEOUT = "60000"; // 1 minute
      process.env.TRANSPORT_MAX_LIFETIME = "300000"; // 5 minutes
      process.env.CLEANUP_INTERVAL = "60000"; // 1 minute

      const config = getSessionConfig();

      expect(config.CLIENT_IDLE_TIMEOUT).toBe(60000);
      expect(config.CLIENT_MAX_LIFETIME).toBe(300000);
      expect(config.TRANSPORT_IDLE_TIMEOUT).toBe(60000);
      expect(config.TRANSPORT_MAX_LIFETIME).toBe(300000);
      expect(config.CLEANUP_INTERVAL).toBe(60000);
    });
  });

  describe("Type Coercion", () => {
    test("should convert string numbers to integers", () => {
      process.env.CLIENT_IDLE_TIMEOUT = "900000";
      const config = getSessionConfig();

      expect(typeof config.CLIENT_IDLE_TIMEOUT).toBe("number");
      expect(config.CLIENT_IDLE_TIMEOUT).toBe(900000);
    });

    test("should reject non-numeric strings", () => {
      process.env.CLIENT_IDLE_TIMEOUT = "not-a-number";

      expect(() => getSessionConfig()).toThrow();
    });

    test("should reject decimal numbers", () => {
      process.env.CLIENT_IDLE_TIMEOUT = "600000.5";
      const config = getSessionConfig();

      // parseInt truncates decimals, so this becomes 600000
      expect(config.CLIENT_IDLE_TIMEOUT).toBe(600000);
    });
  });

  describe("Edge Cases", () => {
    test("should handle very large timeout values", () => {
      process.env.CLIENT_IDLE_TIMEOUT = "86400000"; // 24 hours
      process.env.CLIENT_MAX_LIFETIME = "604800000"; // 7 days

      const config = getSessionConfig();

      expect(config.CLIENT_IDLE_TIMEOUT).toBe(86400000);
      expect(config.CLIENT_MAX_LIFETIME).toBe(604800000);
    });

    test("should handle mixed set/unset environment variables", () => {
      process.env.CLIENT_IDLE_TIMEOUT = "180000";
      // Other vars use defaults

      const config = getSessionConfig();

      expect(config.CLIENT_IDLE_TIMEOUT).toBe(180000); // Custom
      expect(config.CLIENT_MAX_LIFETIME).toBe(3600000); // Default
      expect(config.TRANSPORT_IDLE_TIMEOUT).toBe(900000); // Default
    });
  });
});