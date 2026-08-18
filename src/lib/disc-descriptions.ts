/**
 * Deskripsi 10 tipe DISC (4 tunggal + 6 kombinasi) sesuai lembar penjelasan
 * resmi "10 DISC". Dipakai mengisi bagian SUMMARY PERSONALITY BACKGROUND
 * pada Excel Profiling.
 */
export interface DiscDescription {
  title: string;
  paragraphs: string[];
  treatmentHeader: string;
  treatments: string[];
}

export const DISC_DESCRIPTIONS: Record<string, DiscDescription> = {
  "D": {
    "title": "Type > D - Dominance (The Challenger)",
    "paragraphs": [
      "Orang yang mendapat skor tinggi dalam intensitas tipe “D” sangat aktif dalam menghadapi masalah dan tantangan. Sementara itu, mereka yang memiliki skor “D” rendah cenderung ingin melakukan penelitian lebih lanjut sebelum mengambil keputusan.",
      "Orang dengan skor “D” tinggi digambarkan sebagai penuntut, kuat, egosentris, berkemauan keras, ambisius, agresif, dan perintis. Sebaliknya, skor “D” rendah menggambarkan individu yang konservatif, kooperatif, penuh perhitungan, tidak banyak menuntut, hati-hati, menyenangkan, sederhana, dan damai.",
      "Pada sisi lain, mereka termasuk golongan yang mengabaikan potensi risiko, tidak menimbang pro dan kontra, serta tidak mempertimbangkan pendapat orang lain. Hal ini karena Orang dengan tipe D sering fokus pada hasil dan tindakan cepat, sehingga kadang tidak memperhitungkan risiko secara mendalam sebelum mengambil keputusan dan kepercayaan diri dan dorongan kuat untuk mencapai hasil, orang tipe D bisa terlihat dominan atau kurang mendengarkan pandangan rekan kerja. \nNamun mereka punya kemampuan untuk berpikir besar dan berorientasi ke masa depan. Mereka tidak takut mengubah sistem lama demi kemajuan. Inilah alasan mengapa banyak pemimpin bertipe D sukses membawa perubahan besar dalam organisasi."
    ],
    "treatmentHeader": "Perlakuan yang optimal untuk orang-orang dalam tipe ini adalah sebagai berikut:",
    "treatments": [
      "1. Berkata singkat, langsung, dan to the point.",
      "2. Bertanya “apa”, bukan “bagaimana”.",
      "3. Fokus pada usaha; ingat mereka menginginkan hasil.",
      "4. Beri saran tentang cara mencapai hasil, memimpin, dan memecahkan masalah.\nBahas manfaat dari ide dan cara pendekatan."
    ]
  },
  "I": {
    "title": "Type > I - Influence (The Enthusiast)",
    "paragraphs": [
      "Orang dengan skor \"I\" tinggi akan mempengaruhi orang lain melalui bicara dan aktivitasnya, dan cenderung emosional. Mereka digambarkan sebagai orang yang meyakinkan, memiliki daya tarik, politis, antusias, persuasif, hangat, demonstratif, mudah percaya, dan optimis.",
      "Orang dengan skor “I” tinggi digambarkan sebagai pemecah masalah yang kreatif, pendorong yang hebat, memotivasi orang lain untuk mencapai sesuatu, memiliki rasa humor yang positif dan dapat bernegosiasi dalam konflik; pembuat perdamaian. Serta dikenal sebagai pribadi yang ekspresif, komunikatif, dan berorientasi pada hubungan interpersonal. Ia cenderung mudah bergaul, senang bekerja sama, dan memiliki kemampuan alami untuk menciptakan suasana positif di lingkungan kerja.\nTipe ini juga sangat responsif terhadap interaksi sosial dan biasanya memperoleh energi dari kolaborasi, percakapan, serta dinamika tim yang hangat. Ia mudah memengaruhi orang lain melalui pendekatan yang ramah dan antusias, dan sering menjadi penghubung antar anggota tim.",
      "Pada sisi lain, mereka termasuk seseorang sering menghadapi tantangan berupa kecenderungan kurang teliti, pengambilan keputusan yang impulsif, konsistensi kerja yang mudah menurun ketika tugas terasa monoton, kecanggungan dalam menghadapi konflik secara langsung, serta fokus yang mudah teralihkan oleh interaksi atau rangsangan di sekitarnya."
    ],
    "treatmentHeader": "Perlakuan yang optimal untuk orang-orang dalam tipe ini adalah sebagai berikut:",
    "treatments": [
      "1. Berikan waktu anda untuk berinteraksi dan mendengarkan aspirasi.",
      "2. Sediakan tugas dimana mereka memiliki kesempatan untuk membangun relasi dan berhubungan dengan orang lain dari beragam latar belakang .",
      "3. Berikan bimbingan dan arahan yang jelas - termasuk deadline, sebab tanpa panduan ini mereka sering akan \"ngelantur\" dan tidak mampu menyelesaikan perkerjaan dengan tepat waktu.",
      "4. Tempatkan pada posisi yang memungkinkan interaksi intens, seperti hubungan pelanggan, pemasaran, pelatihan, layanan publik, atau koordinasi tim.",
      "5. Dorong peningkatan keterampilan seperti perencanaan, prioritas kerja, dan ketelitian."
    ]
  },
  "S": {
    "title": "Type > S - Steadiness (The Supporter)",
    "paragraphs": [
      "Orang dengan skor tipe \"S\" tinggi menginginkan kecepatan yang tetap, keamanan, dan tidak suka perubahan mendadak. Seseorang yang tinggi \"S\"-nya adalah individu yang tenang, santai, sabar, posesif, mudah ditebak, sengaja, stabil, konsisten, dan cenderung bermimik wajah tanpa emosi.",
      "Orang dengan skor “S” tinggi digambarkan sebagai Pendengar yang baik; Pekerja tim. Posesif. Mantap; Mudah diprediksi. Mudah memahami; Menyenangkan. Seseorang dengan tipe ini juga memiliki sisi positif seperti Ia mampu membuat orang lain merasa diterima dan diperlakukan setara, karena sikapnya yang tulus dan rendah hati. Dalam bekerja, ia dapat melihat cara yang lebih mudah dan efisien untuk menyelesaikan sesuatu. Orang dengan tipe ini juga terfokus serta memiliki intuisi yang baik terhadap orang lain dan hubungan antarindividu. Ia dikenal memiliki akal sehat, berpikir logis, dan tidak mudah terbawa emosi. Selain itu, ia selalu mendukung tujuan tim dan dapat diandalkan sebagai rekan kerja yang baik. Ia berupaya membangun hubungan yang harmonis, memberikan stabilitas di lingkungan sekitar, serta mampu melihat proyek atau situasi secara menyeluruh. Dengan sifatnya yang realistis dan praktis, orang ini menjadi sosok yang menenangkan, konsisten, dan sangat berharga dalam kerja sama tim.",
      "Pada sisi lain, mereka termasuk seseorang yang menolak perubahan,memakan waktu lama untuk menyesuaikan diri dengan perubahan, serta menyimpan gerutu, sensitif terhadap kritik, dan kesulitan menetapkan prioritas.\nDalam menganalisis Informasi, seseorang tipe 'S' tinggi mungkin di luarnya terlihat seperti setuju, namun di dalamnya membangkang, serta dapat merenungkan secara mendalam keprihatinan dan keraguan mereka. Pada proses presentasi tipe ini jika memberikan umpan balik maka akan ragu-ragu dan memperlambat tindakan."
    ],
    "treatmentHeader": "Perlakuan yang optimal untuk orang-orang dalam tipe ini adalah sebagai berikut:",
    "treatments": [
      "1. Ciptakan lingkungan yang menguntungkan: pribadi dan menyenangkan.",
      "2. Ekspresikan minat yang tulus pada mereka sebagai pribadi.",
      "3. Sediakan mereka dengan klarifikasi atas tugas-tugas dan jawaban untuk pertanyaan \"bagaimana\".",
      "4. Definisikan secara jelas tujuan, prosedur dan peran mereka dalam rencana keseluruhan, serta yakinkan mereka atas dukungan tindak lanjut pribadi."
    ]
  },
  "C": {
    "title": "Type > C - Compliance (The Thinker)",
    "paragraphs": [
      "Orang dengan skor \"C\" tinggi biasanya patuh pada peraturan dan struktur. Mereka suka melakukan pekerjaan yang berkualitas dan melakukannya dengan benar pada kali pertama. Orang-orang \"C\" tinggi adalah orang-orang yang berhati-hati, tepat, rapi, sistematis, diplomatis, akurat, dan bijaksana. Mereka dengan yang rendah skor \"C\"-nya menantang aturan dan menginginkan kemerdekaan, digambarkan sebagai pembangkang, keras kepala, semau sendiri, tidak sistematis, dan tidak peduli dengan rincian.",
      "Orang-orang dalam kategori ini termasuk pribadi yang menekankan akurasi dan ketelitian. Mereka cenderung menyukai sesuatu yang direncanakan dengan matang dan bersifat menyeluruh. Mereka juga cenderung suka dengan pekerjaan yang mengacu pada prosedur dan standar operasi yang baku.",
      "Pada sisi lain, karena cenderung terfokus pada keteraturan, pribadi dalam model ini cenderung skeptis terhadap gagasan-gagasan baru yang radikal. Mereka juga sedikit enggan menerima proses perubahan yang mendadak. Ketika mereka termotivasi secara negative, mereka akan menjadi sinis atau sangat kritis. Ia juga adalah seorang pengorganisir yang sistematis dan cermat, memiliki naluri manajerial yang kuat, serta mampu membuat dan memelihara sistem kerja yang konsisten dan efisien. Ia berupaya menciptakan lingkungan yang logis dan teratur, mengendalikan rincian dengan hati-hati, serta mengevaluasi kemajuan tim secara objektif. Dalam mengambil keputusan, ia cenderung konservatif, menekankan kualitas, dan selalu berpikir rasional."
    ],
    "treatmentHeader": "Perlakuan yang optimal untuk orang-orang dalam tipe ini adalah sebagai berikut:",
    "treatments": [
      "1. Memberikan tugas dimana terdapat kesempatan bagi mereka untuk mendemonstrasikan keahlian mereka.",
      "2. Memberikan tugas yang menuntut akurasi dan ketelitian",
      "3. Memberikan tugas yang membutuhkan perencanaan yang matang dan bersifat komprehensif",
      "4. Ketika memberikan instruksi, harus disertai dengan data dan argumen yang rasional dan disajikan secara sistematis."
    ]
  },
  "D-I": {
    "title": "Type > D–I - Dominant–Influence (The Charismatic Executor)",
    "paragraphs": [
      "Orang dengan skor \"D–I\" tinggi memiliki energi tinggi, penuh inisiatif, dan mudah memengaruhi orang lain. Ia bergerak cepat, berpikir strategis, serta sangat nyaman memimpin dan membuat keputusan. Keberaniannya berpadu dengan kemampuan interpersonal yang kuat, membuatnya efektif dalam memulai perubahan atau menggerakkan tim. Ia menyukai dinamika, tantangan, dan peluang yang memberi ruang kreativitas serta kebebasan.",
      "Orang-orang dalam kategori ini termasuk Individu yang biasanya tegas, percaya diri, persuasif, inovatif, serta mampu menginspirasi. Ia unggul dalam mengambil keputusan cepat, mengomunikasikan visi besar, dan memobilisasi orang lain menuju target bersama.",
      "Pada sisi lain, dalam beberapa situasi, tipe ini dapat terlihat terlalu terburu-buru, kurang memperhatikan detail, atau terlalu fokus pada ide sehingga melewatkan aspek eksekusi. Ia juga bisa menjadi terlalu dominan atau terlalu percaya diri tanpa mempertimbangkan dampak jangka panjang."
    ],
    "treatmentHeader": "Perlakuan yang optimal untuk orang-orang dalam tipe ini adalah sebagai berikut:",
    "treatments": [
      "1. Berikan tantangan dan target jelas, dan sediakan ruang kreativitas dan keputusan mandiri.",
      "2. Beri kesempatan memimpin proyek atau inisiatif baru dan batasi aturan terlalu ketat agar tidak menghambat spontanitasnya.",
      "3. Berikan umpan balik yang cepat, langsung, namun dengan pendekatan positif.",
      "4. Gunakan komunikasi langsung, cepat, dan to-the-point.",
      "5. Sediakan rekan penyeimbang untuk aspek detail."
    ]
  },
  "D-S": {
    "title": "Type > D–S - Dominant–Steadiness (The Steady Leader)",
    "paragraphs": [
      "Tipe kepribadian \"D–S\" tinggi menggambarkan individu yang memiliki kombinasi unik antara ketegasan, dorongan kuat untuk mencapai hasil, dan kebutuhan akan kestabilan serta konsistensi, sehingga mereka tampil sebagai sosok yang tenang namun tegas, mampu membuat keputusan penting tanpa terburu-buru, dan tetap fokus pada tujuan jangka panjang dengan ketahanan serta komitmen yang kuat.",
      "Orang tipe \"D-S\" tinggi dapat bekerja dengan cara yang sistematis dan penuh tanggung jawab, memadukan keberanian mengambil keputusan dari sisi \"Dominan\" dengan kesabaran serta kesetiaan dari sisi \"Stabil\", sehingga menghasilkan gaya kepemimpinan yang kuat, stabil, dan dapat diandalkan dalam situasi penuh tekanan.",
      "Pada sisi lain, tipe \"D-S\" tinggi memiiki beberapa kekurangan meskipun orang dengan tipe D-S tinggi terlihat kuat, konsisten, dan dapat diandalkan, mereka sering kali kurang fleksibel terhadap perubahan mendadak, cenderung nyaman dengan rutinitas, dan bisa lambat menyesuaikan diri dengan situasi baru; selain itu, mereka sering terlalu mandiri atau sulit mendelegasikan tugas, karena ingin menyelesaikan segala sesuatunya sendiri sesuai standar tinggi yang mereka tetapkan. Proses pengambilan keputusan terkadang menjadi lambat ketika mereka terlalu berhati-hati untuk memastikan semua detail aman, dan secara sosial mereka bisa terlihat dingin, serius, atau kurang ekspresif. Orang dengan tipe \"D–S\" tinggi perlu meningkatkan fleksibilitas, keterbukaan, dan kemampuan beradaptasi agar potensi mereka dapat berjalan optimal tanpa menimbulkan gesekan atau hambatan dalam tim maupun lingkungan kerja."
    ],
    "treatmentHeader": "Perlakuan yang optimal untuk orang-orang dalam tipe ini adalah sebagai berikut:",
    "treatments": [
      "1. Berikan informasi jelas dan terstruktur sebelum proyek dimulai.",
      "2. Tunjukkan dampak jangka panjang dari keputusan yang harus dibuat.",
      "3. Gunakan pendekatan komunikasi logis dan berbasis data.",
      "4. Sediakan ruang untuk bekerja dengan ritme stabil, dan hindari perubahan mendadak tanpa alasan jelas.",
      "5. Berikan apresiasi dalam bentuk nyata (hasil, proses, kontribusi)."
    ]
  },
  "D-C": {
    "title": "Type > D–C - Dominant–Compliance (The Analytical Controller)",
    "paragraphs": [
      "Orang dengan skor \"D–C\" tinggi merupakan individu tegas namun logis, cepat namun tetap memperhatikan akurasi. Biasanya sangat kuat dalam menganalisis data, membuat keputusan berbasis fakta, dan menerapkan sistem kerja efektif. Ia perfeksionis dalam standar kualitas dan tidak segan menantang asumsi yang tidak berdasar.",
      "Orang-orang dalam kategori ini termasuk Individu yang sangat kritis, berpikir sistematis, mampu menyelesaikan masalah kompleks, disiplin tinggi, serta efisien. Ia mampu memastikan hasil kerja berkualitas tinggi secara konsisten.",
      "Pada sisi lain, orang-orang pada kategori ini termasuk individu yang dapat terlihat terlalu kaku, perfeksionis, atau kurang peka terhadap aspek emosional. Terkadang terlalu fokus pada detail hingga lambat dalam delegasi."
    ],
    "treatmentHeader": "Perlakuan yang optimal untuk orang-orang dalam tipe ini adalah sebagai berikut:",
    "treatments": [
      "1. Berikan data lengkap, fakta, dan standar kerja jelas, dan berikan ruang menganalisis tanpa tekanan emosional.",
      "2. Hindari ambiguitas dalam instruksi atau perubahan, serta jangan paksa bekerja tanpa struktur.",
      "3. Tunjukkan apresiasi terhadap kualitas dan ketepatannya.",
      "4. Beri kesempatan mengelola proses/sistem.",
      "5. Gunakan komunikasi objektif dan profesional."
    ]
  },
  "I-S": {
    "title": "Type > I–S - Influence–Steadiness (The Warm Harmonizer)",
    "paragraphs": [
      "Orang dengan skor \"I–S\" tinggi merupakan individu yang ramah, peduli, dan senang membangun hubungan kerja yang harmonis. Ia komunikatif namun tidak agresif, menyenangkan namun tetap stabil. Fokus utamanya adalah menciptakan suasana nyaman dan mendukung dalam tim. Ia biasanya pendengar yang baik, setia, dan mudah bekerja sama.",
      "Orang-orang dalam kategori ini termasuk Individu yang cocok dalam kerja tim, menjaga stabilitas hubungan, sabar, suportif, dan konsisten. Ia mahir menciptakan iklim positif tanpa perlu menjadi pusat perhatian.",
      "Pada sisi lain, orang-orang pada kategori ini termasuk individu yang cenderung menghindari konflik, lambat mengambil keputusan, dan dapat kesulitan menetapkan batasan. Kadang terlalu mengutamakan keharmonisan sehingga mengabaikan target."
    ],
    "treatmentHeader": "Perlakuan yang optimal untuk orang-orang dalam tipe ini adalah sebagai berikut:",
    "treatments": [
      "1. Berikan suasana kerja yang suportif dan tidak agresif, dan berikan waktu untuk memproses perubahan.",
      "2. Gunakan komunikasi ramah namun jelas.",
      "3. Libatkan dalam kerja sama tim dan pelayanan, dan berikan dukungan emosional saat tekanan meningkat.",
      "4. Ajarkan keterampilan asertif.",
      "5. Berikan apresiasi atas konsistensi dan loyalitasnya."
    ]
  },
  "I-C": {
    "title": "Type > I–C - Influence–Compliance (The Structured Communicator)",
    "paragraphs": [
      "Orang dengan skor \"I–C\" tinggi merupakan individu yang memiliki kemampuan sosial yang kuat tetapi tetap memperhatikan detail. Ia menyukai komunikasi, ide baru, dan estetika, namun tetap mengutamakan akurasi. Biasanya terampil dalam pekerjaan kreatif, analitis ringan, atau peran yang membutuhkan kolaborasi dengan standar kualitas tertentu.",
      "Orang-orang dalam kategori ini termasuk individu yang kreatif, komunikatif, teliti dalam hal yang menarik minatnya, mampu menjembatani komunikasi antar pihak, dan menghasilkan ide berkualitas.",
      "Pada sisi lain, orang-orang pada kategori ini termasuk individu yang bisa ragu mengambil keputusan, takut membuat kesalahan, serta mudah terpengaruh reaksi orang lain. Kadang terlalu banyak memikirkan opini dan detail sekaligus."
    ],
    "treatmentHeader": "Perlakuan yang optimal untuk orang-orang dalam tipe ini adalah sebagai berikut:",
    "treatments": [
      "1. Berikan ruang untuk kreativitas dengan pedoman jelas.",
      "2. Gunakan komunikasi yang ramah dan detail.",
      "3. Hindari tekanan berlebihan atau kritik keras.",
      "4. Ajarkan prioritas dan pengambilan keputusan cepat, dan berikan tujuan yang terukur namun fleksibel",
      "5. Tunjukkan penghargaan atas kualitas dan estetika."
    ]
  },
  "S-C": {
    "title": "Type > S–C - Steadiness–Compliance (The Reliable Analyst)",
    "paragraphs": [
      "Orang dengan skor tipe \"S-C\" tinggi memiliki kepribadian yang tenang, stabil, dan penuh tanggung jawab. Mereka dikenal sebagai pribadi yang sabar, konsisten, dan dapat diandalkan dalam berbagai situasi. Dalam pekerjaan maupun kehidupan sehari-hari, mereka cenderung berhati-hati dan selalu memastikan segala sesuatu berjalan sesuai aturan. Ketelitian menjadi ciri khas mereka — setiap detail diperhatikan, setiap langkah dipertimbangkan, dan setiap hasil kerja diusahakan agar sempurna. Bagi mereka, kualitas bukan sekadar target, melainkan bentuk tanggung jawab moral terhadap pekerjaan yang dilakukan.",
      "Orang dengan skor “S-C” tinggi digambarkan sebagai seseorang yang mempunyai kekuatan dalam hal kesetiaan dan keandalan. Mereka jarang tergesa-gesa, tidak mudah berubah sikap, dan mampu menjaga kestabilan suasana di sekitarnya. Dalam tim, mereka sering menjadi sosok yang menenangkan ketika situasi sedang tegang. Sifatnya yang penuh pertimbangan membuat mereka dipercaya untuk menangani pekerjaan yang memerlukan ketelitian, keakuratan, dan konsistensi. Mereka juga sangat menghargai hubungan yang harmonis, sehingga selalu berusaha menghindari konflik dan menyelesaikan masalah dengan cara yang halus dan diplomatis.",
      "Pada sisi lain, mereka termasuk seseorang yang sering kali terjebak dalam kehati-hatian yang berlebihan. Keinginan mereka untuk memastikan segalanya sempurna dapat membuat proses pengambilan keputusan menjadi lambat. Mereka cenderung khawatir melakukan kesalahan dan sulit beradaptasi ketika dihadapkan pada perubahan mendadak. Perfeksionisme yang tinggi kadang membuat mereka terlalu keras pada diri sendiri, bahkan untuk hal-hal kecil yang sebenarnya bisa ditoleransi. Selain itu, karena tidak menyukai konfrontasi, mereka bisa menyimpan ketidaksetujuan dalam diam, yang pada akhirnya menumpuk menjadi beban emosional."
    ],
    "treatmentHeader": "Perlakuan yang optimal untuk orang-orang dalam tipe ini adalah sebagai berikut:",
    "treatments": [
      "1. Berikan penjelasan dan instruksi yang jelas serta waktu yang cukup untuk memahami perubahan.",
      "2. Gunakan komunikasi yang tenang, sopan, dan rasional. Hindari tekanan berlebihan atau nada konfrontatif.",
      "3. Ciptakan lingkungan kerja yang stabil dan terstruktur, dengan aturan dan ekspektasi yang konsisten.",
      "4. Dorong untuk lebih berani mengambil keputusan, meski belum semua hal terasa sempurna."
    ]
  }
};


