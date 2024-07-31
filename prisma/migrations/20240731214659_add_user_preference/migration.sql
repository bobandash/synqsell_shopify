-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "tableIdsHidden" TEXT[],

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);
