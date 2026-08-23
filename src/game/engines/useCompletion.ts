import { useRef } from 'react'

export const useCompletion = (onSolved: (mistakes: number) => void) => {
  const reported = useRef(false)
  return (mistakes: number) => {
    if (reported.current) return
    reported.current = true
    onSolved(mistakes)
  }
}
