import { Component, OnInit, OnDestroy, EventEmitter, Inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog } from '@angular/material/dialog';
import { CURRENT_USER } from '../app-initialize.factory';
import { UserDto } from '../graph/graph.types';
import { environment } from '../../environments/environment';
import { RolesDialogComponent } from './roles-dialog/roles-dialog.component';
import { HealthstatusService } from '../healthstatus.service';
import { interval, Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    CommonModule
  ],
})

export class ToolbarComponent implements OnInit, OnDestroy{
  @Output() sidebarClick = new EventEmitter<boolean>();

  constructor(
    private dialog: MatDialog,
    private healthservice: HealthstatusService,
    @Inject(CURRENT_USER) public user: UserDto,
  ) {}

  healthStatus: boolean | undefined;
  private healthCheckSubscription: Subscription | undefined;
  isHovered: boolean | undefined;
  statusText: string | undefined;

  ngOnInit() {
    this.healthCheckSubscription = interval(5000).subscribe(() => {
      this.getHealthCheck();
    });
  }

  ngOnDestroy() {
    if (this.healthCheckSubscription) {
      this.healthCheckSubscription.unsubscribe();
    }
  } 

  getHealthCheck() : any {
    this.healthservice.healthCheck().subscribe(
      (res: any) =>{ 
        console.log(res);
        this.healthStatus=res.status === 'ok';
      },
      (error: any) => {
        console.error('Error occurred while checking health:', error);        
        this.healthStatus = false;        
      });
  }
  
  showStatusText(isHovered: boolean) {
    this.isHovered = isHovered;
    this.statusText = this.healthStatus ? 'Online' : 'Offline';
  }

  showRolesDialog() {
    this.dialog.open(RolesDialogComponent, {
      width: '400px',
    });
  }

  openSidebar() {
    this.sidebarClick.emit(true);
  }

  logout() {
    window.location.href = `${environment.apiUrl}/auth/logout`;
  }
}
