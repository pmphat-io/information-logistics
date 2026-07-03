function readEnv(name: string) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export function getMongoUri() {
  return readEnv("MONGODB_URI");
}

export function getAdminPassword() {
  return readEnv("ADMIN_PASSWORD") ?? "change-me";
}

export function isMongoConfigured() {
  return Boolean(getMongoUri());
}
