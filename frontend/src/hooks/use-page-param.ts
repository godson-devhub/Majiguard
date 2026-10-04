import { useState } from 'react'

/** Local page state, so paging never pushes a query string into the shell. */
export function usePageParam(initialPage = 1) {
  const [page, setPage] = useState(initialPage)
  return { page, setPage }
}
