/**
 * App.tsx – Root component
 *
 * Keeps the top-level app component minimal: just renders MainScreen inside
 * a SafeAreaView so the UI avoids hardware notches and home indicators.
 */

import React from 'react';
import {SafeAreaView, StatusBar, StyleSheet} from 'react-native';
import MainScreen from './src/screens/MainScreen';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <MainScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