/** Kunci pemetaan jawaban DISC -> huruf (identik dengan sheet "Input" template). */
export const DISC_MOST_KEY: Record<number, string[]> = {"1": ["S", "I", "*", "C"], "2": ["C", "D", "*", "S"], "3": ["I", "*", "*", "D"], "4": ["C", "S", "*", "D"], "5": ["I", "D", "S", "*"], "6": ["C", "D", "I", "S"], "7": ["S", "I", "*", "*"], "8": ["I", "S", "C", "D"], "9": ["D", "C", "*", "*"], "10": ["*", "D", "S", "I"], "11": ["S", "*", "D", "C"], "12": ["*", "C", "I", "D"], "13": ["D", "S", "I", "*"], "14": ["C", "I", "S", "D"], "15": ["S", "C", "I", "D"], "16": ["*", "C", "I", "S"], "17": ["*", "D", "S", "I"], "18": ["D", "*", "*", "C"], "19": ["D", "S", "I", "*"], "20": ["D", "S", "I", "C"], "21": ["S", "D", "I", "*"], "22": ["S", "*", "D", "C"], "23": ["*", "I", "S", "*"], "24": ["*", "I", "D", "C"]};

export const DISC_LEAST_KEY: Record<number, string[]> = {"1": ["S", "I", "D", "C"], "2": ["*", "D", "I", "S"], "3": ["I", "C", "S", "*"], "4": ["C", "S", "I", "D"], "5": ["*", "D", "S", "C"], "6": ["*", "D", "I", "S"], "7": ["*", "I", "C", "D"], "8": ["I", "S", "C", "D"], "9": ["D", "C", "I", "S"], "10": ["C", "D", "S", "*"], "11": ["*", "I", "D", "C"], "12": ["S", "*", "I", "D"], "13": ["D", "*", "*", "C"], "14": ["C", "I", "*", "D"], "15": ["S", "*", "I", "D"], "16": ["D", "*", "I", "S"], "17": ["C", "D", "S", "*"], "18": ["D", "I", "S", "*"], "19": ["D", "*", "I", "C"], "20": ["*", "S", "I", "*"], "21": ["S", "D", "I", "C"], "22": ["S", "I", "D", "C"], "23": ["D", "*", "S", "C"], "24": ["S", "I", "*", "*"]};

export function getDiscDescription(letters: string | null | undefined) {
  if (!letters) return null;
  return DISC_DESCRIPTIONS[letters.trim().toUpperCase()] ?? null;
}
