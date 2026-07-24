import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-pdf-tools',
  templateUrl: './pdf-tools.page.html',
  styleUrls: ['./pdf-tools.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class PdfToolsPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
