import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { pool } from './db/client.js';
import { id } from './utils/ids.js';
import { comparePassword, hashPassword, signAccessToken, signRefreshToken } from './modules/auth/auth.js';
import { requireAuth, requireRole } from './middleware/auth.js';

const app = express();
app.use(cors());
app.use(express.json());

async function audit(tenantId: string, userId: string | null, action: string, entityType: string, entityId: string | null, beforeData: unknown, afterData: unknown) {
  await pool.query(
    `INSERT INTO audit_events(id,tenant_id,user_id,action,entity_type,entity_id,before_data,after_data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id(), tenantId, userId, action, entityType, entityId, beforeData ? JSON.stringify(beforeData) : null, afterData ? JSON.stringify(afterData) : null]
  );
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/auth/register', async (req, res) => {
  const schema = z.object({ tenantName: z.string(), fullName: z.string(), email: z.string().email(), password: z.string().min(8) });
  const parsed = schema.parse(req.body);
  const tenantId = id();
  const userId = id();
  const passwordHash = await hashPassword(parsed.password);
  await pool.query('BEGIN');
  try {
    await pool.query(`INSERT INTO tenants(id,name) VALUES ($1,$2)`, [tenantId, parsed.tenantName]);
    await pool.query(`INSERT INTO users(id,tenant_id,email,password_hash,full_name) VALUES ($1,$2,$3,$4,$5)`, [userId, tenantId, parsed.email, passwordHash, parsed.fullName]);
    await pool.query(`INSERT INTO user_roles(user_id,role) VALUES ($1,'Admin')`, [userId]);
    await pool.query('COMMIT');
    const payload = { userId, tenantId, roles: ['Admin'] };
    res.status(201).json({ accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload) });
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
});

app.post('/auth/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
  const { email, password } = schema.parse(req.body);
  const result = await pool.query(
    `SELECT u.id,u.tenant_id,u.password_hash,COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') AS roles
     FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id WHERE u.email=$1 GROUP BY u.id`,
    [email]
  );
  const row = result.rows[0];
  if (!row || !(await comparePassword(password, row.password_hash))) return res.status(401).json({ message: 'Invalid credentials' });
  const payload = { userId: row.id, tenantId: row.tenant_id, roles: row.roles };
  res.json({ accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload) });
});

app.post('/customers', requireAuth, requireRole('Admin', 'Ventas'), async (req, res) => {
  const schema = z.object({ code: z.string(), name: z.string(), rncCedula: z.string().optional(), paymentTermsDays: z.number().default(30), creditLimit: z.number().default(0), email: z.string().email().optional(), phone: z.string().optional() });
  const data = schema.parse(req.body);
  const customerId = id();
  await pool.query(`INSERT INTO customers(id,tenant_id,code,name,rnc_cedula,payment_terms_days,credit_limit,email,phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [customerId, req.auth!.tenantId, data.code, data.name, data.rncCedula ?? null, data.paymentTermsDays, data.creditLimit, data.email ?? null, data.phone ?? null]);
  await audit(req.auth!.tenantId, req.auth!.userId, 'create', 'customer', customerId, null, data);
  res.status(201).json({ id: customerId, ...data });
});

app.get('/customers', requireAuth, async (req, res) => {
  const result = await pool.query(`SELECT * FROM customers WHERE tenant_id=$1 ORDER BY created_at DESC`, [req.auth!.tenantId]);
  res.json(result.rows);
});

app.post('/products', requireAuth, requireRole('Admin', 'Almacen', 'Ventas'), async (req, res) => {
  const schema = z.object({ sku: z.string(), name: z.string(), productType: z.enum(['good', 'service']), price: z.number(), cost: z.number().default(0), minStock: z.number().default(0) });
  const data = schema.parse(req.body);
  const productId = id();
  await pool.query(`INSERT INTO products(id,tenant_id,sku,name,product_type,price,cost,min_stock) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [productId, req.auth!.tenantId, data.sku, data.name, data.productType, data.price, data.cost, data.minStock]);
  await audit(req.auth!.tenantId, req.auth!.userId, 'create', 'product', productId, null, data);
  res.status(201).json({ id: productId, ...data });
});

app.post('/inventory/movements', requireAuth, requireRole('Admin', 'Almacen'), async (req, res) => {
  const schema = z.object({ productId: z.string().uuid(), warehouseId: z.string().uuid(), movementType: z.enum(['purchase','sale','adjustment_in','adjustment_out','transfer_in','transfer_out']), quantity: z.number().positive(), unitCost: z.number().default(0), referenceType: z.string().optional(), referenceId: z.string().uuid().optional() });
  const data = schema.parse(req.body);
  const sign = ['sale','adjustment_out','transfer_out'].includes(data.movementType) ? -1 : 1;
  await pool.query(`INSERT INTO inventory_movements(id,tenant_id,product_id,warehouse_id,movement_type,quantity,unit_cost,reference_type,reference_id,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id(), req.auth!.tenantId, data.productId, data.warehouseId, data.movementType, sign * data.quantity, data.unitCost, data.referenceType ?? null, data.referenceId ?? null, req.auth!.userId]);
  res.status(201).json({ message: 'Movement recorded' });
});

