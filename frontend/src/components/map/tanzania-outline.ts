/**
 * National outline of the United Republic of Tanzania, as a flat
 * `[longitude, latitude, ...]` ring in WGS84 degrees.
 *
 * Source: `assets/TZA.geo.json` (Natural Earth 1:110m country outline),
 * redistributed into the frontend as static reference geometry. This is
 * reference cartography, not MajiGuard data: no water-point value, count or
 * status lives here, and nothing about it is produced at runtime.
 *
 * The outline is deliberately coarse (48 vertices). It locates a national
 * distribution view; it is not a survey-grade boundary, and it is never used to
 * decide whether a water point falls inside the country.
 */
export const TANZANIA_OUTLINE: readonly number[] = [
  33.90371, -0.95, 34.07262, -1.05982, 37.69869, -3.09699, 37.7669, -3.67712, 39.20222, -4.67677, 38.74054, -5.90895,
  38.79977, -6.47566, 39.44, -6.84, 39.47, -7.1, 39.19469, -7.7039, 39.25203, -8.00781, 39.18652, -8.48551,
  39.53574, -9.11237, 39.9496, -10.0984, 40.31659, -10.3171, 39.521, -10.89688, 38.42756, -11.2852, 37.82764, -11.26879,
  37.47129, -11.56876, 36.77515, -11.59454, 36.51408, -11.72094, 35.3124, -11.43915, 34.55999, -11.52002, 34.28, -10.16,
  33.94084, -9.69367, 33.73972, -9.41715, 32.75937, -9.2306, 32.19186, -8.93036, 31.55635, -8.76205, 31.15775, -8.59458,
  30.74, -8.34, 30.2, -7.08, 29.62, -6.52, 29.41999, -5.94, 29.51999, -5.41998, 29.34, -4.49998,
  29.75351, -4.45239, 30.11632, -4.09012, 30.50554, -3.56858, 30.75224, -3.35931, 30.74301, -3.03431, 30.52766, -2.80762,
  30.46967, -2.41383, 30.75831, -2.28725, 30.81613, -1.69891, 30.4191, -1.13466, 30.76986, -1.01455, 31.86617, -1.02736
]
