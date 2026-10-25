/**
 * Greek sample content for the LOCAL database only, so /el can be checked
 * end to end while Anastasia's reviewed Greek is still on its way: page
 * sections and titles (the videos page among them), menus, site settings, the
 * memoir, image alt text, the one reader review with given Greek, and the
 * story categories and sample video (both from local-fixtures.sql, applied
 * only when those rows exist).
 *
 *   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f scripts/content/local-fixtures.sql
 *   DB_URL=postgresql://postgres:postgres@127.0.0.1:55422/postgres bun scripts/content/greek-fixtures.ts
 *
 * Rows are written as approved with origin "fixture", which the database
 * allows only because they are marked as fixtures. The script talks to the
 * local Supabase database and nothing else; it never runs against production.
 * The text follows the Greek mocks in docs/design/mocks (el.html, el-about.html)
 * and is a draft for review, not approved copy.
 */
import { $ } from "bun";
import { MEDIA } from "./media";

const LOCAL_DB = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (!/^postgresql:\/\/postgres:postgres@127\.0\.0\.1:\d+\/postgres$/.test(LOCAL_DB)) {
  throw new Error("Greek fixtures only write to the local database.");
}

type Fields = Record<string, string>;
/**
 * Section Greek: plain keys, arrays matched to the section's items by
 * position, or objects matched to them by href (a link list, whose own links
 * the owner may have added to).
 */
type SectionGreek = Record<string, string | Fields[] | Record<string, Fields>>;

const HOME: SectionGreek[] = [
  {
    title: "Μετατρέπω τον πόνο σε σκοπό.",
    accent: "σκοπό.",
    body: "Είμαι η Αναστασία. Βοηθώ γυναίκες να μετατρέψουν τις πληγές τους σε ιστορίες, τις ιστορίες σε δεξιότητες και τις δεξιότητες σε μια ζωή που αγαπούν.",
    caption: "Κόρη της Γκάνας, γυναίκα της Κύπρου, μητέρα από θαύμα και αφηγήτρια από κλήση.",
    "primary.label": "Διάβασε την ιστορία μου",
  },
  { title: "Άκουσε, με τη δική μου φωνή." },
  {
    quote:
      "Το διάβασα μονορούφι και έκλαψα — από εκείνα τα καλά δάκρυα. Ήταν σαν ένα μακρύ γράμμα από μια σοφή μεγαλύτερη αδελφή.",
    quoteBy: "Άμα, Άκρα",
  },
  {
    quote: "Ό,τι κι αν αντιμετωπίζεις, ο λόγος σου να χαμογελάς υπάρχει ακόμη.",
    source: "Βρες τον λόγο σου να χαμογελάς",
  },
  { title: "Στη σκηνή, στην κάμερα." },
  {
    title: "Όπου κανείς δεν μένει πίσω.",
    lead: "Στηρίζουμε ανθρώπους, οικογένειες και ευάλωτες ζωές που αντιμετωπίζουν δυσκολίες — με τρόφιμα, συμπονετική φροντίδα, κοινοτική στήριξη και φροντίδα για ζώα υπό διάσωση.",
    body: "<p>Κάθε περίπτωση είναι άνθρωπος — όχι αριθμός. Ιστορίες με φροντίδα και άδεια.</p>",
    caption: "Ταΐζοντας ελπίδα, μία καρδιά τη φορά.",
    "primary.label": "Κάνε δωρεά",
    "link.label": "Προσφέρσου εθελοντικά",
    "secondary.label": "Ιστορίες επίδρασης",
  },
  { title: "Ιστορίες από το ειλικρινές ενδιάμεσο.", "link.label": "Όλες οι ιστορίες" },
];

