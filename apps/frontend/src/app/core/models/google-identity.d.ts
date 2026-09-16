// Tipado minimo para window.google, cargado desde el script de Google
// Identity Services en index.html. No es el paquete oficial de tipos
// (no lo necesitamos completo), solo lo que este proyecto usa.
export interface GoogleCredentialResponse {
  credential: string;
}

export interface GoogleIdConfiguration {
  client_id: string;
  callback: (respuesta: GoogleCredentialResponse) => void;
}

export interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
  logo_alignment?: 'left' | 'center';
}

export interface GoogleAccountsId {
  initialize(config: GoogleIdConfiguration): void;
  renderButton(elemento: HTMLElement, opciones: GoogleButtonOptions): void;
  prompt(): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}
