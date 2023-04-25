import { Component, Inject } from '@angular/core';
import { CURRENT_USER } from './app-initialize.factory';
import { UserDto } from './graph/graph.types';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(@Inject(CURRENT_USER) public user: UserDto) {}

  logout() {
    window.location.href = `${environment.apiUrl}/auth/logout`;
  }
}
