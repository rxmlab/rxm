// import { environment } from '../../../src/assests/env.json';
import { HttpClient } from '@angular/common/http';
import { EnvironmentService } from '../services/environment.service';
import { inject } from '@angular/core';
import { IMicroService } from '../interfaces/microservice.interface';

export async function initializeEnvironment() {
  const environmentService = inject(EnvironmentService);
  const http = inject(HttpClient);
  const json = await http.get<IMicroService[]>('assets/env.json').toPromise();
  if (json) {
    environmentService.setMicroServices(json);
  }

  console.log(json);
}
