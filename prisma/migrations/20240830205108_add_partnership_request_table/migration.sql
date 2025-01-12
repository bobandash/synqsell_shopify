-- CreateTable
CREATE TABLE "PartnershipRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "sessionId" TEXT,
    "message" TEXT NOT NULL,

    CONSTRAINT "PartnershipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PartnershipRequestToPriceList" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_PartnershipRequestToPriceList_AB_unique" ON "_PartnershipRequestToPriceList"("A", "B");

-- CreateIndex
CREATE INDEX "_PartnershipRequestToPriceList_B_index" ON "_PartnershipRequestToPriceList"("B");

-- AddForeignKey
ALTER TABLE "PartnershipRequest" ADD CONSTRAINT "PartnershipRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipRequest" ADD CONSTRAINT "PartnershipRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PartnershipRequestToPriceList" ADD CONSTRAINT "_PartnershipRequestToPriceList_A_fkey" FOREIGN KEY ("A") REFERENCES "PartnershipRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PartnershipRequestToPriceList" ADD CONSTRAINT "_PartnershipRequestToPriceList_B_fkey" FOREIGN KEY ("B") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
