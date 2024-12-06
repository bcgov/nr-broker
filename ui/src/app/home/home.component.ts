import { Component, OnInit } from '@angular/core';

import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { SystemApiService } from '../service/system-api.service';
import { ConnectionConfigRestDto } from '../service/dto/connection-config-rest.dto';
import { PreferencesService } from '../preferences.service';

@Component({
    selector: 'app-home',
    imports: [
        RouterModule,
        MatButtonModule,
        MatCardModule,
        MatDividerModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTabsModule,
    ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  loading = true;
  selectedTabIndex = 0;
  services: ConnectionConfigRestDto[] = [];
  documents: ConnectionConfigRestDto[] = [];

  constructor(
    private readonly systemApiService: SystemApiService,
    private readonly preferences: PreferencesService,
  ) {}

  ngOnInit(): void {
    this.systemApiService.getConnectionConfig().subscribe((data) => {
      this.services = data.filter((dataum) => dataum.collection === 'service');
      this.documents = data.filter(
        (dataum) => dataum.collection === 'documentation',
      );
      this.loading = false;
    });

    this.selectedTabIndex = this.preferences.get('homeSectionTab');
  }

  setSelectedTabIndex(event: any) {
    if (event !== this.selectedTabIndex) {
      this.selectedTabIndex = event;
    }
    this.preferences.set('homeSectionTab', this.selectedTabIndex);
  }
}
