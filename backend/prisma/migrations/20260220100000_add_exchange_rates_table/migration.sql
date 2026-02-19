-- CreateTable: exchange_rates for NBG currency exchange rate storage
CREATE TABLE IF NOT EXISTS "exchange_rates" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "base" TEXT NOT NULL DEFAULT 'GEL',
    "currency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraint on date + base + currency
CREATE UNIQUE INDEX IF NOT EXISTS "exchange_rates_date_base_currency_key" ON "exchange_rates"("date", "base", "currency");

-- CreateIndex: index for lookups by currency and date
CREATE INDEX IF NOT EXISTS "exchange_rates_currency_date_idx" ON "exchange_rates"("currency", "date");
