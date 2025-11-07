import { api } from "./axios-config"
import type { StatisticsData } from "./types"

export async function getStatistics(): Promise<StatisticsData> {
  try {
    const response = await api.get<StatisticsData>("/v1/Admins/statistics")
    
    if (response.success && response.data) {
      return response.data
    } else {
      // If the API call was not successful, throw an error with the server's message
      throw new Error(response.error || "Failed to fetch statistics")
    }
  } catch (error: any) {
    //console.error("[API] Get statistics error:", error.message)
    throw error // Re-throw the error to be caught by useSWR
  }
}