app.get('/inventory/stock', requireAuth, async (req, res) => {
  const result = await pool.query(`SELECT product_id, warehouse_id, SUM(quantity) as on_hand FROM inventory_movements WHERE tenant_id=$1 GROUP BY product_id, warehouse_id`, [req.auth!.tenantId]);
  res.json(result.rows);
});

app.post('/quotes', requireAuth, requireRole('Admin', 'Ventas'), async (req, res) => {
  const schema = z.object({ customerId: z.string().uuid(), validUntil: z.string(), notes: z.string().optional(), items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().positive(), unitPrice: z.number(), taxRate: z.number().default(0.18) })).min(1) });
  const data = schema.parse(req.body);
  const quoteId = id();
  const total = data.items.reduce((acc, i) => acc + i.quantity * i.unitPrice * (1 + i.taxRate), 0);
  await pool.query('BEGIN');
  try {
    await pool.query(`INSERT INTO quotes(id,tenant_id,customer_id,status,valid_until,notes,total,created_by) VALUES ($1,$2,$3,'sent',$4,$5,$6,$7)`, [quoteId, req.auth!.tenantId, data.customerId, data.validUntil, data.notes ?? null, total, req.auth!.userId]);
    for (const item of data.items) {
      const lineTotal = item.quantity * item.unitPrice * (1 + item.taxRate);
      await pool.query(`INSERT INTO quote_items(id,quote_id,product_id,quantity,unit_price,tax_rate,line_total) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id(), quoteId, item.productId, item.quantity, item.unitPrice, item.taxRate, lineTotal]);
    }
    await pool.query('COMMIT');
    res.status(201).json({ id: quoteId, total });
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
});

app.post('/quotes/:id/convert-to-invoice', requireAuth, requireRole('Admin', 'Ventas', 'Caja'), async (req, res) => {
  const quoteId = req.params.id;
  await pool.query('BEGIN');
  try {
    const quoteRes = await pool.query(`SELECT * FROM quotes WHERE id=$1 AND tenant_id=$2`, [quoteId, req.auth!.tenantId]);
    const quote = quoteRes.rows[0];
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    const itemsRes = await pool.query(`SELECT * FROM quote_items WHERE quote_id=$1`, [quoteId]);
    const subtotal = itemsRes.rows.reduce((acc, i) => acc + Number(i.quantity) * Number(i.unit_price), 0);
    const taxTotal = itemsRes.rows.reduce((acc, i) => acc + Number(i.quantity) * Number(i.unit_price) * Number(i.tax_rate), 0);
    const total = subtotal + taxTotal;
    const invoiceId = id();
    const invoiceNumber = `FAC-${Date.now().toString().slice(-8)}`;
    await pool.query(`INSERT INTO invoices(id,tenant_id,quote_id,customer_id,invoice_number,status,subtotal,tax_total,total,balance_due,created_by) VALUES ($1,$2,$3,$4,$5,'issued',$6,$7,$8,$8,$9)`, [invoiceId, req.auth!.tenantId, quoteId, quote.customer_id, invoiceNumber, subtotal, taxTotal, total, req.auth!.userId]);
    for (const item of itemsRes.rows) {
      await pool.query(`INSERT INTO invoice_items(id,invoice_id,product_id,quantity,unit_price,tax_rate,line_total) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id(), invoiceId, item.product_id, item.quantity, item.unit_price, item.tax_rate, item.line_total]);
      await pool.query(`INSERT INTO inventory_movements(id,tenant_id,product_id,warehouse_id,movement_type,quantity,unit_cost,reference_type,reference_id,created_by)
      SELECT $1,$2,$3,w.id,'sale',$4,p.cost,'invoice',$5,$6 FROM warehouses w JOIN products p ON p.id=$3 WHERE w.tenant_id=$2 ORDER BY w.code LIMIT 1`, [id(), req.auth!.tenantId, item.product_id, -Number(item.quantity), invoiceId, req.auth!.userId]);
    }
    await pool.query(`UPDATE quotes SET status='converted' WHERE id=$1`, [quoteId]);
    await pool.query(`INSERT INTO ar_ledger(id,tenant_id,customer_id,invoice_id,entry_type,debit,credit,balance) VALUES($1,$2,$3,$4,'invoice',$5,0,$5)`, [id(), req.auth!.tenantId, quote.customer_id, invoiceId, total]);
    await pool.query('COMMIT');
    res.status(201).json({ invoiceId, invoiceNumber, subtotal, taxTotal, total, pdfUrl: `/invoices/${invoiceId}/pdf` });
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
});