const ABOUT: SectionGreek[] = [
  {
    title: "Μια ζωή ξαναγραμμένη στα περιθώρια.",
    body: "Το όνομά μου είναι Αναστασία Patience. Είμαι κόρη της Γκάνας, γυναίκα της Κύπρου, μητέρα από θαύμα και αφηγήτρια από κλήση. Αυτή είναι η μεγάλη ιστορία.",
    facts: [
      { label: "Με έδρα", value: "Κύπρο" },
      { label: "Ήπειροι που με μεγάλωσαν", value: "Αφρική & Ευρώπη" },
      { label: "Ιδρύτρια του", value: "Patience Media House" },
    ],
  },
  {
    title: "Κάθε πληγή είναι μάθημα.",
    body: [
      "Η ιστορία μου είναι ραμμένη από πένθος, πίστη και πεισματάρικη ελπίδα — και κάθε βιβλίο, masterclass και ιστορία που μοιράζομαι είναι ένα χέρι τεντωμένο πίσω σε σένα.",
      "Κάθε μητέρα είναι μύστης. Κάθε συνηθισμένη γυναίκα κουβαλά κάτι που ο κόσμος χρειάζεται απεγνωσμένα — συχνά ακριβώς αυτό που νομίζει ότι την αποκλείει.",
      "Γράφω για τη γυναίκα που ξαναχτίζει μετά την απώλεια, τη μητέρα που ψιθυρίζει προσευχές πάνω από ένα άρρωστο παιδί, την επιχειρηματία με ένα όνειρο που φοβάται να ονομάσει.",
    ]
      .map((text) => `<p>${text}</p>`)
      .join(""),
  },
  {
    title: "Κάθε εποχή μού δίδαξε κάτι.",
    "link.label": "Διάβασε το βιβλίο",
    items: [
      {
        label: "Η αρχή",
        title: "Οι γονείς μου",
        body: "Η μητέρα μου μού έμαθε να προσεύχομαι — και να μένω ήσυχη και σταθερή στις δύσκολες στιγμές. Ο πατέρας μου μού έμαθε να δουλεύω σκληρά με πειθαρχία: να είμαι ευγενική, ειλικρινής και με σεβασμό.",
      },
      {
        label: "Η διάβαση",
        title: "Δύο βαλίτσες",
        body: "Στα είκοσι τέσσερα μπήκα σε ένα αεροπλάνο με δύο βαλίτσες και μια υπόσχεση. Θα έχτιζα μια ζωή. Θα έστελνα χρήματα στο σπίτι. Θα γινόμουν κάποια.",
        caption: "Από τη Γκάνα στην Κύπρο — και παντού ανάμεσα.",
      },
      {
        label: "Η δουλειά",
        title: "Φροντίστρια",
        body: "Για χρόνια φρόντιζα ηλικιωμένους. Οι ιστορίες τους έγιναν δικές μου. Η μοναξιά τους μού έμαθε παρουσία. Το θάρρος τους μού έμαθε αντοχή.",
      },
      {
        label: "Η πρώτη απώλεια",
        title: "Ο αδελφός μου",
        body: "Όταν πέθανε ο μικρότερος αδελφός μου, κάτι μέσα μου έσπασε που δεν ήξερα ότι μπορούσε να σπάσει. Έμαθα ότι το πένθος έχει καιρό. Κάποιες μέρες βρέχει και βρέχει και δεν σταματά.",
      },
      {
        label: "Η αποσταθεροποίηση",
        title: "Χωρίς γονείς",
        body: "Η απώλεια της μητέρας μου, χρόνια αργότερα, με ξερίζωσε. Χωρίς γονείς σε ξένη χώρα, έπρεπε να βρω τον δρόμο μου — και να γίνω η δική μου πυξίδα.",
      },
      {
        label: "Η επιλογή",
        title: "Η εγκυμοσύνη",
        body: "Οι γιατροί είπαν να διακόψω. Υπήρχαν κίνδυνοι. Υπήρχαν λόγοι. Υπήρχαν χαρτιά να υπογράψω. Το όνομά του θα γινόταν το θαύμα μου — γιατί πίστευα ότι η ζωή του άξιζε να παλέψω γι’ αυτήν, ακόμα κι όταν ο κόσμος μου έλεγε το αντίθετο.",
        pullQuote: "Διάλεξα την πίστη. Διάλεξα εκείνον.",
      },
      {
        label: "Το θαύμα",
        title: "Ο γιος μου",
        body: "Ήρθε στον κόσμο μικρός, ήσυχος και τέλειος — κουβαλώντας ήδη μια δύναμη που έβλεπα μέσα του. Είναι ο λόγος που ξέρω ότι ο Θεός ακόμα γράφει ιστορίες με αδύνατα τέλη.",
      },
      {
        label: "Το σκοτεινό δωμάτιο",
        title: "Κατάθλιψη",
        body: "Η επιλόχεια κατάθλιψη ήρθε σαν ομίχλη χωρίς έξοδο. Έπαψα να χαμογελώ. Έπαψα να γράφω. Έπαψα να πιστεύω ότι ήμουν ακόμα εκεί μέσα. Αργά, απαλά, βρήκα τον δρόμο πίσω.",
      },
      {
        label: "Τώρα",
        title: "Συγγραφέας και ιδρύτρια",
        body: "Γράφω τα βιβλία που χρειαζόμουν. Διδάσκω τα μαθήματα που ευχόμουν να είχα. Το «Βρες τον λόγο σου να χαμογελάς» είναι η επιστολή μου σε κάθε γυναίκα που ένιωσε πολύ σπασμένη για να ξαναρχίσει.",
      },
    ],
  },
  {
    quote:
      "Να δώσω σε κάθε γυναίκα ένα φανάρι για τις σκοτεινές εποχές και έναν χάρτη να χτίσει μια ζωή που αγαπά όταν επιστρέψει το φως.",
    attribution: "Η αποστολή μου",
  },
  {
    title: "Πέντε αξίες, μία κλήση.",
    items: [
      { title: "Πίστη", body: "Η πίστη είναι ο μυς που γυμνάζω πρώτα, κάθε πρωί." },
      { title: "Ανθεκτικότητα", body: "Όχι η δυνατή. Η ήσυχη, αθόρυβη, συνεχίζω-να-πηγαίνω." },
      { title: "Σκοπός", body: "Διδάσκω ό,τι έχω ζήσει." },
      { title: "Ιστορία", body: "Οι ιστορίες θεραπεύουν ό,τι δεν φτάνουν τα στατιστικά." },
      { title: "Υπηρεσία", body: "Αν δεν βοηθά κάποιον να σηκωθεί, δεν το χτίζω." },
    ],
  },
  {
    title: "Ξεκίνα από το πρώτο κεφάλαιο.",
    "link.label": "Άκουσε το πρώτο κεφάλαιο",
    "secondary.label": "Πάρε το δωρεάν eBook",
  },
];

