import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultFoodDepartureTime,
  normalizeClockTime,
  subtractHoursFromClock,
  syncedFoodDepartureTime,
} from "@/lib/dates";
import { createBlankEvent } from "@/lib/event-factory";
import { normalizeEventRecord } from "@/lib/types";

describe("horário de saída da comida", () => {
  it("normaliza e subtrai duas horas do serviço", () => {
    assert.equal(normalizeClockTime("9:05"), "09:05");
    assert.equal(defaultFoodDepartureTime("19:00"), "17:00");
    assert.equal(defaultFoodDepartureTime("08:30"), "06:30");
    assert.equal(subtractHoursFromClock("01:15", 2), "23:15");
    assert.equal(defaultFoodDepartureTime(""), "");
  });

  it("recalcula o padrão só se o campo ainda estiver no valor automático", () => {
    assert.equal(syncedFoodDepartureTime("19:00", "20:00", "17:00"), "18:00");
    assert.equal(syncedFoodDepartureTime("19:00", "20:00", ""), "18:00");
    assert.equal(syncedFoodDepartureTime("19:00", "20:00", "16:00"), "16:00");
  });

  it("preenche o horário ao criar e ao normalizar evento existente", () => {
    const created = createBlankEvent({ serviceTime: "19:00" });
    assert.equal(created.foodDepartureTime, "17:00");

    const legacy = createBlankEvent({ serviceTime: "12:00", foodDepartureTime: "" });
    const normalized = normalizeEventRecord({ ...legacy, foodDepartureTime: "" });
    assert.equal(normalized.foodDepartureTime, "10:00");
  });
});
