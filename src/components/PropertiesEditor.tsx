"use client";

import { useMemo, useState } from "react";

import {
  parsePropertiesJson,
  propertiesToRows,
  rowsToProperties,
  type PropertyRow,
  type PropertyType,
} from "@/lib/feature-form";

const TYPES: PropertyType[] = ["string", "number", "boolean", "null"];

export function PropertiesEditor({
  initial,
  onChange,
}: {
  initial: Record<string, unknown>;
  onChange?: (json: string, valid: boolean) => void;
}) {
  const initialRows = useMemo(() => propertiesToRows(initial), [initial]);
  const [rows, setRows] = useState<PropertyRow[]>(initialRows);
  const [mode, setMode] = useState<"rows" | "json">("rows");
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(rowsToProperties(initialRows), null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  function publish(nextRows: PropertyRow[]) {
    try {
      const properties = rowsToProperties(nextRows);
      const json = JSON.stringify(properties);
      setError(null);
      onChange?.(json, true);
      return properties;
    } catch (issue) {
      setError((issue as Error).message);
      onChange?.("", false);
      return null;
    }
  }

  function updateRow(index: number, patch: Partial<PropertyRow>) {
    const next = rows.map((row, position) =>
      position === index ? { ...row, ...patch } : row,
    );
    setRows(next);
    publish(next);
  }

  function addRow() {
    const next = [...rows, { key: "", type: "string" as PropertyType, value: "" }];
    setRows(next);
  }

  function removeRow(index: number) {
    const next = rows.filter((_, position) => position !== index);
    setRows(next);
    publish(next);
  }

  function switchToJson() {
    try {
      setJsonText(JSON.stringify(rowsToProperties(rows), null, 2));
      setError(null);
    } catch (issue) {
      setError((issue as Error).message);
      return;
    }
    setMode("json");
  }

  function switchToRows() {
    try {
      const parsed = parsePropertiesJson(jsonText);
      const next = propertiesToRows(parsed);
      setRows(next);
      setError(null);
      onChange?.(JSON.stringify(parsed), true);
      setMode("rows");
    } catch (issue) {
      setError((issue as Error).message);
    }
  }

  function editJson(text: string) {
    setJsonText(text);
    try {
      const parsed = parsePropertiesJson(text);
      setError(null);
      onChange?.(JSON.stringify(parsed), true);
    } catch (issue) {
      setError((issue as Error).message);
      onChange?.("", false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Properties</span>
        <button
          type="button"
          className="text-xs text-blue-700 underline"
          onClick={() => (mode === "rows" ? switchToJson() : switchToRows())}
        >
          {mode === "rows" ? "Advanced JSON" : "Key/value editor"}
        </button>
      </div>

      {mode === "rows" ? (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex gap-2">
              <input
                aria-label={`property key ${index + 1}`}
                className="w-1/4 rounded border px-2 py-1 text-sm"
                placeholder="key"
                value={row.key}
                onChange={(event) => updateRow(index, { key: event.target.value })}
              />
              <select
                aria-label={`property type ${index + 1}`}
                className="rounded border px-2 py-1 text-sm"
                value={row.type}
                onChange={(event) =>
                  updateRow(index, { type: event.target.value as PropertyType })
                }
              >
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                aria-label={`property value ${index + 1}`}
                className="flex-1 rounded border px-2 py-1 text-sm"
                placeholder="value"
                disabled={row.type === "null"}
                value={row.value}
                onChange={(event) => updateRow(index, { value: event.target.value })}
              />
              <button
                type="button"
                className="rounded border px-2 py-1 text-sm hover:bg-gray-100"
                onClick={() => removeRow(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
            onClick={addRow}
          >
            Add property
          </button>
        </div>
      ) : (
        <textarea
          aria-label="properties JSON"
          className="h-40 w-full rounded border px-2 py-1 font-mono text-sm"
          value={jsonText}
          onChange={(event) => editJson(event.target.value)}
        />
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
