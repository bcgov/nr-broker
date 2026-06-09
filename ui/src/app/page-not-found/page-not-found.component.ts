import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-page-not-found',
  imports: [MatButtonModule, MatCardModule, RouterModule],
  templateUrl: './page-not-found.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./page-not-found.component.scss'],
})
export class PageNotFoundComponent {}
