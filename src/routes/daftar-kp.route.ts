import { Hono } from "hono";
import { RegExpRouter } from "hono/router/reg-exp-router";
import DaftarKPHandler from "../handlers/daftar-kp.handler";
import AuthMiddleware from "../middlewares/auth.middleware";

const daftarKPRoute = new Hono({ router: new RegExpRouter() });

// mahasiswa route

daftarKPRoute.post(
  "/mahasiswa/daftar-kp/pendaftaran-kp",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.createPermohonanPendaftaranKP
);

daftarKPRoute.patch(
  "/mahasiswa/daftar-kp/pendaftaran-kp",
  AuthMiddleware.JWTBearerTokenExtraction,
  DaftarKPHandler.updatePermohonanPendaftaranKP
);

daftarKPRoute.post(
  "/mahasiswa/daftar-kp/pendaftaran-instansi",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.createPermohonanPendaftaranInstansi
);

daftarKPRoute.patch(
  "/mahasiswa/daftar-kp/berkas-daftar-kp",
  AuthMiddleware.JWTBearerTokenExtraction,
  DaftarKPHandler.patchBerkasDaftarKP
);

daftarKPRoute.get(
  "/mahasiswa/daftar-kp/riwayat-pendaftaran-kp",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.getRiwayatPendaftaranKP
);

daftarKPRoute.get(
  "/mahasiswa/daftar-kp/pembimbing-instansi",
  AuthMiddleware.JWTBearerTokenExtraction,
  DaftarKPHandler.getPembimbingInstansi
);

daftarKPRoute.post(
  "/mahasiswa/daftar-kp/pembimbing-instansi",
  AuthMiddleware.JWTBearerTokenExtraction,
  DaftarKPHandler.createPembimbingInstansi
);

daftarKPRoute.get(
  "/mahasiswa/daftar-kp/data-instansi",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.getDataInstansi
);

daftarKPRoute.get(
  "/mahasiswa/daftar-kp/kp-saya",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.getKPTerbaruMahasiswa
);

daftarKPRoute.get(
  "/mahasiswa/daftar-kp/log/:idKP",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.getLOGKPendaftaranKPById
);

// koordinator route

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/berkas-mahasiswa",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.getBerkasMahasiswa
);

daftarKPRoute.patch(
  "/koordinator-kp/daftar-kp/berkas-mahasiswa/:id",
  AuthMiddleware.JWTBearerTokenExtraction,
  DaftarKPHandler.patchBerkasMahasiswa
);

daftarKPRoute.put(
  "/koordinator-kp/daftar-kp/berkas-mahasiswa/:id",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.putBerkasMahasiswa
);

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/instansi",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.getAllDataInstansi
);

daftarKPRoute.post(
  "/koordinator-kp/daftar-kp/instansi",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.createInstansi
);

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/instansi/:id",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.getDataDetailInstansi
);

daftarKPRoute.patch(
  "/koordinator-kp/daftar-kp/instansi/:id",
  AuthMiddleware.JWTBearerTokenExtraction,
  DaftarKPHandler.patchDataInstansi
);

daftarKPRoute.put(
  "/koordinator-kp/daftar-kp/instansi/:id",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.editDataInstansi
);

daftarKPRoute.delete(
  "/koordinator-kp/daftar-kp/instansi/:id",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.deleteDataInstansi
);

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/get-data-kp",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.getDataKPMahasiswa
);

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/get-data-kp/:id",
  AuthMiddleware.JWTBearerTokenExtraction,

  DaftarKPHandler.getDataKPDetailMahasiswa
);

daftarKPRoute.get(
  "/koordinator-kp/daftar-kp/statistik-pendaftaran",
  AuthMiddleware.JWTBearerTokenExtraction,
  DaftarKPHandler.getStatistikPendaftaran
);

daftarKPRoute.patch(
  "/koordinator-kp/daftar-kp/tanggal-daftar-kp",
  AuthMiddleware.JWTBearerTokenExtraction,
  DaftarKPHandler.patchTanggalDaftarKP
);

// pegawai bagian umum

daftarKPRoute.get(
  "/daftar-kp/bagian-umum/berkas-mahasiswa",
  AuthMiddleware.JWTBearerTokenExtraction,
  DaftarKPHandler.getDataKPMahasiswaBagianUmum
);

daftarKPRoute.post(
  "/daftar-kp/bagian-umum/berkas-mahasiswa",
  AuthMiddleware.JWTBearerTokenExtraction,
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
