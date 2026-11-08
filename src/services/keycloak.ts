import Keycloak from "keycloak-js";

class KeycloakService {
  private static instance: Keycloak.KeycloakInstance;
  private static initPromise: Promise<boolean> | null = null;

  static getInstance(): Keycloak.KeycloakInstance {
    if (!KeycloakService.instance) {
      KeycloakService.instance = new Keycloak({
        url: "https://www.keytomarvel.com/",
        realm: "whereq",
        clientId: "whereq-ca",
      }) as Keycloak.KeycloakInstance;
    }
    return KeycloakService.instance;
  }

  static init(): Promise<boolean> {
    if (!KeycloakService.initPromise) {
      const keycloak = KeycloakService.getInstance();
      KeycloakService.initPromise = keycloak.init({
        onLoad: "check-sso",
        silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
        pkceMethod: "S256",
      });
    }
    return KeycloakService.initPromise;
  }

  // Add these to make TypeScript happy about the properties we're accessing
  static get tokenParsed() {
    return this.getInstance().tokenParsed;
  }

  static accountManagement() {
    return this.getInstance().accountManagement();
  }
}

export default KeycloakService;