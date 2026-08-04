import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { CollectionEdgeConfig, GitHubEdgeToRoles } from '../../service/persistence/dto/collection-config.dto';
import { ConnectionConfigDto } from '../../service/persistence/dto/connection-config.dto';
import { EdgetitlePipe } from '../../util/edgetitle.pipe';
import { TeamRoleChipComponment } from '../team-role-chip/team-role-chip.component';
import {
  BrokerChipClickEvent,
  BrokerRolesByEdge,
  ConnectionConfigChipInfo,
  ConnectionConfigChipsByRole,
  GitHubRolesByEdge,
} from '../team-roles/team-role-types';

@Component({
  selector: 'app-team-role-edges',
  imports: [MatDividerModule, EdgetitlePipe, TeamRoleChipComponment],
  templateUrl: './team-role-edges.component.html',
  styleUrl: './team-role-edges.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class TeamRoleEdgesComponent {
  readonly edges = input.required<CollectionEdgeConfig[]>();
  readonly teamRoleChipsEnabled = input(false);
  readonly connectionConfigChipsForRole = input<ConnectionConfigChipsByRole>({});
  readonly gitHubRoleByEdge = input<GitHubRolesByEdge>({});
  readonly brokerRoleByEdge = input<BrokerRolesByEdge>({});
  readonly currentConnectionConfigId = input<string | null>(null);

  readonly connectionChipClick = output<ConnectionConfigChipInfo>();
  readonly githubChipClick = output<GitHubEdgeToRoles>();
  readonly brokerChipClick = output<BrokerChipClickEvent>();

  getConnectionChipIcon(connectionConfig: ConnectionConfigDto): string {
    return connectionConfig.imageEmbedded || connectionConfig.imageUrl || 'assets/broker-bw.svg';
  }

  isCurrentConnectionChip(chip: ConnectionConfigChipInfo): boolean {
    return !!this.currentConnectionConfigId() && chip.connectionConfig.id === this.currentConnectionConfigId();
  }

  onConnectionChipClick(chip: ConnectionConfigChipInfo): void {
    if (this.isCurrentConnectionChip(chip)) {
      return;
    }

    this.connectionChipClick.emit(chip);
  }

  onGitHubChipClick(githubRole: GitHubEdgeToRoles): void {
    this.githubChipClick.emit(githubRole);
  }

  onBrokerChipClick(edge: CollectionEdgeConfig, chipLabel: string): void {
    this.brokerChipClick.emit({ edge, chipLabel });
  }
}
