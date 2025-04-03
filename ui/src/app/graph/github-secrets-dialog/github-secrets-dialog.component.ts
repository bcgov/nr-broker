import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-github-secrets-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './github-secrets-dialog.component.html',
  styleUrl: './github-secrets-dialog.component.scss',
})
export class GithubSecretsDialogComponent {}
