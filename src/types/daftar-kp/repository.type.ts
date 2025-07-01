import {
  $Enums,
  pendaftaran_kp,
  status_dokumen,
  status_pendaftaran,
} from "../../generated/prisma";
import {
  CreatePermohonanPendaftaranKPInterface,
  CreatePermohonanPendaftaranInstansiInterface,
} from "./service.type";

// utk params
export interface RepositoryCreatePendaftaranKPInterface
  extends Omit<CreatePermohonanPendaftaranKPInterface, "email"> {
  nim: string;
}

export interface RepositoryUpdatePendaftaranKPInterface
  extends Omit<CreatePermohonanPendaftaranKPInterface, "email"> {
  dataKPMahasiswa: pendaftaran_kp;
  nim: string;
}

export interface RepositoryPendaftaranInstansiInterface
  extends Omit<CreatePermohonanPendaftaranInstansiInterface, "email"> {
  nim: string;
}

// utk return
export interface RepositoryRiwayatPendaftaranKPInterface {
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

export interface PutMahasiswaParamsInterface {
  id: string;
  status?: "Gagal" | "Baru" | "Lanjut";
  nip_pembimbing?: string | null;
  kelas_kp: string;
  tujuan_surat_instansi: string;
  link_surat_penolakan_instansi: string;
  link_surat_pengantar: string;
  link_surat_balasan: string;
  link_surat_penunjukkan_dospem: string;
  link_surat_perpanjangan_kp: string;
  id_surat_pengajuan_dospem: string;
  status_link_surat_penolakan_instansi:
    | "Ditolak"
    | "Divalidasi"
    | "Terkirim"
    | null;
  status_link_surat_pengantar: "Ditolak" | "Divalidasi" | "Terkirim" | null;
  status_link_surat_balasan: "Ditolak" | "Divalidasi" | "Terkirim" | null;
  status_link_surat_penunjukkan_dospem:
    | "Ditolak"
    | "Divalidasi"
    | "Terkirim"
    | null;
  status_link_surat_perpanjangan_kp:
    | "Ditolak"
    | "Divalidasi"
    | "Terkirim"
    | null;
  status_id_surat_pengajuan_dospem:
    | "Ditolak"
    | "Divalidasi"
    | "Terkirim"
    | null;
  catatan_link_surat_penolakan_instansi: string;
  catatan_link_surat_pengantar: string;
  catatan_link_surat_balasan: string;
  catatan_link_surat_penunjukkan_dospem: string;
  catatan_link_surat_perpanjangan_kp: string;
  catatan_id_surat_pengajuan_dospem: string;
  catatan_penolakan: string;
  level_akses: number;
  judul_kp: string;
  alasan_lanjut_kp: string;
  id_instansi?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
}

export interface dataLamaPutBerkasMahasiswa extends pendaftaran_kp {
  document: {
    idPendaftaranKP: string;
    idKriteria: number;
    data: string;
    status: status_dokumen | null;
    catatan: string | null;
    tanggal_upload: Date;
  }[];
}

export interface getTahunAjaran {
  id: number;
  nama?: string | null;
  created_at?: Date | null;
}
