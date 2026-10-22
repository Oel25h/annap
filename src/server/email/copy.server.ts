/**
 * Email copy that is not edited in the studio: the default subject and body
 * of each template (used until she edits one, and for Greek until a Greek
 * version is approved), button labels, receipt labels and the footer.
 * Server only, so none of it reaches the browser bundle. The Greek is a
 * draft for review, like the rest of el.ts.
 */
import type { Locale } from "@/lib/i18n/locale";
import type { EmailTemplate } from "../outbox.server";

export type EmailCopy = {
  templates: Record<EmailTemplate, { subject: string; body: string }>;
  confirmButton: string;
  masterclassButton: string;
  downloadsNote: string;
  order: string;
  item: string;
  quantity: string;
  total: string;
  shipTo: string;
  customer: string;
  monthly: string;
  gift: string;
  topic: string;
  replyNote: string;
  footer: string;
  unsubscribe: string;
};

const en: EmailCopy = {
  templates: {
    newsletter_confirm: {
      subject: "Please confirm your email",
      body: "Thank you for asking for my letters. Please confirm your email with the button below, and the first one will be on its way.\n\nIf you did not ask for this, ignore this email and nothing will happen.",
    },
    ebook_link: {
      subject: "Your copy of {bookTitle}",
      body: "Dear {firstName},\n\nHere is your copy of {bookTitle}. The download links work for 7 days.\n\nI hope it meets you exactly where you are.\n\nWith love,\nAnastasia",
    },
    order_receipt: {
      subject: "Thank you for your order",
      body: "Thank you for your order. Your receipt is below, and any downloads are ready from the links in this email.",
    },
    donation_thanks: {
      subject: "Thank you for your gift",
      body: "Thank you. Your gift becomes a meal, a visit or a rescue. Your receipt is below.",
    },
    contact_autoreply: {
      subject: "I have your message",
      body: "Dear {name},\n\nThank you for writing. I read every message myself and will reply within a few days.\n\nWith warmth,\nAnastasia",
    },
    contact_notification: {
      subject: "New message from {name}",
      body: "{name} ({email}) wrote about: {topic}",
    },
    waitlist_confirm: {
      subject: "You are on the list",
      body: "Dear {firstName},\n\nThank you. I will write to you as soon as places open in {title}.",
    },
    order_notification: {
      subject: "New order {orderNumber} to post",
      body: "{name} ({email}) placed order {orderNumber}. It includes something to post.",
    },
  },
  confirmButton: "Confirm my email",
  masterclassButton: "See the masterclass",
  downloadsNote: "Each link works for 7 days.",
  order: "Order {orderNumber}",
  item: "Item",
  quantity: "Qty",
  total: "Total",
  shipTo: "Ship to",
  customer: "Customer",
  monthly: "Every month, until you change it",
  gift: "Your gift",
  topic: "Topic",
  replyNote: "Reply to this email to answer them directly.",
  footer: "Anastasia Patience, Cyprus",
  unsubscribe: "Unsubscribe",
};

const el: EmailCopy = {
  templates: {
    newsletter_confirm: {
      subject: "Επιβεβαίωσε το email σου",
      body: "Σε ευχαριστώ που ζήτησες τα γράμματά μου. Επιβεβαίωσε το email σου με το κουμπί παρακάτω και το πρώτο θα είναι καθ’ οδόν.\n\nΑν δεν το ζήτησες εσύ, αγνόησε αυτό το μήνυμα και δεν θα γίνει τίποτα.",
    },
    ebook_link: {
      subject: "Το αντίτυπό σου: {bookTitle}",
      body: "Γεια σου {firstName},\n\nΙδού το αντίτυπό σου του {bookTitle}. Οι σύνδεσμοι λήψης ισχύουν για 7 ημέρες.\n\nΕλπίζω να σε βρει ακριβώς εκεί που βρίσκεσαι.\n\nΜε αγάπη,\nΑναστασία",
    },
    order_receipt: {
      subject: "Σε ευχαριστώ για την παραγγελία σου",
      body: "Σε ευχαριστώ για την παραγγελία σου. Η απόδειξη είναι παρακάτω και ό,τι αγόρασες για λήψη σε περιμένει στους συνδέσμους αυτού του email.",
    },
    donation_thanks: {
      subject: "Σε ευχαριστώ για τη δωρεά σου",
      body: "Σε ευχαριστώ. Η δωρεά σου γίνεται ένα γεύμα, μια επίσκεψη ή μια διάσωση. Η απόδειξη είναι παρακάτω.",
    },
    contact_autoreply: {
      subject: "Έλαβα το μήνυμά σου",
      body: "Γεια σου {name},\n\nΣε ευχαριστώ που μου έγραψες. Διαβάζω κάθε μήνυμα η ίδια και θα απαντήσω μέσα σε λίγες μέρες.\n\nΜε ζεστασιά,\nΑναστασία",
    },
    contact_notification: {
      subject: "Νέο μήνυμα από {name}",
      body: "{name} ({email}) έγραψε για: {topic}",
    },
    waitlist_confirm: {
      subject: "Είσαι στη λίστα",
      body: "Γεια σου {firstName},\n\nΣε ευχαριστώ. Θα σου γράψω μόλις ανοίξουν θέσεις στο {title}.",
    },
    order_notification: {
      subject: "Νέα παραγγελία {orderNumber} για αποστολή",
      body: "{name} ({email}) έκανε την παραγγελία {orderNumber}. Περιλαμβάνει κάτι για αποστολή.",
    },
  },
  confirmButton: "Επιβεβαίωση email",
  masterclassButton: "Δες το masterclass",
  downloadsNote: "Κάθε σύνδεσμος ισχύει για 7 ημέρες.",
  order: "Παραγγελία {orderNumber}",
  item: "Είδος",
  quantity: "Ποσ.",
  total: "Σύνολο",
  shipTo: "Αποστολή σε",
  customer: "Πελάτης",
  monthly: "Κάθε μήνα, μέχρι να το αλλάξεις",
  gift: "Η δωρεά σου",
  topic: "Θέμα",
  replyNote: "Απάντησε σε αυτό το email για να τους απαντήσεις απευθείας.",
  footer: "Anastasia Patience, Κύπρος",
  unsubscribe: "Διαγραφή",
};

export const EMAIL_COPY: Record<Locale, EmailCopy> = { en, el };
