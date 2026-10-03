export const HYDERABAD_CENTER = { latitude: 17.385, longitude: 78.4867 } as const;

/** Loose bounding box around the Hyderabad metropolitan region (incl. Secunderabad). */
export const HYDERABAD_BOUNDS = {
  south: 17.1,
  north: 17.8,
  west: 78.1,
  east: 78.8,
} as const;

export interface HyderabadLocality {
  name: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

/** Common localities with a representative PIN and approximate centre (for quick location pick). */
export const HYDERABAD_LOCALITIES: readonly HyderabadLocality[] = [
  { name: 'Gachibowli', pincode: '500032', latitude: 17.4401, longitude: 78.3489 },
  { name: 'HITEC City', pincode: '500081', latitude: 17.4435, longitude: 78.3772 },
  { name: 'Madhapur', pincode: '500081', latitude: 17.4486, longitude: 78.3908 },
  { name: 'Kondapur', pincode: '500084', latitude: 17.46, longitude: 78.364 },
  { name: 'Financial District', pincode: '500032', latitude: 17.4175, longitude: 78.343 },
  { name: 'Manikonda', pincode: '500089', latitude: 17.4034, longitude: 78.3868 },
  { name: 'Narsingi', pincode: '500075', latitude: 17.398, longitude: 78.359 },
  { name: 'Jubilee Hills', pincode: '500033', latitude: 17.4326, longitude: 78.4071 },
  { name: 'Banjara Hills', pincode: '500034', latitude: 17.4126, longitude: 78.4482 },
  { name: 'Ameerpet', pincode: '500016', latitude: 17.4375, longitude: 78.4482 },
  { name: 'Begumpet', pincode: '500016', latitude: 17.4399, longitude: 78.4623 },
  { name: 'Secunderabad', pincode: '500003', latitude: 17.4399, longitude: 78.4983 },
  { name: 'Kukatpally', pincode: '500072', latitude: 17.4948, longitude: 78.3996 },
  { name: 'Miyapur', pincode: '500049', latitude: 17.4969, longitude: 78.3548 },
  { name: 'Tolichowki', pincode: '500008', latitude: 17.401, longitude: 78.414 },
  { name: 'Charminar', pincode: '500002', latitude: 17.3616, longitude: 78.4747 },
  { name: 'Dilsukhnagar', pincode: '500060', latitude: 17.3688, longitude: 78.5247 },
  { name: 'Uppal', pincode: '500039', latitude: 17.4058, longitude: 78.5591 },
  { name: 'LB Nagar', pincode: '500074', latitude: 17.3457, longitude: 78.5522 },
  { name: 'Shamshabad', pincode: '501218', latitude: 17.2403, longitude: 78.4294 },
];

export function isWithinHyderabad(latitude: number, longitude: number): boolean {
  return (
    latitude >= HYDERABAD_BOUNDS.south &&
    latitude <= HYDERABAD_BOUNDS.north &&
    longitude >= HYDERABAD_BOUNDS.west &&
    longitude <= HYDERABAD_BOUNDS.east
  );
}