const PAGES: Record<string, { meta: Fields; sections: SectionGreek[] }> = {
  "/": {
    meta: {
      title: "Αρχική",
      seo_title: "Anastasia Patience: Βρες τον λόγο σου να χαμογελάς",
      seo_description:
        "Συγγραφέας, αφηγήτρια και ιδρύτρια του Patience Media House. Βιβλία, ένα ηχητικό βιβλίο με τη δική της φωνή και γράμματα για την πίστη, την απώλεια και μια ζωή που αγαπάς.",
    },
    sections: HOME,
  },
  "/about": {
    meta: {
      title: "Σχετικά",
      seo_title: "Σχετικά με την Anastasia Patience",
      seo_description:
        "Από τη Γκάνα στην Κύπρο, μέσα από την απώλεια, την πίστη και τη μητρότητα: πώς η Αναστασία έγινε συγγραφέας, αφηγήτρια και ιδρύτρια του Patience Media House.",
    },
    sections: ABOUT,
  },
  "/books": {
    meta: {
      title: "Βιβλία",
      seo_title: "Βιβλία της Anastasia Patience",
      seo_description:
        "Απομνημόνευμα, βιβλίο εργασίας και ήπια σοφία: βιβλία για τις εποχές που δεν μπορείς να προσπεράσεις, σε έντυπη μορφή, eBook και ήχο.",
    },
    sections: [
      {
        title: "Βιβλία που σε φέρνουν σπίτι.",
        intro:
          "Μισό απομνημόνευμα, μισό εγχειρίδιο, γραμμένα με τη φωνή μιας φίλης που έχει περπατήσει τον δρόμο.",
      },
      { title: "Τα ηχητικά βιβλία, με τη φωνή μου." },
      {
        title: "Διάβασέ το απόψε, δωρεάν.",
        body: "Άφησε το μικρό σου όνομα και το email σου, και το «Βρες τον λόγο σου να χαμογελάς» είναι δικό σου για λήψη αμέσως.",
        buttonLabel: "Στείλε μου το δωρεάν eBook",
      },
    ],
  },
  "/blog": {
    meta: {
      title: "Ιστορίες",
      seo_title: "Ιστορίες: Anastasia Patience",
      seo_description:
        "Ιστορίες για την πίστη, τον σκοπό, τις γυναίκες στις επιχειρήσεις, τις ψηφιακές δεξιότητες και μια ζωή που ξαναχτίζεται μετά την απώλεια.",
    },
    sections: [{ title: "Ιστορίες για τις γενναίες και για όσες ακόμη γίνονται." }],
  },
  "/contact": {
    meta: {
      title: "Επικοινωνία",
      seo_title: "Επικοινωνία με την Anastasia Patience",
      seo_description:
        "Προσκλήσεις για ομιλίες, ερωτήματα από τα μέσα, συνεργασίες ή ένα ζεστό γεια.",
    },
    sections: [
      {
        title: "Διαβάζω κάθε γράμμα.",
        body: "Είτε με προσκαλείς σε μια σκηνή, σε μια ιστορία ή σε μια συνεργασία, θα χαρώ πολύ να σε ακούσω. Απαντώ μέσα σε λίγες μέρες.",
      },
    ],
  },
  "/foundation": {
    meta: {
      title: "Ανθρωπιστικό Ίδρυμα Patience",
      seo_title: "Ανθρωπιστικό Ίδρυμα Patience",
      seo_description:
        "Όπου κανείς δεν μένει πίσω: τρόφιμα, συμπονετική φροντίδα, κοινοτική στήριξη και φροντίδα για ζώα υπό διάσωση.",
    },
    sections: [
      {
        title: "Όπου κανείς δεν μένει πίσω.",
        body: "Στηρίζουμε ανθρώπους, οικογένειες και ευάλωτες ζωές που αντιμετωπίζουν δυσκολίες — με τρόφιμα, συμπονετική φροντίδα, κοινοτική στήριξη και φροντίδα για ζώα υπό διάσωση.",
        "primary.label": "Κάνε δωρεά",
        "secondary.label": "Ιστορίες επίδρασης",
      },
      {
        title: "Τέσσερις τρόποι που φροντίζουμε.",
        items: [
          {
            title: "Επισιτιστική βοήθεια",
            body: "Τρόφιμα και ζεστά γεύματα για οικογένειες που στερούνται.",
          },
          {
            title: "Συμπονετική φροντίδα",
            body: "Επισκέψεις, συντροφιά και πρακτική βοήθεια για ηλικιωμένους, ασθενείς και ανθρώπους που είναι μόνοι.",
          },
          {
            title: "Κοινοτική στήριξη",
            body: "Στεκόμαστε δίπλα σε οικογένειες στις δύσκολες εποχές, ώστε κανείς να μην τις περνά μόνος.",
          },
          {
            title: "Ζώα υπό διάσωση",
            body: "Τροφή, καταφύγιο και κτηνιατρική φροντίδα για ζώα που έχουν εγκαταλειφθεί.",
          },
        ],
      },
      {
        title: "Μαζί, μπορούμε να κάνουμε τη διαφορά.",
        body: "Κάθε δωρεά γίνεται ένα γεύμα, μια επίσκεψη ή μια διάσωση. Δώσε μία φορά ή περπάτα μαζί μας κάθε μήνα.",
      },
      { title: "Πρόσωπα που κρατάμε κοντά μας." },
      {
        title: "Τι καθοδηγεί κάθε πράξη φροντίδας.",
        items: [
          { title: "Συμπόνια", body: "Συναντάμε τους ανθρώπους εκεί που βρίσκονται." },
          {
            title: "Αξιοπρέπεια",
            body: "Η βοήθεια δίνεται με σεβασμό, και οι ιστορίες μοιράζονται μόνο με άδεια.",
          },
          { title: "Προσφορά", body: "Είμαστε εκεί, αθόρυβα και σταθερά." },
          { title: "Ελπίδα", body: "Κάθε γεύμα και κάθε επίσκεψη λέει: δεν σε ξεχάσαμε." },
          { title: "Κοινότητα", body: "Τίποτα από αυτά δεν γίνεται μόνο του." },
        ],
      },
    ],
  },
  "/gallery": {
    meta: {
      title: "Γκαλερί",
      seo_title: "Γκαλερί: Anastasia Patience",
      seo_description: "Φωτογραφίες από τη ζωή και το έργο της Αναστασίας.",
    },
    sections: [{ title: "Μια ζωή σε κεφάλαια." }],
  },
  "/shop": {
    meta: {
      title: "Κατάστημα",
      seo_title: "Κατάστημα: Patience Media House",
      seo_description:
        "Ψηφιακά προϊόντα, πρότυπα, μαθήματα και σεμινάρια από το Patience Media House.",
    },
    sections: [{ title: "Εργαλεία για τον δρόμο σου." }],
  },
  "/masterclasses": {
    meta: {
      title: "Σεμινάρια",
      seo_title: "Σεμινάρια με την Anastasia Patience",
      seo_description:
        "Μετάτρεψε τις γνώσεις και τις ιδέες σου σε ψηφιακά προϊόντα και δεξιότητες που αποφέρουν εισόδημα.",
    },
    sections: [
      {
        title: "Σεμινάρια για όσες ακόμη γίνονται.",
        intro:
          "Ψηφιακές δεξιότητες, ψηφιακά προϊόντα και ο οδηγός επιχειρηματικότητας που θα ήθελα να είχα νωρίτερα.",
      },
      {
        title: "Μάθε πρώτη πότε ανοίγει το επόμενο σεμινάριο.",
        body: "Γράψου στα γράμματα και θα μαθαίνεις για τα νέα σεμινάρια πριν από όλους.",
      },
    ],
  },
  "/start": {
    meta: {
      title: "Anastasia Patience",
      seo_title: "Ξεκίνα εδώ: Anastasia Patience",
      seo_description:
        "Όλα σε ένα μέρος: το δωρεάν eBook, το ηχητικό βιβλίο, οι ιστορίες μου, τα σεμινάρια και το ίδρυμα.",
    },
    sections: [
      {
        items: {
          "/books#free-ebook": {
            label: "Πάρε το δωρεάν eBook",
            description: "Βρες τον λόγο σου να χαμογελάς, δωρεάν για λήψη",
          },
          "/#listen": {
            label: "Άκουσε το ηχητικό βιβλίο",
            description: "Τα πρώτα κεφάλαια, με τη δική μου φωνή",
          },
          "/blog": {
            label: "Διάβασε τις ιστορίες μου",
            description: "Ιστορίες από το ειλικρινές ενδιάμεσο.",
          },
          "/masterclasses": {
            label: "Σεμινάρια",
            description: "Μετάτρεψε όσα ξέρεις σε εισόδημα",
          },
          "/foundation": {
            label: "Ανθρωπιστικό Ίδρυμα Patience",
            description: "Όπου κανείς δεν μένει πίσω",
          },
          "/contact": {
            label: "Επικοινώνησε μαζί μου",
            description: "Ομιλίες · Μέσα ενημέρωσης · Συνεργασίες",
          },
        },
      },
    ],
  },
  "/videos": {
    meta: {
      title: "Βίντεο",
      seo_title: "Βίντεο: Anastasia Patience",
      seo_description:
        "Ομιλίες, αναγνώσεις και συζητήσεις από το κανάλι της Αναστασίας στο YouTube.",
    },
    // The channel link's label comes from the catalog.
    sections: [{ title: "Στη σκηνή, στην κάμερα." }],
  },
  "/cookies": {
    meta: {
      title: "Cookies",
      seo_title: "Cookies και αποθήκευση",
      seo_description:
        "Τι κρατά αυτός ο ιστότοπος στο πρόγραμμα περιήγησής σου και γιατί. Κανένα cookie διαφήμισης ή παρακολούθησης.",
    },
    sections: [
      {
        body: [
          "<p>Αυτός ο ιστότοπος δεν χρησιμοποιεί cookies διαφήμισης ή παρακολούθησης, ούτε εργαλεία στατιστικών. Ό,τι κρατά στο πρόγραμμα περιήγησής σου υπάρχει για να θυμάται τις επιλογές σου. Μένει στη συσκευή σου και δεν το συλλέγουμε ποτέ.</p>",
          "<h2>Τι κρατά το πρόγραμμα περιήγησής σου</h2>",
          "<ul><li><strong>Τη γλώσσα σου:</strong> όταν αλλάζεις γλώσσα ανάμεσα στα αγγλικά και τα ελληνικά, ένα cookie (aph_locale) θυμάται την επιλογή σου για έναν χρόνο.</li><li><strong>Τον αναπαραγωγέα ηχητικών βιβλίων:</strong> για κάθε έκδοση ηχητικού βιβλίου, το κεφάλαιο όπου βρίσκεσαι, πού σταμάτησες, τα κεφάλαια που τελείωσες και την ταχύτητα αναπαραγωγής, καθώς και την έκδοση που διάλεξες σε κάθε γλώσσα. Αυτά μένουν στον τοπικό χώρο αποθήκευσης του προγράμματος περιήγησης, για να συνεχίζεις από εκεί που σταμάτησες.</li><li><strong>Την πρόταση γλώσσας:</strong> αν κλείσεις τη σημείωση που σου προτείνει μια σελίδα στη γλώσσα του προγράμματος περιήγησής σου, ο τοπικός χώρος αποθήκευσης το θυμάται για έναν χρόνο, ώστε η σημείωση να μην ξαναεμφανιστεί.</li><li><strong>Το studio:</strong> συνδέονται μόνο η Αναστασία και η ομάδα της. Η σύνδεσή τους μένει στον τοπικό χώρο αποθήκευσης μέχρι να αποσυνδεθούν.</li></ul>",
          "<h2>Υπηρεσίες που βοηθούν στη λειτουργία του ιστότοπου</h2>",
          "<ul><li><strong>Το Cloudflare Turnstile</strong> ελέγχει ότι μια φόρμα τη στέλνει άνθρωπος και όχι πρόγραμμα. Η Cloudflare αναφέρει ότι το Turnstile δεν χρησιμοποιεί cookies.</li><li><strong>Τα βίντεο του YouTube</strong> χρησιμοποιούν τη λειτουργία βελτιωμένου απορρήτου του YouTube και φορτώνουν μόνο όταν πατήσεις αναπαραγωγή. Από εκεί και πέρα, για το βίντεο ισχύουν τα cookies και οι όροι του YouTube.</li><li><strong>Η Stripe</strong> δέχεται τις πληρωμές στις δικές της σελίδες πληρωμής, που ορίζουν δικά τους cookies για την πρόληψη της απάτης.</li></ul>",
          "<h2>Πώς τα διαγράφεις</h2>",
          "<p>Μπορείς να τα διαγράψεις όλα όποτε θέλεις από τις ρυθμίσεις του προγράμματος περιήγησής σου για αυτόν τον ιστότοπο. Τίποτα δεν χαλάει: ο αναπαραγωγέας ξεκινά ξανά από το πρώτο κεφάλαιο και η σημείωση γλώσσας μπορεί να ξαναεμφανιστεί.</p>",
          '<p>Για τα στοιχεία που μας δίνεις σε φόρμες και παραγγελίες, δες τη <a href="/el/privacy">δήλωση απορρήτου</a>.</p>',
        ].join(""),
      },
    ],
  },
};

