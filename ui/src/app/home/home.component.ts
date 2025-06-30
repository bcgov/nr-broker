import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRipple } from '@angular/material/core';
import { MatRippleModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';

import { SystemApiService } from '../service/system-api.service';
import { ConnectionConfigDto } from '../service/persistence/dto/connection-config.dto';
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
    MatRippleModule,
    MatTabsModule,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  loading = true;
  selectedTabIndex = 0;
  services: ConnectionConfigDto[] = [];
  documents: ConnectionConfigDto[] = [];
  @ViewChild(MatRipple, { static: true }) ripple!: MatRipple;
  private intervalId: any;

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

    this.intervalId = setInterval(() => {
      this.triggerRipple();
    }, 10000); // every 10 seconds
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  triggerRipple() {
    this.ripple.launch({
      persistent: false,
      centered: true,
      animation: {
        enterDuration: 300,
        exitDuration: 600,
      },
    });
  }

  setSelectedTabIndex(event: any) {
    if (event !== this.selectedTabIndex) {
      this.selectedTabIndex = event;
    }
    this.preferences.set('homeSectionTab', this.selectedTabIndex);
  }
}
