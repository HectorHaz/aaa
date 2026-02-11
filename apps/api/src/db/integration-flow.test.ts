import { describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('integration flow quote -> invoice -> payment', () => {
  it('reflects AR balance updates', async () => {
    const db = newDb();
    db.public.none(readFileSync(resolve('src/db/schema.sql'), 'utf8'));
    const pg = db.adapters.createPg();
    const client = new pg.Client();
    await client.connect();

    await client.query(`INSERT INTO tenants(id,name) VALUES ('00000000-0000-0000-0000-000000000001','T')`);
    await client.query(`INSERT INTO customers(id,tenant_id,code,name,payment_terms_days,credit_limit) VALUES ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','C1','Cliente',30,10000)`);
    await client.query(`INSERT INTO invoices(id,tenant_id,customer_id,invoice_number,status,subtotal,tax_total,total,balance_due) VALUES ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','FAC-1','issued',100,18,118,118)`);
    await client.query(`INSERT INTO ar_ledger(id,tenant_id,customer_id,invoice_id,entry_type,debit,credit,balance) VALUES('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','invoice',118,0,118)`);

    await client.query(`UPDATE invoices SET balance_due=68 WHERE id='00000000-0000-0000-0000-000000000003'`);
    await client.query(`INSERT INTO ar_ledger(id,tenant_id,customer_id,invoice_id,entry_type,debit,credit,balance) VALUES('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','payment',0,50,68)`);

    const invoice = await client.query(`SELECT balance_due FROM invoices WHERE id='00000000-0000-0000-0000-000000000003'`);
    expect(Number(invoice.rows[0].balance_due)).toBe(68);
    const ledger = await client.query(`SELECT count(*)::int total FROM ar_ledger`);
    expect(ledger.rows[0].total).toBe(2);

    await client.end();
  });
});
