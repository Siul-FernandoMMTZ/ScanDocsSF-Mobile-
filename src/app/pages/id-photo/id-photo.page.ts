import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-id-photo',
  templateUrl: './id-photo.page.html',
  styleUrls: ['./id-photo.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class IdPhotoPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
