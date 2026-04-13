'use server'

import { runReleaseSync, runProviderByName, getRecentSyncLogs } from '@/services/releases/releaseSyncService'

export async function syncAllReleases() {
  return runReleaseSync()
}

export async function syncReleaseProvider(providerName: string) {
  return runProviderByName(providerName)
}

export async function fetchSyncLogs() {
  return getRecentSyncLogs(10)
}