/** Menu labels, by menu and English label. */
const NAV: Record<string, string> = {
  "header:About": "Σχετικά",
  "header:Books": "Βιβλία",
  "header:Stories": "Ιστορίες",
  "header:Videos": "Βίντεο",
  "header:Gallery": "Γκαλερί",
  "header:Foundation": "Ίδρυμα",
  "header:Contact": "Επικοινωνία",
  "header_action:Free eBook": "Δωρεάν eBook",
  "footer:Explore": "Εξερεύνηση",
  "footer:Company": "Εταιρεία",
  "footer:About": "Σχετικά",
  "footer:Books": "Βιβλία",
  "footer:Stories": "Ιστορίες",
  "footer:Videos": "Βίντεο",
  "footer:Gallery": "Γκαλερί",
  "footer:Foundation": "Ίδρυμα",
  "footer:Masterclasses": "Σεμινάρια",
  "footer:Contact": "Επικοινωνία",
  "legal:Privacy": "Απόρρητο",
  "legal:Terms": "Όροι",
  "legal:Cookies": "Cookies",
};

const SITE: Fields = {
  tagline: "Βρες τον λόγο σου να χαμογελάς.",
  footer_text: "Συγγραφέας, αφηγήτρια, επιχειρηματίας. Ιδρύτρια του Patience Media House.",
  default_seo_description:
    "Συγγραφέας, αφηγήτρια και ιδρύτρια του Patience Media House. Βιβλία, ένα ηχητικό βιβλίο με τη δική της φωνή και γράμματα για την πίστη, την απώλεια και μια ζωή που αγαπάς.",
};

