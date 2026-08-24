// IVR multilingue OmniComm 360°.
// FR / EN / PT : vraies voix Amazon Polly (femme + homme).
// Lingala / Swahili / Tshiluba / Kikongo : Polly n'a pas ces langues -> textes
// traduits lus par une voix francaise (alphabet latin, prononciation correcte).
// A remplacer par des <Play> audio natifs si Rogerio fournit des enregistrements.

export type LangCode = "fr" | "en" | "ln" | "sw" | "lu" | "kg" | "pt" | "es";

export const DIGIT_TO_LANG: Record<string, LangCode> = {
  "1": "fr", "2": "en", "3": "ln", "4": "sw", "5": "lu", "6": "kg", "7": "pt", "8": "es",
};

type Voix = { lang: string; femme: string; homme: string };

// fr-FR sert de moteur de lecture pour les 4 langues congolaises.
const VOIX: Record<LangCode, Voix> = {
  fr: { lang: "fr-FR", femme: "Polly.Lea", homme: "Polly.Mathieu" },
  en: { lang: "en-US", femme: "Polly.Joanna", homme: "Polly.Matthew" },
  pt: { lang: "pt-BR", femme: "Polly.Camila", homme: "Polly.Ricardo" },
  es: { lang: "es-ES", femme: "Polly.Lucia", homme: "Polly.Enrique" },
  ln: { lang: "fr-FR", femme: "Polly.Lea", homme: "Polly.Mathieu" },
  sw: { lang: "fr-FR", femme: "Polly.Lea", homme: "Polly.Mathieu" },
  lu: { lang: "fr-FR", femme: "Polly.Lea", homme: "Polly.Mathieu" },
  kg: { lang: "fr-FR", femme: "Polly.Lea", homme: "Polly.Mathieu" },
};

type Cle = "nom" | "bienvenue" | "menu" | "relation" | "indispo" | "support" | "vm" | "rien" | "aurevoir" | "nonreconnu";

