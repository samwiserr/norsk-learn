export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  STORAGE = 'STORAGE',
  AUTH = 'AUTH',
  UNKNOWN = 'UNKNOWN',
}

export interface AppErrorData {
  type: ErrorType;
  message: string;
  code?: string;
  retryable: boolean;
  originalError?: unknown;
  timestamp: number;
}

export class AppError extends Error {
  public type: ErrorType;
  public code?: string;
  public retryable: boolean;
  public originalError?: unknown;
  public timestamp: number;

  constructor(
    type: ErrorType,
    message: string,
    code?: string,
    retryable = false,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.retryable = retryable;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }
}

// User-friendly error messages in multiple languages
const ERROR_MESSAGES: Record<ErrorType, Record<string, string>> = {
  [ErrorType.NETWORK]: {
    en: 'Connection error. Please check your internet and try again.',
    no: 'Tilkoblingsfeil. Sjekk internettforbindelsen og prøv igjen.',
    de: 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    fr: 'Erreur de connexion. Veuillez vérifier votre connexion Internet et réessayer.',
    es: 'Error de conexión. Verifique su conexión a Internet e intente nuevamente.',
    it: 'Errore di connessione. Controlla la tua connessione Internet e riprova.',
    pt: 'Erro de conexão. Verifique sua conexão com a Internet e tente novamente.',
    nl: 'Verbindingsfout. Controleer uw internetverbinding en probeer het opnieuw.',
    sv: 'Anslutningsfel. Kontrollera din internetanslutning och försök igen.',
    da: 'Forbindelsesfejl. Tjek din internetforbindelse og prøv igen.',
    fi: 'Yhteysvirhe. Tarkista internetyhteytesi ja yritä uudelleen.',
    pl: 'Błąd połączenia. Sprawdź swoje połączenie internetowe i spróbuj ponownie.',
    uk: 'Помилка з\'єднання. Перевірте своє інтернет-з\'єднання та спробуйте ще раз.',
  },
  [ErrorType.API]: {
    en: 'Service temporarily unavailable. Please try again in a moment.',
    no: 'Tjenesten er midlertidig utilgjengelig. Prøv igjen om et øyeblikk.',
    de: 'Service vorübergehend nicht verfügbar. Bitte versuchen Sie es gleich noch einmal.',
    fr: 'Service temporairement indisponible. Veuillez réessayer dans un moment.',
    es: 'Servicio temporalmente no disponible. Por favor, intente de nuevo en un momento.',
    it: 'Servizio temporaneamente non disponibile. Riprova tra un momento.',
    pt: 'Serviço temporariamente indisponível. Tente novamente em um momento.',
    nl: 'Service tijdelijk niet beschikbaar. Probeer het over een moment opnieuw.',
    sv: 'Tjänsten är tillfälligt otillgänglig. Försök igen om ett ögonblick.',
    da: 'Tjenesten er midlertidigt utilgængelig. Prøv igen om et øjeblik.',
    fi: 'Palvelu on tilapäisesti poissa käytöstä. Yritä hetken kuluttua uudelleen.',
    pl: 'Usługa tymczasowo niedostępna. Spróbuj ponownie za chwilę.',
    uk: 'Служба тимчасово недоступна. Будь ласка, спробуйте ще раз через хвилину.',
  },
  [ErrorType.VALIDATION]: {
    en: 'Invalid input. Please check your message and try again.',
    no: 'Ugyldig inndata. Sjekk meldingen din og prøv igjen.',
    de: 'Ungültige Eingabe. Bitte überprüfen Sie Ihre Nachricht und versuchen Sie es erneut.',
    fr: 'Entrée invalide. Veuillez vérifier votre message et réessayer.',
    es: 'Entrada inválida. Verifique su mensaje e intente nuevamente.',
    it: 'Input non valido. Controlla il tuo messaggio e riprova.',
    pt: 'Entrada inválida. Verifique sua mensagem e tente novamente.',
    nl: 'Ongeldige invoer. Controleer uw bericht en probeer het opnieuw.',
    sv: 'Ogiltig inmatning. Kontrollera ditt meddelande och försök igen.',
    da: 'Ugyldig input. Tjek din besked og prøv igen.',
    fi: 'Virheellinen syöte. Tarkista viestisi ja yritä uudelleen.',
    pl: 'Nieprawidłowe dane wejściowe. Sprawdź swoją wiadomość i spróbuj ponownie.',
    uk: 'Недійсний ввід. Будь ласка, перевірте своє повідомлення та спробуйте ще раз.',
  },
  [ErrorType.STORAGE]: {
    en: 'Failed to save data. Your conversation may not be saved.',
    no: 'Kunne ikke lagre data. Samtalen din kan være ikke lagret.',
    de: 'Speichern fehlgeschlagen. Ihre Unterhaltung wurde möglicherweise nicht gespeichert.',
    fr: 'Échec de l\'enregistrement. Votre conversation n\'a peut-être pas été enregistrée.',
    es: 'Error al guardar. Es posible que su conversación no se haya guardado.',
    it: 'Salvataggio non riuscito. La tua conversazione potrebbe non essere stata salvata.',
    pt: 'Falha ao salvar. Sua conversa pode não ter sido salva.',
    nl: 'Opslaan mislukt. Uw gesprek is mogelijk niet opgeslagen.',
    sv: 'Kunde inte spara. Din konversation kanske inte har sparats.',
    da: 'Kunne ikke gemme. Din samtale er muligvis ikke gemt.',
    fi: 'Tallennus epäonnistui. Keskustelusi ei ehkä ole tallennettu.',
    pl: 'Zapisywanie nie powiodło się. Twoja rozmowa może nie zostać zapisana.',
    uk: 'Не вдалося зберегти дані. Ваша розмова може не бути збережена.',
  },
  [ErrorType.AUTH]: {
    en: 'Authentication failed. Please sign in again.',
    no: 'Autentisering mislyktes. Vennligst logg inn igjen.',
    de: 'Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.',
    fr: 'Échec de l\'authentification. Veuillez vous reconnecter.',
    es: 'Error de autenticación. Por favor, inicie sesión nuevamente.',
    it: 'Autenticazione non riuscita. Per favore, accedi di nuovo.',
    pt: 'Falha na autenticação. Por favor, faça login novamente.',
    nl: 'Authenticatie mislukt. Log opnieuw in.',
    sv: 'Autentisering misslyckades. Logga in igen.',
    da: 'Godkendelse mislykkedes. Log venligst ind igen.',
    fi: 'Tunnistautuminen epäonnistui. Ole hyvä ja kirjaudu uudelleen sisään.',
    pl: 'Uwierzytelnianie nie powiodło się. Zaloguj się ponownie.',
    uk: 'Помилка аутентифікації. Будь ласка, увійдіть знову.',
  },
  [ErrorType.UNKNOWN]: {
    en: 'An unexpected error occurred. Please try again.',
    no: 'En uventet feil oppstod. Vennligst prøv igjen.',
    de: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    fr: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
    es: 'Ocurrió un error inesperado. Por favor, intente nuevamente.',
    it: 'Si è verificato un errore imprevisto. Riprova.',
    pt: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
    nl: 'Er is een onverwachte fout opgetreden. Probeer het opnieuw.',
    sv: 'Ett oväntat fel uppstod. Försök igen.',
    da: 'Der opstod en uventet fejl. Prøv venligst igen.',
    fi: 'Odottamaton virhe tapahtui. Yritä uudelleen.',
    pl: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
    uk: 'Сталася неочікувана помилка. Будь ласка, спробуйте ще раз.',
  },
};

export const getErrorMessage = (error: AppError, language: string = 'en'): string => {
  const messages = ERROR_MESSAGES[error.type];
  return messages[language] || messages.en || error.message;
};

// Helper to create AppError from various error types
export const createAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new AppError(ErrorType.NETWORK, 'Network request failed', 'NETWORK_ERROR', true, error);
  }

  if (error instanceof Response) {
    if (error.status >= 500) {
      return new AppError(ErrorType.API, `Server error: ${error.status}`, `HTTP_${error.status}`, true, error);
    }
    if (error.status === 401 || error.status === 403) {
      return new AppError(ErrorType.AUTH, 'Authentication required', `HTTP_${error.status}`, false, error);
    }
    return new AppError(ErrorType.API, `Request failed: ${error.status}`, `HTTP_${error.status}`, false, error);
  }

  if (error instanceof Error) {
    return new AppError(ErrorType.UNKNOWN, error.message, 'UNKNOWN_ERROR', false, error);
  }

  return new AppError(ErrorType.UNKNOWN, 'An unknown error occurred', 'UNKNOWN_ERROR', false, error);
};

