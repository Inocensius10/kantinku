export interface GeoReading {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/** Jarak (meter) menggunakan formula Haversine — hanya untuk tampilan; validasi final di database. */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export class GeoError extends Error {
  constructor(
    message: string,
    public code: 'UNSUPPORTED' | 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT',
  ) {
    super(message);
  }
}

/**
 * Ambil lokasi dengan akurasi tinggi. Memantau posisi beberapa detik dan
 * mengembalikan pembacaan paling akurat (GPS sering membaik setelah beberapa detik).
 */
export function getAccuratePosition(opts: { targetAccuracy?: number; maxWaitMs?: number } = {}): Promise<GeoReading> {
  const target = opts.targetAccuracy ?? 30;
  const maxWait = opts.maxWaitMs ?? 12000;

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeoError('Perangkat/browser Anda tidak mendukung GPS.', 'UNSUPPORTED'));
      return;
    }

    let best: GeoReading | null = null;
    let settled = false;

    const finish = (watchId: number) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) resolve(best);
      else reject(new GeoError('Lokasi tidak dapat ditemukan. Pastikan GPS aktif lalu coba lagi.', 'TIMEOUT'));
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const reading: GeoReading = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        if (!best || reading.accuracy < best.accuracy) best = reading;
        if (reading.accuracy <= target) finish(watchId);
      },
      (err) => {
        if (settled) return;
        if (err.code === err.PERMISSION_DENIED) {
          settled = true;
          navigator.geolocation.clearWatch(watchId);
          clearTimeout(timer);
          reject(
            new GeoError(
              'Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser, lalu coba lagi.',
              'DENIED',
            ),
          );
        } else if (err.code === err.POSITION_UNAVAILABLE && !best) {
          settled = true;
          navigator.geolocation.clearWatch(watchId);
          clearTimeout(timer);
          reject(new GeoError('Sinyal lokasi tidak tersedia. Pastikan GPS aktif.', 'UNAVAILABLE'));
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWait },
    );

    const timer = setTimeout(() => finish(watchId), maxWait);
  });
}