export const T: Record<LangCode, Record<Cle, string>> = {
  fr: {
    nom: "Francais",
    bienvenue: "Bienvenue chez OmniComm 360.",
    menu: "Pour parler a un conseiller, tapez 1. Pour le support technique, tapez 2. Pour laisser un message, tapez 3.",
    relation: "Je vous mets en relation avec un conseiller. Veuillez patienter.",
    indispo: "Le conseiller n'est pas disponible pour le moment.",
    support: "Support technique OmniComm 360. Laissez un message decrivant votre besoin.",
    vm: "Laissez votre message apres le bip. Appuyez sur diese pour terminer.",
    rien: "Nous n'avons rien enregistre.",
    aurevoir: "Merci, votre message a ete enregistre. Au revoir.",
    nonreconnu: "Choix non reconnu.",
  },
  en: {
    nom: "English",
    bienvenue: "Welcome to OmniComm 360.",
    menu: "To speak with an agent, press 1. For technical support, press 2. To leave a message, press 3.",
    relation: "Connecting you to an agent. Please hold.",
    indispo: "The agent is not available right now.",
    support: "OmniComm 360 technical support. Please leave a message describing your need.",
    vm: "Leave your message after the beep. Press pound to finish.",
    rien: "We did not record anything.",
    aurevoir: "Thank you, your message has been recorded. Goodbye.",
    nonreconnu: "Choice not recognized.",
  },
  pt: {
    nom: "Portugues",
    bienvenue: "Bem-vindo a OmniComm 360.",
    menu: "Para falar com um atendente, disque 1. Para suporte tecnico, disque 2. Para deixar uma mensagem, disque 3.",
    relation: "Estou a ligar para um atendente. Aguarde, por favor.",
    indispo: "O atendente nao esta disponivel de momento.",
    support: "Suporte tecnico OmniComm 360. Deixe uma mensagem descrevendo a sua necessidade.",
    vm: "Deixe a sua mensagem apos o sinal. Prima cardinal para terminar.",
    rien: "Nao gravamos nada.",
    aurevoir: "Obrigado, a sua mensagem foi gravada. Ate logo.",
    nonreconnu: "Opcao nao reconhecida.",
  },
  ln: {
    nom: "Lingala",
    bienvenue: "Boyei malamu na OmniComm 360.",
    menu: "Mpo na kosolola na moto ya mosala, fina 1. Mpo na lisungi ya tekiniki, fina 2. Mpo na kotika liloba, fina 3.",
    relation: "Nazali kokangisa yo na moto ya mosala. Zela mwa moke.",
    indispo: "Moto ya mosala azali te sikoyo.",
    support: "Lisungi ya tekiniki OmniComm 360. Tika liloba na yo.",
    vm: "Tika liloba na yo sima ya bip. Fina diese mpo na kosukisa.",
    rien: "Tobombi eloko te.",
    aurevoir: "Matondi, liloba na yo ebombami. Tokomonana.",
    nonreconnu: "Poni eyebani te.",
  },
  sw: {
    nom: "Kiswahili",
    bienvenue: "Karibu OmniComm 360.",
    menu: "Kuzungumza na wakala, bonyeza 1. Kwa msaada wa kiufundi, bonyeza 2. Kuacha ujumbe, bonyeza 3.",
    relation: "Ninakuunganisha na wakala. Tafadhali subiri.",
    indispo: "Wakala hayupo kwa sasa.",
    support: "Msaada wa kiufundi OmniComm 360. Tafadhali acha ujumbe.",
    vm: "Acha ujumbe wako baada ya mlio. Bonyeza reli kumaliza.",
    rien: "Hatukurekodi chochote.",
    aurevoir: "Asante, ujumbe wako umerekodiwa. Kwaheri.",
    nonreconnu: "Chaguo halikutambuliwa.",
  },
  lu: {
    nom: "Tshiluba",
    bienvenue: "Tuasakidila ku OmniComm 360.",
    menu: "Bua kuakula ne muena mudimu, ofina 1. Bua diambuluisha dia tekiniki, ofina 2. Bua kushiya mukenji, ofina 3.",
    relation: "Ndi nkukudika ne muena mudimu. Indila kakese.",
    indispo: "Muena mudimu kena ku mpindieu to.",
    support: "Diambuluisha dia tekiniki OmniComm 360. Shiya mukenji webe.",
    vm: "Shiya mukenji webe panyima pa bip.",
    rien: "Katuvua bashale tshintu to.",
    aurevoir: "Tuasakidila, mukenji webe mmushale. Tudimonangane.",
    nonreconnu: "Disungula kadiyi dijingululka to.",
  },
  kg: {
    nom: "Kikongo",
    bienvenue: "Boyisa kwa OmniComm 360.",
    menu: "Mu kubokila mfutu wa kisalu, fina 1. Mu lusadisu lwa tekiniki, fina 2. Mu kubika nsangu, fina 3.",
    relation: "Nkuluka nge kwa mfutu wa kisalu. Vingila fioti.",
    indispo: "Mfutu wa kisalu kena ko ntangu yayi.",
    support: "Lusadisu lwa tekiniki OmniComm 360. Bika nsangu.",
    vm: "Bika nsangu na nge kunima bip.",
    rien: "Tubikidi kima ko.",
    aurevoir: "Matondo, nsangu na nge yibikamane. Tumonana.",
    nonreconnu: "Nsola yayi kayizolakana ko.",
  },
  es: {
    nom: "Espanol",
    bienvenue: "Bienvenido a OmniComm 360.",
    menu: "Para hablar con un agente, marque 1. Para soporte tecnico, marque 2. Para dejar un mensaje, marque 3.",
    relation: "Le comunico con un agente. Espere, por favor.",
    indispo: "El agente no esta disponible en este momento.",
    support: "Soporte tecnico OmniComm 360. Deje un mensaje describiendo su necesidad.",
    vm: "Deje su mensaje despues del tono. Pulse almohadilla para terminar.",
    rien: "No hemos grabado nada.",
    aurevoir: "Gracias, su mensaje ha sido grabado. Adios.",
    nonreconnu: "Opcion no reconocida.",
  },
};

// Voix par defaut (femme). Bascule globale possible via IVR_VOICE=homme.
function genre(): "femme" | "homme" {
  return process.env.IVR_VOICE === "homme" ? "homme" : "femme";
}

function nettoie(t: string): string {
  return t.replace(/&/g, "et").replace(/[<>]/g, "");
}

// <Say> dans la langue demandee, avec la bonne voix Polly.
export function dire(lang: LangCode, texte: string, forceHomme = false): string {
  const v = VOIX[lang];
  const voix = forceHomme || genre() === "homme" ? v.homme : v.femme;
  return `<Say language="${v.lang}" voice="${voix}">${nettoie(texte)}</Say>`;
}

export function t(lang: LangCode, cle: Cle): string {
  return T[lang][cle];
}

// Message d'accueil qui liste les langues, chacune annoncee dans SA langue/voix.
export function menuLangues(): string {
  const ordre: LangCode[] = ["fr", "en", "ln", "sw", "lu", "kg", "pt", "es"];
  const digitDe: Record<LangCode, string> = { fr: "1", en: "2", ln: "3", sw: "4", lu: "5", kg: "6", pt: "7", es: "8" };
  const intro = dire("fr", "Bienvenue chez OmniComm 360. Choisissez votre langue.") + dire("en", "Welcome. Choose your language.");
  const options = ordre.map((l) => dire(l, `${T[l].nom}, ${digitDe[l]}.`)).join("");
  return intro + options;
}
