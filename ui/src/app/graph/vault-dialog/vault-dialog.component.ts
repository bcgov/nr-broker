import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { ServiceRestDto } from '../../service/dto/service-rest.dto';
import { VaultConfigRestDto } from '../../service/dto/vault-config-rest.dto';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

@Component({
    selector: 'app-vault-dialog',
    imports: [
        FormsModule,
        MatButtonModule,
        MatCheckboxModule,
        MatDialogModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
    ],
    templateUrl: './vault-dialog.component.html',
    styleUrl: './vault-dialog.component.scss'
})
export class VaultDialogComponent implements OnInit {
  public config: {
    actor: string;
    approle: {
      enabled: boolean;
      advanced: string;
    };
    brokerGlobal: boolean;
    brokerFor: string;
    db: string;
    enabled: boolean;
    policyOptions: {
      kvReadProject: boolean;
      systemPolicies: string;
      tokenPeriod: 'hourly' | 'bidaily' | 'daily' | 'weekly';
    };
  } = {
    actor: '',
    approle: {
      enabled: false,
      advanced: '',
    },
    brokerGlobal: false,
    brokerFor: '',
    db: '',
    enabled: false,
    policyOptions: {
      kvReadProject: false,
      systemPolicies: '',
      tokenPeriod: 'daily',
    },
  };

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: {
      service: ServiceRestDto;
      showMasked: boolean;
    },
    public readonly dialogRef: MatDialogRef<VaultDialogComponent>,
  ) {}

  ngOnInit() {
    this.config.enabled = this.data.service.vaultConfig?.enabled ?? false;
    this.config.approle.enabled =
      this.data.service.vaultConfig?.approle?.enabled ?? false;

    // Actor
    if (this.data.service.vaultConfig?.actor) {
      this.config.actor = JSON.stringify(this.data.service.vaultConfig.actor);
    }

    // Broker
    if (this.data.service.vaultConfig?.brokerGlobal) {
      this.config.brokerGlobal = this.data.service.vaultConfig.brokerGlobal;
    }

    if (this.data.service.vaultConfig?.brokerFor) {
      this.config.brokerFor = this.data.service.vaultConfig.brokerFor.join();
    }

    // DB
    if (this.data.service.vaultConfig?.db) {
      this.config.db = this.data.service.vaultConfig.db.join();
    }

    // AppRole
    if (this.data.service.vaultConfig?.approle) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { enabled, ...advancedApprole } =
        this.data.service.vaultConfig.approle;
      if (Object.keys(advancedApprole).length > 0) {
        this.config.approle.advanced = JSON.stringify(advancedApprole);
      }
    }

    // Policy options
    if (this.data.service.vaultConfig?.policyOptions?.kvReadProject) {
      this.config.policyOptions.kvReadProject =
        this.data.service.vaultConfig.policyOptions.kvReadProject;
    }

    if (this.data.service.vaultConfig?.policyOptions?.systemPolicies) {
      this.config.policyOptions.systemPolicies =
        this.data.service.vaultConfig.policyOptions.systemPolicies.join();
    }

    if (this.data.service.vaultConfig?.policyOptions?.tokenPeriod) {
      this.config.policyOptions.tokenPeriod =
        this.data.service.vaultConfig.policyOptions.tokenPeriod;
    }
  }

  isFormInvalid() {
    return false;
  }

  update() {
    const configObj: VaultConfigRestDto = {
      enabled: this.config.enabled,
    };

    if (!this.data.showMasked) {
      configObj.approle = {
        enabled: this.config.approle.enabled,
      };
      configObj.policyOptions = {
        tokenPeriod: this.config.policyOptions.tokenPeriod,
      };
    } else {
      if (this.config.actor && this.config.actor !== '') {
        configObj.actor = JSON.parse(this.config.actor);
      }
      configObj.approle = {
        enabled: this.config.approle.enabled,
        ...JSON.parse(
          this.config.approle.advanced && this.config.approle.advanced !== ''
            ? this.config.approle.advanced
            : '{}',
        ),
      };
      if (this.config.brokerGlobal) {
        configObj.brokerGlobal = this.config.brokerGlobal;
      }
      if (this.config.brokerFor) {
        configObj.brokerFor = this.config.brokerFor.split(',');
      }
      if (this.config.db) {
        configObj.db = this.config.db.split(',');
      }
      configObj.policyOptions = {
        kvReadProject: this.config.policyOptions.kvReadProject,
        tokenPeriod: this.config.policyOptions.tokenPeriod,
        ...(this.config.policyOptions.kvReadProject
          ? {
              kvReadProject: this.config.policyOptions.kvReadProject,
            }
          : {}),
        ...(this.config.policyOptions.systemPolicies
          ? {
              systemPolicies:
                this.config.policyOptions.systemPolicies.split(','),
            }
          : {}),
      };
    }
    this.dialogRef.close({
      save: true,
      vaultConfig: configObj,
    });
  }
}
