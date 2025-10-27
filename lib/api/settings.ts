import { api } from "./axios-config"

export interface Setting {
  id: number
  key: string
  value: string
}

export interface SettingsResponse {
  success: boolean
  message: string
  data: Setting[]
}

export interface UpdateSettingResponse {
  success: boolean
  message: string
  data: Setting
}

// Fetch all settings
export async function getAllSettings() {
  return api.get<Setting[]>("/v1/Settings")
}

// Update a specific setting
export async function updateSetting(id: number, value: string) {
  return api.put<Setting>(`/v1/Settings/${id}`, { value })
}

// Helper function to find a setting by key
export function findSettingByKey(settings: Setting[], key: string): Setting | undefined {
  return settings.find((setting) => setting.key === key)
}
