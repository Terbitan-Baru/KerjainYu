export type HelpFaqEntry = {
  id: string;
  question: string;
  answer: string; // plain text, gunakan \n untuk jeda paragraf
};

export type HelpCategory = {
  id: string;
  label: string;
  entries: HelpFaqEntry[];
};

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "proyek",
    label: "Proyek",
    entries: [
      {
        id: "proyek-buat",
        question: "Apa itu proyek di KerjainYu, dan siapa yang bisa membuatnya?",
        answer:
          "Proyek adalah ruang kerja tempat sebuah tim mengelola tugas bersama. Semua pengguna yang sudah login bisa membuat proyek baru. Saat kamu membuat proyek, kamu otomatis menjadi Ketua (leader) proyek tersebut.",
      },
      {
        id: "proyek-undang",
        question: "Bagaimana cara mengundang anggota ke proyek?",
        answer:
          "Hanya Ketua proyek yang bisa mengundang anggota baru. Cari calon anggota berdasarkan username lalu kirim undangan. Orang yang diundang akan melihat undangan tersebut di tab \"Undangan\" pada ikon lonceng notifikasi, dan bisa menerima atau menolaknya dari sana.",
      },
      {
        id: "proyek-role",
        question: "Apa bedanya role \"Ketua\" (leader) dan \"Anggota\" (member)?",
        answer:
          "Ketua bisa membuat, menugaskan, dan mengedit tugas, mengarsipkan atau menghapus proyek, meninjau hasil kerja (submission), mengundang atau mengeluarkan anggota, serta menjadikan anggota lain sebagai Ketua.\nAnggota bisa mengklaim tugas yang belum diambil, mengerjakan tugas yang ditugaskan padanya, mengirim hasil kerja, mengajukan tukar tugas, dan berkomentar di tugas.",
      },
      {
        id: "proyek-arsip",
        question: "Bagaimana cara mengarsipkan proyek, dan apa yang terjadi setelah itu?",
        answer:
          "Hanya Ketua yang bisa mengarsipkan proyek, dari halaman Pengaturan Proyek. Setelah diarsipkan, proyek dan seluruh datanya tetap tersimpan, hanya disembunyikan dari daftar proyek aktif. Tugas di proyek yang diarsipkan menjadi read-only — tidak ada klaim, penugasan, submit hasil kerja, review, atau permintaan tukar tugas baru. Anggota tetap bisa menambahkan komentar di tugas meski proyeknya sudah diarsipkan.",
      },
      {
        id: "proyek-aktifkan",
        question: "Bagaimana cara mengaktifkan kembali proyek yang sudah diarsipkan?",
        answer:
          "Buka halaman Arsip, cari proyeknya, lalu tekan tombol \"Aktifkan\". Hanya Ketua proyek yang bisa melakukan ini. Setelah diaktifkan, proyek akan muncul kembali di daftar proyek aktif dan semua aksi normal (klaim, submit, review, dll) bisa dilakukan lagi.",
      },
      {
        id: "proyek-hapus",
        question: "Bagaimana cara menghapus proyek, dan apakah bisa dibatalkan?",
        answer:
          "Hanya Ketua yang bisa menghapus proyek, dari halaman Pengaturan Proyek dengan menekan \"Hapus proyek ini\" lalu mengonfirmasinya. Penghapusan ini bersifat permanen dan tidak bisa dibatalkan — seluruh tugas, anggota, hasil kerja, komentar, dan tautan proyek akan ikut terhapus selamanya. Pastikan kamu benar-benar yakin sebelum melanjutkan.",
      },
    ],
  },
  {
    id: "tugas",
    label: "Tugas / Papan Tugas",
    entries: [
      {
        id: "tugas-klaim",
        question: "Apa itu \"war tugas\" / klaim tugas?",
        answer:
          "Tugas yang belum ditugaskan ke siapa pun (berstatus Unclaimed) akan muncul di papan tugas dan bisa diklaim oleh anggota proyek mana pun, siapa cepat dia dapat. Proses klaim bersifat atomik — kalau dua orang menekan klaim di saat yang hampir bersamaan, hanya satu yang berhasil dan yang lain akan mendapat pesan error bahwa tugas sudah diambil.",
      },
      {
        id: "tugas-status",
        question: "Apa saja status yang bisa dimiliki sebuah tugas?",
        answer:
          "Alur status tugas secara umum adalah:\n1. Belum diklaim (Unclaimed) — tugas tersedia di kolom \"Belum diklaim\", siapa pun anggota bisa mengklaimnya.\n2. To Do — tugas sudah punya penanggung jawab, tapi belum mulai dikerjakan.\n3. Dikerjakan (Ongoing) — penanggung jawab sedang mengerjakan tugas.\n4. Ditinjau — mencakup Submitted (menunggu review Ketua) dan Revisi/In Revision (Ketua minta perbaikan, penanggung jawab harus submit ulang).\n5. Selesai — mencakup Approved (disetujui) atau Rejected (ditolak).",
      },
      {
        id: "tugas-tugaskan",
        question: "Bagaimana cara leader menugaskan tugas langsung ke anggota tertentu (bukan war tugas)?",
        answer:
          "Ketua bisa menekan tombol \"Tugaskan ke Member\" di halaman detail tugas untuk memilih anggota tertentu secara langsung. Opsi ini hanya muncul selama tugas belum punya penanggung jawab sama sekali.",
      },
      {
        id: "tugas-submit",
        question: "Bagaimana cara submit hasil kerja?",
        answer:
          "Penanggung jawab tugas (assignee) bisa mengirim hasil kerja saat tugas berstatus Dikerjakan (Ongoing), lewat tombol submit di halaman detail tugas. Ada kolom catatan opsional untuk menjelaskan hasil kerjamu ke Ketua.",
      },
      {
        id: "tugas-review",
        question: "Apa yang terjadi setelah leader mereview submission?",
        answer:
          "Ada tiga kemungkinan hasil review: Setujui membuat tugas berstatus selesai (Approved); Minta revisi mengembalikan tugas ke penanggung jawab untuk diperbaiki dan dikirim ulang; Tolak membuat tugas berakhir sebagai Rejected.",
      },
      {
        id: "tugas-edit",
        question: "Bisakah tugas diedit setelah dibuat?",
        answer:
          "Bisa. Ketua proyek dapat mengedit judul, deskripsi, prioritas, dan deadline tugas dari halaman detail tugas, lewat tombol \"Edit Tugas\". Perubahan status tugas atau penanggung jawabnya tetap dilakukan lewat aksi klaim, tugaskan, atau review — bukan lewat form edit ini. Edit tugas hanya bisa dilakukan selama proyeknya masih aktif (belum diarsipkan atau selesai).",
      },
    ],
  },
  {
    id: "tukar-tugas",
    label: "Tukar Tugas",
    entries: [
      {
        id: "swap-cara",
        question: "Bagaimana cara menukar tugas dengan anggota lain?",
        answer:
          "Hanya penanggung jawab tugas yang bisa mengajukan tukar, dan tugasnya harus berstatus To Do atau Dikerjakan. Tekan \"Tukar Task\" di halaman detail tugas, pilih anggota tujuan, lalu opsional pilih salah satu tugas milik anggota tersebut untuk ditukar langsung.",
      },
      {
        id: "swap-approve",
        question: "Siapa yang menyetujui permintaan tukar tugas?",
        answer:
          "Tergantung pengaturan \"Izinkan anggota bertukar tugas secara bebas\" di halaman Pengaturan Proyek. Jika diaktifkan, anggota yang dituju sendiri yang menyetujui atau menolak permintaan. Jika dinonaktifkan, Ketua proyek yang menyetujui atau menolaknya.",
      },
      {
        id: "swap-batal",
        question: "Bisakah permintaan tukar tugas dibatalkan?",
        answer:
          "Bisa, oleh orang yang mengajukan permintaan tersebut, selama belum direspons oleh pihak lain. Tekan \"Batalkan\" pada tab \"Tukar Task\" di ikon lonceng notifikasi.",
      },
    ],
  },
  {
    id: "notifikasi",
    label: "Notifikasi",
    entries: [
      {
        id: "notif-pemicu",
        question: "Apa saja yang memicu notifikasi?",
        answer:
          "Kamu akan mendapat notifikasi saat: tugas ditugaskan padamu, tugas berhasil ditukar, ada permintaan tukar tugas baru, hasil kerja menunggu review, hasil kerjamu sudah direview, ada komentar baru di tugas, kamu ditambahkan atau diundang ke proyek, dan pengingat mendekati deadline tugas.",
      },
      {
        id: "notif-lokasi",
        question: "Di mana saya melihat undangan proyek dan permintaan tukar tugas saya?",
        answer:
          "Tekan ikon lonceng di bagian atas halaman. Di sana ada tab \"Undangan\" untuk undangan proyek, dan tab \"Tukar Task\" untuk permintaan tukar tugas yang masuk maupun yang kamu ajukan.",
      },
      {
        id: "notif-baca",
        question: "Bisakah saya menandai satu notifikasi saja sebagai sudah dibaca, atau menghapusnya?",
        answer:
          "Saat ini belum bisa. KerjainYu hanya menyediakan badge jumlah notifikasi belum dibaca dan opsi \"Tandai semua sudah dibaca\" saat kamu membuka lonceng notifikasi — belum ada daftar riwayat notifikasi per item dengan aksi baca/hapus satu per satu.",
      },
    ],
  },
  {
    id: "kalender-berkas",
    label: "Kalender & Berkas",
    entries: [
      {
        id: "kalender",
        question: "Apa yang ditampilkan di halaman kalender proyek?",
        answer:
          "Halaman kalender menampilkan deadline setiap tugas dalam proyek tersebut, membantu tim melihat sebaran tenggat waktu secara visual.",
      },
      {
        id: "berkas",
        question: "Apa itu halaman \"Berkas\" (links)?",
        answer:
          "Halaman Berkas adalah daftar tautan eksternal yang dikelola bersama oleh anggota proyek, dikelompokkan berdasarkan kategori seperti desain, pengembangan, dokumentasi, atau lainnya — memudahkan tim menyimpan referensi penting di satu tempat.",
      },
    ],
  },
  {
    id: "akun",
    label: "Akun",
    entries: [
      {
        id: "akun-profil",
        question: "Bagaimana cara mengubah profil saya (nama, username, avatar)?",
        answer:
          "Buka halaman Profil, lalu ubah nama, username, atau foto profilmu di sana dan simpan perubahannya.",
      },
      {
        id: "akun-password",
        question: "Bagaimana cara mengganti password?",
        answer:
          "Buka halaman Profil, lalu cari form ganti password. Masukkan password lama dan password baru, lalu simpan.",
      },
    ],
  },
];
