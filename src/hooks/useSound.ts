import { Audio } from 'expo-av';
import { useEffect } from 'react';

let audioModeSet = false;

async function ensureAudioMode() {
  if (audioModeSet) return;
  audioModeSet = true;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });
}

async function playFile(file: ReturnType<typeof require>) {
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(file);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch {
    // Silently fail — sound is non-critical
  }
}

export function useSound() {
  const playChime = () => playFile(require('../../assets/chime.wav'));
  const playCelebrate = () => playFile(require('../../assets/victory.mp3'));
  return { playChime, playCelebrate };
}
