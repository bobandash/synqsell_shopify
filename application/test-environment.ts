import PrismaEnvironment from '@quramy/jest-prisma/environment';
import fetch, { Response, Request, Headers } from '@remix-run/web-fetch';

class CustomEnvironment extends PrismaEnvironment {
  async setup() {
    await super.setup();

    if (typeof this.global.Response === 'undefined') {
      // Add all static methods to match the full Response interface
      this.global.Response = Response as unknown as typeof globalThis.Response;
      this.global.Request = Request as unknown as typeof globalThis.Request;
      this.global.Headers = Headers as unknown as typeof globalThis.Headers;
      this.global.fetch = fetch as unknown as typeof globalThis.fetch;
    }
  }
}

export default CustomEnvironment;
