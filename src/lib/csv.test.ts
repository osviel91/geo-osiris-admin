import { describe, expect, it } from "vitest";

import { parseCsvHeaders } from "@/lib/csv";

describe("parseCsvHeaders", () => {
  it("parses plain comma separated headers", () => {
    expect(parseCsvHeaders("lon,lat,call\n1,2,3")).toEqual(["lon", "lat", "call"]);
  });

  it("handles quoted headers containing commas", () => {
    expect(parseCsvHeaders('lon,"lat,decimal",call\n1,2,3')).toEqual([
      "lon",
      "lat,decimal",
      "call",
    ]);
  });

  it("handles escaped quotes and trims whitespace", () => {
    expect(parseCsvHeaders(' lon , "a""b" \n')).toEqual(["lon", 'a"b']);
  });

  it("strips a UTF-8 BOM and supports CRLF", () => {
    expect(parseCsvHeaders("\uFEFFlon,lat\r\n1,2")).toEqual(["lon", "lat"]);
  });
});
