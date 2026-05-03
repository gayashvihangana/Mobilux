INSERT INTO users (id, name, email, password, role, created_at, updated_at)
VALUES
  (1, 'Mobilux Owner', 'admin@mobilux.lk', '$2a$10$7EqJtq98hPqEX7fNZaFWoO5/3wZLxE/nf9sOcY0Pda/2E2E8d1sya', 'ADMIN', now(), now()),
  (2, 'Repair Staff', 'staff@mobilux.lk', '$2a$10$7EqJtq98hPqEX7fNZaFWoO5/3wZLxE/nf9sOcY0Pda/2E2E8d1sya', 'STAFF', now(), now()),
  (3, 'Customer One', 'customer@mobilux.lk', '$2a$10$7EqJtq98hPqEX7fNZaFWoO5/3wZLxE/nf9sOcY0Pda/2E2E8d1sya', 'CUSTOMER', now(), now());

INSERT INTO products (id, name, price, category, visible, created_at, updated_at)
VALUES
  (1, 'iPhone 14', 189000.00, 'PHONE', true, now(), now()),
  (2, 'Samsung Galaxy S23', 174000.00, 'PHONE', true, now(), now()),
  (3, 'Fast Charger 25W', 6900.00, 'ACCESSORY', true, now(), now());

INSERT INTO repairs (id, customer_id, assigned_staff_id, device_model, issue_description, status, cost, created_at, updated_at)
VALUES
  (1, 3, 2, 'iPhone 12 Pro', 'Screen replacement needed', 'IN_PROGRESS', 22000.00, now(), now()),
  (2, 3, 2, 'Samsung Galaxy A52', 'Battery draining fast', 'COMPLETED', 9500.00, now(), now());

INSERT INTO payments (id, repair_id, amount, receipt_url, status, created_at, updated_at)
VALUES
  (1, 2, 9500.00, '/uploads/receipts/sample-receipt.jpg', 'VERIFIED', now(), now());

INSERT INTO discounts (id, user_id, percentage, eligibility_rules, active, created_at)
VALUES
  (1, 3, 10.00, 'Eligible after 3 completed repairs', true, now());
