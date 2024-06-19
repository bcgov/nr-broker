import { Component, OnInit } from '@angular/core';

import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SystemApiService } from '../service/system-api.service';
import { ConnectionConfigRestDto } from '../service/dto/connection-config-rest.dto';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  loading = true;
  services: ConnectionConfigRestDto[] = [];
  documents: ConnectionConfigRestDto[] = [];

  constructor(private readonly systemApiService: SystemApiService) {}

  ngOnInit(): void {
    this.systemApiService.getConnectionConfig().subscribe((data) => {
      this.services = data.filter((dataum) => dataum.collection === 'service');
      this.documents = data.filter(
        (dataum) => dataum.collection === 'documentation',
      );
      this.loading = false;
    });
  }
}
