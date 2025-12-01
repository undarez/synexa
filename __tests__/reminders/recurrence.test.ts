/**
 * Tests unitaires pour les rappels récurrents
 */

import { calculateNextRecurrence, parseRecurrenceRule, formatRecurrenceRule } from "@/app/lib/reminders/recurrence";
import type { RecurrenceRule } from "@/app/lib/reminders/recurrence";

describe("Recurrence", () => {
  const baseDate = new Date("2025-12-01T10:00:00Z");

  describe("calculateNextRecurrence", () => {
    it("should calculate next daily recurrence", () => {
      const rule: RecurrenceRule = { type: "DAILY" };
      const next = calculateNextRecurrence(baseDate, rule);
      expect(next).toBeTruthy();
      expect(next?.getDate()).toBe(2); // Jour suivant
    });

    it("should calculate next weekly recurrence", () => {
      const rule: RecurrenceRule = { type: "WEEKLY" };
      const next = calculateNextRecurrence(baseDate, rule);
      expect(next).toBeTruthy();
      // 7 jours plus tard
      const expectedDate = new Date(baseDate);
      expectedDate.setDate(expectedDate.getDate() + 7);
      expect(next?.getDate()).toBe(expectedDate.getDate());
    });

    it("should calculate next monthly recurrence", () => {
      const rule: RecurrenceRule = { type: "MONTHLY" };
      const next = calculateNextRecurrence(baseDate, rule);
      expect(next).toBeTruthy();
      expect(next?.getMonth()).toBe(baseDate.getMonth() + 1);
    });

    it("should respect end date", () => {
      const rule: RecurrenceRule = {
        type: "DAILY",
        endDate: new Date("2025-12-01T10:00:00Z"),
      };
      const next = calculateNextRecurrence(baseDate, rule);
      expect(next).toBeNull();
    });
  });

  describe("parseRecurrenceRule", () => {
    it("should parse simple rule", () => {
      const rule = parseRecurrenceRule("DAILY");
      expect(rule).toEqual({ type: "DAILY" });
    });

    it("should parse rule with interval", () => {
      const rule = parseRecurrenceRule("DAILY:2");
      expect(rule).toEqual({ type: "DAILY", interval: 2 });
    });

    it("should parse JSON rule", () => {
      const jsonRule = JSON.stringify({ type: "WEEKLY", daysOfWeek: [1, 3, 5] });
      const rule = parseRecurrenceRule(jsonRule);
      expect(rule).toEqual({ type: "WEEKLY", daysOfWeek: [1, 3, 5] });
    });
  });

  describe("formatRecurrenceRule", () => {
    it("should format simple rule", () => {
      const rule: RecurrenceRule = { type: "DAILY" };
      const formatted = formatRecurrenceRule(rule);
      expect(formatted).toBe(JSON.stringify(rule));
    });

    it("should format rule with interval", () => {
      const rule: RecurrenceRule = { type: "DAILY", interval: 2 };
      const formatted = formatRecurrenceRule(rule);
      expect(formatted).toBe("DAILY:2");
    });
  });
});



