import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { io, Socket } from 'socket.io-client';
import { getAuthData } from './auth.service';

const LOCATION_TASK = 'FSM_BACKGROUND_LOCATION';
const API_WS = process.env.EXPO_PUBLIC_WS_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(`${API_WS}/realtime`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

// Definição da task de background — precisa estar no escopo global do módulo
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('[BG Location]', error.message);
    return;
  }

  const { locations } = data as { locations: Location.LocationObject[] };
  const location = locations[0];
  if (!location) return;

  const auth = await getAuthData();
  if (!auth) return;

  const s = getSocket();
  s.emit('technician:location', {
    technicianId: auth.technicianId,
    companyId: auth.companyId,
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    heading: location.coords.heading ?? 0,
    speedKmh: location.coords.speed != null ? location.coords.speed * 3.6 : 0,
  });
});

export async function startLocationTracking(): Promise<boolean> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return false;

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') return false;

  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (alreadyRunning) return true;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 15000,      // a cada 15s
    distanceInterval: 30,     // ou a cada 30m percorridos
    deferredUpdatesInterval: 5000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'FSM — Rastreamento ativo',
      notificationBody: 'Sua localização está sendo compartilhada com o gestor.',
      notificationColor: '#2563eb',
    },
  });

  return true;
}

export async function stopLocationTracking(): Promise<void> {
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  socket?.disconnect();
  socket = null;
}

export function connectSocketAsTechnician(technicianId: string, companyId: string) {
  const s = getSocket();
  s.on('connect', () => {
    s.emit('technician:join', { technicianId, companyId });
  });
  if (s.connected) {
    s.emit('technician:join', { technicianId, companyId });
  }
  return s;
}
