import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatRippleModule } from '@angular/material/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ToolbarComponent } from './toolbar/toolbar.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    ToolbarComponent,
    RouterOutlet,
    MatIconModule,
    MatListModule,
    MatRippleModule,
    MatSidenavModule,
    RouterModule,
  ],
})
export class AppComponent {
  sidenavOpen = false;
  openSidebar() {
    this.sidenavOpen = !this.sidenavOpen;
  }
}
