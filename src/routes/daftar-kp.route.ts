import { Context, Hono } from "hono";
import { RegExpRouter } from "hono/router/reg-exp-router";
import DaftarKPHandler from "../handlers/daftar-kp.handler";
import AuthMiddleware from "../middlewares/auth.middleware";
import prisma from "../infrastructures/db.infrastructure";

const daftarKPRoute = new Hono({ router: new RegExpRouter() });

// mahasiswa route

daftarKPRoute.get("/show", async function (c: Context) {
  const mahasiswa = await prisma.mahasiswa.findMany({});
  const instansi = await prisma.instansi.findMany({});
  const pendaftaranKP = await prisma.pendaftaran_kp.findMany({
    include: {
      log: true,
      document: {
        orderBy: {
          idKriteria: "asc",
        },
      },
    },
  });
  return c.json({ mahasiswa, instansi, pendaftaranKP });
});

daftarKPRoute.get("/test", async function (c: Context) {
  await prisma.lOG.deleteMany({});
  await prisma.option.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.kriteria.deleteMany({});
  await prisma.pendaftaran_kp.deleteMany({});
  await prisma.instansi.deleteMany({});
  await prisma.mahasiswa.deleteMany({});
  await prisma.ruangan.deleteMany({});
  await prisma.dosen.deleteMany({});
  await prisma.pembimbing_instansi.deleteMany({});
  await prisma.tahun_ajaran.deleteMany({});

  await prisma.kriteria.createMany({
    data: [
      {
        id: 0,
        nama: "surat penolakan instansi",
      },
      {
        id: 1,
        nama: "surat pengantar instansi",
      },
      { id: 2, nama: "surat balasan dari instansi" },
      { id: 3, nama: "id penunjukkan dosen pembimbing" },
      { id: 4, nama: "surat penunjukkan dosen pembimbing" },
      {
        id: 5,
        nama: "surat perpanjangan kerja praktik",
      },
    ],
  });

  await prisma.dosen.create({
    data: {
      nip: "123321",
      nama: "Olav",
      email: "a@gmail.com",
    },
  });

  await prisma.mahasiswa.create({
    data: {
      nim: "123",
      nama: "Olav",
      email: "a@gmail.com",
      nip: "123321",
    },
  });

  await prisma.instansi.create({
    data: {
      id: "12432432-2222-2233-3333-333222222223",
      nama: "Test",
      alamat: "jl123",
      jenis: "Pemerintahan",
      nama_pj: "Olavlagi",
      no_hp_pj: "480243",
      status: "Aktif",
      longitude: 4324.432432,
      latitude: 432.432423432,
      radius: 500,
    },
  });

  await prisma.mahasiswa.createMany({
    data: [
      {
        nim: "12250111794",
        nama: "Hafidz Alhadid Rahman",
        email: "abc@gmail.com",
        no_hp: "08089432",
        nip: "123321",
      },
      {
        nim: "12250111791",
        nama: "Hafidz Alhadid Rahman",
        email: "abc1@gmail.com",
        no_hp: "08089432",
        nip: "123321",
      },
      {
        nim: "12250111888",
        nama: "Hafidz Alhadid Rahman",
        email: "abc2@gmail.com",
        no_hp: "08089432",
        nip: "123321",
      },
      {
        nim: "12150111794",
        nama: "Hafidz Alhadid Rahman",
        email: "abc3@gmail.com",
        no_hp: "08089432",
        nip: "123321",
      },
      {
        nim: "12150111791",
        nama: "Hafidz Alhadid Rahman",
        email: "abc4@gmail.com",
        no_hp: "08089432",
        nip: "123321",
      },
      {
        nim: "12050111794",
        nama: "Hafidz Alhadid Rahman",
        email: "abc5@gmail.com",
        no_hp: "08089432",
        nip: "123321",
      },
      {
        nim: "12050111791",
        nama: "Hafidz Alhadid Rahman",
        email: "abc6@gmail.com",
        no_hp: "08089432",
        nip: "123321",
      },
      {
        nim: "12050111999",
        nama: "Hafidz Alhadid Rahman",
        email: "abc7@gmail.com",
        no_hp: "08089432",
        nip: "123321",
      },
    ],
  });

  await prisma.instansi.create({
    data: {
      id: "12432432-2222-2233-3333-333222222224",
      nama: "Coba",
      alamat: "jl123",
      jenis: "Pemerintahan",
      nama_pj: "Olavlagi",
      no_hp_pj: "480243",
      status: "Aktif",
      longitude: 4324.432432,
      latitude: 432.432423432,
      radius: 500,
    },
  });

  await prisma.tahun_ajaran.create({
    data: {
      id: 202420251,
    },
  });

  await prisma.tahun_ajaran.create({
    data: {
      id: 202320241,
    },
  });

  // await prisma.pendaftaran_kp.create({
  //   data: {
  //     id_tahun_ajaran: 202420251,
  //     tanggal_mulai: new Date(),
  //     tujuan_surat_instansi: "ABC",
  //     id_instansi: "12432432-2222-2233-3333-333222222224",
  //     nim: "12150111794",
  //     judul_kp: "semua orang",
  //     kelas_kp: "A",
  //     status: "Baru",
  //     document: {
  //       createMany: {
  //         data: [
  //           { idKriteria: 0 },
  //           { idKriteria: 1 },
  //           { idKriteria: 2 },
  //           { idKriteria: 3 },
  //           { idKriteria: 4 },
  //           { idKriteria: 5 },
  //         ],
  //       },
  //     },
  //   },
  // });

  // await prisma.pendaftaran_kp.create({
  //   data: {
  //     id_tahun_ajaran: 202420251,
  //     tanggal_mulai: new Date(),
  //     tujuan_surat_instansi: "ABC",
  //     id_instansi: "12432432-2222-2233-3333-333222222224",
  //     nim: "12050111794",
  //     judul_kp: "semua orang",
  //     kelas_kp: "A",
  //     status: "Baru",
  //     document: {
  //       createMany: {
  //         data: [
  //           { idKriteria: 0 },
  //           { idKriteria: 1 },
  //           { idKriteria: 2 },
  //           { idKriteria: 3 },
  //           { idKriteria: 4 },
  //           { idKriteria: 5 },
  //         ],
  //       },
  //     },
  //   },
  // });

  // await prisma.pendaftaran_kp.create({
  //   data: {
  //     id_tahun_ajaran: 202420251,
  //     tanggal_mulai: new Date(),
  //     tujuan_surat_instansi: "ABC",
  //     id_instansi: "12432432-2222-2233-3333-333222222224",
  //     nim: "12250111794",
  //     judul_kp: "semua orang",
  //     kelas_kp: "A",
  //     status: "Baru",
  //     document: {
  //       createMany: {
  //         data: [
  //           { idKriteria: 0 },
  //           { idKriteria: 1 },
  //           { idKriteria: 2 },
  //           { idKriteria: 3 },
  //           { idKriteria: 4 },
  //           { idKriteria: 5 },
  //         ],
  //       },
  //     },
  //   },
  // });

  // await prisma.pendaftaran_kp.create({
  //   data: {
  //     id_tahun_ajaran: 202320241,
  //     tanggal_mulai: new Date(),
  //     tujuan_surat_instansi: "ABC",
  //     id_instansi: "12432432-2222-2233-3333-333222222224",
  //     nim: "12250111791",
  //     judul_kp: "semua orang",
  //     kelas_kp: "A",
  //     status: "Baru",
  //     document: {
  //       createMany: {
  //         data: [
  //           { idKriteria: 0 },
  //           { idKriteria: 1 },
  //           { idKriteria: 2 },
  //           { idKriteria: 3 },
  //           { idKriteria: 4 },
  //           { idKriteria: 5 },
  //         ],
  //       },
  //     },
  //   },
  // });

  // await prisma.pendaftaran_kp.create({
  //   data: {
  //     id_tahun_ajaran: 202320241,
  //     tanggal_mulai: new Date(),
  //     tujuan_surat_instansi: "ABC",
  //     id_instansi: "12432432-2222-2233-3333-333222222224",
  //     nim: "123",
  //     judul_kp: "semua orang",
  //     kelas_kp: "A",
  //     status: "Gagal",
  //     document: {
  //       createMany: {
  //         data: [
  //           { idKriteria: 0 },
  //           { idKriteria: 1 },
  //           { idKriteria: 2 },
  //           { idKriteria: 3 },
  //           { idKriteria: 4 },
  //           { idKriteria: 5 },
  //         ],
  //       },
  //     },
  //   },
  // });

  // await prisma.pendaftaran_kp.create({
  //   data: {
  //     id_tahun_ajaran: 202420251,
  //     tanggal_mulai: new Date(),
  //     tujuan_surat_instansi: "ABC",
  //     id_instansi: "12432432-2222-2233-3333-333222222224",
  //     nim: "123",
  //     judul_kp: "semua orang",
  //     kelas_kp: "A",
  //     status: "Gagal",
  //     document: {
  //       createMany: {
  //         data: [
  //           { idKriteria: 0 },
  //           { idKriteria: 1 },
  //           { idKriteria: 2 },
  //           { idKriteria: 3 },
  //           { idKriteria: 4 },
  //           { idKriteria: 5 },
  //         ],
  //       },
  //     },
  //   },
  // });

  // await prisma.pendaftaran_kp.create({
  //   data: {
  //     id_tahun_ajaran: 202420251,
  //     tanggal_mulai: new Date(),
  //     tujuan_surat_instansi: "ABC",
  //     id_instansi: "12432432-2222-2233-3333-333222222224",
  //     nim: "123",
  //     judul_kp: "semua orang",
  //     kelas_kp: "A",
  //     status: "Gagal",
  //     document: {
  //       createMany: {
  //         data: [
  //           { idKriteria: 0 },
  //           { idKriteria: 1 },
  //           { idKriteria: 2 },
  //           { idKriteria: 3 },
  //           { idKriteria: 4 },
  //           { idKriteria: 5 },
  //         ],
  //       },
  //     },
  //   },
  // });

  await prisma.option.create({
    data: {
      id: 999,
      tanggal_mulai_pendaftaran_kp: "2025-06-02T08:18:36.528Z",
      tanggal_akhir_pendaftaran_kp: "2025-06-30T08:18:36.528Z",
      tanggal_mulai_pendaftaran_kp_lanjut: "2025-06-02T08:18:36.528Z",
      tanggal_akhir_pendaftaran_kp_lanjut: "2025-06-30T08:18:36.528Z",
    },
  });

  const mahasiswa = await prisma.mahasiswa.findMany({});
  const instansi = await prisma.instansi.findMany({});
  const dosen = await prisma.dosen.findMany({});

  return c.json({ mahasiswa, instansi, dosen });
});

