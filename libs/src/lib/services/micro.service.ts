import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MicroService {
  private readonly _microServices = new Map<string, MicroService>();

  setMicroService(microServiceName: string, microService: MicroService) {
    this._microServices.set(microServiceName, microService);
  }

  getMicroService(microServiceName: string): MicroService | undefined {
    return this._microServices.get(microServiceName);
  }
}
