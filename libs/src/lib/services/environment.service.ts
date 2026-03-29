import { Injectable } from '@angular/core';
import { IMicroService } from '../interfaces/microservice.interface';
// concept is get microseevise from that perticular environment
@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  private readonly _microServices = new Map<string, IMicroService>();
  private _default!: string;

  setMicroServices(microServices: IMicroService[]) {
    microServices.forEach((microService) => {
      if (microService.default) {
        this._default = microService.name;
      }
      this.setMicroService(microService.name, microService);
    });
    if (!this._default && microServices.length > 0) {
      this._default = microServices[0].name;
    }
  }

  setMicroService(microServiceName: string, microService: IMicroService) {
    this._microServices.set(microServiceName, microService);
  }

  getMicroService(microServiceName?: string): IMicroService {
    if (!microServiceName) {
      microServiceName = this._default;
    }
    return this._microServices.get(microServiceName)!;
  }

  getContext(serviceName?: string) {
    let url = '';
    const microService = this.getMicroService(serviceName);
    url =
      url + microService?.baseUrl.includes('http') ? (microService?.baseUrl ?? '') : window.origin;
    url = url + microService.context + microService.version;
    return url;
  }
}
