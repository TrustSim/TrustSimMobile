class KycStore {
  frontUri: string | null = null;
  backUri: string | null = null;
  selfieUri: string | null = null;

  setFront(uri: string) {
    this.frontUri = uri;
  }

  setBack(uri: string) {
    this.backUri = uri;
  }

  setSelfie(uri: string) {
    this.selfieUri = uri;
  }

  clear() {
    this.frontUri = null;
    this.backUri = null;
    this.selfieUri = null;
  }
}

export const kycStore = new KycStore();
