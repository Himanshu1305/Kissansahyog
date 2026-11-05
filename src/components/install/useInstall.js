import { useSyncExternalStore } from 'react'
import { installStore } from '../../lib/install/installStore'

// Batch 17F - read the one install store from React.
export default function useInstall() {
  return useSyncExternalStore(installStore.subscribe, installStore.getSnapshot, installStore.getSnapshot)
}

// Tap handler for every "Install" button. prompt() must run inside the tap, so when the browser
// gave us the install event we call it right here (no await before it). Otherwise open the steps.
export function startInstall(snapshot = installStore.getSnapshot()) {
  if (snapshot.canPrompt) {
    installStore.promptInstall()
    return
  }
  installStore.openGuide()
}
