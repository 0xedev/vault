ALTER TABLE "users" ALTER COLUMN "locked_balance" TYPE numeric(78,18) USING "locked_balance"::numeric;
ALTER TABLE "users" ALTER COLUMN "locked_balance" SET DEFAULT 0;

ALTER TABLE "listings" ALTER COLUMN "price" TYPE numeric(78,18) USING "price"::numeric;

ALTER TABLE "offers" ALTER COLUMN "amount" TYPE numeric(78,18) USING "amount"::numeric;
ALTER TABLE "offers" ALTER COLUMN "apr" TYPE numeric(18,6) USING "apr"::numeric;

ALTER TABLE "escrows" ALTER COLUMN "amount" TYPE numeric(78,18) USING "amount"::numeric;

ALTER TABLE "transactions" ALTER COLUMN "amount" TYPE numeric(78,18) USING "amount"::numeric;