const BOOKS: Record<string, Fields> = {
  "find-your-reason-to-smile": {
    title: "Βρες τον λόγο σου να χαμογελάς",
    subtitle: "Ένα ταξίδι πίστης, απώλειας, ανθεκτικότητας και ελπίδας",
    tagline: "Ένας σύντροφος για τις μέρες που σχεδόν τα παράτησες.",
    description:
      "Μισό απομνημόνευμα, μισό ήπιος οδηγός — ένα βιβλίο για το να επιλέγεις τη χαρά με πρόθεση. Η Αναστασία μοιράζεται τις απώλειες που την άνοιξαν και τις μικρές καθημερινές πρακτικές που την έφεραν πίσω στον εαυτό της. Αν ξέχασες πώς να χαμογελάς, αυτό το βιβλίο θα σου το θυμίσει.",
    whoFor:
      "Για κάθε γυναίκα που ξαναχτίζει τη ζωή της μετά την απώλεια, που ξαναβρίσκει τον εαυτό της μετά τη μητρότητα ή που ψάχνει την ελπίδα μέσα στην καθημερινότητα.",
  },
};

/**
 * Reader reviews, by English "name, role". Only Ama's has Greek given in
 * DESIGN.md §9; the other quotes are never paraphrased, so they stay English.
 */