daftarKPRoute.post(
  "/mahasiswa/daftar-kp/pendaftaran-kp",
  DaftarKPHandler.createPermohonanPendaftaranKP
);

daftarKPRoute.patch(
  "/mahasiswa/daftar-kp/pendaftaran-kp",
  DaftarKPHandler.updatePermohonanPendaftaranKP
);

daftarKPRoute.post(
  "/mahasiswa/daftar-kp/pendaftaran-instansi",
  DaftarKPHandler.createPermohonanPendaftaranInstansi
);

daftarKPRoute.patch(
  "/mahasiswa/daftar-kp/berkas-daftar-kp",
  DaftarKPHandler.patchBerkasDaftarKP
);

daftarKPRoute.get(
  "/mahasiswa/daftar-kp/riwayat-pendaftaran-kp",
  DaftarKPHandler.getRiwayatPendaftaranKP
);

daftarKPRoute.get(
  "/mahasiswa/daftar-kp/data-instansi",
  DaftarKPHandler.getDataInstansi
);

daftarKPRoute.get(
  "/mahasiswa/daftar-kp/kp-saya",

  DaftarKPHandler.getKPTerbaruMahasiswa
);

daftarKPRoute.get(
  "/mahasiswa/daftar-kp/log/:idKP",
  DaftarKPHandler.getLOGKPendaftaranKPById
);