app.get('/invoices/:id/pdf', requireAuth, async (req, res) => {
  const invoiceRes = await pool.query(`SELECT i.*, c.name customer_name FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.id=$1 AND i.tenant_id=$2`, [req.params.id, req.auth!.tenantId]);
  const inv = invoiceRes.rows[0];
  if (!inv) return res.status(404).json({ message: 'Invoice not found' });
  const content = `Factura ${inv.invoice_number}\nCliente: ${inv.customer_name}\nTotal: ${inv.total}`;
  res.setHeader('Content-Type', 'application/pdf');
  res.send(Buffer.from(content));
});

app.post('/payments', requireAuth, requireRole('Admin', 'Caja', 'Contabilidad'), async (req, res) => {
  const schema = z.object({ invoiceId: z.string().uuid(), amount: z.number().positive(), method: z.string(), reference: z.string().optional() });
  const data = schema.parse(req.body);
  await pool.query('BEGIN');
  try {
    const invRes = await pool.query(`SELECT * FROM invoices WHERE id=$1 AND tenant_id=$2`, [data.invoiceId, req.auth!.tenantId]);
    const invoice = invRes.rows[0];
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const newBalance = Number(invoice.balance_due) - data.amount;
    await pool.query(`INSERT INTO payments(id,tenant_id,invoice_id,amount,method,reference,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)`, [id(), req.auth!.tenantId, data.invoiceId, data.amount, data.method, data.reference ?? null, req.auth!.userId]);
    await pool.query(`UPDATE invoices SET balance_due=$1,status=$2 WHERE id=$3`, [Math.max(newBalance, 0), newBalance <= 0 ? 'paid' : 'issued', data.invoiceId]);
    await pool.query(`INSERT INTO ar_ledger(id,tenant_id,customer_id,invoice_id,entry_type,debit,credit,balance) VALUES ($1,$2,$3,$4,'payment',0,$5,$6)`, [id(), req.auth!.tenantId, invoice.customer_id, data.invoiceId, data.amount, Math.max(newBalance, 0)]);
    await pool.query('COMMIT');
    res.status(201).json({ message: 'Payment recorded', balanceDue: Math.max(newBalance, 0) });
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
});

app.get('/ar/ledger', requireAuth, requireRole('Admin', 'Contabilidad', 'Caja'), async (req, res) => {
  const result = await pool.query(`SELECT * FROM ar_ledger WHERE tenant_id=$1 ORDER BY occurred_at DESC`, [req.auth!.tenantId]);
  res.json(result.rows);
});

app.post('/dgii/submissions/mock', requireAuth, requireRole('Admin', 'Contabilidad'), async (req, res) => {
  const schema = z.object({ invoiceId: z.string().uuid() });
  const { invoiceId } = schema.parse(req.body);
  const submissionId = id();
  await pool.query(`INSERT INTO dgii_submissions(id,tenant_id,invoice_id,provider_name,status,request_payload,response_payload,attempts) VALUES($1,$2,$3,'mock-provider','accepted',$4,$5,1)`, [submissionId, req.auth!.tenantId, invoiceId, JSON.stringify({ invoiceId }), JSON.stringify({ trackId: `MOCK-${Date.now()}`, status: 'accepted' })]);
  res.status(201).json({ id: submissionId, status: 'accepted' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({ message: err.message });
});

export default app;
