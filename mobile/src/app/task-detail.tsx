import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import axios from 'axios';
import { getAuthData } from '../services/auth.service';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const STATUS_FLOW: Record<string, { next: string; label: string; color: string } | null> = {
  routed:      { next: 'in_transit',  label: 'Iniciar Deslocamento', color: '#2563eb' },
  in_transit:  { next: 'in_progress', label: 'Cheguei no Local',     color: '#7c3aed' },
  in_progress: { next: 'completed',   label: 'Finalizar Atendimento', color: '#16a34a' },
  completed:   null,
  pending:     { next: 'in_transit',  label: 'Iniciar Deslocamento', color: '#2563eb' },
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  async function fetchOrder() {
    const auth = await getAuthData();
    if (!auth) return;
    const { data } = await axios.get(`${API_URL}/service-orders/${id}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    setOrder(data);
    setLoading(false);
  }

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      const auth = await getAuthData();
      if (!auth) return;
      const { data } = await axios.patch(
        `${API_URL}/service-orders/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${auth.token}` } },
      );
      setOrder(data);
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível atualizar o status');
    } finally {
      setUpdating(false);
    }
  }

  function openMaps() {
    if (!order) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`;
    Linking.openURL(url);
  }

  useEffect(() => { fetchOrder(); }, [id]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#3b82f6" size="large" />
    </View>
  );

  const action = order ? STATUS_FLOW[order.status] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.section}>CLIENTE</Text>
        <Text style={styles.title}>{order.clientName}</Text>
        <Text style={styles.phone}>{order.clientPhone}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>ENDEREÇO</Text>
        <Text style={styles.address}>{order.address}</Text>
        <TouchableOpacity style={styles.mapsBtn} onPress={openMaps}>
          <Text style={styles.mapsBtnText}>Abrir no Maps</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>DETALHES</Text>
        <Row label="Prioridade" value={order.priority} />
        <Row label="Duração Estimada" value={`${order.estimatedDurationMinutes} min`} />
        <Row label="Janela de Atendimento" value={
          `${fmt(order.timeWindowStart)} – ${fmt(order.timeWindowEnd)}`
        } />
        {order.description ? <Row label="Descrição" value={order.description} /> : null}
      </View>

      {order.status === 'completed' ? (
        <View style={[styles.completedBanner]}>
          <Text style={styles.completedText}>✓ Atendimento Concluído</Text>
        </View>
      ) : action ? (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: action.color }]}
          onPress={() => updateStatus(action.next)}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionBtnText}>{action.label}</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function fmt(dt: string) {
  return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingTop: 56, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  back: { marginBottom: 8 },
  backText: { color: '#3b82f6', fontSize: 15 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155' },
  section: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  phone: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  address: { color: '#cbd5e1', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  mapsBtn: { backgroundColor: '#1d4ed8', borderRadius: 8, padding: 10, alignItems: 'center' },
  mapsBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#334155' },
  rowLabel: { color: '#64748b', fontSize: 13 },
  rowValue: { color: '#e2e8f0', fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  actionBtn: { borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8 },
  actionBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  completedBanner: { backgroundColor: '#14532d', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8 },
  completedText: { color: '#4ade80', fontSize: 16, fontWeight: '600' },
});
