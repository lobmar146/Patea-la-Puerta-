-- CreateTable
CREATE TABLE "CustomMonster" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strength" INTEGER NOT NULL,
    "levels" INTEGER NOT NULL,
    "treasures" INTEGER NOT NULL,
    "conditions" JSONB,
    "uses" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomMonster_pkey" PRIMARY KEY ("key")
);
