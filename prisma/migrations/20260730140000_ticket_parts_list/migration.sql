-- AlterTable
ALTER TABLE "RepairTicket" ADD COLUMN "parts" JSONB,
ADD COLUMN "issueWarranty" TEXT;

-- Seed the parts list from the flat legacy columns: each comma-separated part
-- in "partsUsed" becomes its own row, all sharing the one recorded supplier.
UPDATE "RepairTicket" t
SET "parts" = sub.parts
FROM (
    SELECT
        r."id",
        jsonb_agg(
            jsonb_build_object(
                'part', btrim(p),
                'supplier', COALESCE(r."partsSupplier", '')
            )
        ) AS parts
    FROM "RepairTicket" r,
        unnest(string_to_array(r."partsUsed", ',')) AS p
    WHERE r."partsUsed" IS NOT NULL
        AND btrim(r."partsUsed") <> ''
        AND btrim(p) <> ''
    GROUP BY r."id"
) sub
WHERE t."id" = sub."id";
