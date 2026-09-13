"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ErrorBanner } from "@/components/ErrorBanner";
import { parseCsvHeaders } from "@/lib/csv";
import type { ActionError } from "@/lib/errors";
import { MAX_IMPORT_BYTES, buildCsvMapping } from "@/lib/import-form";
import type { CsvPropertyType } from "@/lib/types";

type PropertyRow = { enabled: boolean; name: string; type: CsvPropertyType };

export function ImportUploadForm({ layerId }: { layerId: string }) {
  const router = useRouter();
  const [format, setFormat] = useState<"csv" | "geojson">("csv");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const [externalId, setExternalId] = useState("");
  const [properties, setProperties] = useState<Record<string, PropertyRow>>({});
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<ActionError | null>(null);
  const [pending, setPending] = useState(false);

  const propertyHeaders = useMemo(
    () => headers.filter((header) => header !== longitude && header !== latitude),
    [headers, longitude, latitude],
  );

  async function onFileChange(selected: File | null) {
    setError(null);
    setFile(selected);
    setHeaders([]);
    setLongitude("");
    setLatitude("");
    setExternalId("");
    setProperties({});
    if (!selected || format !== "csv") return;
    if (selected.size > MAX_IMPORT_BYTES) {
      setError({ status: 413, message: "File exceeds the 5 MB import limit" });
      return;
    }
    const detected = parseCsvHeaders(await selected.text());
    setHeaders(detected);
    setLongitude(detected[0] ?? "");
    setLatitude(detected[1] ?? "");
    setProperties(
      Object.fromEntries(
        detected.map((header) => [header, { enabled: true, name: header, type: "string" }]),
      ),
    );
  }

  async function submit() {
    setError(null);
    if (!file) {
      setError({ status: 400, message: "Select a file to upload" });
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setError({ status: 413, message: "File exceeds the 5 MB import limit" });
      return;
    }

    const form = new FormData();
    form.set("file", file);
    form.set("layer_id", layerId);
    form.set("format", format);
    if (sourceName.trim()) form.set("source_name", sourceName.trim());
    if (sourceUrl.trim()) form.set("source_url", sourceUrl.trim());
    if (format === "csv") {
      try {
        const mapping = buildCsvMapping(headers, {
          longitude,
          latitude,
          externalId,
          properties: Object.fromEntries(
            propertyHeaders
              .filter((header) => properties[header]?.enabled)
              .map((header) => [
                header,
                {
                  name: properties[header]?.name ?? header,
                  type: properties[header]?.type ?? "string",
                },
              ]),
          ),
        });
        form.set("csv_mapping", JSON.stringify(mapping));
      } catch (mappingError) {
        setError({
          status: 422,
          message: mappingError instanceof Error ? mappingError.message : "Invalid mapping",
        });
        return;
      }
    }

    setPending(true);
    try {
      const response = await fetch("/api/imports", { method: "POST", body: form });
      const payload = (await response.json()) as
        | { ok: true; data: { id: string } }
        | { ok: false; error: ActionError };
      if (!payload.ok) {
        setError(payload.error);
        return;
      }
      router.push(`/imports/${payload.data.id}`);
    } catch {
      setError({ status: 503, message: "Upload failed: the admin server is unavailable" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <ErrorBanner error={error ?? undefined} />

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Format
          <select
            className="mt-1 w-full rounded border px-2 py-1"
            value={format}
            onChange={(event) => {
              setFormat(event.target.value as "csv" | "geojson");
              void onFileChange(null);
            }}
          >
            <option value="csv">CSV</option>
            <option value="geojson">GeoJSON</option>
          </select>
        </label>
        <label className="text-sm">
          File (max 5 MB)
          <input
            className="mt-1 w-full rounded border px-2 py-1"
            type="file"
            accept={format === "csv" ? ".csv,text/csv" : ".geojson,.json,application/geo+json"}
            onChange={(event) => void onFileChange(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {format === "csv" && headers.length > 0 && (
        <fieldset className="space-y-3 rounded border p-3">
          <legend className="px-1 text-sm font-medium">
            Column mapping ({headers.length} detected headers)
          </legend>

          <div className="grid grid-cols-3 gap-3">
            <HeaderSelect label="Longitude" value={longitude} headers={headers} onChange={setLongitude} />
            <HeaderSelect label="Latitude" value={latitude} headers={headers} onChange={setLatitude} />
            <HeaderSelect
              label="External ID (optional)"
              value={externalId}
              headers={headers}
              onChange={setExternalId}
              allowEmpty
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Properties</p>
            {propertyHeaders.map((header) => (
              <div key={header} className="flex items-center gap-3 text-sm">
                <label className="flex w-1/4 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={properties[header]?.enabled ?? true}
                    onChange={(event) =>
                      setProperties((current) => ({
                        ...current,
                        [header]: {
                          enabled: event.target.checked,
                          name: current[header]?.name ?? header,
                          type: current[header]?.type ?? "string",
                        },
                      }))
                    }
                  />
                  <span className="font-mono text-xs">{header}</span>
                </label>
                <input
                  className="w-2/4 rounded border px-2 py-1"
                  value={properties[header]?.name ?? header}
                  onChange={(event) =>
                    setProperties((current) => ({
                      ...current,
                      [header]: {
                        enabled: current[header]?.enabled ?? true,
                        name: event.target.value,
                        type: current[header]?.type ?? "string",
                      },
                    }))
                  }
                  aria-label={`Property name for ${header}`}
                />
                <select
                  className="w-1/4 rounded border px-2 py-1"
                  value={properties[header]?.type ?? "string"}
                  onChange={(event) =>
                    setProperties((current) => ({
                      ...current,
                      [header]: {
                        enabled: current[header]?.enabled ?? true,
                        name: current[header]?.name ?? header,
                        type: event.target.value as CsvPropertyType,
                      },
                    }))
                  }
                  aria-label={`Property type for ${header}`}
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="integer">integer</option>
                  <option value="boolean">boolean</option>
                  <option value="json">json</option>
                </select>
              </div>
            ))}
            {propertyHeaders.length === 0 && (
              <p className="text-xs text-gray-600">No non-coordinate columns detected.</p>
            )}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-3 rounded border p-3">
        <legend className="px-1 text-sm font-medium">Provenance source (optional)</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Source name
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Source URL
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
            />
          </label>
        </div>
        <p className="text-xs text-gray-600">
          Applied to every feature provenance record created when this import is committed.
          Defaults to the filename when left empty.
        </p>
      </fieldset>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={pending || !file}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Staging…" : "Stage import"}
      </button>
    </div>
  );
}

function HeaderSelect({
  label,
  value,
  headers,
  onChange,
  allowEmpty = false,
}: {
  label: string;
  value: string;
  headers: string[];
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <label className="text-sm">
      {label}
      <select
        className="mt-1 w-full rounded border px-2 py-1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {allowEmpty && <option value="">—</option>}
        {headers.map((header) => (
          <option key={header} value={header}>
            {header}
          </option>
        ))}
      </select>
    </label>
  );
}
