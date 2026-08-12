export interface TempleMapLinks {
  /** Turn-by-turn directions to the temple, or null when its address is unknown. */
  directionsUrl: string | null;
  /** The temple's location on a map, or null when it has published neither a map link nor an address. */
  mapUrl: string | null;
}

/**
 * The two map destinations for a temple's location card.
 *
 * Both are derived from the tenant's own rows — the map link its admin
 * entered, and failing that its address. Nothing here carries a coordinate,
 * place id or address of its own, so one temple's card can never point at
 * another temple's location, and a temple that has published no location at
 * all gets no actions rather than a link to somewhere plausible.
 *
 * Directions are always built from the address rather than reusing the admin's
 * map link: that link is frequently a shortened `maps.app.goo.gl` URL or a
 * place page, neither of which becomes a directions route by appending to it.
 * The `dir/?api=1&destination=` form is Google's documented, stable entry
 * point and lets Maps resolve the address itself.
 */
export function templeMapLinks(location: {
  address: string | null;
  googleMapsUrl: string | null;
}): TempleMapLinks {
  const address = location.address?.trim() || null;
  const mapLink = location.googleMapsUrl?.trim() || null;

  const query = address ? encodeURIComponent(address) : null;

  return {
    directionsUrl: query ? `https://www.google.com/maps/dir/?api=1&destination=${query}` : null,
    mapUrl: mapLink ?? (query ? `https://www.google.com/maps/search/?api=1&query=${query}` : null),
  };
}
