import { pool } from './client.js';
import { id } from '../utils/ids.js';
import { hashPassword } from '../modules/auth/auth.js';

async function run() {
  const tenantId = id();
  const adminId = id();
  const warehouseId = id();
  const passwordHash = await hashPassword('Admin1234!');

  await pool.query('BEGIN');
  try {
    await pool.query(`INSERT INTO tenants(id,name) VALUES ($1,'Demo PyME RD') ON CONFLICT DO NOTHING`, [tenantId]);
    await pool.query(`INSERT INTO users(id,tenant_id,email,password_hash,full_name) VALUES($1,$2,'admin@demo.do',$3,'Admin Demo') ON CONFLICT DO NOTHING`, [adminId, tenantId, passwordHash]);
    await pool.query(`INSERT INTO user_roles(user_id,role) VALUES ($1,'Admin') ON CONFLICT DO NOTHING`, [adminId]);
    await pool.query(`INSERT INTO warehouses(id,tenant_id,code,name) VALUES ($1,$2,'PRINCIPAL','Almacén Principal') ON CONFLICT DO NOTHING`, [warehouseId, tenantId]);
    const customerId = id();
    const productId = id();
    await pool.query(`INSERT INTO customers(id,tenant_id,code,name,rnc_cedula,credit_limit,email) VALUES ($1,$2,'C-001','Cliente Demo','101010101',50000,'cliente@demo.do') ON CONFLICT DO NOTHING`, [customerId, tenantId]);
    await pool.query(`INSERT INTO products(id,tenant_id,sku,name,product_type,price,cost,min_stock) VALUES($1,$2,'SKU-001','Producto Demo','good',1000,700,5) ON CONFLICT DO NOTHING`, [productId, tenantId]);
    await pool.query('COMMIT');
    console.log('Seed completed: admin@demo.do / Admin1234!');
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
