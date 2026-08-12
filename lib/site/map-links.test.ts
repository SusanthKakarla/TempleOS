import { describe, expect, it } from "vitest";
import { templeMapLinks } from "./map-links";

const ADDRESS = "XMQ8+MC8, Chagallu, Andhra Pradesh 534342";

describe("templeMapLinks", () => {
  it("builds directions to the temple's own address", () => {
    const { directionsUrl } = templeMapLinks({ address: ADDRESS, googleMapsUrl: null });

    expect(directionsUrl).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS)}`,
    );
  });

  it("prefers the map link the temple's admin entered for the view action", () => {
    const { mapUrl } = templeMapLinks({ address: ADDRESS, googleMapsUrl: "https://maps.app.goo.gl/abc123" });
    expect(mapUrl).toBe("https://maps.app.goo.gl/abc123");
  });

  /*
   * A shortened or place-page link cannot be turned into a route by appending
   * to it, so directions are built from the address even when a map link
   * exists — otherwise "Get Directions" would silently be a second "View on
   * Google Maps".
   */
  it("still routes directions through the address when a map link is present", () => {
    const { directionsUrl } = templeMapLinks({ address: ADDRESS, googleMapsUrl: "https://maps.app.goo.gl/abc123" });
    expect(directionsUrl).toContain("/maps/dir/");
    expect(directionsUrl).toContain(encodeURIComponent(ADDRESS));
  });

  it("falls back to a search for the address when no map link was entered", () => {
    const { mapUrl } = templeMapLinks({ address: ADDRESS, googleMapsUrl: null });
    expect(mapUrl).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`);
  });

  it("escapes the address, so a comma or plus code cannot break out of the query", () => {
    const { mapUrl } = templeMapLinks({ address: ADDRESS, googleMapsUrl: null });
    expect(mapUrl).not.toContain(" ");
    expect(mapUrl).toContain("XMQ8%2BMC8");
  });

  /*
   * A temple that has published no location gets no actions at all rather
   * than a link to a plausible-looking wrong place.
   */
  it("offers nothing when the temple has published no location", () => {
    expect(templeMapLinks({ address: null, googleMapsUrl: null })).toEqual({
      directionsUrl: null,
      mapUrl: null,
    });
  });

  it("treats a blank address as no address", () => {
    expect(templeMapLinks({ address: "   ", googleMapsUrl: null }).directionsUrl).toBeNull();
  });

  it("can still show the map when only a map link was entered", () => {
    const links = templeMapLinks({ address: null, googleMapsUrl: "https://maps.app.goo.gl/abc123" });
    expect(links.mapUrl).toBe("https://maps.app.goo.gl/abc123");
    // No address means no route can be built, so directions are withheld
    // rather than pointed at the place page.
    expect(links.directionsUrl).toBeNull();
  });
});
