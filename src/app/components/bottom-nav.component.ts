import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bookOutline, barChartOutline } from 'ionicons/icons';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [IonIcon],
  template: `
    <nav class="bottom-nav">
      <button class="nav-item" [class.active]="rota === '/diario'" (click)="ir('/diario')">
        <ion-icon name="book-outline" />
        <span>Diário</span>
      </button>
      <button class="nav-item" [class.active]="rota === '/dashboard'" (click)="ir('/dashboard')">
        <ion-icon name="bar-chart-outline" />
        <span>Insights</span>
      </button>
    </nav>
  `,
  styleUrls: ['./bottom-nav.component.scss'],
})
export class BottomNavComponent {
  @Input() rota = '';

  constructor(private router: Router) {
    addIcons({ bookOutline, barChartOutline });
  }

  ir(path: string) {
    this.router.navigate([path]);
  }
}
