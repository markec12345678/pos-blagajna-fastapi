export function useParams() {
  const path = window.location.pathname
  const parts = path.split('/')
  if (parts[1] === 'menu' && parts[2]) return { tableId: parts[2] }
  return {}
}
