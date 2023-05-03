import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatRippleModule } from '@angular/material/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { GraphComponent } from './graph/graph.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    ToolbarComponent,
    GraphComponent,
    RouterOutlet,
    MatIconModule,
    MatListModule,
    MatRippleModule,
    MatSidenavModule,
  ],
})
export class AppComponent {
  sidenavOpen = false;
  openSidebar() {
    this.sidenavOpen = !this.sidenavOpen;
  }
}
