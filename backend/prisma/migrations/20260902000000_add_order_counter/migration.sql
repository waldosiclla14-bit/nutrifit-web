-- CreateTable
CREATE TABLE "order_counters" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "current" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_counters_pkey" PRIMARY KEY ("id")
);

-- Insert single counter row
INSERT INTO "order_counters" ("id", "current") VALUES (1, 0);
