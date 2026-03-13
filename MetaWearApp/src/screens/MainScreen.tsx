/**
 * MainScreen
 *
 * Thin UI layer for the MetaWear bridge app.  All business logic lives in
 * BridgeService; this screen only renders state and dispatches user actions.
 *
 * Sections:
 *  - Backend URL input field
 *  - Connect Glasses / Disconnect button
 *  - Polling status indicator
 *  - Scrollable event log
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {bridgeService, BackendResponse} from '../services/BridgeService';
import {
  connectGlasses,
  disconnectGlasses,
  startMetaSDKListeners,
} from '../native/MetaSDKModule';

// ─── Types ────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'response';
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

let logIdCounter = 0;
function makeEntry(
  message: string,
  type: LogEntry['type'] = 'info',
): LogEntry {
  return {id: String(logIdCounter++), timestamp: now(), message, type};
}

// ─── Component ────────────────────────────────────────────────────────────

export default function MainScreen(): React.JSX.Element {
  const [backendUrl, setBackendUrl] = useState<string>(
    'https://<codespace>-8765.app.github.dev',
  );
  const [glassesConnected, setGlassesConnected] = useState<boolean>(false);
  const [polling, setPolling] = useState<boolean>(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const flatListRef = useRef<FlatList<LogEntry>>(null);

  const appendLog = useCallback(
    (message: string, type: LogEntry['type'] = 'info') => {
      setLog(prev => [...prev, makeEntry(message, type)]);
    },
    [],
  );

  // ─── BridgeService subscriptions ────────────────────────────────────────

  useEffect(() => {
    const unsubResponse = bridgeService.onResponse((res: BackendResponse) => {
      appendLog(JSON.stringify(res), 'response');
    });

    const unsubError = bridgeService.onError((err: Error) => {
      appendLog(`Error: ${err.message}`, 'error');
    });

    const unsubPoll = bridgeService.onPollStatus((active: boolean) => {
      setPolling(active);
      appendLog(active ? 'Polling started' : 'Polling stopped');
    });

    // Wire up native SDK → BridgeService pipeline
    startMetaSDKListeners();

    return () => {
      unsubResponse();
      unsubError();
      unsubPoll();
      bridgeService.stopPolling();
    };
  }, [appendLog]);

  // Auto-scroll log to bottom when new entries arrive
  useEffect(() => {
    if (log.length > 0) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({animated: true}),
        50,
      );
    }
  }, [log]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleUrlChange = useCallback(
    (url: string) => {
      setBackendUrl(url);
      bridgeService.setBaseUrl(url);
      appendLog(`Backend URL set to: ${url}`);
    },
    [appendLog],
  );

  const handleConnectToggle = useCallback(() => {
    if (glassesConnected) {
      disconnectGlasses();
      bridgeService.stopPolling();
      setGlassesConnected(false);
      appendLog('Disconnected from glasses');
    } else {
      if (!backendUrl || backendUrl.includes('<codespace>')) {
        appendLog(
          'Please set a valid Backend URL before connecting',
          'error',
        );
        return;
      }
      bridgeService.setBaseUrl(backendUrl);
      if (Platform.OS === 'ios') {
        connectGlasses();
      }
      bridgeService.startPolling();
      setGlassesConnected(true);
      appendLog('Connecting to glasses…');
    }
  }, [glassesConnected, backendUrl, appendLog]);

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderLogEntry: ListRenderItem<LogEntry> = ({item}) => (
    <View style={styles.logEntry}>
      <Text style={styles.logTimestamp}>{item.timestamp}</Text>
      <Text
        style={[
          styles.logMessage,
          item.type === 'error' && styles.logError,
          item.type === 'response' && styles.logResponse,
        ]}>
        {item.message}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>MetaWear Bridge</Text>
        <Text style={styles.subtitle}>Ray-Ban Meta ↔ Python Backend</Text>
      </View>

      {/* ── Backend URL ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.label}>Backend URL</Text>
        <TextInput
          accessibilityLabel="Backend URL input"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onChangeText={handleUrlChange}
          placeholder="https://<codespace>-8765.app.github.dev"
          placeholderTextColor="#999"
          style={styles.input}
          value={backendUrl}
        />
      </View>

      {/* ── Connect button ──────────────────────────────────────── */}
      <Pressable
        accessibilityRole="button"
        onPress={handleConnectToggle}
        style={[
          styles.button,
          glassesConnected ? styles.buttonDisconnect : styles.buttonConnect,
        ]}>
        <Text style={styles.buttonText}>
          {glassesConnected ? 'Disconnect Glasses' : 'Connect Glasses'}
        </Text>
      </Pressable>

      {/* ── Polling status ──────────────────────────────────────── */}
      <View style={styles.pollingRow}>
        {polling ? (
          <>
            <ActivityIndicator
              accessibilityLabel="Polling active"
              color="#4CAF50"
              size="small"
              style={styles.pollingSpinner}
            />
            <Text style={styles.pollingActive}>Polling /response…</Text>
          </>
        ) : (
          <Text style={styles.pollingIdle}>Polling inactive</Text>
        )}
      </View>

      {/* ── Event log ───────────────────────────────────────────── */}
      <View style={styles.logContainer}>
        <Text style={styles.label}>Event Log</Text>
        <FlatList
          ref={flatListRef}
          data={log}
          keyExtractor={item => item.id}
          renderItem={renderLogEntry}
          style={styles.logList}
          ListEmptyComponent={
            <Text style={styles.logEmpty}>No events yet</Text>
          }
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  button: {
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 16,
    paddingVertical: 14,
  },
  buttonConnect: {
    backgroundColor: '#1565C0',
  },
  buttonDisconnect: {
    backgroundColor: '#B71C1C',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pollingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  pollingSpinner: {
    marginRight: 8,
  },
  pollingActive: {
    color: '#4CAF50',
    fontSize: 14,
  },
  pollingIdle: {
    color: '#666',
    fontSize: 14,
  },
  logContainer: {
    flex: 1,
  },
  logList: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 8,
  },
  logEmpty: {
    color: '#555',
    fontSize: 13,
    padding: 8,
    textAlign: 'center',
  },
  logEntry: {
    borderBottomColor: '#2A2A2A',
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  logTimestamp: {
    color: '#666',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  logMessage: {
    color: '#E0E0E0',
    fontSize: 13,
    marginTop: 2,
  },
  logError: {
    color: '#EF5350',
  },
  logResponse: {
    color: '#66BB6A',
  },
});