const TESTIMONIALS: Record<string, Fields> = {
  "Ama, Accra": {
    quote:
      "Το διάβασα μονορούφι και έκλαψα — από εκείνα τα καλά δάκρυα. Ήταν σαν ένα μακρύ γράμμα από μια σοφή μεγαλύτερη αδελφή.",
    name: "Άμα",
    role: "Άκρα",
  },
};

/** Image alt text (and captions), by the library's key. The second cover waits for its Greek title. */
const MEDIA_GREEK: Partial<Record<keyof typeof MEDIA, Fields>> = {
  heroPortrait: {
    alt: "Η Αναστασία Patience με κρεμ σακάκι χαμογελά, με το πηγούνι ακουμπισμένο στο χέρι της",
  },
  portraitBurgundy: { alt: "Η Αναστασία Patience με μπορντό μπλούζα, χαμογελά ζεστά" },
  portraitRust: { alt: "Η Αναστασία Patience με κεραμιδί μπλούζα, χαμογελά" },
  bookDesk: {
    alt: "Η Αναστασία στο γραφείο της, δίπλα σε ένα αντίτυπο του «Βρες τον λόγο σου να χαμογελάς»",
  },
  authorTable: {
    alt: "Η Αναστασία σε ένα τραπέζι με λουλούδια και το βιβλίο της, «Βρες τον λόγο σου να χαμογελάς»",
  },
  coverFyrts: {
    alt: "Το εξώφυλλο του «Βρες τον λόγο σου να χαμογελάς»: ανατολή πάνω από τη θάλασσα",
  },
  cyprus: {
    alt: "Παστέλ σπίτια πάνω από τη θάλασσα στις ακτές της Κύπρου, την ώρα του δειλινού",
    caption: "Η Κύπρος, το νησί που έγινε σπίτι μου.",
  },
  sunset: { alt: "Η σιλουέτα μιας γυναίκας μπροστά σε ένα πορτοκαλί ηλιοβασίλεμα" },
  hands: { alt: "Δύο χέρια σε σχήμα χούφτας κρατούν το φως του ήλιου που δύει" },
  windowPrayer: { alt: "Μια σιλουέτα με υψωμένα χέρια μπροστά σε ένα ηλιόλουστο παράθυρο" },
  socialCard: { alt: "Η Αναστασία Patience, συγγραφέας του «Βρες τον λόγο σου να χαμογελάς»" },
};

