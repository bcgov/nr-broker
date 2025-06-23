import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-page-error',
  imports: [MatButtonModule, MatCardModule, RouterModule],
  templateUrl: './page-error.component.html',
  styleUrl: './page-error.component.scss',
})
export class PageErrorComponent {
  code = input<string>('418');
  message = input<string>('I am a teapot');
  error = input<string>(
    'An unexpected error occurred. Please try again later.',
  );
}