// koordinator route

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/berkas-mahasiswa",

  DaftarKPHandler.getBerkasMahasiswa
);

daftarKPRoute.patch(
  "/koordinator-kp/daftar-kp/berkas-mahasiswa/:id",
  DaftarKPHandler.patchBerkasMahasiswa
);

daftarKPRoute.put(
  "/koordinator-kp/daftar-kp/berkas-mahasiswa/:id",

  DaftarKPHandler.putBerkasMahasiswa
);

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/instansi",

  DaftarKPHandler.getAllDataInstansi
);

daftarKPRoute.post(
  "/koordinator-kp/daftar-kp/instansi",

  DaftarKPHandler.createInstansi
);

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/instansi/:id",

  DaftarKPHandler.getDataDetailInstansi
);

daftarKPRoute.patch(
  "/koordinator-kp/daftar-kp/instansi/:id",
  DaftarKPHandler.patchDataInstansi
);

daftarKPRoute.put(
  "/koordinator-kp/daftar-kp/instansi/:id",
  DaftarKPHandler.editDataInstansi
);

daftarKPRoute.delete(
  "/koordinator-kp/daftar-kp/instansi/:id",

  DaftarKPHandler.deleteDataInstansi
);

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/get-data-kp",

  DaftarKPHandler.getDataKPMahasiswa
);

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/get-data-kp/:id",
  DaftarKPHandler.getDataKPDetailMahasiswa
);

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/statistik-pendaftaran",
  DaftarKPHandler.getStatistikPendaftaran
);

daftarKPRoute.patch(
  "/koordinator-kp/daftar-kp/tanggal-daftar-kp",
  DaftarKPHandler.patchTanggalDaftarKP
);

// pegawai bagian umum

daftarKPRoute.get(
  "/daftar-kp/bagian-umum/berkas-mahasiswa",
  DaftarKPHandler.getDataKPMahasiswaBagianUmum
);

daftarKPRoute.post(
  "/daftar-kp/bagian-umum/berkas-mahasiswa",
  DaftarKPHandler.postLOGPPencetakanSuratPengantar
);

// all

daftarKPRoute.get(
  "/daftar-kp/tanggal-daftar-kp",

  DaftarKPHandler.getTanggalDaftarKP
);

daftarKPRoute.get(
  "/daftar-kp/get-tahun-ajaran",

  DaftarKPHandler.getTahunAjaran
);

daftarKPRoute.get("/daftar-kp/data-dosen", DaftarKPHandler.getDataDosen);

export default daftarKPRoute;