/** Story categories, by slug. */
const CATEGORIES: Record<string, string> = {
  "purpose-and-faith": "Σκοπός & Πίστη",
  "women-and-business": "Γυναίκες & Επιχειρήσεις",
  "digital-skills": "Ψηφιακές δεξιότητες",
  "wellness-and-lifestyle": "Ευεξία & Τρόπος ζωής",
  "personal-stories": "Προσωπικές ιστορίες",
};

/** Videos, by YouTube id. */
const VIDEOS: Record<string, Fields> = {
  fixtureVid1: {
    title: "Μέσα στο «Βρες τον λόγο σου να χαμογελάς»",
    description: "Γιατί το έγραψα, και το κεφάλαιο που κόντεψα να αφήσω έξω.",
  },
};

// ---------------------------------------------------------------------------

async function query<T>(sql: string): Promise<T> {
  const out = await $`psql ${LOCAL_DB} -At -v ON_ERROR_STOP=1 -c ${sql}`.text();
  return JSON.parse(out.trim() || "null") as T;
}

type Section = { id: string; type: string; props: Record<string, unknown> };

/** Flatten section Greek to overlay keys, matching item arrays to the section's item ids. */
function sectionFields(section: Section, greek: SectionGreek): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(greek)) {
    if (typeof value === "string") {
      out[key] = value;
      continue;
    }
    const items = section.props[key] as { id: string; href?: string }[] | undefined;
    const byHref = !Array.isArray(value);
    if (!items || (!byHref && items.length !== value.length)) {
      throw new Error(`${section.type} ${section.id}: ${key} has ${items?.length ?? 0} items`);
    }
    items.forEach((item, i) => {
      const fields = byHref ? value[item.href ?? ""] : value[i];
      for (const [field, text] of Object.entries(fields ?? {})) {
        out[`${key}.${item.id}.${field}`] = text;
      }
    });
  }
  return out;
}

