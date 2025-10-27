"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

export default function EditableNumberInput({
  initialValue,
  onValueChange,
  ...props // Pass other props like 'disabled'
}) {
  const [value, setValue] = useState(initialValue.toString())

  useEffect(() => {
    setValue(initialValue.toString())
  }, [initialValue])

  useEffect(() => {
    const handler = setTimeout(() => {
      const numericValue = Number.parseFloat(value)
      // Only call onValueChange if the value is valid and different from initialValue
      if (!isNaN(numericValue) && numericValue !== initialValue) {
        onValueChange(numericValue)
      }
    }, 500)

    // Cleanup: cancel the timeout if user types again
    return () => {
      clearTimeout(handler)
    }
  }, [value, initialValue, onValueChange])

  return <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} {...props} />
}
