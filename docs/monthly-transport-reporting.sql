-- Suggested relational schema for Monthly Employee Bus Transportation Reporting
-- Suitable for MySQL or PostgreSQL with minor dialect adjustments.

CREATE TABLE companies (
  id BIGSERIAL PRIMARY KEY,
  company_code VARCHAR(50) UNIQUE,
  company_name VARCHAR(255) NOT NULL UNIQUE,
  report_emails TEXT NOT NULL,
  cc_emails TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plants (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  plant_code VARCHAR(50),
  plant_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employees (
  id BIGSERIAL PRIMARY KEY,
  employee_code VARCHAR(80) NOT NULL UNIQUE,
  employee_name VARCHAR(255) NOT NULL,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  plant_id BIGINT NOT NULL REFERENCES plants(id),
  official_email VARCHAR(255),
  employment_type VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transport_usage (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  usage_month DATE NOT NULL,
  route_name VARCHAR(255),
  pickup_point VARCHAR(255),
  is_using_transport BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, usage_month)
);

CREATE TABLE report_mail_logs (
  id BIGSERIAL PRIMARY KEY,
  report_month DATE NOT NULL,
  company_id BIGINT NULL REFERENCES companies(id),
  delivery_mode VARCHAR(40) NOT NULL,
  recipients TEXT NOT NULL,
  cc_recipients TEXT DEFAULT '',
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(40) NOT NULL,
  total_employees INTEGER NOT NULL DEFAULT 0,
  attachment_format VARCHAR(40) DEFAULT 'xlsx',
  error_message TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

SELECT
  c.company_name,
  p.plant_name,
  COUNT(*) AS employee_count
FROM transport_usage tu
JOIN employees e ON e.id = tu.employee_id
JOIN companies c ON c.id = e.company_id
JOIN plants p ON p.id = e.plant_id
WHERE tu.usage_month = DATE '2026-04-01'
  AND tu.is_using_transport = TRUE
GROUP BY c.company_name, p.plant_name
ORDER BY c.company_name, p.plant_name;

SELECT
  e.employee_code,
  e.employee_name,
  c.company_name,
  p.plant_name,
  COALESCE(tu.pickup_point, tu.route_name, '-') AS route_or_pickup_point
FROM transport_usage tu
JOIN employees e ON e.id = tu.employee_id
JOIN companies c ON c.id = e.company_id
JOIN plants p ON p.id = e.plant_id
WHERE tu.usage_month = DATE '2026-04-01'
  AND tu.is_using_transport = TRUE
ORDER BY c.company_name, p.plant_name, e.employee_name;
