import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../trader.db');

const [,, username, password] = process.argv;

if (!username || !password) {
  console.error('Usage: node src/db/create-user.js <username> <password>');
  process.exit(1);
}

const db = new Database(DB_PATH);
const hash = await bcrypt.hash(password, 12);

try {
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`✅ 사용자 생성 완료: ${username}`);
} catch (err) {
  if (err.message.includes('UNIQUE')) {
    console.error('❌ 이미 존재하는 사용자명');
  } else {
    throw err;
  }
}

db.close();
