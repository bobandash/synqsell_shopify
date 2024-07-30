-- CreateTable
CREATE TABLE "ChecklistTable" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "header" TEXT NOT NULL,
    "subHeader" TEXT,
    "isHidden" BOOLEAN NOT NULL,

    CONSTRAINT "ChecklistTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "checklistTableId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "header" TEXT NOT NULL,
    "subheader" TEXT,
    "buttonText" TEXT,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistStatus" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL,

    CONSTRAINT "ChecklistStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_key_key" ON "ChecklistItem"("key");

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistTableId_fkey" FOREIGN KEY ("checklistTableId") REFERENCES "ChecklistTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistStatus" ADD CONSTRAINT "ChecklistStatus_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
