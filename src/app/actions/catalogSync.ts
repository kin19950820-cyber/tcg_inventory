'use server'

import { runSportsSync, runPokemonSetSync } from '@/services/catalogSyncService'

export async function syncSports() {
  return runSportsSync()
}

export async function syncPokemonSet(setId: string) {
  return runPokemonSetSync(setId)
}
