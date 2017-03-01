export const USER_UPDATE_ATTRS = "USER_UPDATE_ATTRS"

export function updateUserAttributes(user) {
  return { type: USER_UPDATE_ATTRS, user };
}