const rows: { type: string; id: string; fields: Fields }[] = [];

const pages = await query<{ id: string; path: string; sections: Section[] }[]>(
  "select coalesce(json_agg(json_build_object('id', id, 'path', path, 'sections', sections)), '[]') from public.pages",
);
for (const [path, greek] of Object.entries(PAGES)) {
  const page = pages.find((p) => p.path === path);
  if (!page) throw new Error(`No page at ${path}`);
  rows.push({ type: "page_meta", id: page.id, fields: greek.meta });
  if (page.sections.length !== greek.sections.length) {
    throw new Error(`${path}: ${page.sections.length} sections, ${greek.sections.length} in Greek`);
  }
  page.sections.forEach((section, i) => {
    rows.push({
      type: "page_section",
      id: section.id,
      fields: sectionFields(section, greek.sections[i]),
    });
  });
}

const nav = await query<{ id: string; menu: string; label: string }[]>(
  "select coalesce(json_agg(json_build_object('id', id, 'menu', menu, 'label', label)), '[]') from public.navigation_items",
);
for (const item of nav) {
  const label = NAV[`${item.menu}:${item.label}`];
  if (label) rows.push({ type: "navigation_item", id: item.id, fields: { label } });
}

rows.push({ type: "site_settings", id: "site", fields: SITE });

const books = await query<{ id: string; slug: string }[]>(
  "select coalesce(json_agg(json_build_object('id', id, 'slug', slug)), '[]') from public.books",
);
for (const [slug, fields] of Object.entries(BOOKS)) {
  const book = books.find((b) => b.slug === slug);
  if (book) rows.push({ type: "book", id: book.id, fields });
}

const testimonials = await query<{ id: string; name: string; role: string | null }[]>(
  "select coalesce(json_agg(json_build_object('id', id, 'name', name, 'role', role)), '[]') from public.testimonials",
);
for (const row of testimonials) {
  const fields = TESTIMONIALS[[row.name, row.role].filter(Boolean).join(", ")];
  if (fields) rows.push({ type: "testimonial", id: row.id, fields });
}

const assets = await query<string[]>(
  "select coalesce(json_agg(id), '[]') from public.media_assets",
);
for (const [key, fields] of Object.entries(MEDIA_GREEK)) {
  const { id } = MEDIA[key as keyof typeof MEDIA];
  if (fields && assets.includes(id)) rows.push({ type: "media_asset", id, fields });
}

const categories = await query<{ id: string; slug: string }[]>(
  "select coalesce(json_agg(json_build_object('id', id, 'slug', slug)), '[]') from public.blog_categories",
);
for (const category of categories) {
  const name = CATEGORIES[category.slug];
  if (name) rows.push({ type: "blog_category", id: category.id, fields: { name } });
}

const videos = await query<{ id: string; youtube_id: string }[]>(
  "select coalesce(json_agg(json_build_object('id', id, 'youtube_id', youtube_id)), '[]') from public.videos",
);
for (const video of videos) {
  const fields = VIDEOS[video.youtube_id];
  if (fields) rows.push({ type: "video", id: video.id, fields });
}

const lit = (value: string) => `'${value.replace(/'/g, "''")}'`;
const sql = [
  "begin;",
  ...rows.map(
    (row) => `insert into public.content_translations
  (entity_type, entity_id, locale, fields, status, origin, approved_at)
values (${lit(row.type)}, ${lit(row.id)}, 'el', ${lit(JSON.stringify(row.fields))}::jsonb, 'approved', 'fixture', now())
on conflict (entity_type, entity_id, locale) do update
  set fields = excluded.fields, status = 'approved', origin = 'fixture',
      approved_at = now(), updated_at = now(), draft_fields = null
  where public.content_translations.origin = 'fixture';`,
  ),
  "commit;",
].join("\n");

await $`psql ${LOCAL_DB} -q -v ON_ERROR_STOP=1 -c ${sql}`;
console.log(`Greek fixtures: ${rows.length} rows written to the local database.`);
