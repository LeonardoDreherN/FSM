import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import { getAuthData, logout } from '../services/auth.service';
import { startLocationTracking } from '../services/geolocation.service';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pendente',       color: '#f59e0b' },
  routed:      { label: 'Roteirizado',    color: '#3b82f6' },
  in_transit:  { label: 'Em Trânsito',   color: '#60a5fa' },
  in_progress: { label: 'Em Atendimento', color: '#a78bfa' },
  completed:   { label: 'Concluído',      color: '#22c55e' },
};

interface ServiceOrder {
  id: string;
  clientName: string;
  address: string;
  status: string;
  priority: string;
  sequenceOrder: number;
  estimatedDurationMinutes: number;
  timeWindowStart: string;
}

export default function TasksScreen() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [techName, setTechName] = useState('');

  async function fetchOrders() {
    setLoading(true);
    try {
      const auth = await getAuthData();
      if (!auth) { router.replace('/login'); return; }
      setTechName(auth.name);

      const today = new Date().toISOString().split('T')[0];
      const { data } = await axios.get(`${API_URL}/service-orders?date=${today}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setOrders(data.sort((a: ServiceOrder, b: ServiceOrder) => (a.sequenceOrder ?? 99) - (b.sequenceOrder ?? 99)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
    startLocationTracking().catch(console.warn);
  }, []);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const renderItem = ({ item }: { item: ServiceOrder }) => {
    const s = STATUS_LABEL[item.status] ?? STATUS_LABEL.pending;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/task-detail', params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.seq}>#{item.sequenceOrder ?? '—'}</Text>
          <Text style={[styles.badge, { color: s.color, borderColor: s.color }]}>{s.label}</Text>
        </View>
        <Text style={styles.clientName}>{item.clientName}</Text>
        <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
        <Text style={styles.meta}>
          {item.estimatedDurationMinutes}min · {new Date(item.timeWindowStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Minhas Tarefas</Text>
          <Text style={styles.headerSub}>{techName}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutBtn}>Sair</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchOrders} tintColor="#3b82f6" />}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma tarefa para hoje</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  logoutBtn: { color: '#64748b', fontSize: 14 },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  seq: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  badge: { fontSize: 11, fontWeight: '600', borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  clientName: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  address: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginBottom: 8 },
  meta: { color: '#475569', fontSize: 12 },
  empty: { color: '#475569', textAlign: 'center', marginTop: 60, fontSize: 15 },
});
