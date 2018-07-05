export const jwt = (req, payload, next) => {
  const user = payload.user
  return next(null, user, {})
}
