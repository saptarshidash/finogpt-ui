export function getRedirectTarget(state: unknown) {
  if (typeof state === "object" && state !== null && "from" in state) {
    const from = state.from
    if (typeof from === "string" && from.length > 0) {
      return from
    }
  }

  return "/dashboard"
}
