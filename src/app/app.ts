import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpService } from '@rxm/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('rxm');
  private _httpService = inject(HttpService);

  ngOnInit(): void {
    this._httpService.get('/abcdClass').subscribe((data) => console.log);
  }
}
