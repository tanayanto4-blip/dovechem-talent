/**
 * Deskripsi 16 tipe MBTI (judul, 5 poin ciri, dan ringkasan) sesuai lembar
 * penjelasan resmi. Dipakai untuk mengisi kolom keterangan pada Profiling.
 */
export interface MbtiDescription {
  title: string;
  bullets: string[];
  summary: string;
}

export const MBTI_DESCRIPTIONS: Record<string, MbtiDescription> = {
  "ENTP": {
    "title": "ENTP  (Innovative – Creative) (The Debater / The Visionary)",
    "bullets": [
      "Gesit, kreatif, inovatif, cerdik, logis, baik dalam banyak hal.",
      "Banyak bicara dan punya kemampuan debat yang baik, bisa berargumentasi untuk senang-senang saja tanpa merasa bersalah.",
      "Fleksibel. Punya banyak cara untuk memecahkan masalah dan tantangan.",
      "Cenderung untuk melakukan hal baru yang menarik hati setelah melakukan sesuatu yang lain dan punya keinginan kuat untuk mengembangkan diri.",
      "Kurang konsisten."
    ],
    "summary": "ENTP adalah perancang. Mereka suka merencanakan masa depan dan kemungkinan yang menyertainya. Intuisi dan kemampuan berpikirnya membuat dia bisa melihat berbagai potensi dan memilih yang terbaik dari semuanya. Kecakapan mengatur dan memutuskan ini mungkin yang terbaik dari semua tipe kepribadian."
  },
  "ISFP": {
    "title": "ISFP (Artistic) (The Adventurer / The Composer)",
    "bullets": [
      "Menunjukkan perhatian lebih banyak melalui tindakan dibandingkan kata-kata.",
      "Berpikiran simpel dan praktis, fleksibel, sensitif, ramah, tidak menonjolkan diri, rendah hati pada kemampuannya.",
      "Menghindari konflik, tidak memaksakan pendapat atau nilai-nilainya pada orang lain.",
      "Seringkali santai menyelesaikan sesuatu, karena sangat menikmati apa yang terjadi saat ini.",
      "Biasanya tidak mau memimpin tetapi menjadi pengikut dan pelaksana yang setia."
    ],
    "summary": "ISFP dikenal memiliki empati, kasih sayang, dan kelembutan terhadap orang lain. Selain itu, ISFP mempunyai ketelitian dan minat yang besar terhadap keindahan dan detail. kepribadian ISFP adalah orang yang hangat dan pemberi. Mereka keliatan cuek dan tidak peduli, tapi kalau sudah akrab justru akan jadi sebaliknya."
  },
  "ESTJ": {
    "title": "ESTJ (Conservative – Discipline) (The Executive / The Supervisor)",
    "bullets": [
      "Konservatif dan cenderung kaku.",
      "Sangat sistematis, procedural dan terencana, disiplin, on time , pekerja keras.",
      "Praktis, realistis, berpegang pada fakta, dengan dorongan alamiah.",
      "Tidak tertarik pada subject yang tidak berguna baginya, tapi dapat menyesuaikan diri jika diperlukan.",
      "Senang mengorganisir sesuatu. Bisa menjadi administrator yang baik jika mereka ingat untuk memperhatikan perasaan dan perspektif orang lain."
    ],
    "summary": "ESTJ dikenal pekerja keras,  cepat,  memegang teguh prinsip-prinsip serta bisa jadi pemimpin yang baik. ESTJ menyikapi sesuatu dengan obyektif dan logis, sekaligus mencegah perasaan dan emosinya mengganggu pengambilan keputusan."
  },
  "ESTP": {
    "title": "ESTP (Spontaneous) (The Doer / The Promoter)",
    "bullets": [
      "Spontan, Aktif, Enerjik, Cekatan, Cepat, Sigap, Antusias, Fun dan penuh variasi.",
      "Komunikator, asertif, to the point, ceplas-ceplos, berkarisma, punya interpersonal skill yang baik.",
      "Baik dalam pemecahan masalah langsung di tempat. Mampu menghadapi masalah, konflik dan kritik. Tidak khawatir, menikmati apapun yang terjadi.",
      "Cenderung untuk menyukai sesuatu yang mekanistis, kegiatan bersama dan olahraga.",
      "Mudah beradaptasi, toleran, pada umumnya konservatif tentang nilai-nilai. Tidak suka penjelasan terlalu panjang. Paling baik dalam hal-hal nyata yang dapat dilakukan."
    ],
    "summary": "ESTP dikenal dengan sikapnya yang bebas layaknya petualang. ESTP adalah orang yang logis, tapi juga punya pesona yang menyenangkan dan menantang. Mereka sensitif terhadap situasi sekitar, dan menggunakan sensitifitasnya untuk membuat keputusan-keputusan yang masuk akal."
  },
  "ISTP": {
    "title": "ISTP (Pragmatic) (The Virtuoso / The Crafter)",
    "bullets": [
      "Tenang, pendiam, cenderung kaku, dingin, hati-hati, penuh pertimbangan.",
      "Logis, rasional, kritis, obyektif, mampu mengesampingkan perasaan dan mampu menghadapi perubahan mendadak dengan cepat dan tenang.",
      "Percaya diri, tegas dan mampu menghadapi perbedaan maupun kritik.",
      "Mampu menganalisa, mengorganisir dan  mendelegasikan.",
      "Problem solver yang baik terutama untuk masalah teknis dan  keadaan mendadak."
    ],
    "summary": "ISTP adalah orang-orang yang pintar dan berani. Mereka dikenal pendiam dan nggak kenal takut, namun cerdas dalam menghadapi krisis. Mereka memiliki pemikiran khas introvert yang mampu berpikir secara dalam, dan mengambil keputusan secara obyektif."
  },
  "ISTJ": {
    "title": "ISTJ (Responsible) (The Inspector / The Duty Fulfiller)",
    "bullets": [
      "Serius, tenang, stabil & damai.",
      "Senang pada fakta, logis, obyektif, praktis & realistis.",
      "Task oriented, tekun, teratur, menepati janji, dapat diandalkan & bertanggung jawab.",
      "Pendengar yang baik, setia, hanya mau berbagi dengan orang dekat.",
      "Memegang aturan, standar & prosedur dengan teguh."
    ],
    "summary": "ISTJ dikenal pendiam, namun teliti terhadap detil. Mereka selalu teguh memegang kata-katanya dan bertanggung jawab terhadap ucapan. ISTJ mengingat banyak hal, terutama karena kemampuan Sensing mereka, membuat mereka melihat banyak hal dan mengingat semuanya."
  },
  "ENFP": {
    "title": "ENFP (Optimistic) (The Campaigner / The Inspirer)",
    "bullets": [
      "Ramah, hangat, enerjik, optimis, antusias, semangat tinggi, fun.",
      "Pandai berkomunikasi, senang bersosialisasi dan membawa suasana positif.",
      "Imaginatif, penuh ide, kreatif, inovatif.",
      "Mampu beradaptasi dengan beragam situasi dan perubahan.",
      "Mudah membaca perasaan dan kebutuhan orang lain."
    ],
    "summary": "ENFP dikenal penuh semangat, idealisme dan rasa ingin tahu yang besar terhadap dunia dan manusia di dalamnya. ENFP bisa menguasai banyak hal. Tapi, ENFP gampang bosen, dan kurang pandai dalam menangani masalah yang kompleks. Namun, ENFP tipe yang membawa warna, ide, dan energi ke dalam tim."
  },
  "ENTJ": {
    "title": "ENTJ (Natural Leader) (The Commander / The Field Marshall)",
    "bullets": [
      "Tangguh, disiplin, dan sangat menghargai komitmen.",
      "Tegas, asertif, to the point, jujur terus terang, obyektif, kritis, & punya standard tinggi.",
      "Dominan, kuat kemauannya, perfeksionis dan kompetitif.",
      "Berkarisma, komunikasi baik, mampu menggerakkan orang dan berbakat pemimpin.",
      "Cenderung menutupi perasaan dan menyembunyikan kelemahan."
    ],
    "summary": "ENTJ dikenal memiliki kecerdasan intelektual dan kemampuan memenuhi target dengan tepat dan cepat. ENTJ cakap sebagai pemimpin dan penggerak organisasi. ENTJ senang memegang kendali. Jadi, bila bekerja, sebaiknya ENTJ memilih pekerjaan yang mengharuskan dia jadi penanggung jawab."
  },
  "ISFJ": {
    "title": "ISFJ (Loyal) (The Defender / The Protector)",
    "bullets": [
      "Penuh pertimbangan, hati-hati, teliti dan akurat.",
      "Serius, tenang, stabil namun sensitif.",
      "Ramah, perhatian pada perasaan & kebutuhan orang lain, setia, kooperatif, pendengar yang baik.",
      "Punya kemampuan mengorganisasi, detail, teliti, sangat bertanggungjawab & bisa diandalkan."
    ],
    "summary": "ISFJ dikenal rendah hati dan memahami orang lain. Mereka adalah orang-orang yang hangat, penuh kasih sayang, dan berintegritas. ISFJ tidak suka menjadi pusat perhatian, dan memilih menolong orang tanpa diketahui. Mereka juga lemah terhadap kritik, sehingga mudah down apabila mengalami hal buruk."
  },
  "INFJ": {
    "title": "INFJ (Reflective) (The Advocate / The Counselor)",
    "bullets": [
      "Perhatian, empati, sensitif & berkomitmen terhadap sebuah hubungan.",
      "Sukses karena ketekunan, originalitas dan keinginan kuat untuk melakukan apa saja yang diperlukan termasuk memberikan yg terbaik dalam pekerjaan.",
      "Idealis, perfeksionis, memegang teguh prinsip.",
      "Visioner, penuh ide, kreatif, suka merenung dan inspiring.",
      "Biasanya diikuti dan dihormati karena kejelasan visi serta dedikasi pada hal-hal baik."
    ],
    "summary": "INFJ adalah kombinasi gabungan dari kecakapan otak namun mampu memahami orang lain. Karena cerdas sekaligus perasa, INFJ bertekad menggunakan kecerdasannya untuk kebaikan umat manusia. Kelemahan INFJ adalah punya kecenderungan menahan diri,setengah-setengah dan kadang tidak fokus sama satu hal. INFJ suka belajar, namun cepet puas."
  },
  "INTJ": {
    "title": "INTJ (Independent) (The Architect / The Mastermind)",
    "bullets": [
      "Visioner, punya perencanaan praktis, & biasanya memiliki ide-ide original serta dorongan kuat untuk mencapainya.",
      "Punya kemampuan analisa yang bagus serta menyederhanakan sesuatu yang rumit dan abstrak menjadi sesuatu yang praktis, mudah difahami & dipraktekkan.",
      "Mandiri, percaya diri, skeptis, kritis, logis, menentukan (determinatif) dan kadang keras kepala.",
      "Punya keinginan untuk berkembang serta selalu ingin lebih maju dari orang lain.",
      "Kritik & konflik tidak menjadi masalah berarti."
    ],
    "summary": "INTJ adalah seorang intelektual sejati, si jenius berpikiran cepat. Mereka mencintai logika dan detail, membuat INTJ selalu haus pengetahuan. Mereka punya intuisi yang khas, mampu melihat pola-pola tersembunyi dan menerka maknanya. Namun seorang INTJ tidak menyukai pekerjaan yang rutin dan dikerjakan bersama. Mereka menyukai pekerjaan yang rumit dan bekerja sendiri."
  },
  "INFP": {
    "title": "INFP (Idealist) (The Mediator)",
    "bullets": [
      "Sangat perhatian dan peka dengan perasaan orang lain.",
      "Cenderung idealis dan perfeksionis.",
      "Peduli pada banyak hal, dan cenderung mengambil terlalu banyak dan menyelesaikan sebagian.",
      "Penuh dengan antusiasme dan kesetiaan, tapi biasanya hanya untuk orang dekat.",
      "Berpikir win-win solution, mempercayai dan mengoptimalkan orang lain."
    ],
    "summary": "INFP adalah kepribadian yang suka berpikir dan idealis. Mereka cepat belajar, berbicara dengan pelan, dan murah hati. Kepribadian INFP memiliki empati yang besar terhadap orang lain. Aspek Introvert dan Intuition membuat kepribadian INFP berpikiran terbuka dan kreatif. Namun INFP merupakan orang yang sulit percaya kepada orang lain."
  },
  "INTP": {
    "title": "INTP (Conceptual) (The Thinker)",
    "bullets": [
      "Sangat menghargai intelektualitas dan pengetahuan. Menikmati hal-hal teoritis dan ilmiah. Senang memecahkan masalah dengan logika dan analisa.",
      "Diam dan menahan diri. Lebih suka bekerja sendiri.",
      "Cenderung kritis, skeptis, mudah curiga dan pesimis.",
      "Tidak suka memimpin dan bisa menjadi pengikut yang tidak banyak menuntut.",
      "Cenderung memiliki minat yang jelas. Membutuhkan karir dimana minatnya bisa berkembang dan bermanfaat. Jika menemukan sesuatu yang menarik minatnya, ia akan sangat serius dan antusias menekuninya."
    ],
    "summary": "INTP dikenal memiliki rasa ingin tahu yang kuat. INTP adalah orang yang cerdas namun pikirannya selalu terbuka oleh berbagai masukan dari luar. INTP mempunyai bakat menganalisa teori-teori dan membuktikan kebenaran teori tersebut. Tentu dibutuhkan kemampuan lebih dalam hal ini, dan INTP memilikinya. Kecakapan memahami hal-hal rumit dalam sekejap membuat INTP cepat belajar. Namun INTP bukan komunikator yang baik. Apa yang di pikiran sama yang diucapkan kadang nggak sesuai. Bukan berarti mereka nggak jujur, mereka cuma sulit menemukan kata-kata yang pas."
  },
  "ESFP": {
    "title": "ESFP (Generous) (The Entertainer / The Performer)",
    "bullets": [
      "Outgoing, easygoing, mudah berteman, bersahabat, sangat sosial, ramah, hangat, & menyenangkan.",
      "Optimis, ceria, antusias, fun, menghibur, suka menjadi perhatian.",
      "Punya interpersonal skill yang baik, murah hati, mudah simpatik dan mengenali perasaan orang lain. Menghindari konflik dan menjaga keharmonisan suatu hubungan.",
      "Mengetahui apa yang terjadi di sekelilingnya dan ikut serta dalam kegiatan tersebut.",
      "Sangat baik dalam keadaan yang membutuhkan common sense, tindakan cepat dan ketrampilan praktis."
    ],
    "summary": "ESFP dikenal karena selalu positif, antusias, dan bisa menyatukan banyak orang. Mereka membawa kebahagiaan ke dalam situasi apapun, biasanya dengan humor. Namun ESFP tidak suka banyak teori dan tidak suka mikir yang sulit-sulit. Bukan berarti tidak bisa, mereka hanya tidak suka saja. ESFP juga tidak pandai menangani konflik. Mereka cenderung sakit hati jika dikritik, dan menganggap kritikan sebagai upaya menjatuhkan. Jika perlu, saat dikritik, mereka akan membalas. Ini kadang-kadang disesali oleh mereka."
  },
  "ESFJ": {
    "title": "ESFJ (Harmonious) (The Consul / The Provider/The Caregiver)",
    "bullets": [
      "Hangat, banyak bicara, populer, dilahirkan untuk bekerjasama, suportif dan anggota kelompok yang aktif.",
      "Membutuhkan keseimbangan dan baik dalam menciptakan harmoni.",
      "Selalu melakukan sesuatu yang manis bagi orang lain. Kerja dengan baik dalam situasi yang mendukung dan memujinya.",
      "Santai, easy going, sederhana, tidak berfikir panjang.",
      "Teliti dan rajin merawat apa yang ia miliki."
    ],
    "summary": "ESFJ punya dua senjata utama untuk menentukan karir. Yang pertama adalah mereka terorganisir, yang kedua adalah mereka mendapatkan kepuasan dari menolong orang lain. Makanya, jika mereka mengerjakan tugas yang berhubungan dengan membuat sesuatu dan mengelolanya, mereka suka. Namun ESFJ ingin karyanya diapresiasi. Keinginan ini terkadang berlebihan. Jika mereka merasa kurang mendapat pujian, mungkin mereka akan sedikit pamer, agar orang lain memuji mereka."
  },
  "ENFJ": {
    "title": "ENFJ (Convincing) (The Giver / The Teacher)",
    "bullets": [
      "Kreatif, imajinatif, peka, sensitive, loyal.",
      "Pada umumnya peduli pada apa kata orang atau apa yang orang lain inginkan dan cenderung melakukan sesuatu dengan memperhatikan perasaan orang lain.",
      "Pandai bergaul, meyakinkan, ramah, fun, populer, simpatik. Responsif pada kritik dan pujian.",
      "Menyukai variasi dan tantangan baru.",
      "Butuh apresiasi dan penerimaan."
    ],
    "summary": "ENFJ dikenal karena kemampuan mereka menginspirasi orang lain dan membawa aura positif ke lingkungan. Mereka punya intuisi tajam soal kondisi manusia, dan menggunakannya untuk menggali kelebihan orang lain. ENFJ percaya dengan kekuatan kata-kata. Bagi mereka, kata-kata sama kuatnya dengan tindakan. Salah satu kepribadian dari ENFJ adalah ingin dipuji. Mereka ingin kinerjanya mereka mendapat apresiasi."
  }
};

export function getMbtiDescription(type?: string | null): MbtiDescription | null {
  const key = (type ?? "").trim().toUpperCase();
  return MBTI_DESCRIPTIONS[key] ?? null;
}
