/*
# Add budget_amount to months + new categories

## Changes
1. Add `budget_amount` column to `months` table
   - decimal(14,2), NOT NULL, default 0
   - Represents the total monthly budget (separate from income)
   - Expenses are tracked against this budget amount

2. New Categories added:
   - "Uber/Pick me" - for ride-hailing services
   - "Kangaroo" - for Kangaroo delivery service

## Notes
- The existing `income` column remains for tracking monthly income
- `budget_amount` is the allocation from which expenses are deducted
- New categories are inserted only if they don't already exist
*/

-- Add budget_amount column to months table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'months' AND column_name = 'budget_amount'
  ) THEN
    ALTER TABLE months ADD COLUMN budget_amount decimal(14,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add Uber/Pick me category if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Uber/Pick me') THEN
    INSERT INTO categories (name, icon, color, allows_multiple, is_extra, sort_order)
    VALUES ('Uber/Pick me', 'car-taxi-front', '#6366f1', false, false, 14);
  END IF;
END $$;

-- Add Kangaroo category if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Kangaroo') THEN
    INSERT INTO categories (name, icon, color, allows_multiple, is_extra, sort_order)
    VALUES ('Kangaroo', 'package', '#f472b6', false, false, 15);
  END IF;
END $$;
