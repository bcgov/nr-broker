import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ServiceDto } from '../../service/persistence/dto/service.dto';
import { VaultConfigDto } from '../../service/persistence/dto/vault-config.dto';

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
  styleUrl: './vault-dialog.component.scss',
})
export class VaultDialogComponent implements OnInit {
  readonly data = inject<{
    service: ServiceDto;
    showMasked: boolean;
  }>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<VaultDialogComponent>>(MatDialogRef);

  readonly config = signal({
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
      tokenPeriod: 'daily' as 'hourly' | 'bidaily' | 'daily' | 'weekly',
    },
  });

  ngOnInit() {
    this.config.update((current) => ({
      ...current,
      enabled: this.data.service.vaultConfig?.enabled ?? false,
      approle: {
        ...current.approle,
        enabled: this.data.service.vaultConfig?.approle?.enabled ?? false,
        advanced: (() => {
          if (this.data.service.vaultConfig?.approle) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { enabled, ...advancedApprole } =
              this.data.service.vaultConfig.approle;
            if (Object.keys(advancedApprole).length > 0) {
              return JSON.stringify(advancedApprole);
            }
          }
          return current.approle.advanced;
        })(),
      },
      actor: this.data.service.vaultConfig?.actor
        ? JSON.stringify(this.data.service.vaultConfig.actor)
        : current.actor,
      brokerGlobal: this.data.service.vaultConfig?.brokerGlobal ?? current.brokerGlobal,
      brokerFor: this.data.service.vaultConfig?.brokerFor
        ? this.data.service.vaultConfig.brokerFor.join()
        : current.brokerFor,
      db: this.data.service.vaultConfig?.db
        ? this.data.service.vaultConfig.db.join()
        : current.db,
      policyOptions: {
        kvReadProject:
          this.data.service.vaultConfig?.policyOptions?.kvReadProject ??
          current.policyOptions.kvReadProject,
        systemPolicies: this.data.service.vaultConfig?.policyOptions
          ?.systemPolicies
          ? this.data.service.vaultConfig.policyOptions.systemPolicies.join()
          : current.policyOptions.systemPolicies,
        tokenPeriod:
          this.data.service.vaultConfig?.policyOptions?.tokenPeriod ??
          current.policyOptions.tokenPeriod,
      },
    }));
  }

  updateEnabled(enabled: boolean) {
    this.config.update((c) => ({ ...c, enabled }));
  }

  updateDb(db: string) {
    this.config.update((c) => ({ ...c, db }));
  }

  updateApproleEnabled(enabled: boolean) {
    this.config.update((c) => ({ ...c, approle: { ...c.approle, enabled } }));
  }

  updateApproleAdvanced(advanced: string) {
    this.config.update((c) => ({ ...c, approle: { ...c.approle, advanced } }));
  }

  updateKvReadProject(kvReadProject: boolean) {
    this.config.update((c) => ({
      ...c,
      policyOptions: { ...c.policyOptions, kvReadProject },
    }));
  }

  updateSystemPolicies(systemPolicies: string) {
    this.config.update((c) => ({
      ...c,
      policyOptions: { ...c.policyOptions, systemPolicies },
    }));
  }

  updateTokenPeriod(tokenPeriod: 'hourly' | 'bidaily' | 'daily' | 'weekly') {
    this.config.update((c) => ({
      ...c,
      policyOptions: { ...c.policyOptions, tokenPeriod },
    }));
  }

  updateActor(actor: string) {
    this.config.update((c) => ({ ...c, actor }));
  }

  updateBrokerGlobal(brokerGlobal: boolean) {
    this.config.update((c) => ({ ...c, brokerGlobal }));
  }

  updateBrokerFor(brokerFor: string) {
    this.config.update((c) => ({ ...c, brokerFor }));
  }

  isFormInvalid() {
    return false;
  }

  update() {
    const config = this.config();
    const configObj: VaultConfigDto = {
      enabled: config.enabled,
    };

    if (!this.data.showMasked) {
      configObj.approle = {
        enabled: config.approle.enabled,
      };
      configObj.policyOptions = {
        tokenPeriod: config.policyOptions.tokenPeriod,
      };
    } else {
      if (config.actor && config.actor !== '') {
        configObj.actor = JSON.parse(config.actor);
      }
      configObj.approle = {
        enabled: config.approle.enabled,
        ...JSON.parse(
          config.approle.advanced && config.approle.advanced !== ''
            ? config.approle.advanced
            : '{}',
        ),
      };
      if (config.brokerGlobal) {
        configObj.brokerGlobal = config.brokerGlobal;
      }
      if (config.brokerFor) {
        configObj.brokerFor = config.brokerFor.split(',');
      }
      if (config.db) {
        configObj.db = config.db.split(',');
      }
      configObj.policyOptions = {
        kvReadProject: config.policyOptions.kvReadProject,
        tokenPeriod: config.policyOptions.tokenPeriod,
        ...(config.policyOptions.kvReadProject
          ? {
              kvReadProject: config.policyOptions.kvReadProject,
            }
          : {}),
        ...(config.policyOptions.systemPolicies
          ? {
              systemPolicies: config.policyOptions.systemPolicies.split(','),
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
