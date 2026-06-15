import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface RoutePoint {
  id: string;
  lat: number;
  lng: number;
  estimatedDurationMinutes: number;
  timeWindowStart: Date;
  timeWindowEnd: Date;
}

export interface OptimizedRoute {
  orderedIds: string[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  legs: Array<{ distanceMeters: number; durationSeconds: number }>;
}

@Injectable()
export class RoutingEngine {
  private readonly logger = new Logger(RoutingEngine.name);
  private readonly osrmBase: string;

  constructor(config: ConfigService) {
    this.osrmBase = config.get<string>('OSRM_BASE_URL', 'http://router.project-osrm.org');
  }

  async optimizeRoute(origin: RoutePoint, waypoints: RoutePoint[]): Promise<OptimizedRoute> {
    if (waypoints.length === 0) {
      return { orderedIds: [], totalDistanceMeters: 0, totalDurationSeconds: 0, legs: [] };
    }

    const allPoints = [origin, ...waypoints];
    const coordStr = allPoints.map((p) => `${p.lng},${p.lat}`).join(';');

    try {
      const url = `${this.osrmBase}/trip/v1/driving/${coordStr}?source=first&roundtrip=false&annotations=duration,distance`;
      const { data } = await axios.get(url, { timeout: 8000 });

      if (data.code !== 'Ok' || !data.trips?.length) {
        this.logger.warn('OSRM retornou resposta inválida, usando ordem original');
        return this.buildFallbackRoute(waypoints);
      }

      const trip = data.trips[0];
      const waypointOrder: number[] = data.waypoints
        .slice(1)
        .map((w: any) => w.waypoint_index - 1);

      const orderedIds = waypointOrder.map((i) => waypoints[i].id);

      const legs = trip.legs.map((l: any) => ({
        distanceMeters: Math.round(l.distance),
        durationSeconds: Math.round(l.duration),
      }));

      return {
        orderedIds,
        totalDistanceMeters: Math.round(trip.distance),
        totalDurationSeconds: Math.round(trip.duration),
        legs,
      };
    } catch (err) {
      this.logger.error('Erro ao chamar OSRM:', err.message);
      return this.buildFallbackRoute(waypoints);
    }
  }

  async getEtaSeconds(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<number> {
    try {
      const url = `${this.osrmBase}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
      const { data } = await axios.get(url, { timeout: 5000 });
      if (data.code === 'Ok' && data.routes?.length) {
        return Math.round(data.routes[0].duration);
      }
    } catch {
      // fallback silencioso
    }
    return this.haversineSeconds(fromLat, fromLng, toLat, toLng);
  }

  private buildFallbackRoute(waypoints: RoutePoint[]): OptimizedRoute {
    return {
      orderedIds: waypoints.map((w) => w.id),
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      legs: [],
    };
  }

  private haversineSeconds(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const distanceM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(distanceM / 10); // ~36 km/h média urbana estimada
  }
}
