/* ═══════════════════════════════════════════
   BALLOON LAND — Paketi, poređenje, dodaci i FAQ (CMS core)
   Ovaj fajl će u budućnosti generisati CMS.
   Isti podaci pune stranicu Paketi I sekciju na početnoj.
   ═══════════════════════════════════════════ */

// Paketi — redoslijed = redoslijed prikaza; "istaknut" dobija zlatni okvir i bedž
window.PAKETI = [
  {
    id: "mini",
    ime: "Mini",
    tag: "Za intimne proslave",
    cijena: 149,
    istaknut: false,
    stavke: [
      { t: "Balonski stub ili mini luk" },
      { t: "Brojka / natpis od balona" },
      { t: "Konfeti baloni" },
      { t: "Dostava i montaža" },
      { t: "Fotokutak", off: true },
      { t: "Svjetlosni efekti", off: true },
    ],
  },
  {
    id: "veliki",
    ime: "Veliki",
    tag: "Za nezaboravne momente",
    cijena: 399,
    istaknut: true,
    bedz: "★ Najpopularniji",
    stavke: [
      { t: "Veliki balonski luk ili zid" },
      { t: "Fotokutak sa pozadinom" },
      { t: "Personalizovani natpisi" },
      { t: "Konfeti top + prskalice" },
      { t: "Dekoracija stolova" },
      { t: "Dostava, montaža i demontaža" },
    ],
  },
  {
    id: "lux",
    ime: "Lux",
    tag: "Full spektakl produkcija",
    cijena: 899,
    istaknut: false,
    stavke: [
      { t: "Kompletna scenografija prostora" },
      { t: "Hladne prskalice + teški dim" },
      { t: "Svjetleća slova i LED dekor" },
      { t: "Cvjetni / balonski zidovi" },
      { t: "Koordinator na događaju" },
      { t: "Sve iz paketa Veliki BUM" },
    ],
  },
];

// Tabela poređenja — vrijednost: true = ✦, false = —, tekst = ispis
window.PAKETI_POREDJENJE = [
  { stavka: "Balonska instalacija", mini: "Stub / mini luk", veliki: "Veliki luk ili zid", lux: "Kompletna scenografija" },
  { stavka: "Brojka / natpis od balona", mini: true, veliki: true, lux: true },
  { stavka: "Konfeti baloni", mini: true, veliki: true, lux: true },
  { stavka: "Fotokutak sa pozadinom", mini: false, veliki: true, lux: true },
  { stavka: "Personalizovani natpisi", mini: false, veliki: true, lux: true },
  { stavka: "Konfeti top + prskalice", mini: false, veliki: true, lux: true },
  { stavka: "Dekoracija stolova", mini: false, veliki: true, lux: true },
  { stavka: "Hladne prskalice + teški dim", mini: false, veliki: false, lux: true },
  { stavka: "Svjetleća slova i LED dekor", mini: false, veliki: false, lux: true },
  { stavka: "Cvjetni / balonski zidovi", mini: false, veliki: false, lux: true },
  { stavka: "Koordinator na događaju", mini: false, veliki: false, lux: true },
  { stavka: "Dostava i montaža", mini: true, veliki: true, lux: true },
  { stavka: "Demontaža nakon događaja", mini: false, veliki: true, lux: true },
];

// Dodaci (à la carte)
window.PAKETI_DODACI = [
  { ikona: "🎇", naziv: "Hladne prskalice", opis: "Par fontana za prvi ples ili rezanje torte.", cijena: "od 80 KM" },
  { ikona: "🌫️", naziv: "Teški dim", opis: "Ples u oblacima — filmski efekat niskog dima.", cijena: "od 120 KM" },
  { ikona: "🎊", naziv: "Konfeti top", opis: "Zlatna kiša konfeta u ključnom trenutku.", cijena: "od 40 KM" },
  { ikona: "💡", naziv: "Svjetleća slova", opis: "LOVE, BUM, inicijali ili brojka — LED sjaj.", cijena: "od 60 KM" },
  { ikona: "🎈", naziv: "Balon brojka", opis: "Velika brojka od balona po izboru boja.", cijena: "od 30 KM" },
  { ikona: "📸", naziv: "Fotokutak", opis: "Pozadina, rekviziti i savršeno svjetlo.", cijena: "od 150 KM" },
];

// Često postavljana pitanja
window.PAKETI_FAQ = [
  {
    pitanje: "Koliko ranije treba rezervisati termin?",
    odgovor: "Za vjenčanja i veće događaje preporučujemo 4–8 sedmica ranije, posebno u sezoni (maj–septembar). Za manje proslave često možemo uskočiti i za 5–7 dana — pišite nam, uvijek nađemo rješenje.",
  },
  {
    pitanje: "Da li su cijene fiksne?",
    odgovor: "Cijene paketa su početne (\"od\") i zavise od veličine prostora, količine balona i udaljenosti. Nakon kratke konsultacije dobijate tačnu, fiksnu ponudu — bez skrivenih troškova.",
  },
  {
    pitanje: "Jesu li hladne prskalice i teški dim sigurni u zatvorenom prostoru?",
    odgovor: "Da. Hladne prskalice ne stvaraju toplotu koja pali materijale, a teški dim se zadržava pri podu i ne aktivira požarne alarme. Koristimo certificiranu opremu i naš tim upravlja efektima tokom cijelog događaja.",
  },
  {
    pitanje: "Dolazite li i van grada?",
    odgovor: "Naravno! Radimo na području cijele BiH. Za lokacije van grada obračunavamo samo troškove puta, koji su jasno navedeni u ponudi.",
  },
  {
    pitanje: "Šta ako se dekoracija ošteti prije početka proslave?",
    odgovor: "Montažu završavamo prije dolaska gostiju i sve provjeravamo na licu mjesta. U paketima Veliki i Lux BUM naš tim ostaje dostupan i tokom događaja — ako balon pukne, mi ga mijenjamo.",
  },
  {
    pitanje: "Kako izgleda proces plaćanja?",
    odgovor: "Rezervacija termina se potvrđuje avansom od 30%, a ostatak plaćate nakon montaže, kada vidite i odobrite dekoraciju. Moguće je plaćanje gotovinom ili na račun.",
  },
];
