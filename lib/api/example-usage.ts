"use client"

// Example usage of the enhanced API handler
// This file demonstrates how to use the API without try-catch blocks

import { api } from "./axios-config"

// Example 1: Simple GET request
export async function getUsers() {
  const result = await api.get("/v1/User")

  if (result.success) {
    console.log("Users fetched:", result.data)
    return result.data
  } else {
    console.error("Failed to fetch users:", result.error)
    // Show toast notification with result.error
    return null
  }
}

// Example 2: POST request with data
export async function createUser(userData: any) {
  const result = await api.post("/v1/User", userData)

  if (result.success) {
    console.log("User created:", result.data)
    // Show success toast with result.message
    return result.data
  } else {
    console.error("Failed to create user:", result.error)
    // Show error toast with result.error
    return null
  }
}

// Example 3: Using in a React component (no try-catch needed!)
/*
function UsersList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchUsers = async () => {
    setLoading(true)
    const result = await api.get("/v1/User")
    setLoading(false)
    
    if (result.success) {
      setUsers(result.data.items)
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const handleCreateUser = async (userData) => {
    const result = await api.post("/v1/User", userData)
    
    if (result.success) {
      toast({
        title: "Success",
        description: result.message || "User created successfully",
      })
      fetchUsers() // Refresh list
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  return (
    // Your component JSX
  )
}
*/
