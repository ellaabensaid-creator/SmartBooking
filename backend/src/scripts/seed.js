const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const [adminRole] = await pool.query('SELECT id FROM roles WHERE name = ?', ['admin']);
  const [clientRole] = await pool.query('SELECT id FROM roles WHERE name = ?', ['client']);

  const [adminRows] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@smartbooking.local']);
  if (adminRows.length === 0) {
    const [adminInsert] = await pool.query(
      `INSERT INTO users (role_id, first_name, last_name, email, phone, password_hash)
       VALUES (?, 'Admin', 'Demo', 'admin@smartbooking.local', '0600000000', ?)`,
      [adminRole[0].id, passwordHash]
    );

    const adminId = adminInsert.insertId;
    await pool.query(
      `INSERT INTO services (admin_id, name, description, duration_minutes, price, is_active)
       VALUES (?, 'Consultation standard', 'Service de démonstration', 30, 25.00, 1)`,
      [adminId]
    );

    await pool.query(
      `INSERT INTO availabilities (admin_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
       VALUES (?, 1, '09:00:00', '12:00:00', 30, 1),
              (?, 1, '14:00:00', '18:00:00', 30, 1),
              (?, 2, '09:00:00', '12:00:00', 30, 1),
              (?, 2, '14:00:00', '18:00:00', 30, 1)`,
      [adminId, adminId, adminId, adminId]
    );
  }

  const [clientRows] = await pool.query('SELECT id FROM users WHERE email = ?', ['client@smartbooking.local']);
  if (clientRows.length === 0) {
    await pool.query(
      `INSERT INTO users (role_id, first_name, last_name, email, phone, password_hash)
       VALUES (?, 'Client', 'Demo', 'client@smartbooking.local', '0700000000', ?)`,
      [clientRole[0].id, passwordHash]
    );
  }

  console.log('Seed completed. Demo accounts:');
  console.log('Admin: admin@smartbooking.local / Password123!');
  console.log('Client: client@smartbooking.local / Password123!');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
