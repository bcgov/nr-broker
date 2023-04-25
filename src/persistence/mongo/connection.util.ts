export function getMongoDbConnectionUrl() {
  return process.env.MONGODB_URL.replace(
    '{{username}}',
    process.env.MONGODB_USERNAME,
  ).replace('{{password}}', process.env.MONGODB_PASSWORD);
}
