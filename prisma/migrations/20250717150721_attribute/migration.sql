/*
  Warnings:

  - You are about to drop the `tahun_ajaran` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `id_tahun_ajaran` on table `pendaftaran_kp` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "pendaftaran_kp" DROP CONSTRAINT "pendaftaran_kp_id_tahun_ajaran_fkey";

-- AlterTable
ALTER TABLE "pendaftaran_kp" ALTER COLUMN "id_tahun_ajaran" SET NOT NULL,
ALTER COLUMN "id_tahun_ajaran" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "tahun_ajaran";
