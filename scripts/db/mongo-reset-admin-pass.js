use('admin');
if (db.getUser('admin_db_engine') !== null) {
  db.changeUserPassword('admin_db_engine', 'admin_secret');
}
