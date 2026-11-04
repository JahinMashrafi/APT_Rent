import { describe, expect, it, vi } from "vitest";
import { addMonths, formatDuration, monthsBetween } from "./leaseDuration.js";
import { adaptApplication, adaptProperty, flattenApplication, hasLiftIn } from "../services/adapters.js";
import {
  dayLabel,
  formatClock,
  formatCurrency,
  formatDate,
  formatNumber,
  hasKey,
  localizeDigits,
  relativeTime,
  translate,
} from "../i18n/translate.js";
import { formatTime, parseDateOnly, toDateString, upcomingDays } from "./tour.js";
import { occupationLabel, takesInstitution, takesWorkplace, workplaceLabel } from "./occupations.js";
import formatRelativeDate from "./formatRelativeDate.js";
import { extractNotificationAddresses, localizeNotification } from "./notificationText.js";
import { normalizeUserPayload } from "./auth.js";

describe("lease duration helpers", () => {
  it("adds months while clamping dates to the target month", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2024-12-01", 2)).toBe("2025-02-01");
  });

  it("calculates complete months and formats durations", () => {
    expect(monthsBetween("2026-01-31", "2026-03-30")).toBe(1);
    expect(monthsBetween("2026-01-01", "2026-03-01")).toBe(2);
    expect(formatDuration(0)).toBe("0 months");
    expect(formatDuration(18)).toBe("1 year 6 months");
    expect(formatDuration(24)).toBe("2 years");
  });
});

describe("tour helpers", () => {
  it("formats times and preserves local date-only values", () => {
    expect(formatTime("09:00")).toBe("9:00 AM");
    expect(formatTime("12:30:00")).toBe("12:30 PM");
    expect(formatTime("bad")).toBe("bad");
    expect(toDateString(parseDateOnly("2026-10-05"))).toBe("2026-10-05");
    expect(parseDateOnly("not-a-date")).toBeNull();
  });

  it("returns consecutive local days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 15, 30));
    const days = upcomingDays(3);
    expect(days.map(toDateString)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
    vi.useRealTimers();
  });
});

describe("translation helpers", () => {
  it("localizes numbers and currency", () => {
    expect(localizeDigits(15000, "bn")).toBe("১৫০০০");
    expect(formatNumber(150000, "en")).toBe("150,000");
    expect(formatCurrency(15000, "en")).toBe("৳15,000");
    expect(formatCurrency(15000, "bn")).toBe("৳১৫,০০০");
  });

  it("translates placeholders and falls back to the key", () => {
    expect(translate("bn", "time.daysAgo", { count: 2 })).toContain("দিন");
    expect(translate("en", "time.daysAgo", { count: 1 })).not.toContain("days");
    expect(hasKey("bn", "common.today")).toBe(true);
    expect(hasKey("en", "missing.key")).toBe(false);
    expect(translate("en", "time.daysAgo", { count: 2 })).toContain("2");
    expect(translate("en", "missing.key")).toBe("missing.key");
  });

  it("formats dates, clocks, and relative labels", () => {
    expect(formatDate("2026-10-05", "en", "long")).toContain("October");
    expect(formatDate("not-a-date")).toBe("");
    expect(formatClock("2026-10-05T15:07:00")).toMatch(/03:07 PM/);
    expect(formatClock("not-a-date")).toBe("");
    expect(dayLabel(new Date())).toBe("Today");
    expect(relativeTime("not-a-date")).toBe("");
  });
});

describe("adapter and occupation helpers", () => {
  it("adapts property and application API shapes", () => {
    expect(hasLiftIn(["Parking", "Elevator"])).toBe(true);
    expect(adaptProperty({
      property_id: 7,
      address: "Dhaka",
      rate: 25000,
      facilities: ["Elevator"],
      availability_status: "available",
      owner: { user_id: 3, name: "Owner" },
    })).toMatchObject({
      id: "7",
      title: "Dhaka",
      pricePerMonth: 25000,
      hasLift: true,
      status: "active",
      landlord: { id: 3, name: "Owner" },
    });
    expect(adaptApplication({
      application_id: 9,
      property_id: 7,
      property_address: "Dhaka",
      tenant: { user_id: 4, name: "Tenant", contact_number: "123" },
    })).toMatchObject({
      id: "9",
      propertyId: "7",
      tenant: { id: 4, name: "Tenant", phone: "123" },
    });
    expect(flattenApplication({ tenant: { name: "Tenant", email: "t@example.com" } }))
      .toMatchObject({ tenantName: "Tenant", email: "t@example.com" });
    expect(adaptProperty(null)).toBeNull();
  });

  it("maps occupation-specific fields", () => {
    expect(occupationLabel("student")).toBe("Student");
    expect(takesInstitution("student")).toBe(true);
    expect(takesWorkplace("businessman")).toBe(true);
    expect(workplaceLabel("businessman")).toBe("Business name");
    expect(occupationLabel("unknown")).toBe("");
  });
});

describe("authentication and notifications", () => {
  it("normalizes API user fields and handles empty payloads", () => {
    expect(normalizeUserPayload(null)).toBeNull();
    expect(normalizeUserPayload({
      user_id: 8,
      contact_number: "555",
      is_landlord: 1,
      is_tenant: 0,
      is_admin: true,
      is_verified: true,
    })).toMatchObject({
      id: 8,
      phone: "555",
      isLandlord: true,
      isTenant: false,
      isAdmin: true,
      isVerified: true,
    });
  });

  it("extracts unique addresses and localizes known notifications", () => {
    const notifications = [
      { message: "Your application for Old Road was marked \"approved\"." },
      { message: "A tenant wants to view Old Road." },
      { message: "A tenant wants to view New Road. Note: Call first." },
      { message: "A tenant wants to view New Road." },
    ];
    expect(extractNotificationAddresses(notifications)).toEqual(["Old Road", "New Road"]);

    const context = {
      t: (key, vars = {}) => `${key}:${Object.values(vars).join(",")}`,
      lang: "en",
      digits: (value) => String(value),
      tx: (_group, value) => value,
      formatCurrency: (value) => `৳${value}`,
    };
    expect(localizeNotification(
      { title: "New rental application", message: "A tenant applied for your property (application #12)." },
      context,
    )).toEqual({
      title: "notifText.applicationReceivedTitle:",
      message: "notifText.applicationReceivedBody:12",
    });
  });

  it("returns relative dates for invalid and recent inputs", () => {
    expect(formatRelativeDate(null)).toBe("");
    expect(formatRelativeDate("not-a-date")).toBe("");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
    expect(formatRelativeDate("2026-10-10T00:00:00Z")).toBe("0d ago");
    expect(formatRelativeDate("2026-10-20T00:00:00Z")).toBe("0d ago");
    vi.useRealTimers();
  });
});
