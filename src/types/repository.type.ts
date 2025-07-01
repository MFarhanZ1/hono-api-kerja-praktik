import { $Enums, status_pendaftaran } from "../generated/prisma/index";
import {
  CreatePermohonanPendaftaranKPInterface,
  CreatePermohonanPendaftaranInstansiInterface,
} from "./service.type";

// utk params
export interface RepositoryPendaftaranKPInterface
  extends Omit<CreatePermohonanPendaftaranKPInterface, "email"> {
  nim: string;
}

export interface RepositoryPendaftaranInstansiInterface
  extends Omit<CreatePermohonanPendaftaranInstansiInterface, "email"> {
  nim: string;
}

// utk return
export interface RepositoryRiwayatPendaftaranKPInterface {
  id: string;
  status: status_pendaftaran | null | undefined;
  tanggal_mulai: Date;
  level_akses: number;
  instansi: {
    nama: string;
  } | null;
}

export interface RepositoryPendaftaranKPMahasiswaInterface {
  id: string;
  tanggal_mulai: Date;
  status?: string | null;
  mahasiswa?: {
    nama: string;
    nim: string;
  } | null;
}

export interface RepositoryDetailPendaftaranKPMahasiswa {
  id: string;
  status?: string | null;
  tujuan_surat_instansi: string;
  tanggal_mulai: Date;
  tanggal_selesai?: Date | null;
  level_akses: number;
  link_surat_pengantar?: string | null;
  link_surat_balasan?: string | null;
  link_surat_penunjukkan_dospem?: string | null;
  link_surat_perpanjangan_kp?: string | null;
  id_surat_pengajuan_dospem?: string | null;
  catatan_penolakan?: string | null;
  alasan_lanjut_kp?: string | null;
  mahasiswa?: {
    nim: string;
    nama: string;
    no_hp?: string | null;
    email: string;
  } | null;
  instansi?: {
    nama: string;
    pembimbing_instansi: {
      nama?: string | null;
    }[];
  } | null;
  dosen_pembimbing?: {
    nama: string;
  } | null;
}

export interface GetAllDataInstansiRepository {
  id: string;
  status: $Enums.status_instansi | null;
  nama: string;
  jenis: $Enums.jenis_instansi;
}
