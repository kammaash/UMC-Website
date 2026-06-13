/**
 * Approximate geographic centers for every Indian state/UT, keyed by the exact
 * names the phone app uses (NeomorphicPickerPresets.indianStates). Ported from
 * the app's `_kStateCenters` in lib/Widgets/location_picker_screen.dart so the
 * web location picker's initial-camera fallback matches the phone app.
 */
export interface LatLng {
  lat: number
  lng: number
}

/** Center of India — the last-resort camera fallback. */
export const INDIA_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 }

export const STATE_CENTERS: Record<string, LatLng> = {
  'Andhra Pradesh': { lat: 15.9129, lng: 79.74 },
  'Arunachal Pradesh': { lat: 28.218, lng: 94.7278 },
  Assam: { lat: 26.2006, lng: 92.9376 },
  Bihar: { lat: 25.0961, lng: 85.3131 },
  Chhattisgarh: { lat: 21.2787, lng: 81.8661 },
  Goa: { lat: 15.2993, lng: 74.124 },
  Gujarat: { lat: 22.2587, lng: 71.1924 },
  Haryana: { lat: 29.0588, lng: 76.0856 },
  'Himachal Pradesh': { lat: 31.1048, lng: 77.1734 },
  Jharkhand: { lat: 23.6102, lng: 85.2799 },
  Karnataka: { lat: 15.3173, lng: 75.7139 },
  Kerala: { lat: 10.8505, lng: 76.2711 },
  'Madhya Pradesh': { lat: 22.9734, lng: 78.6569 },
  Maharashtra: { lat: 19.7515, lng: 75.7139 },
  Manipur: { lat: 24.6637, lng: 93.9063 },
  Meghalaya: { lat: 25.467, lng: 91.3662 },
  Mizoram: { lat: 23.1645, lng: 92.9376 },
  Nagaland: { lat: 26.1584, lng: 94.5624 },
  Odisha: { lat: 20.9517, lng: 85.0985 },
  Punjab: { lat: 31.1471, lng: 75.3412 },
  Rajasthan: { lat: 27.0238, lng: 74.2179 },
  Sikkim: { lat: 27.533, lng: 88.5122 },
  'Tamil Nadu': { lat: 11.1271, lng: 78.6569 },
  Telangana: { lat: 18.1124, lng: 79.0193 },
  Tripura: { lat: 23.9408, lng: 91.9882 },
  'Uttar Pradesh': { lat: 26.8467, lng: 80.9462 },
  Uttarakhand: { lat: 30.0668, lng: 79.0193 },
  'West Bengal': { lat: 22.9868, lng: 87.855 },
  'Andaman and Nicobar Islands': { lat: 11.7401, lng: 92.6586 },
  Chandigarh: { lat: 30.7333, lng: 76.7794 },
  'Dadra and Nagar Haveli and Daman and Diu': { lat: 20.1809, lng: 73.0169 },
  'Delhi (NCT)': { lat: 28.7041, lng: 77.1025 },
  'Jammu and Kashmir': { lat: 33.7782, lng: 76.5762 },
  Ladakh: { lat: 34.2996, lng: 78.2932 },
  Lakshadweep: { lat: 10.5667, lng: 72.6417 },
  Puducherry: { lat: 11.9416, lng: 79.8083 },
}

/** State/UT name → centroid, or undefined when unknown/empty. */
export function stateCenter(name: string | null | undefined): LatLng | undefined {
  return name ? STATE_CENTERS[name] : undefined
}
